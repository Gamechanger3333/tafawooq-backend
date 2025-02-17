const express = require('express');
const assessmentController = require('../controllers/assessController');

const router = express.Router();

router.post('/', assessmentController.createAssessment);
router.get('/', assessmentController.getAllAssessments);
router.get('/:id', assessmentController.getAssessmentById);
router.put('/:id', assessmentController.updateAssessment);

module.exports = router;
