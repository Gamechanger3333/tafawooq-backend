const mongoose = require("mongoose");

const programSubjectSchema = new mongoose.Schema({
  program_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true
  },
  hourly_rate: {
    type: Number,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

const ProgramSubjects = mongoose.model("ProgramSubjects", programSubjectSchema);
module.exports = ProgramSubjects;