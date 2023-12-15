const express = require('express');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const User = require('../models/User');
const router = express.Router();
const { Types } = require('mongoose');

// USER GET
router.get('/:identifier', verifyToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const loggedInUser = req.user;

    if (!loggedInUser) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    let user;

    if (Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ username: identifier });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isLoggedUser = loggedInUser.username === user.username;

    if (!isAdmin && !isLoggedUser) {
      return res.status(403).json({ error: `Access denied ${loggedInUser.username} != ${user.username}` });
    }

    if (req.query.showOptions === 'true') {
      const { options } = user;
      return res.json(options);
    }

    if (isLoggedUser) {
      const { _id, username, email, role, phone, address, lastLoginDate, createdAt, updatedAt, accountStatus, emailVerified } = user;
      return res.json({ _id, username, email, role, phone, address, lastLoginDate, createdAt, updatedAt, accountStatus, emailVerified });
    }

    if (isAdmin) {
      const { username, email, role, phone, emailVerified, lastLoginDate, accountStatus, createdAt, updatedAt } = user;
      return res.json({ username, email, role, phone, emailVerified, lastLoginDate, accountStatus, createdAt, updatedAt });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// USER PATCH
router.patch('/:username', verifyToken, async (req, res) => {
  try {
    const { username: targetUsername } = req.params;
    const loggedInUser = req.user;

    if (!loggedInUser) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await User.findOne({ username: targetUsername });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = loggedInUser.role === 'admin';
    const isLoggedUser = loggedInUser.username === targetUsername;

    if (!isAdmin && !isLoggedUser) {
      return res.status(403).json({ error: `Access denied ${loggedInUser.username} != ${targetUsername}` });
    }

    const { email, password, phone, options, address } = req.body;

    let isModified = false;

    if (email && email !== user.email) {
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

    // Update options if provided
    if (options) {
      user.options = options;
      isModified = true;
    }

    // Update address if provided
    if (address) {
      user.address = address;
      isModified = true;
    }

    if (!isModified) {
      return res.status(304).end();
    }

    await user.save();

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;