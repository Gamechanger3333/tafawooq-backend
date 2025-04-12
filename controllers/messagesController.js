const Messages = require("../models/messagesModel");
const Users = require("../models/usersModel");
const mongoose = require("mongoose");

// Get conversations (list of users with whom the current user has exchanged messages)
const getConversations = async (req, res) => {
  console.log(`[getConversations] Retrieving conversations for user: ${req.user._id}`);
  try {
    const userId = req.user._id;

    // Find all messages where current user is either sender or receiver
    console.log(`[getConversations] Finding messages for user: ${userId}`);
    const messages = await Messages.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ timestamp: -1 });
    console.log(`[getConversations] Found ${messages.length} messages for user: ${userId}`);

    // Extract unique conversation partners
    const conversationPartners = new Map();
    console.log(`[getConversations] Extracting conversation partners from messages`);

    for (const message of messages) {
      const partnerId = message.sender.equals(userId) 
        ? message.receiver.toString() 
        : message.sender.toString();
      
      if (!conversationPartners.has(partnerId)) {
        console.log(`[getConversations] Adding new conversation partner: ${partnerId}`);
        conversationPartners.set(partnerId, {
          lastMessage: message,
          unreadCount: message.receiver.equals(userId) && !message.read ? 1 : 0
        });
      } else if (message.receiver.equals(userId) && !message.read) {
        const partner = conversationPartners.get(partnerId);
        partner.unreadCount += 1;
        console.log(`[getConversations] Updated unread count for partner ${partnerId}: ${partner.unreadCount}`);
      }
    }

    // Fetch user details for all conversation partners
    const partnerIds = Array.from(conversationPartners.keys());
    console.log(`[getConversations] Fetching user details for ${partnerIds.length} partners`);
    const partners = await Users.find({ _id: { $in: partnerIds } })
      .select('_id first_name last_name email profile_pic role');
    console.log(`[getConversations] Found ${partners.length} partner user details`);

    // Combine user details with conversation data
    console.log(`[getConversations] Combining user details with conversation data`);
    const conversations = partners.map(partner => {
      const convo = conversationPartners.get(partner._id.toString());
      return {
        user: partner,
        lastMessage: {
          _id: convo.lastMessage._id,
          content: convo.lastMessage.content,
          timestamp: convo.lastMessage.timestamp,
          sender: convo.lastMessage.sender,
          receiver: convo.lastMessage.receiver,
          read: convo.lastMessage.read
        },
        unreadCount: convo.unreadCount
      };
    });

    // Sort by latest message timestamp
    console.log(`[getConversations] Sorting conversations by timestamp`);
    conversations.sort((a, b) => 
      b.lastMessage.timestamp - a.lastMessage.timestamp
    );

    console.log(`[getConversations] Returning ${conversations.length} conversations`);
    res.json(conversations);
  } catch (error) {
    console.error("[getConversations] Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

// Get messages between current user and another user
const getMessages = async (req, res) => {
  console.log(`[getMessages] Retrieving messages between users ${req.user._id} and ${req.params.userId}`);
  try {
    const userId = req.user._id;
    const partnerId = req.params.userId;

    // Validate partnerId
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      console.log(`[getMessages] Invalid user ID: ${partnerId}`);
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if partner exists
    console.log(`[getMessages] Checking if partner user exists: ${partnerId}`);
    const partner = await Users.findById(partnerId);
    if (!partner) {
      console.log(`[getMessages] Partner user not found: ${partnerId}`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`[getMessages] Partner found: ${partner._id} (${partner.first_name} ${partner.last_name})`);

    // Get messages between users
    console.log(`[getMessages] Finding messages between ${userId} and ${partnerId}`);
    const messages = await Messages.find({
      $or: [
        { sender: userId, receiver: partnerId },
        { sender: partnerId, receiver: userId }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', '_id first_name last_name profile_pic')
    .populate('receiver', '_id first_name last_name profile_pic');
    console.log(`[getMessages] Found ${messages.length} messages`);

    // Mark unread messages as read
    const unreadMessages = messages.filter(
      msg => msg.receiver.equals(userId) && !msg.read
    );
    console.log(`[getMessages] Found ${unreadMessages.length} unread messages to mark as read`);

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(msg => msg._id);
      console.log(`[getMessages] Marking messages as read: ${messageIds.join(', ')}`);
      await Messages.updateMany(
        { _id: { $in: messageIds } },
        { $set: { read: true } }
      );
      console.log(`[getMessages] Successfully marked ${unreadMessages.length} messages as read`);
    }

    res.json(messages);
  } catch (error) {
    console.error("[getMessages] Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Send a message (REST API alternative to socket)
const sendMessage = async (req, res) => {
  console.log(`[sendMessage] Sending message from user: ${req.user._id}`);
  try {
    const senderId = req.user._id;
    const { receiverId, content } = req.body;
    console.log(`[sendMessage] Receiver: ${receiverId}, Content: ${content ? (content.length > 20 ? content.substring(0, 20) + '...' : content) : 'empty'}`);

    // Validate inputs
    if (!receiverId || !content) {
      console.log(`[sendMessage] Missing data: receiverId=${receiverId}, content=${!!content}`);
      return res.status(400).json({ message: "Receiver ID and content are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      console.log(`[sendMessage] Invalid receiver ID: ${receiverId}`);
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    // Check if receiver exists
    console.log(`[sendMessage] Checking if receiver exists: ${receiverId}`);
    const receiver = await Users.findById(receiverId);
    if (!receiver) {
      console.log(`[sendMessage] Receiver not found: ${receiverId}`);
      return res.status(404).json({ message: "Receiver not found" });
    }
    console.log(`[sendMessage] Receiver found: ${receiver._id} (${receiver.first_name} ${receiver.last_name})`);

    // Permission checks based on roles (same logic as in socket implementation)
    const senderRole = req.user.role;
    const receiverRole = receiver.role;
    console.log(`[sendMessage] Permission check: Sender role: ${senderRole}, Receiver role: ${receiverRole}`);
    
    let isAllowed = false;
    
    if (senderRole === "admin") {
      // Admin can message anyone
      isAllowed = true;
      console.log(`[sendMessage] Admin messaging permission granted`);
    } else if (senderRole === "tutor") {
      // Tutor can message students or admin
      isAllowed = receiverRole === "student" || receiverRole === "admin";
      console.log(`[sendMessage] Tutor messaging ${receiverRole}: permission=${isAllowed}`);
      
      // Additional check for students - tutor should only message their own students
      if (receiverRole === "student") {
        // This would require a relationship check in your database
        // For now, we'll assume it's allowed
        isAllowed = true;
        console.log(`[sendMessage] Assuming tutor can message this student`);
      }
    } else if (senderRole === "student") {
      // Student can message tutors or admin
      isAllowed = receiverRole === "tutor" || receiverRole === "admin";
      console.log(`[sendMessage] Student messaging ${receiverRole}: permission=${isAllowed}`);
      
      // Additional check for tutors - student should only message their own tutors
      if (receiverRole === "tutor") {
        // This would require a relationship check in your database
        // For now, we'll assume it's allowed
        isAllowed = true;
        console.log(`[sendMessage] Assuming student can message this tutor`);
      }
    }

    if (!isAllowed) {
      console.log(`[sendMessage] Permission denied: ${senderRole} cannot message ${receiverRole}`);
      return res.status(403).json({ message: "You are not allowed to message this user" });
    }

    // Create and save message
    console.log(`[sendMessage] Creating new message`);
    const message = new Messages({
      sender: senderId,
      receiver: receiverId,
      content
    });
    
    await message.save();
    console.log(`[sendMessage] Message saved with ID: ${message._id}`);

    // Populate sender and receiver info
    console.log(`[sendMessage] Populating sender and receiver info`);
    await message.populate('sender', '_id first_name last_name profile_pic');
    await message.populate('receiver', '_id first_name last_name profile_pic');

    console.log(`[sendMessage] Message sent successfully`);
    res.status(201).json(message);
  } catch (error) {
    console.error("[sendMessage] Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// Admin broadcast message (REST API alternative to socket)
const broadcastMessage = async (req, res) => {
  console.log(`[broadcastMessage] Broadcasting message from user: ${req.user._id} (${req.user.role})`);
  try {
    // Only admin can broadcast
    if (req.user.role !== "admin") {
      console.log(`[broadcastMessage] Permission denied: ${req.user.role} is not admin`);
      return res.status(403).json({ message: "Only admins can broadcast messages" });
    }

    const { content, targetRole } = req.body;
    console.log(`[broadcastMessage] Target role: ${targetRole || 'all'}, Content: ${content ? (content.length > 20 ? content.substring(0, 20) + '...' : content) : 'empty'}`);
    
    if (!content) {
      console.log(`[broadcastMessage] Missing content`);
      return res.status(400).json({ message: "Content is required" });
    }

    // Find target users
    console.log(`[broadcastMessage] Finding target users with role: ${targetRole || 'all'}`);
    const query = targetRole ? { role: targetRole } : {};
    const users = await Users.find(query).select('_id');
    console.log(`[broadcastMessage] Found ${users.length} target users`);

    // Save messages
    const messages = [];
    const senderId = req.user._id;

    console.log(`[broadcastMessage] Creating broadcast messages`);
    for (const user of users) {
      if (!user._id.equals(senderId)) {
        console.log(`[broadcastMessage] Creating message for user: ${user._id}`);
        const message = new Messages({
          sender: senderId,
          receiver: user._id,
          content,
          isBroadcast: true
        });
        
        await message.save();
        console.log(`[broadcastMessage] Message saved with ID: ${message._id}`);
        messages.push(message);
      }
    }

    console.log(`[broadcastMessage] Broadcast sent to ${messages.length} users`);
    res.status(201).json({
      message: "Broadcast sent successfully",
      count: messages.length
    });
  } catch (error) {
    console.error("[broadcastMessage] Error broadcasting message:", error);
    res.status(500).json({ message: "Failed to broadcast message" });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  console.log(`[getUnreadCount] Getting unread count for user: ${req.user._id}`);
  try {
    const userId = req.user._id;

    const count = await Messages.countDocuments({
      receiver: userId,
      read: false
    });
    console.log(`[getUnreadCount] User ${userId} has ${count} unread messages`);

    res.json({ count });
  } catch (error) {
    console.error("[getUnreadCount] Error getting unread count:", error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  console.log(`[deleteMessage] Deleting message ${req.params.messageId} by user: ${req.user._id}`);
  try {
    const userId = req.user._id;
    const messageId = req.params.messageId;

    // Find the message
    console.log(`[deleteMessage] Finding message: ${messageId}`);
    const message = await Messages.findById(messageId);
    
    if (!message) {
      console.log(`[deleteMessage] Message not found: ${messageId}`);
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender or admin can delete
    const isSender = message.sender.equals(userId);
    const isAdmin = req.user.role === "admin";
    console.log(`[deleteMessage] Checking delete permission: isSender=${isSender}, isAdmin=${isAdmin}`);
    
    if (!isSender && !isAdmin) {
      console.log(`[deleteMessage] Permission denied: User ${userId} cannot delete message ${messageId}`);
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    console.log(`[deleteMessage] Deleting message: ${messageId}`);
    await message.deleteOne();
    console.log(`[deleteMessage] Message ${messageId} deleted successfully`);
    
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("[deleteMessage] Error deleting message:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  broadcastMessage,
  getUnreadCount,
  deleteMessage
};