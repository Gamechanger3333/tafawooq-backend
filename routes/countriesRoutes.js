const express = require('express');
const countriesController = require('../controllers/countriesController');
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

const router = express.Router();

// Reference data (countries) — reads are public, but create/update/delete
// were previously wide open to anyone on the internet with no auth at all.
// Only admins should be able to modify it.
// POST /countries        → create one country
router.post('/', auth, authorize('admin'), countriesController.createCountry);

// POST /countries/bulk   → create many countries
router.post('/bulk', auth, authorize('admin'), countriesController.createAllCountries);

// GET /countries         → get all countries
router.get('/', countriesController.getAllCountries);

// GET /countries/:id     → get country by id
router.get('/:id', countriesController.getCountryById);

// PUT /countries/:id     → update country
router.put('/:id', auth, authorize('admin'), countriesController.updateCountry);

// DELETE /countries/:id  → delete country
router.delete('/:id', auth, authorize('admin'), countriesController.deleteCountry);

module.exports = router;