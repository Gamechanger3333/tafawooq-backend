const express = require("express");
const router = express.Router();
const forgotPasswordController = require("../controllers/forgotPasswordController");
// Rate limiting middleware (optional but recommended)
const rateLimit = require('express-rate-limit');



const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// verify-reset-otp guards a 6-digit code (1M combinations) — without a limit
// here an attacker can brute-force it directly, bypassing the send-side
// limiter above entirely. resend-reset-otp needs the same limit so it can't
// be used to spam a victim's inbox.
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: {
        success: false,
        message: 'Too many attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});


router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordController.forgotPassword);
router.post("/verify-reset-otp", otpLimiter, forgotPasswordController.verifyResetOTP);
router.post("/reset-password", otpLimiter, forgotPasswordController.resetPassword);
router.post("/resend-reset-otp", forgotPasswordLimiter, forgotPasswordController.resendResetOTP);


module.exports = router;
