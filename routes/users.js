const express = require('express');
const router = express.Router();
const { Types } = require('mongoose');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const User = require('../models/User');

// TODO: Add logging

// Endpoints //

// GET - Get current logged user
router.get('/', verifyToken, async (req, res) => {
  try {
    const loggedUser = req.user;
    if (!loggedUser) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    // Admin can get all user list
    if (req.query.getAllUsers === 'true' && loggedUser.role === 'admin') {
      try {
        const users = await User.find();
        return res.json(users);
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // User can get only options
    if (req.query.showOptions === 'true') {
      const { options } = loggedUser;
      return res.json(options);
    }

    return res.json(extractUserFields(loggedUser));

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH - Patch current user by Id, email or username
router.patch('/', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const isModified = await updateUser(user, req.body);
    if (isModified) return res.status(204).end();
    return res.status(304).end();

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET :/identifier - Get certain user by Id, email or username
router.get('/:identifier', verifyToken, async (req, res) => {
  try {
    const user = await getUserByIdentifier(req.params.identifier);
    const userProcessing = await canProcessUser(user, req.user)

    if (userProcessing.success === true) {
      return res.json(extractUserFields(user));
    }

    return res.status(userProcessing.code).json({ error: userProcessing.message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH :/identifier - Patch certain user by Id, email or username
router.patch('/:identifier', verifyToken, async (req, res) => {
  try {
    const user = await getUserByIdentifier(req.params.identifier);
    const userProcessing = await canProcessUser(user, req.user)
    let isModified;

    if (userProcessing.success === true) {
      isModified = await updateUser(user, req.body);
      if (isModified) return res.status(204).end();
      return res.status(304).end();
    }

    return res.status(userProcessing.code).json({ error: userProcessing.message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Anonymize and deactivate current user
router.delete('/', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    try {
      await softDeleteUser(user);
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Functions //

async function softDeleteUser(user) {
  if (!user) return;

  user.firstName = null;
  user.lastName = null;
  user.email = 'mail@example.com';
  user.accountStatus = 'suspended';
  user.emailVerified = false;
  user.lastLoginDate = null;
  user.premiumExpiration = null;
  user.phone = null;
  user.options = null;
  user.address = null;

  await user.save();
}

async function canProcessUser(user, loggedUser) {

  if (!user) {
    return { success: false, code: 404, message: 'User not found' };
  }

  if (!loggedUser) {
    return { success: false, code: 401, message: 'Not logged in' };
  }

  const userType = await getUserType(loggedUser, user);
  if (userType === UserType.ADMIN_USER || userType === UserType.LOGGED_USER || userType === UserType.ORGANIZATION_OWNER) {
    return { success: true };
  }

  return { success: false, code: 403, message: 'Access denied' };
}

async function updateUser(user, body) {
  const { email, password, phone, options, address } = body;

  let isModified = false;

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) return;
    user.email = email;
    user.emailVerified = false;
    isModified = true;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    isModified = true;
  }

  if (phone && phone !== user.phone) {
    user.phone = phone;
    isModified = true;
  }

  if (options) {
    user.options = options;
    isModified = true;
  }

  if (address) {
    user.address = address;
    isModified = true;
  }

  await user.save();

  return isModified;
}

function extractUserFields(user) {
  if (!user) return;
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    lastLoginDate: user.lastLoginDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
  };
}

const UserType = {
  LOGGED_USER: 'loggedUser',
  ADMIN_USER: 'adminUser',
  ORGANIZATION_OWNER: 'organizationOwner',
  UNKNOWN_TYPE: 'unknownType',
};

async function getUserType(loggedUser, user) {
  try {
    if (!user) {
      return null;
    }

    if (loggedUser.role === 'admin') return UserType.ADMIN_USER;
    if (loggedUser.username === user.username) return UserType.LOGGED_USER;

    /*const organization = User.returnOrganization(user._id);
    if (!organization) {
      const userInOrganization = organization.users.find(orgUser => orgUser.userId === loggedUser._id);
      if (userInOrganization && userInOrganization.role === 'owner') return UserType.ORGANIZATION_OWNER;
    }*/
    return UserType.UNKNOWN_TYPE;
  } catch (error) {
    throw new Error(error);
  }
}

async function getUserByIdentifier(identifier) {
  try {
    let user;
    if (Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ username: identifier });
    }
    return user;
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = router;