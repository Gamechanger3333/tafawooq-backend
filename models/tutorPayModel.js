const mongoose = require("mongoose");

const tutorPayoutSchema = new mongoose.Schema({
  tutor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: "EUR"
  },
  payout_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  batch_id: {
    type: String,
    required: true
  }
});

const TutorPayouts = mongoose.model("TutorPayouts", tutorPayoutSchema);
module.exports = TutorPayouts;