const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  program_subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProgramSubject",
    required: true
  },
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price_per_hour: {
    type: Number,
    required: true
  },
  is_free_trial: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const Courses = mongoose.model("Courses", courseSchema);
module.exports = Courses;