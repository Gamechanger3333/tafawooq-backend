const mongoose = require("mongoose");
const ProgramSubjects = require("./progSubModel");
const Users = require("./usersModel"); // Adjust path as needed

// Topic schema for nested content
const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  isCompleted: {
    type: Boolean,
    required: true
  }
});

// Content section schema
const contentSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  topics: {
    type: [topicSchema],
    required: true
  }
});

// Course details schema
const courseDetailsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  about: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  instructorAvatar: {
    type: String,
    required: true
  },
  instructorPosition: {
    type: String,
    required: true
  },
  skillLevel: {
    type: String,
    required: true
  },
  totalStudents: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  isCaptions: {
    type: Boolean,
    required: true
  },
  length: {
    type: String,
    required: true
  },
  totalLectures: {
    type: Number,
    required: true
  },
  description: {
    type: [String],
    required: true
  },
  content: {
    type: [contentSectionSchema],
    required: true
  }
});

// Main Course schema
const courseSchema = new mongoose.Schema({
  // Keep the relationship fields
  program_subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProgramSubjects",
    required: true
  },
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  
  // Add fields matching the exact structure from your fake DB
  id: {
    type: Number,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  tutorImg: {
    type: String,
    required: true
  },
  completedTasks: {
    type: Number,
    required: true
  },
  totalTasks: {
    type: Number,
    required: true
  },
  userCount: {
    type: Number,
    required: true
  },
  note: {
    type: Number,
    required: true
  },
  view: {
    type: Number,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  desc: {
    type: String,
    required: true
  },
  tags: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  ratingCount: {
    type: Number,
    required: true
  },
  
  // Course details as a nested object
  courseDetails: {
    type: courseDetailsSchema,
    required: true
  },
  
  // Standard flags
  is_active: {
    type: Boolean,
    default: true,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const Courses = mongoose.model("Courses", courseSchema);
module.exports = Courses;