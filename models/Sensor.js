// models/sensor.js

const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    name: {
        type: String,
        maxLength: 200,
        required: true,
    },
    secretKey: {
        type: String,
        maxLength: 100,
        required: true,
        unique: true,
    },
    type: {
        type: [String],
        required: true,
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
    owner: {
        type: String,
    },
});

const Sensor = mongoose.model('Sensor', sensorSchema);

module.exports = Sensor;
