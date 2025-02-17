const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectsController");

router.post("/", subjectController.createSubject);
router.get("/", subjectController.getAllActiveSubjects);
router.get("/:id", subjectController.getSubjectById);
router.put("/:id", subjectController.updateSubject);
router.delete("/:id", subjectController.softDeleteSubject);

module.exports = router;
