const express = require("express");
const sessionController = require("../controllers/sessionController");
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Session management routes
router.post("/", authMiddleware, sessionController.createSession);
router.get("/user/:role/:userId", authMiddleware, sessionController.getUserSessions);
router.get("/:sessionId", authMiddleware, sessionController.getSessionById);
router.patch("/status/:sessionId", authMiddleware, sessionController.updateSessionStatus);
router.get("/tutor/:tutorId/approved", authMiddleware, sessionController.getTutorApprovedSessions);
router.get("/student/:studentId/approved", authMiddleware, sessionController.getStudentApprovedSessions);

// Teacher booking routes
router.get("/teachers/search", authMiddleware, sessionController.getTeachersForBooking);
router.get("/teacher/:teacherId/availability", authMiddleware, sessionController.getTeacherAvailability);

// Favorites routes
router.post("/favorites/add", authMiddleware, sessionController.addTeacherToFavorites);
router.post("/favorites/remove", authMiddleware, sessionController.removeTeacherFromFavorites);

// Dashboard route
router.get("/dashboard/student/:studentId", authMiddleware, sessionController.getStudentDashboard);

module.exports = router;