const mongoose = require('mongoose');

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
});

module.exports = mongoose.model('Sensor', sensorSchema);