const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 50,
        description: 'Name of the group',
    },
    description: {
        type: String,
        required: true,
        maxlength: 500,
        description: 'Description of the group',
    },
    users: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        required: true,
        description: 'Array of user IDs associated with the group',
    },
    sensors: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sensor',
        }],
        description: 'Array of sensor IDs associated with the group',
    },
});

groupSchema.statics.findBySensor = async function (sensorId) {
    try {
        const group = await this.findOne({ sensors: { $in: [sensorId] } });
        return group;
    } catch (error) {
        throw new Error(`Error finding group by sensor ID: ${error.message}`);
    }
};

module.exports = mongoose.model('Group', groupSchema);