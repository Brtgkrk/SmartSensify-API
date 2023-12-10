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
      typeId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      typeName: {
        type: String,
      },
      unit: {
        type: String,
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