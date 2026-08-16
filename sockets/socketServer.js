// src/socket/socketServer.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const Messages = require("../models/messagesModel");
const Users = require("../models/usersModel");

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  console.log('[SOCKET AUTH] Authentication attempt with token:', token ? 'Token provided' : 'No token');

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    // Verify JWT token using the same secret as your API
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Extract userId from the decoded token
    // Matching with your auth middleware which uses decoded.userId
    const userId = decoded.userId;
    
    if (!userId) {
      console.error('[SOCKET AUTH] No userId found in token payload:', decoded);
      return next(new Error('Invalid token structure'));
    }
    
    console.log(`[SOCKET AUTH] User authenticated: ${userId}`);
    
    // Set user info on socket for later use
    socket.user = {
      id: userId,      // Add this for consistency with existing code
      userId: userId,  // Add this as fallback
      roles: decoded.roles || []
    };
    
    next();
  } catch (error) {
    console.error('[SOCKET AUTH] Authentication failed:', error.message);
    next(new Error('Authentication failed'));
  }
};

const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://tafawoq-frontend-opal.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', (socket) => {
    // Get user ID from socket.user, set in the authentication middleware
    const userId = socket.user?.id;
    
    if (!userId) {
      console.error('[SOCKET] Connection missing user ID');
      socket.disconnect();
      return;
    }
    
    console.log(`[SOCKET] User connected: ${userId}`);
    
    // Add user to their own room for personalized messages
    socket.join(userId);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${userId}`);
    });

    // SOCKET HANDLERS
    
    // Get conversations
    socket.on('conversations:get', async (_, callback) => {
      try {
        console.log(`[SOCKET] Fetching conversations for user: ${userId}`);
        
        // Get all conversations for the user
        const messages = await Messages.aggregate([
          {
            $match: {
              $or: [
                { sender: new Types.ObjectId(userId) },
                { receiver: new Types.ObjectId(userId) }
              ]
            }
          },
          {
            $sort: { timestamp: -1 }
          },
          {
            $group: {
              _id: {
                $cond: [
                  { $eq: ['$sender', new Types.ObjectId(userId)] },
                  '$receiver',
                  '$sender'
                ]
              },
              lastMessage: { $first: '$$ROOT' },
              unreadCount: {
                $sum: {
                  $cond: [
                    { $and: [
                      { $eq: ['$receiver', new Types.ObjectId(userId)] },
                      { $eq: ['$read', false] }
                    ]},
                    1,
                    0
                  ]
                }
              }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $project: {
              _id: 0,
              user: {
                _id: '$user._id',
                first_name: '$user.first_name',
                last_name: '$user.last_name',
                active: '$user.active',
                email: '$user.email',
                profile_pic: '$user.profile_pic',
                role: '$user.role'
              },
              lastMessage: 1,
              unreadCount: 1
            }
          }
        ]);

        // Fully populate the lastMessage sender and receiver
        const populatedConversations = await Promise.all(messages.map(async (conversation) => {
          const lastMessage = conversation.lastMessage;
          
          const [senderUser, receiverUser] = await Promise.all([
            Users.findById(lastMessage.sender).select('_id first_name last_name email profile_pic role active'),
            Users.findById(lastMessage.receiver).select('_id first_name last_name email profile_pic role active')
          ]);
          
          lastMessage.sender = senderUser;
          lastMessage.receiver = receiverUser;
          
          return conversation;
        }));

        console.log(`[SOCKET] Returning ${populatedConversations.length} conversations for user: ${userId}`);
        callback(populatedConversations);
      } catch (error) {
        console.error('[SOCKET] Error fetching conversations:', error);
        callback({ error: 'Failed to fetch conversations' });
      }
    });

    // Get messages for a specific conversation
    socket.on('messages:get', async ({ userId: partnerId }, callback) => {
      try {
        console.log(`[SOCKET] Fetching messages between ${userId} and ${partnerId}`);
        
        if (!Types.ObjectId.isValid(partnerId)) {
          return callback({ error: 'Invalid user ID' });
        }

        // Get messages between the current user and the specified partner
        const messages = await Messages.find({
          $or: [
            { sender: userId, receiver: partnerId },
            { sender: partnerId, receiver: userId }
          ]
        })
        .sort({ timestamp: 1 })
        .populate('sender', '_id first_name last_name email profile_pic role active')
        .populate('receiver', '_id first_name last_name email profile_pic role active');

        // Mark all unread messages as read
        await Messages.updateMany(
          { 
            sender: partnerId, 
            receiver: userId, 
            read: false 
          },
          { read: true }
        );

        console.log(`[SOCKET] Returning ${messages.length} messages for conversation with ${partnerId}`);
        callback(messages);
      } catch (error) {
        console.error('[SOCKET] Error fetching messages:', error);
        callback({ error: 'Failed to fetch messages' });
      }
    });

    // Send a new message
    socket.on('message:send', async ({ receiverId, content }, callback) => {
      try {
        console.log(`[SOCKET] Sending message from ${userId} to ${receiverId}: ${content.substring(0, 20)}...`);
        
        if (!Types.ObjectId.isValid(receiverId)) {
          return callback({ error: 'Invalid receiver ID' });
        }

        if (!content || content.trim() === '') {
          return callback({ error: 'Message content cannot be empty' });
        }

        // Create new message
        const newMessage = new Messages({
          sender: userId,
          receiver: receiverId,
          content,
          read: false,
          timestamp: new Date()
        });

        await newMessage.save();

        // Populate sender and receiver for the response
        const populatedMessage = await Messages.findById(newMessage._id)
          .populate('sender', '_id first_name last_name email profile_pic role active')
          .populate('receiver', '_id first_name last_name email profile_pic role active');

        // Emit to both sender and receiver
        io.to(userId).emit('message:new', populatedMessage);
        io.to(receiverId).emit('message:new', populatedMessage);
        
        // Let both users know conversations were updated
        io.to(userId).emit('conversation:updated');
        io.to(receiverId).emit('conversation:updated');

        console.log(`[SOCKET] Message sent successfully: ${newMessage._id}`);
        callback(populatedMessage);
      } catch (error) {
        console.error('[SOCKET] Error sending message:', error);
        callback({ error: 'Failed to send message' });
      }
    });

    // Broadcast a message to multiple recipients
    socket.on('message:broadcast', async ({ content, role }, callback) => {
      try {
        console.log(`[SOCKET] Broadcasting message from ${userId} to role ${role || 'all'}: ${content.substring(0, 20)}...`);
        
        if (!content || content.trim() === '') {
          return callback({ error: 'Message content cannot be empty' });
        }

        // Find receivers based on role (if provided) or all users except sender
        const query = role 
          ? { role, _id: { $ne: userId } }
          : { _id: { $ne: userId } };
          
        const receivers = await Users.find(query).select('_id');
        
        if (receivers.length === 0) {
          return callback({ error: 'No recipients found' });
        }

        // Create and save messages for each receiver
        const messages = receivers.map(receiver => ({
          sender: userId,
          receiver: receiver._id,
          content,
          read: false,
          timestamp: new Date()
        }));

        const savedMessages = await Messages.insertMany(messages);

        // Emit notifications to all receivers
        for (const msg of savedMessages) {
          const populatedMessage = await Messages.findById(msg._id)
            .populate('sender', '_id first_name last_name email profile_pic role active')
            .populate('receiver', '_id first_name last_name email profile_pic role active');
            
          io.to(msg.receiver.toString()).emit('message:new', populatedMessage);
          io.to(msg.receiver.toString()).emit('conversation:updated');
        }

        // Notify the sender too
        io.to(userId).emit('conversation:updated');

        console.log(`[SOCKET] Broadcast sent to ${receivers.length} recipients`);
        callback({ success: true, message: 'Broadcast sent successfully' });
      } catch (error) {
        console.error('[SOCKET] Error broadcasting message:', error);
        callback({ error: 'Failed to broadcast message' });
      }
    });

    // Get unread message count
    socket.on('messages:unread:count', async (_, callback) => {
      try {
        const count = await Messages.countDocuments({
          receiver: userId,
          read: false
        });

        console.log(`[SOCKET] Unread message count for ${userId}: ${count}`);
        callback({ count });
      } catch (error) {
        console.error('[SOCKET] Error getting unread count:', error);
        callback({ error: 'Failed to get unread message count' });
      }
    });

    // Delete a message
    socket.on('message:delete', async ({ messageId }, callback) => {
      try {
        console.log(`[SOCKET] Deleting message ${messageId} by user ${userId}`);
        
        if (!Types.ObjectId.isValid(messageId)) {
          return callback({ error: 'Invalid message ID' });
        }

        // Find the message to get sender and receiver before deletion
        const message = await Messages.findById(messageId);
        
        if (!message) {
          return callback({ error: 'Message not found' });
        }

        // Check if user is authorized to delete
        if (message.sender.toString() !== userId) {
          return callback({ error: 'Unauthorized to delete this message' });
        }

        // Delete the message
        await Messages.findByIdAndDelete(messageId);

        // Notify both users
        const receiverId = message.receiver.toString();
        
        io.to(userId).emit('message:deleted', { messageId });
        io.to(receiverId).emit('message:deleted', { messageId });
        
        // Update conversations list for both users
        io.to(userId).emit('conversation:updated');
        io.to(receiverId).emit('conversation:updated');

        console.log(`[SOCKET] Message ${messageId} deleted successfully`);
        callback({ success: true, message: 'Message deleted successfully' });
      } catch (error) {
        console.error('[SOCKET] Error deleting message:', error);
        callback({ error: 'Failed to delete message' });
      }
    });

    // Typing indicators — purely ephemeral, no DB writes. We just relay a
    // "so-and-so is typing" ping to the other participant's personal room
    // (the same room `message:send` delivers into), and let the client
    // debounce/expire it locally.
    socket.on('typing:start', ({ receiverId }) => {
      if (!receiverId || !Types.ObjectId.isValid(receiverId)) return;

      socket.to(receiverId).emit('typing:update', { userId, isTyping: true });
    });

    socket.on('typing:stop', ({ receiverId }) => {
      if (!receiverId || !Types.ObjectId.isValid(receiverId)) return;

      socket.to(receiverId).emit('typing:update', { userId, isTyping: false });
    });

    // Mark a message as read
    socket.on('message:read', async ({ messageId }) => {
      try {
        console.log(`[SOCKET] Marking message ${messageId} as read by user ${userId}`);
        
        if (!Types.ObjectId.isValid(messageId)) {
          return;
        }

        // Update the message read status
        const message = await Messages.findById(messageId);
        
        if (!message || message.receiver.toString() !== userId) {
          return;
        }
        
        if (!message.read) {
          message.read = true;
          await message.save();
          
          // Notify the sender that the message was read
          io.to(message.sender.toString()).emit('conversation:updated');
          console.log(`[SOCKET] Message ${messageId} marked as read`);
        }
      } catch (error) {
        console.error('[SOCKET] Error marking message as read:', error);
      }
    });
  });

  return io;
};

module.exports = { initializeSocketServer };