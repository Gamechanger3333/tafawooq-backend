const jwt = require('jsonwebtoken');
const Users = require('../models/usersModel');

const auth = async (req, res, next) => {
  try {
    console.log(`[AUTH MIDDLEWARE] Incoming request: ${req.method} ${req.originalUrl}`);

    // Extract the token from headers
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.warn(`[AUTH MIDDLEWARE] No token provided`);
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log(`[AUTH MIDDLEWARE] Token received: ${token}`);

    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[AUTH MIDDLEWARE] Token decoded:`, decoded);

    // Find the user and ensure they are active
    const user = await Users.findOne({ _id: decoded.userId });

    if (!user) {
      console.warn(`[AUTH MIDDLEWARE] User not found or inactive. UserId: ${decoded.userId}`);
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    console.log(`[AUTH MIDDLEWARE] User authenticated: ${user._id} - Roles: ${user.role}`);
    console.log("[AUTH MIDDLEWARE] Decoded JWT payload:", decoded);

    // Attach user and roles to request object
    req.user = user;
    req.roles = decoded.roles || []; // Extract roles from token
    req.token = token;

    next();
  } catch (error) {
    console.error(`[AUTH MIDDLEWARE] Authentication error:`, error.message);
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = auth;
