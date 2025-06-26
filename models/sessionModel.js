const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Users", 
        required: true 
    },
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Users", 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    duration: { 
        type: Number, 
        required: true 
    }, // in minutes
    price: { 
        type: Number,
    },
    courseName: { 
        type: String,
        required: true 
    },
    message: { 
        type: String,
        maxlength: 500 
    },
    status: { 
        type: String, 
        enum: ["pending", "approved", "rejected", "completed", "cancelled"], 
        default: "pending" 
    },
    meetingLink: {
        type: String // For online sessions
    },
    notes: {
        type: String, // Teacher's notes about the session
        maxlength: 1000
    },
    cancellationReason: {
        type: String,
        maxlength: 500
    },
    reminderSent: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

// Add indexes for better query performance
sessionSchema.index({ teacherId: 1, date: 1 });
sessionSchema.index({ studentId: 1, date: 1 });
sessionSchema.index({ status: 1, date: 1 });

// Virtual for session end time
sessionSchema.virtual('endTime').get(function() {
    return new Date(this.date.getTime() + this.duration * 60000);
});

// Pre-save middleware to validate session time
sessionSchema.pre('save', function(next) {
    const now = new Date();
    if (this.date < now) {
        return next(new Error('Session date cannot be in the past'));
    }
    next();
});

const session =  mongoose.model("Session", sessionSchema);
module.exports = session;