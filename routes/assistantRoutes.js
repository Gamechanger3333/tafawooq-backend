const express = require('express');
const rateLimit = require('express-rate-limit');
const assistantController = require('../controllers/assistantController');
const auth = require('../middlewares/authMiddleware');

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

// Authenticated users get a per-account limit instead of per-IP, since
// several students behind the same NAT/campus network shouldn't share one
// quota, and this also protects the Groq budget from a compromised account.
const courseAiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: req => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a bit before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /assistant/chat → send a message, get the assistant's reply
router.post('/chat', assistantLimiter, assistantController.chat);

// POST /assistant/courses/:courseId/qa → AI Study Assistant Q&A
router.post('/courses/:courseId/qa', auth, courseAiLimiter, assistantController.courseQA);

// POST /assistant/courses/:courseId/generate → AI quiz/summary generation
router.post('/courses/:courseId/generate', auth, courseAiLimiter, assistantController.generateCourseContent);

module.exports = router;
