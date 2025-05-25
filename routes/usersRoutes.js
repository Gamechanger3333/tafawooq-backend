const express = require("express");
const router = express.Router();
const userController = require("../controllers/usersController");
const auth = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/authorize');
const { uploadOnMulter } = require("../middlewares/multerMiddleware.js");

router.post("/register", userController.registerUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.loginUser);

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
