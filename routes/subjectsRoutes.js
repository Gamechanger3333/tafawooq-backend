const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectsController");
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

// Reference data (subjects) — reads are public, writes are admin-only
// (previously had no auth check at all).
router.post("/", auth, authorize('admin'), subjectController.createSubject);
router.get("/", subjectController.getAllActiveSubjects);
router.get("/:id", subjectController.getSubjectById);
router.put("/:id", auth, authorize('admin'), subjectController.updateSubject);
router.delete("/:id", auth, authorize('admin'), subjectController.softDeleteSubject);

module.exports = router;
