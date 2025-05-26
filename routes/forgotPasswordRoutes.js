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


router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordController.forgotPassword);
router.post("/verify-reset-otp", forgotPasswordController.verifyResetOTP);
router.post("/reset-password", forgotPasswordController.resetPassword);
router.post("/resend-reset-otp", forgotPasswordController.resendResetOTP);


module.exports = router;
