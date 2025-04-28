const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Meeting'
  },
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    default: null
  },
  meetingLink: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;