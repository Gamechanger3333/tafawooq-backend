const mongoose = require("mongoose");
const socketAuth = require("../middlewares/socketAuth");
const messageHandlers = require("./socketHandlers/messageHandlers");
const statusHandlers = require("./socketHandlers/statusHandlers");

// Online users tracking - shared across modules
const onlineUsers = new Map();

const socketSetup = (io) => {
  console.log("Setting up Socket.IO server");
  
  // Apply authentication middleware
  io.use(socketAuth);
  
  // Socket connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user._id} (${socket.user.role}) with socket ID: ${socket.id}`);
    
    // Add user to online users
    onlineUsers.set(socket.user._id.toString(), socket.id);
    console.log(`Added user ${socket.user._id} to online users map, current count: ${onlineUsers.size}`);
    
    // Emit online status to all connected clients
    console.log(`Broadcasting online status for user: ${socket.user._id}`);
    io.emit("userStatus", {
      userId: socket.user._id,
      status: "online"
    });
    
    // Set up message handlers
    console.log(`Initializing message handlers for user: ${socket.user._id}`);
    messageHandlers(io, socket, onlineUsers);
    
    // Set up status handlers
    console.log(`Initializing status handlers for user: ${socket.user._id}`);
    statusHandlers(io, socket, onlineUsers);
    
    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user._id} (socket ID: ${socket.id})`);
      
      // Remove user from online users
      onlineUsers.delete(socket.user._id.toString());
      console.log(`Removed user ${socket.user._id} from online users map, remaining count: ${onlineUsers.size}`);
      
      // Emit offline status to all connected clients
      console.log(`Broadcasting offline status for user: ${socket.user._id}`);
      io.emit("userStatus", {
        userId: socket.user._id,
        status: "offline"
      });
    });
  });
};

module.exports = socketSetup;