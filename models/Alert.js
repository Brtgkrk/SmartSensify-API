const mongoose = require('mongoose');
const Sensor = require('../models/Sensor');

const alertSchema = new mongoose.Schema({
    sensorType: {
        type: String,
        required: true,
        description: 'Type of the sensor'
    },
    condition: {
        type: String,
        enum: ['under', 'above'],
        required: true,
        description: 'Condition for the sensor alert'
    },
    conditionNumber: {
        type: Number,
        required: true,
        description: 'Numeric value for the condition'
    },
    action: {
        type: String,
        enum: ['email'],
        required: true,
        description: 'Action to be taken on alert'
    },
    sendings: {
        type: [{
            timestamp: {
                type: Date,
                required: true,
                description: 'Timestamp of the sending'
            },
            message: {
                type: String,
                required: true,
                description: 'Message content'
            }
        }],
        required: true,
        description: 'Array of timestamped messages'
    },
    emails: {
        type: [String], // Array of strings representing emails
        required: true,
        description: 'Array of email addresses to notify'
    },
    username: {
        type: String,
        description: 'Username of the sensor owner'
    },
});

alertSchema.statics.findSensorByAlertId = async function (alertId) {
    try {
        const alert = await this.findById(alertId);

        if (!alert) {
            throw new Error('Alert not found');
        }

        const sensor = await Sensor.findOne({ alerts: alertId });

        if (!sensor) {
            throw new Error('Sensor not found');
        }

        return sensor;
    } catch (error) {
        throw new Error(`Error finding sensor by alert ID: ${error.message}`);
    }
};

const AlertModel = mongoose.model('Alert', alertSchema);

module.exports = AlertModel;
