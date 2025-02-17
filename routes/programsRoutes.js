const express = require('express');
const programsController = require('../controllers/programsController');

const router = express.Router();

router.post('/', programsController.createProgram);
router.get('/', programsController.getAllPrograms);
router.get('/country/:countryId', programsController.getProgramsByCountry);
router.get('/:id', programsController.getProgramById);
router.put('/:id', programsController.updateProgram);
router.delete('/:id', programsController.deleteProgram);

module.exports = router;
