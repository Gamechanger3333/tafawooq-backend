const express = require("express");
const studentProgressController = require("../controllers/studProgController");

const router = express.Router();

router.post("/", studentProgressController.createStudentProgress);
router.get("/", studentProgressController.getAllStudentProgress);
router.get("/student/:studentId", studentProgressController.getStudentProgressByStudent);
router.get("/course/:courseId", studentProgressController.getStudentProgressByCourse);
router.put("/:id", studentProgressController.updateStudentProgress);

module.exports = router;
