const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const emailService = require('../utils/emailService');
require('dotenv').config();
const User = require('../models/User');
const verifyToken = require('../middlewares/jwtAuthMiddleware');
const router = express.Router();
const { randomBytes } = require('crypto');

// Endpoints //

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'User with the same email or username already exists' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, and numeric characters.' });
    }

    const user = await User.create({
      username,
      email,
      password,
      options: {
        language: 'en',
        timezone: 'UTC',
        theme: 'light',
      },
    });

    await sendVerificationEmail(user);

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login user and return JWT token
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

// Token validation endpoint
router.post('/validateToken', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      try {
        const user = await User.findById(decoded.userId).exec();

        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        res.json({ message: 'Token is valid', userId: user._id });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route!' });
});

router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(404).json({ error: 'Invalid verification token.' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resetPassword/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    const { password } = req.body;

    if (!user || !password) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    user.password = password;
    user.verificationToken = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verifyMail', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (user && !user.emailVerified) {
      await sendVerificationEmail(user);
      return res.status(200).json({ message: 'Verification email sent successfully.' });
    }

    return res.status(304).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resetPassword', async (req, res) => {
  const { identifier } = req.body;

  const isEmail = /\S+@\S+\.\S+/.test(identifier);
  let user;

  if (isEmail) {
    user = await User.findOne({ email: identifier });
  } else {
    user = await User.findOne({ username: identifier });
  }

  if (user && user.accountStatus === 'active') {
    await sendPasswordResetMail(user);
    return res.status(200).json({ message: 'Password reset email sent successfully.' })
  }
  return res.status(404).json({ message: 'User not found.' })
});

// Functions //

const generateVerificationToken = () => {
  return randomBytes(32).toString('hex');
};

const sendVerificationEmail = async (user) => {
  const verificationToken = generateVerificationToken();
  user.verificationToken = verificationToken;
  await user.save();

  const subject = 'Email Verification';
  const htmlBody = `Click the following link to verify your email: <a href="${process.env.SERVER_URL}/auth/verify/${verificationToken}">Click</a>`;
  await emailService.sendEmail(user.email, subject, htmlBody);
};

const sendPasswordResetMail = async (user) => {
  const verificationToken = generateVerificationToken();
  user.verificationToken = verificationToken;
  await user.save();

  const subject = 'Password reset';
  const htmlBody = `Click the following link to reset your password: ${process.env.SERVER_URL}/auth/resetPassword/${verificationToken}`;
  await emailService.sendEmail(user.email, subject, htmlBody);
};


module.exports = router;