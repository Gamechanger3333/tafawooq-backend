const jwt = require("jsonwebtoken");
const Users = require("../models/usersModel");

const socketAuth = async (socket, next) => {
  console.log("Socket authentication attempt", socket.id);
  
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log(`Socket ${socket.id} authentication failed: No token provided`);
      return next(new Error("Authentication required"));
    }
    
    console.log(`Verifying JWT token for socket ${socket.id}`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`Token verified, user ID: ${decoded.userId}`);
    
    const user = await Users.findById(decoded.userId);
    
    if (!user) {
      console.log(`Socket ${socket.id} authentication failed: User ${decoded.userId} not found in database`);
      return next(new Error("User not found"));
    }
    
    console.log(`User found: ${user._id} (${user.email}, ${user.role})`);
    
    // Attach user information to socket
    socket.user = {
      _id: user._id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_pic: user.profile_pic
    };
    
    console.log(`Authentication successful for socket ${socket.id}, user: ${user._id}`);
    next();
  } catch (error) {
    console.error(`Socket ${socket.id} authentication error:`, error);
    next(new Error("Authentication failed"));
  }
};

module.exports = socketAuth;