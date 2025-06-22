const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Users = require("../models/usersModel");
const sendOtp = require('../utils/sendOtp');

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for storage
const hashOTP = (otp) => {
    return bcrypt.hashSync(otp, 12);
};

// 1. Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        const user = await Users.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);

        // Set OTP expiry (10 minutes from now)
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Update user with OTP
        await Users.findByIdAndUpdate(user._id, {
            otp: hashedOTP,
            otpExpiresAt: otpExpiresAt
        });

        // Send OTP email
        await sendOtp(email, otp);

        res.status(200).json({
            success: true,
            message: 'Password reset OTP sent to your email',
            data: {
                email: email,
                expiresIn: '10 minutes'
            }
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reset code. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 2. Verify Reset OTP
const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validate input
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Find user
        const user = await Users.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if OTP exists and hasn't expired
        if (!user.otp || !user.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'No reset code found. Please request a new one.'
            });
        }

        if (user.otpExpiresAt < new Date()) {
            // Clear expired OTP
            await Users.findByIdAndUpdate(user._id, {
                $unset: { otp: 1, otpExpiresAt: 1 }
            });

            return res.status(400).json({
                success: false,
                message: 'Reset code has expired. Please request a new one.'
            });
        }

        // Verify OTP
        const isOTPValid = bcrypt.compareSync(otp, user.otp);
        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset code'
            });
        }

        // Generate a temporary reset token (valid for 15 minutes)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        // Update user with reset token and clear OTP
        await Users.findByIdAndUpdate(user._id, {
            resetToken: bcrypt.hashSync(resetToken, 12),
            resetTokenExpiresAt: resetTokenExpiry,
            $unset: { otp: 1, otpExpiresAt: 1 }
        });

        res.status(200).json({
            success: true,
            message: 'Reset code verified successfully',
            data: {
                email: email,
                resetToken: resetToken, // Send the plain token to frontend
                expiresIn: '15 minutes'
            }
        });

    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify reset code. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 3. Reset Password - FIXED VERSION
const resetPassword = async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body; // Changed from 'otp' to 'resetToken'

        // Validate input
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, reset token, and new password are required'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Find user
        const user = await Users.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if reset token exists and hasn't expired
        if (!user.resetToken || !user.resetTokenExpiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset session. Please start over.'
            });
        }

        if (user.resetTokenExpiresAt < new Date()) {
            // Clear expired reset token
            await Users.findByIdAndUpdate(user._id, {
                $unset: { resetToken: 1, resetTokenExpiresAt: 1 }
            });

            return res.status(400).json({
                success: false,
                message: 'Reset session has expired. Please start over.'
            });
        }

        // Verify reset token
        const isTokenValid = bcrypt.compareSync(resetToken, user.resetToken);
        if (!isTokenValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset token'
            });
        }

        // Hash new password
        const hashedPassword = bcrypt.hashSync(newPassword, 12);

        // Update user password and clear reset token
        await Users.findByIdAndUpdate(user._id, {
            password_hash: hashedPassword,
            $unset: {
                otp: 1,
                otpExpiresAt: 1,
                resetToken: 1,
                resetTokenExpiresAt: 1
            }
        });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 4. Resend Reset OTP
const resendResetOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        const user = await Users.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        const hashedOTP = hashOTP(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Update user with new OTP
        await Users.findByIdAndUpdate(user._id, {
            otp: hashedOTP,
            otpExpiresAt: otpExpiresAt,
            $unset: { resetToken: 1, resetTokenExpiresAt: 1 } // Clear any existing reset token
        });

        // Send OTP email
        await sendOtp(email, otp);

        res.status(200).json({
            success: true,
            message: 'New reset code sent to your email',
            data: {
                email: email,
                expiresIn: '10 minutes'
            }
        });

    } catch (error) {
        console.error('Resend reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend reset code. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    resendResetOTP
};