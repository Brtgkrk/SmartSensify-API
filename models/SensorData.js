const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  sensorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  location: {
    x: {
      type: String,
    },
    y: {
      type: String,
    },
  },
  readings: [
    {
      type: {
        type: String,
        required: true,
      },
      unit: {
        type: String,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
  ],
});

const SensorData = mongoose.model('SensorData', sensorDataSchema, 'sensorData');

module.exports = SensorData;