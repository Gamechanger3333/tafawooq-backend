const express = require("express");
const router = express.Router();
const courseController = require("../controllers/coursesController");
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

router.post("/", authMiddleware, authorize('tutor', 'admin'), courseController.createCourse);
router.get("/", authMiddleware, courseController.getAllCourses);
router.get("/:id", authMiddleware, courseController.getCourseById);
router.put("/:id", authMiddleware, authorize('tutor', 'admin'), courseController.updateCourse);
router.delete("/:id", authMiddleware, authorize('tutor', 'admin'), courseController.deleteCourse);
router.post("/:courseId/content", authMiddleware, authorize('tutor', 'admin'), courseController.addContentToCourse);
router.post("/:courseId/content/:contentId/topic", authMiddleware, authorize('tutor', 'admin'), courseController.addTopicToContent);

module.exports = router;
