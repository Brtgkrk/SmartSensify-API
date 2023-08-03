const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('../models/User');
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
      const { username, email, password } = req.body;

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });

      if (existingUser) {
          return res.status(409).json({ error: 'User with the same email or username already exists' });
      }

      const user = await User.create({ username, email, password });
      res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

// Login user and generate JWT token
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const isEmail = /\S+@\S+\.\S+/.test(identifier);
    let user;

    if (isEmail) {
      user = await User.findOne({ email: identifier });
    } else {
      user = await User.findOne({ username: identifier });
    }
    if (!user) throw new Error('Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid email or password');

    user.lastLoginDate = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/protected', (req, res) => {
  res.json({ message: 'This is a protected route!' });
});

module.exports = router;