const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    maxLength: 50,
    unique: true,
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
    enum: ['admin', 'standard', 'premium'],
    required: true,
    default: "standard",
  },
  premiumExpiration: {
    type: Date,
  },
  phone: {
    type: String,
    maxLength: 15,
    match: /^[0-9]{9,15}$/,
  },
  sensors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sensor',
  }],
  lastLoginDate: {
    type: Date,
    default: null,
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  options: {
    language: {
      type: String,
      maxLength: 20,
      default: 'en',
    },
    timezone: {
      type: String,
      maxLength: 50,
      default: 'UTC',
    },
    theme: {
      type: String,
      enum: ['Default', 'Light', 'Dark'],
      default: 'Default',
    },
    accessibilityPreferences: {
      highContrastMode: {
        type: Boolean,
        default: false,
      },
      fontSize: {
        type: Number,
        default: 1,
      },
    },
  },
}, {
  timestamps: true,
});

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

const User = mongoose.model('User', userSchema);

module.exports = User;