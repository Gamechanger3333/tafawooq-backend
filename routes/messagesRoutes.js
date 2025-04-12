const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messagesController");
const auth = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/authorize');

// Get conversations
router.get("/conversations", auth, messageController.getConversations);

// Get messages with a specific user
router.get("/:userId", auth, messageController.getMessages);

// Send a message (HTTP alternative to socket)
router.post("/", auth, messageController.sendMessage);

// Broadcast message to all users or users with specific role (admin only)
router.post("/broadcast", auth, authorize('admin'), messageController.broadcastMessage);

// Get unread message count
router.get("/unread/count", auth, messageController.getUnreadCount);

// Delete a message
router.delete("/:messageId", auth, messageController.deleteMessage);

module.exports = router;