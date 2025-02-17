const express = require('express');
const sessionController = require('../controllers/sessionsController');

const router = express.Router();

router.post('/', sessionController.createSession);
router.get('/', sessionController.getAllSessions);
router.get('/:id', sessionController.getSessionById);
router.put('/:id', sessionController.updateSession);

module.exports = router;
