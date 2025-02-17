const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    session_id: {
      type: String,
      required: true,
      unique: true
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    start_time: {
      type: Date,
      required: true
    },
    end_time: {
      type: Date,
      required: true
    },
    meeting_url: {
      type: String,
      required: true
    },
    recording_url: {
      type: String
    },
    status: {
      type: String,
      required: true
    }
  });
  
  module.exports = mongoose.model('Sessions', sessionSchema);