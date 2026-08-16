const express = require("express");
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require("../controllers/usersController");
const auth = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/authorize');
const { uploadOnMulter } = require("../middlewares/multerMiddleware.js");

// Auth endpoints are public and high-value targets for brute-force /
// credential-stuffing / OTP-spam / registration-flooding attacks, so they
// each get their own rate limit.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/register", authLimiter, userController.registerUser);
router.post("/verify-otp", otpLimiter, userController.verifyOtp);
router.post("/resend-otp", otpLimiter, userController.resendOtp);
router.post("/login", authLimiter, userController.loginUser);
router.post("/refresh-token", authLimiter, userController.refreshAccessToken);
router.post("/logout", userController.logoutUser);

// Protected routes (require authentication)
router.get("/", auth, authorize('admin'), userController.getAllUsers);
router.get("/tutors-from-courses", auth, userController.getTutorIdsFromPurchasedCourses);
router.get("/search", auth, userController.searchUsers);
router.get("/:id", auth, userController.getUserById);
router.put("/:id", auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);
router.post("/change-profile-pic", auth, uploadOnMulter.single("profile_pic"), userController.changeProfilePic);
router.patch("/change-profile-pic", auth, uploadOnMulter.single("profile_pic"), userController.changeProfilePic);
router.patch('/:id/password', auth, userController.updatePassword);
router.get('/:tutorId/students', auth, authorize('tutor', 'admin'), userController.getTutorStudents);

module.exports = router;
