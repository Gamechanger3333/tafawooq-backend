const express = require("express");
const router = express.Router();
const programSubjectController = require("../controllers/progSubController");

router.post("/", programSubjectController.createProgramSubject);
router.get("/", programSubjectController.getAllProgramSubjects);
router.get("/program/:programId", programSubjectController.getProgramSubjectsByProgram);
router.get("/subject/:subjectId", programSubjectController.getProgramSubjectsBySubject);
router.get("/:id", programSubjectController.getProgramSubjectById);
router.put("/:id", programSubjectController.updateProgramSubject);
router.delete("/:id", programSubjectController.deleteProgramSubject);

module.exports = router;
