const express = require('express');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const User = require('../models/User');
const router = express.Router();

// USER GET
router.get('/:username', verifyToken, async (req, res) => {
  try {
    const { username } = req.params;
    const loggedInUser = req.user;

    if (!loggedInUser) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isLoggedUser = loggedInUser.username === username;

    if (!isAdmin && !isLoggedUser) {
      return res.status(403).json({ error: `Access denied ${loggedInUser.username} != ${username}` });
    }

    // If showOptions is true, return only the options field
    if (req.query.showOptions === 'true') {
      const { options } = user;
      return res.json(options);
    }

    // If the logged-in user is trying to access their own account, return full user info
    if (isLoggedUser) {
      const { username, email, role, phone, emailVerified, options, lastLoginDate, createdAt } = user;
      return res.json({ username, email, role, phone, emailVerified, options, lastLoginDate, createdAt });
    }

    // If the logged-in user is an admin, return account info except options
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

    // Update specific fields if provided in the request body
    const { email, password, phone, options } = req.body;

    // Check if any fields were modified
    let isModified = false;

    if (email && email !== user.email) {
      // If email is being updated, set emailVerified to false
      user.email = email;
      user.emailVerified = false;
      isModified = true;
    }

    if (password) {
      // Hash and update the password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      isModified = true;
    }

    if (phone && phone !== user.phone) {
      user.phone = phone;
      isModified = true;
    }

    if (options && !isEqual(options, user.options)) {
      // Update the options field with the provided data if it's different from the current options
      Object.assign(user.options, options);
      isModified = true;
    }

    // If nothing was modified, return 304 Not Modified
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