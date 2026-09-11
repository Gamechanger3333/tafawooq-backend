const express = require('express');
const programsController = require('../controllers/programsController');
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Reference data (education programs) — reads are public, writes are
// admin-only (previously had no auth check at all).
router.post('/', auth, authorize('admin'), programsController.createProgram);
router.get('/', programsController.getAllPrograms);
router.get('/country/:countryId', programsController.getProgramsByCountry);
router.get('/:id', programsController.getProgramById);
router.put('/:id', auth, authorize('admin'), programsController.updateProgram);
router.delete('/:id', auth, authorize('admin'), programsController.deleteProgram);

module.exports = router;
