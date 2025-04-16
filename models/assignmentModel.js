const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses",
    required: [true, "Course ID is required"],
  },
  title: {
    type: String,
    required: [true, "Assignment title is required"],
    minlength: [3, "Assignment title must be at least 3 characters"],
  },
  dueDate: {
    type: Date,
    required: [true, "Due date is required"],
  },
  document: {
    type: String, // Path to the assignment document
    default: null,
  },
  documentName: {
    type: String,
    default: null,
  },
  documentType: {
    type: String, // MIME type of the document
    default: null,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: [true, "Creator ID is required"],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

// Update timestamp on document update
assignmentSchema.pre("findOneAndUpdate", function() {
  this.set({ updated_at: new Date() });
});

const Assignment = mongoose.model("Assignment", assignmentSchema);

module.exports = Assignment;