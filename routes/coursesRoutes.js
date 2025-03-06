const express = require("express");
const router = express.Router();
const courseController = require("../controllers/coursesController");
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

router.post("/", authMiddleware, authorize('tutor'), courseController.createCourse);
router.get("/", authMiddleware, authorize('tutor'), courseController.getAllCourses);
router.get("/:id", authMiddleware, authorize('tutor'), courseController.getCourseById);
router.put("/:id", authMiddleware, authorize('tutor'), courseController.updateCourse);
router.delete("/:id", authMiddleware, authorize('tutor'), courseController.deleteCourse);
router.post("/:courseId/content", authMiddleware, authorize('tutor'), courseController.addContentToCourse);
router.post("/:courseId/content/:contentId/topic", authMiddleware, authorize('tutor'), courseController.addTopicToContent);

module.exports = router;
