const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    description: 'Name of the organization',
  },
  description: {
    type: String,
    description: 'Description of the organization',
    maxlength: 500,
  },
  isPublic: {
    type: Boolean,
    required: true,
    description: 'Public status of the organization',
  },
  phone: {
    type: String,
    maxlength: 20,
    match: /^[0-9]{9,15}$/,
    description: 'Phone number of the organization',
  },
  email: {
    type: String,
    maxlength: 50,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: 'Email of the organization',
  },
  address: [
    {
      buildingNumber: {
        type: Number,
        description: 'Building number',
      },
      street: {
        type: String,
        maxlength: 50,
        description: 'Street name',
      },
      city: {
        type: String,
        maxlength: 50,
        description:
        'City name',
      },
      country: {
        type: String,
        maxlength: 50,
        description: 'Country name',
      },
      postalCode: {
        type: String,
        maxlength: 20,
        description: 'Postal code',
      },
    },
  ],
  users: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        description: 'User ID',
      },
      role: {
        type: String,
        enum: ['owner', 'moderator', 'normal'],
        description: 'User role',
      },
    },
  ],
});

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;