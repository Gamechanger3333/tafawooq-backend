const express = require('express');
const countriesController = require('../controllers/countriesController');

const router = express.Router();

router.post('/', countriesController.createCountry);
router.post('/bulk', countriesController.createAllCountries);
router.get('/', countriesController.getAllCountries);
router.get('/:id', countriesController.getCountryById);
router.put('/:id', countriesController.updateCountry);
router.delete('/:id', countriesController.deleteCountry);

module.exports = router;
