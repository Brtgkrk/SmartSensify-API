const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.accountStatus !== 'active') {
      req.user = null;
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = verifyToken;