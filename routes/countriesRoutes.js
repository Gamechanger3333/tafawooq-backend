const express = require('express');
const countriesController = require('../controllers/countriesController');

const router = express.Router();

// POST /countries        → create one country
router.post('/', countriesController.createCountry);

// POST /countries/bulk   → create many countries
router.post('/bulk', countriesController.createAllCountries);

// GET /countries         → get all countries
router.get('/', countriesController.getAllCountries);

// GET /countries/:id     → get country by id
router.get('/:id', countriesController.getCountryById);

// PUT /countries/:id     → update country
router.put('/:id', countriesController.updateCountry);

// DELETE /countries/:id  → delete country
router.delete('/:id', countriesController.deleteCountry);

module.exports = router;