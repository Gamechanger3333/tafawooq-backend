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
  profile_pic: {
    type: String,
    default: null
  },
  role: {
    type: String,
    required: true,
    enum: ['guest','student', 'tutor', 'admin', 'parent'],
    default: 'student'
  },
  stripe_account_id: {
    type: String,
    default: null
  },
  stripe_refresh_token: {
    type: String
  },
  stripe_access_token: {
    type: String
  },
  stripeCustomerId: {
    type: String
  },
  cardInfo: [{
    paymentMethodId: String,
    cardName: String,
    cardNumber: String,
    expiryDate: String,
    cardType: String,
    country: String,
    funding: String,
    primary: {
      type: Boolean,
      default: false
    }
  }],
  purchasedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courses'
  }],
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