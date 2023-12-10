const mongoose = require('mongoose');

const officialSensorTypeSchema = new mongoose.Schema({
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

// Apply the provided JSON schema for validation
officialSensorTypeSchema.index({ name: 1, description: 1, unit: 1 }, { unique: true });

const OfficialSensorTypes = mongoose.model('OfficialSensorTypes', officialSensorTypeSchema, 'officialSensorTypes');

module.exports = OfficialSensorTypes;
