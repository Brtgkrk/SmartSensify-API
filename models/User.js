const mongoose = require('mongoose');
const Organization = require('../models/Organization');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    maxLength: 20,
  },
  firstName: {
    type: String,
    maxLength: 50,
  },
  lastName: {
    type: String,
    maxLength: 50,
  },
  email: {
    type: String,
    required: true,
    maxLength: 50,
    match: /^\S+@\S+\.\S+$/,
  },
  password: {
    type: String,
    required: true,
    maxLength: 100,
  },
  role: {
    type: String,
    enum: ['standard', 'developer', 'admin'],
    required: true,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    required: true,
  },
  lastLogin: {
    type: Date,
  },
  groups: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  },
  premiumExpiration: {
    type: Date,
  },
  phone: {
    type: String,
    maxLength: 15,
    pattern: '^[0-9]{9,15}$',
  },
  customSensorTypes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SensorType' }],
  },
  preferences: [
    {
      timezone: {
        type: String,
      },
      language: {
        type: String,
      },
      profileImage: {
        type: String,
      },
    },
  ],
  address: [
    {
      buildingNumber: {
        type: Number,
      },
      street: {
        type: String,
        maxLength: 50,
      },
      city: {
        type: String,
        maxLength: 50,
      },
      country: {
        type: String,
        maxLength: 50,
      },
      postalCode: {
        type: String,
        maxLength: 20,
      },
    },
  ],
});

userSchema.statics.returnOrganization = async function (userId) {
  try {
    const organization = await Organization.findOne({ 'users.userId': userId });
    return organization;
  } catch (error) {
    throw new Error('Error checking user organization status');
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;