const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');

const sensorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 50,
        description: 'Name of the device',
    },
    description: {
        type: String,
        maxlength: 500,
        description: 'Description of the device',
    },
    secretKey: {
        type: String,
        required: true,
        unique: true,
        maxlength: 50,
        description: 'Secret key for the device',
    },
    dataKeys: {
        type: [{
            name: {
                type: String,
                description: 'Name of the dataKey',
            },
            uid: {
                type: String,
                description: 'Unique identifier for the dataKey',
            },
        }],
        description: 'Array of keys for data downloading from the sensor',
    },
    isPublic: {
        type: Boolean,
        description: 'Indicates whether the sensor is public',
        default: false,
    },
    types: {
        type: [{
            type: String, //mongoose.Schema.Types.ObjectId,
            //ref: 'SensorType',
        }],
        description: 'Array of sensor types',
    },
    alerts: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Alert',
        }],
        description: 'Array of alert IDs associated with the sensor',
    },
    lastSettingsUpdateTimestamp: {
        type: Date,
        description: 'Timestamp of the last settings update',
    },
    settings: {
        type: [{
            name: {
                type: String,
                description: 'Setting name',
            },
            value: {
                type: String,
                description: 'Setting value',
            },
            valueType: {
                type: String,
                enum: ['Integer', 'Bool', 'Double', 'String'],
                description: 'Type of the setting value',
            },
        }],
        maxItems: 100,
        description: 'Array of sensor settings',
    },
    lastLogs: {
        type: [{
            timestamp: {
                type: Date,
                description: 'Timestamp of the log entry',
            },
            message: {
                type: String,
                maxlength: 50,
                description: 'Log message',
            },
        }],
        maxItems: 1000,
        description: 'Array of last sensor logs',
    },
    errors: {
        type: [{
            timestamp: {
                type: Date,
                description: 'Timestamp of the error',
            },
            message: {
                type: String,
                maxlength: 50,
                description: 'Error message',
            },
        }],
        maxItems: 1000,
        description: 'Array of sensor errors',
    },
    defaultLocation: {
        type: [{
            latitude: {
                type: Number,
                description: 'Latitude coordinate with maximum precision',
            },
            longitude: {
                type: Number,
                description: 'Longitude coordinate with maximum precision',
            },
        }],
        description: 'Array representing the default location of the sensor',
    },
    batteryStatus: {
        type: [{
            timestamp: {
                type: Date,
                description: 'Timestamp of the battery status entry',
            },
            status: {
                type: Number,
                min: 0,
                max: 100,
                description: 'Battery status percentage (0-100)',
            },
        }],
        maxItems: 200,
        description: 'Array of battery status entries',
    },
    currentOptions: {
        type: {
            apiUri: {
                type: String,
                description: 'API URI for the current options',
            },
            apiVersion: {
                type: String,
                description: 'API version for the current options',
            },
            sensorId: {
                type: String,
                description: 'Sensor ID for the current options',
            },
            secretKey: {
                type: String,
                description: 'Secret key for the current options',
            },
            dataSendingFrequency: {
                type: Number,
                description: 'Data sending frequency for the current options',
            },
            isSendSensorData: {
                type: Boolean,
                description: 'Flag indicating whether to send sensor data for the current options',
            },
            serverAlwaysLive: {
                type: Boolean,
                description: 'Flag indicating whether the server is always live for the current options',
            },
        },
        description: 'Current options for the sensor',
    },
    newOptions: {
        type: {
            apiUri: {
                type: String,
                description: 'API URI for the new options',
            },
            apiVersion: {
                type: String,
                description: 'API version for the new options',
            },
            sensorId: {
                type: String,
                description: 'Sensor ID for the new options',
            },
            secretKey: {
                type: String,
                description: 'Secret key for the new options',
            },
            dataSendingFrequency: {
                type: Number,
                description: 'Data sending frequency for the new options',
            },
            isSendSensorData: {
                type: Boolean,
                description: 'Flag indicating whether to send sensor data for the new options',
            },
            serverAlwaysLive: {
                type: Boolean,
                description: 'Flag indicating whether the server is always live for the new options',
            },
        },
        description: 'New options for the sensor',
    },
});

sensorSchema.methods.areOptionsEqual = function () {
    return (
        this.newOptions.apiUri === this.currentOptions.apiUri &&
        this.newOptions.apiVersion === this.currentOptions.apiVersion &&
        this.newOptions.sensorId === this.currentOptions.sensorId &&
        this.newOptions.secretKey === this.currentOptions.secretKey &&
        this.newOptions.dataSendingFrequency === this.currentOptions.dataSendingFrequency &&
        this.newOptions.isSendSensorData === this.currentOptions.isSendSensorData &&
        this.newOptions.serverAlwaysLive === this.currentOptions.serverAlwaysLive
    );
};

sensorSchema.statics.getOwner = async function (sensorId) {
    try {
        const group = await Group.findBySensor(sensorId);

        if (!group) {
            throw new Error('Group not found for the given sensor');
        }

        const user = await User.findByGroup(group._id);

        if (!user) {
            throw new Error('User not found for the given group');
        }

        return user;
    } catch (error) {
        throw new Error(`Error finding owner of the sensor: ${error.message}`);
    }
};

module.exports = mongoose.model('Sensor', sensorSchema);