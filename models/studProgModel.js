const mongoose = require("mongoose");

const studentProgressSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  completion_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
});

const StudentProgress = mongoose.model("StudentProgress", studentProgressSchema);
module.exports = StudentProgress;