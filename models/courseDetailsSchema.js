const mongoose = require("mongoose");

// Course details schema
const courseDetailsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Course title is required"],
    minlength: [5, "Title must be at least 5 characters"],
  },
  about: {
    type: String,
    required: [true, "About section is required"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
});

module.exports = courseDetailsSchema;
