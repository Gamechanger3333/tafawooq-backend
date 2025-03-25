const express = require("express");
const router = express.Router();
const courseController = require("../controllers/coursesController");
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
  
router.post("/", authMiddleware, authorize('tutor', 'admin'), courseController.createCourse);
router.get("/", courseController.getAllCourses);
router.get("/:id", authMiddleware, courseController.getCourseById);
router.put("/:id", authMiddleware, authorize('tutor', 'admin'), courseController.updateCourse);
router.delete("/:id", authMiddleware, authorize('tutor', 'admin'), courseController.deleteCourse);
router.post("/:courseId/content", authMiddleware, authorize('tutor', 'admin'), courseController.addContentToCourse);
router.post("/:courseId/content/:contentId/topic", authMiddleware, authorize('tutor', 'admin'), courseController.addTopicToContent);

// New routes
router.get("/user/courses", authMiddleware, courseController.getUserSpecificCourses);
router.get("/country/:countryId", authMiddleware, courseController.getCoursesByCountry);
router.get("/education/:level", authMiddleware, courseController.getCoursesByEducationLevel);
router.get("/country/:countryId/education/:level", authMiddleware, courseController.getCoursesByCountryAndLevel);

module.exports = router;