const express = require("express");
const router = express.Router();
const programSubjectController = require("../controllers/progSubController");
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

// Reference data (program-subject links) — reads are public, writes are
// admin-only (previously had no auth check at all).
router.post("/", auth, authorize('admin'), programSubjectController.createProgramSubject);
router.get("/", programSubjectController.getAllProgramSubjects);
router.get("/program/:programId", programSubjectController.getProgramSubjectsByProgram);
router.get("/subject/:subjectId", programSubjectController.getProgramSubjectsBySubject);
router.get("/:id", programSubjectController.getProgramSubjectById);
router.put("/:id", auth, authorize('admin'), programSubjectController.updateProgramSubject);
router.delete("/:id", auth, authorize('admin'), programSubjectController.deleteProgramSubject);

module.exports = router;
