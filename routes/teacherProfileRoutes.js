const express = require("express");
const teacherProfileController = require("../controllers/teacherProfileController");
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Teacher profile routes
router.get("/:teacherId", teacherProfileController.getTeacherProfile);
router.put("/:teacherId", authMiddleware, teacherProfileController.updateTeacherProfile);

// Session courses management
router.post("/:teacherId/session-courses", authMiddleware, teacherProfileController.addSessionCourse);
router.delete("/:teacherId/session-courses/:courseId", authMiddleware, teacherProfileController.removeSessionCourse);

// Availability management
router.put("/:teacherId/availability", authMiddleware, teacherProfileController.updateTeacherAvailability);

module.exports = router;