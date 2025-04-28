const Meeting = require('../models/meetingModel');
const { v4: uuidv4 } = require('uuid');

// Base URL for Jitsi Meet
const JITSI_BASE_URL = process.env.JITSI_BASE_URL || 'meet.jit.si';

exports.createMeeting = async (req, res) => {
  try {
    const { title, password } = req.body;
    const hostId = req.user._id; // Assuming you have authentication middleware
    
    // Create a unique meeting ID
    const meetingId = uuidv4();
    
    // Generate meeting link
    const meetingLink = `https://${JITSI_BASE_URL}/${meetingId}`;
    
    // Create a new meeting in the database
    const meeting = new Meeting({
      title: title || 'Untitled Meeting',
      meetingId,
      password: password || null,
      meetingLink,
      hostId
    });
    
    await meeting.save();
    
    return res.status(201).json({
      success: true,
      data: {
        _id: meeting._id,
        title: meeting.title,
        meetingId: meeting.meetingId,
        meetingLink: meeting.meetingLink,
        password: meeting.password,
        createdAt: meeting.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      error: error.message
    });
  }
};

exports.getAllMeetings = async (req, res) => {
  try {
    const hostId = req.user._id; // Get the host ID from authenticated user
    
    // Fetch all meetings for this host
    const meetings = await Meeting.find({ hostId })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .select('title meetingId meetingLink password createdAt isActive');
    
    return res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch meetings',
      error: error.message
    });
  }
};

exports.getActiveMeetings = async (req, res) => {
  try {
    const hostId = req.user._id; // Get the host ID from authenticated user
    
    // Fetch only active meetings for this host
    const meetings = await Meeting.find({ 
      hostId,
      isActive: true 
    })
    .sort({ createdAt: -1 })
    .select('title meetingId meetingLink password createdAt');
    
    return res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    console.error('Error fetching active meetings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active meetings',
      error: error.message
    });
  }
};