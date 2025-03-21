const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Countries',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  education_level: {
    type: String,
    required: true,
    enum: ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Programs', programSchema);