const statusHandlers = (io, socket, onlineUsers) => {
  console.log(`Setting up status handlers for user: ${socket.user._id}`);
  
  // Get online status of users
  socket.on("getUserStatus", async (data) => {
    console.log(`getUserStatus event received from ${socket.user._id}:`, data);
    
    try {
      const { userIds } = data;
      
      if (!Array.isArray(userIds)) {
        console.log(`Invalid userIds format, expected array but got: ${typeof userIds}`);
        socket.emit("error", { message: "userIds must be an array" });
        return;
      }
      
      console.log(`Checking status for ${userIds.length} users: ${userIds.join(', ')}`);
      const statuses = {};
      
      for (const userId of userIds) {
        const isOnline = onlineUsers.has(userId);
        statuses[userId] = isOnline ? "online" : "offline";
        console.log(`User ${userId} status: ${isOnline ? "online" : "offline"}`);
      }
      
      console.log(`Sending statuses back to user ${socket.user._id}:`, statuses);
      socket.emit("userStatuses", statuses);
    } catch (error) {
      console.error("Error getting user statuses:", error);
      socket.emit("error", { message: "Failed to get user statuses" });
    }
  });
};

module.exports = statusHandlers;