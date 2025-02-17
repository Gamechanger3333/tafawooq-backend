const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Support = mongoose.model("Support", supportSchema);
module.exports = Support;