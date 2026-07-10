const express = require('express');
const rateLimit = require('express-rate-limit');
const assistantController = require('../controllers/assistantController');

const router = express.Router();

// Landing-page visitors are unauthenticated, so this endpoint is rate limited
// per-IP to protect the Anthropic API budget from abuse.
const assistantLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 messages per IP per window
  message: {
    success: false,
    message: 'Too many messages sent. Please wait a bit before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /assistant/chat → send a message, get the assistant's reply
router.post('/chat', assistantLimiter, assistantController.chat);

module.exports = router;
