const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignmentController");
const authMiddleware = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
const { uploadOnMulter } = require('../middlewares/multerMiddleware');

// Create new assignment with multiple file fields
router.post(
  "/",
  authMiddleware,
  authorize('tutor', 'admin'),
  uploadOnMulter.fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  assignmentController.createAssignment
);

// Get all assignments for a course
router.get(
  "/course/:courseId",
  authMiddleware,
  assignmentController.getAssignmentsByCourse
);

// Get a single assignment
router.get(
  "/:id",
  authMiddleware,
  assignmentController.getAssignmentById
);

// Download assignment document
router.get(
  "/:id/download-document",
  authMiddleware,
  assignmentController.downloadAssignmentDocument
);

// Update an assignment
router.put(
  "/:id",
  authMiddleware,
  authorize('tutor', 'admin'),
  uploadOnMulter.fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  assignmentController.updateAssignment
);

// Delete an assignment
router.delete(
  "/:id",
  authMiddleware,
  authorize('tutor', 'admin'),
  assignmentController.deleteAssignment
);

module.exports = router;