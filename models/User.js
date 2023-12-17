const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    maxLength: 20,
    validate: {
      validator: function (value) {
        return /^[a-zA-Z0-9]+$/.test(value);
      },
      message: 'Username must contain only letters and numbers.',
    },
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
    default: 'standard'
  },
  accountStatus: {
    type: String,
    required: true,
    default: 'active',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLoginDate: {
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
  options: {
    timezone: {
      type: String,
    },
    language: {
      type: String,
    },
    theme: {
      type: String,
    },
    profileImage: {
      type: String,
    },
  },

  address: {
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
},
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.statics.returnOrganization = async function (userId) {
  try {
    const organization = await Organization.findOne({ 'users.userId': userId });
    return organization;
  } catch (error) {
    throw new Error('Error checking user organization status');
  }
};

userSchema.statics.getAllSensors = async function (userId) {
  try {
    const user = await this.findById(userId).populate('groups');

    const allSensors = [];
    user.groups.forEach(group => {
      group.sensors.forEach(sensor => {
        allSensors.push(sensor);
      });
    });

    const sensorsDetails = await Sensor.find({ _id: { $in: allSensors } });

    return sensorsDetails;
  } catch (error) {
    throw new Error('Error fetching user sensors');
  }
};

userSchema.statics.hasSensor = async function (userId, sensorId) {
  try {
    const user = await this.findById(userId).populate('groups');

    for (const group of user.groups) {
      if (group.sensors.includes(sensorId)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    throw new Error('Error checking if user has a certain sensor');
  }
};

userSchema.statics.findByGroup = async function (groupId) {
  try {
    const user = await this.findOne({ 'groups': { $in: [groupId] } });
    return user;
  } catch (error) {
    throw new Error(`Error finding user by group ID: ${error.message}`);
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;