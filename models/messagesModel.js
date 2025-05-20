const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster querying of conversations
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, read: 1 });

const Messages = mongoose.model("Messages", messageSchema);
module.exports = Messages;