const mongoose = require("mongoose");
const Users = require("../../models/usersModel");

const messageHandlers = (io, socket, onlineUsers) => {
  console.log(`Setting up message handlers for user: ${socket.user._id}`);
  
  // Handle private messages
  socket.on("privateMessage", async (data) => {
    console.log(`privateMessage event received from ${socket.user._id}:`, data);
    
    try {
      const { receiverId, content } = data;
      
      if (!receiverId || !content) {
        console.log(`Missing data in privateMessage: receiverId=${receiverId}, content=${!!content}`);
        socket.emit("error", { message: "Receiver ID and content are required" });
        return;
      }

      // Check if receiver exists
      const receiver = await Users.findById(receiverId);
      if (!receiver) {
        console.log(`Receiver not found: ${receiverId}`);
        socket.emit("error", { message: "Receiver not found" });
        return;
      }

      // Permission checks based on roles
      const senderRole = socket.user.role;
      const receiverRole = receiver.role;
      
      console.log(`Permission check: Sender(${socket.user._id}) role: ${senderRole}, Receiver(${receiverId}) role: ${receiverRole}`);
      
      let isAllowed = false;
      
      if (senderRole === "admin") {
        // Admin can message anyone
        isAllowed = true;
      } else if (senderRole === "tutor") {
        // Tutor can message students or admin
        isAllowed = receiverRole === "student" || receiverRole === "admin";
        
        // Additional check for students - tutor should only message their own students
        if (receiverRole === "student") {
          // Logic to check if student belongs to this tutor
          // This would require a relationship check in your database
          // For now, we'll assume it's allowed
          isAllowed = true;
        }
      } else if (senderRole === "student") {
        // Student can message tutors or admin
        isAllowed = receiverRole === "tutor" || receiverRole === "admin";
        
        // Additional check for tutors - student should only message their own tutors
        if (receiverRole === "tutor") {
          // Logic to check if tutor belongs to this student
          // This would require a relationship check in your database
          // For now, we'll assume it's allowed
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        console.log(`Permission denied: ${socket.user._id} (${senderRole}) cannot message ${receiverId} (${receiverRole})`);
        socket.emit("error", { message: "You are not allowed to message this user" });
        return;
      }

      console.log(`Creating new message from ${socket.user._id} to ${receiverId}`);
      
      // Create and save message in database
      const Messages = mongoose.model("Messages");
      const message = new Messages({
        sender: socket.user._id,
        receiver: receiverId,
        content
      });
      
      await message.save();
      console.log(`Message saved with ID: ${message._id}`);

      // Format message for frontend
      const formattedMessage = {
        _id: message._id,
        content: message.content,
        sender: {
          _id: socket.user._id,
          first_name: socket.user.first_name,
          last_name: socket.user.last_name,
          profile_pic: socket.user.profile_pic
        },
        timestamp: message.timestamp,
        read: message.read
      };

      // Send message to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        console.log(`Receiver ${receiverId} is online, sending message to socket: ${receiverSocketId}`);
        io.to(receiverSocketId).emit("newMessage", formattedMessage);
      } else {
        console.log(`Receiver ${receiverId} is offline, message will be delivered when they connect`);
      }

      // Send confirmation back to sender
      console.log(`Sending confirmation to sender ${socket.user._id}`);
      socket.emit("messageSent", formattedMessage);
    } catch (error) {
      console.error("Error sending private message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Admin broadcast message
  socket.on("broadcastMessage", async (data) => {
    console.log(`broadcastMessage event received from ${socket.user._id}:`, data);
    
    try {
      // Only admin can broadcast messages
      if (socket.user.role !== "admin") {
        console.log(`Broadcast permission denied: ${socket.user._id} is not an admin`);
        socket.emit("error", { message: "Only admins can broadcast messages" });
        return;
      }

      const { content, targetRole } = data;
      
      if (!content) {
        console.log(`Missing content in broadcastMessage`);
        socket.emit("error", { message: "Content is required" });
        return;
      }

      console.log(`Admin broadcast to role: ${targetRole || 'all'}`);
      
      // Find all users of the target role (if specified), or all users if no role specified
      const query = targetRole ? { role: targetRole } : {};
      const users = await Users.find(query);
      console.log(`Found ${users.length} target users for broadcast`);

      // Save individual messages for each user
      const Messages = mongoose.model("Messages");
      const savedMessages = [];

      for (const user of users) {
        if (user._id.toString() !== socket.user._id.toString()) {
          console.log(`Creating broadcast message for user: ${user._id}`);
          
          const message = new Messages({
            sender: socket.user._id,
            receiver: user._id,
            content,
            isBroadcast: true
          });
          
          await message.save();
          savedMessages.push(message);
          console.log(`Broadcast message saved with ID: ${message._id}`);

          // Send to online user
          const receiverSocketId = onlineUsers.get(user._id.toString());
          if (receiverSocketId) {
            console.log(`User ${user._id} is online, sending broadcast message to socket: ${receiverSocketId}`);
            io.to(receiverSocketId).emit("newMessage", {
              _id: message._id,
              content: message.content,
              sender: {
                _id: socket.user._id,
                first_name: socket.user.first_name,
                last_name: socket.user.last_name,
                profile_pic: socket.user.profile_pic
              },
              isBroadcast: true,
              timestamp: message.timestamp
            });
          } else {
            console.log(`User ${user._id} is offline, broadcast message will be delivered when they connect`);
          }
        }
      }

      console.log(`Broadcast complete, sent to ${savedMessages.length} users`);
      socket.emit("broadcastSent", { count: savedMessages.length });
    } catch (error) {
      console.error("Error broadcasting message:", error);
      socket.emit("error", { message: "Failed to broadcast message" });
    }
  });

  // Mark messages as read
  socket.on("markAsRead", async (data) => {
    console.log(`markAsRead event received from ${socket.user._id}:`, data);
    
    try {
      const { messageId } = data;
      
      const Messages = mongoose.model("Messages");
      const message = await Messages.findById(messageId);
      
      if (!message) {
        console.log(`Message not found: ${messageId}`);
        socket.emit("error", { message: "Message not found" });
        return;
      }

      // Check if the user is the receiver of the message
      if (message.receiver.toString() !== socket.user._id.toString()) {
        console.log(`Permission denied: ${socket.user._id} is not the receiver of message ${messageId}`);
        socket.emit("error", { message: "You can only mark your own messages as read" });
        return;
      }

      console.log(`Marking message ${messageId} as read`);
      message.read = true;
      await message.save();

      // Notify sender that message was read
      const senderSocketId = onlineUsers.get(message.sender.toString());
      if (senderSocketId) {
        console.log(`Sender ${message.sender} is online, notifying of read status`);
        io.to(senderSocketId).emit("messageRead", { messageId });
      } else {
        console.log(`Sender ${message.sender} is offline, read notification will be missed`);
      }

      console.log(`Confirming marked as read to user ${socket.user._id}`);
      socket.emit("markedAsRead", { messageId });
    } catch (error) {
      console.error("Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  });

  // Typing indicator events
  socket.on("typing", (data) => {
    console.log(`typing event received from ${socket.user._id}:`, data);
    
    const { receiverId } = data;
    
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      console.log(`Sending typing indicator to ${receiverId} (socket: ${receiverSocketId})`);
      io.to(receiverSocketId).emit("userTyping", {
        userId: socket.user._id,
        typing: true
      });
    } else {
      console.log(`Receiver ${receiverId} is offline, typing indicator not sent`);
    }
  });

  socket.on("stopTyping", (data) => {
    console.log(`stopTyping event received from ${socket.user._id}:`, data);
    
    const { receiverId } = data;
    
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      console.log(`Sending stop typing indicator to ${receiverId} (socket: ${receiverSocketId})`);
      io.to(receiverSocketId).emit("userTyping", {
        userId: socket.user._id,
        typing: false
      });
    } else {
      console.log(`Receiver ${receiverId} is offline, stop typing indicator not sent`);
    }
  });
};

module.exports = messageHandlers;