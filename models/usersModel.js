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
  isVerified: {
    type: Boolean, 
    default: false
  },
  otp: {
    type: String
  },
  otpExpiresAt: {
    type: Date
  },
  resetToken: {
    type: String
  },
  resetTokenExpiresAt: {
    type: Date
  },
  lastOtpRequestTime: {
    type: Date,
    default: null
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
    enum: ['guest', 'student', 'tutor', 'admin', 'parent'],
    default: 'student'
  },
  
  // Teacher-specific fields
  teacherProfile: {
    description: {
      type: String,
      maxlength: 2000
    },
    experience: {
      type: Number, // years of experience
      min: 0
    },
    education: [{
      degree: String,
      institution: String,
      year: Number
    }],
    certifications: [String],
    specializations: [String],
    hourlyRate: {
      type: Number,
      min: 0
    },
    availability: [{
      dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      startTime: String, // "09:00"
      endTime: String    // "17:00"
    }],
    sessionTypes: [{
      type: String,
      enum: ['one-on-one', 'group', 'workshop']
    }],
    // Courses the teacher offers in sessions (separate from main courses)
    sessionCourses: [{
      courseName: String,
      field: String,
      description: String,
      duration: Number, // typical session duration in minutes
      price: Number
    }],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },
    totalSessions: {
      type: Number,
      default: 0
    }
  },

  // Student-specific fields
  studentProfile: {
    favoriteTeachers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    }],
    interests: [String],
    learningGoals: [String]
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
  last_login: {
    type: Date,
    default: null
  },
  auth_provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// Index for searching teachers
userSchema.index({ 
  role: 1, 
  'teacherProfile.specializations': 1,
  'teacherProfile.rating.average': -1 
});

// Only return active users
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

const Users = mongoose.model("Users", userSchema);
module.exports = Users;