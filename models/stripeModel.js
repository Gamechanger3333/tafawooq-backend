const mongoose = require("mongoose");

const stripeSchema = new mongoose.Schema({
  charge: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Users',
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Courses'
  },
  chargeFor: {
    type: String,
    enum: ['orderCharge', 'appCharge', 'HardwareCharge'],
    default: 'orderCharge'
  },
  plan: {
    type: String
  },
  amount: {
    type: Number
  },
  status: {
    type: String,
    enum: ['succeeded', 'pending', 'failed'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String
  }
}, {timestamps: true});

const stripemodel = mongoose.model("Stripe", stripeSchema);

module.exports = { stripemodel };