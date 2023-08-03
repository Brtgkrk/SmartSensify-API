// models/sensor.js

const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
    name: {
        type: String,
        maxLength: 200,
        required: true,
    },
    description: {
        type: String,
        maxLength: 1000,
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
},
    {
        timestamps: true,
    });

sensorSchema.statics.isOwnedByUser = async function (sensorId, userId) {
    try {
        const user = await User.findById(userId);
        if (user && user.sensors.includes(sensorId)) {
            return true; // Sensor is owned by the user
        }
        return false; // Sensor is not owned by the user or user not found
    } catch (error) {
        return false; // Error occurred or user not found
    }
};


const Sensor = mongoose.model('Sensor', sensorSchema);

module.exports = Sensor