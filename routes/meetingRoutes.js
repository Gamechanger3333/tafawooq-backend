
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { 
  createMeeting, 
  getAllMeetings,
  getActiveMeetings
} = require('../controllers/meetingController');

// Route to create a new meeting
router.post('/create', authMiddleware, createMeeting);

// Route to get all meetings for the authenticated user
router.get('/', authMiddleware, getAllMeetings);

// Route to get only active meetings
router.get('/active', authMiddleware, getActiveMeetings);

module.exports = router;