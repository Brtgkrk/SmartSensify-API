const mongoose = require('mongoose');

const customSensorTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxLength: 50,
    description: 'Name of the typical sensor type',
  },
  description: {
    type: String,
    required: true,
    maxLength: 500,
    description: 'Description of the typical sensor type',
  },
  unit: {
    type: String,
    required: true,
    maxLength: 10,
    description: 'Unit of measurement for the typical sensor type',
  },
});

const CustomSensorType = mongoose.model('CustomSensorType', customSensorTypeSchema);

module.exports = CustomSensorType;