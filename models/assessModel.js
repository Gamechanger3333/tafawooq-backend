const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  assessment_id: {
      type: String,
      required: true,
      unique: true
    },
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  });
  
  module.exports = mongoose.model('Assessments', assessmentSchema);