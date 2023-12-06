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

module.exports = mongoose.model('Group', groupSchema);