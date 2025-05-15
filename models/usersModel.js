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
  // Stripe Connect account for tutors
  stripe_account_id: {
    type: String,
    default: null
  },
  stripe_account_status: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'pending'
  },
  stripe_refresh_token: {
    type: String
  },
  stripe_access_token: {
    type: String
  },
  // Stripe Customer ID for students making payments
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
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Countries',
    required: true 
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