const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password_hash: {
    type: String,
    required: true
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['guest','student', 'tutor', 'admin', 'parent'],
    default: 'student'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  auth_provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  }
});

const Users = mongoose.model("Users", userSchema);
module.exports = Users;