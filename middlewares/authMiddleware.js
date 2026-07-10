const jwt = require('jsonwebtoken');
const Users = require('../models/usersModel');

const auth = async (req, res, next) => {
  try {
    // Extract the token from headers
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user. `active` is excluded by default in the schema
    // (select: false), so it must be explicitly requested here.
    const user = await Users.findOne({ _id: decoded.userId }).select('+active');

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    if (user.active === false) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }

    // Attach user and roles to request object
    req.user = user;
    req.roles = decoded.roles || []; // Extract roles from token
    req.token = token;

    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE] Authentication error:', error.message);
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = auth;
