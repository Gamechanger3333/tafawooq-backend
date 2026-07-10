const express = require('express');
const rateLimit = require('express-rate-limit');
const statsController = require('../controllers/statsController');

const router = express.Router();

// Public endpoint, so a light rate limit keeps it from being hammered.
const statsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

// GET /stats/public → real, live counts used on the landing page
router.get('/public', statsLimiter, statsController.getPublicStats);

module.exports = router;
