const mongoose = require("mongoose");
const courseDetailsSchema = require("./courseDetailsSchema"); 

// Main Course schema
const courseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: [true, "User ID is required"],
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Countries",
    required: [true, "Country is required"],
  },
  education_level: {
    type: String,
    required: [true, "Education level is required"],
    enum: ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL']
  },
  image: {
    type: String,
    required: [true, "Image URL is required"],
    match: [/^https?:\/\/.+/, "Invalid URL format"],
  },
  courseTitle: {
    type: String,
    required: [true, "Course title is required"],
    minlength: [5, "Course title must be at least 5 characters"],
  },
  desc: {
    type: String,
    required: [true, "Course description is required"],
    minlength: [10, "Description must be at least 10 characters"],
  },
  
  // Course details as a nested object
  courseDetails: {
    type: courseDetailsSchema,
    required: [true, "Course details are required"],
  },

  price: {
    type: Number,
    default: 0,
    min: [0, "Price cannot be negative"],
  },
  
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

// Create Course model
const Courses = mongoose.model("Courses", courseSchema);
module.exports = Courses;
