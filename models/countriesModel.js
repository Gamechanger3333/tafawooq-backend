const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      trim: true,
      uppercase: true,   // auto-converts to uppercase on save
      minlength: [2, 'Code must be at least 2 characters'],
      maxlength: [3, 'Code must be at most 3 characters']
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // cleaner than manual Date.now
  }
);

// Index for faster lookups by code
countrySchema.index({ code: 1 });
countrySchema.index({ name: 1 });

module.exports = mongoose.model('Countries', countrySchema);