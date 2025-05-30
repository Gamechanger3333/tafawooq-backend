const Countries = require('../models/countriesModel');

const createCountry = async (req, res) => {
  try {
    const country = new Countries(req.body);
    await country.save();
    res.status(201).json(country);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createAllCountries = async (req, res) => {
  try {
    const countries = req.body;
    
    if (!Array.isArray(countries)) {
      return res.status(400).json({ message: 'Request body must be an array of countries' });
    }

    const createdCountries = await Countries.insertMany(countries, { 
      ordered: false
    });
    
    res.status(201).json({
      message: `Successfully created ${createdCountries.length} countries`,
      countries: createdCountries
    });
  } catch (error) {

    if (error.code === 11000) {
      const duplicateErrors = error.writeErrors || [];
      const successCount = error.result ? error.result.insertedCount : 0;
      
      res.status(207).json({
        message: `Bulk insert completed with some duplicates`,
        successCount: successCount,
        duplicateCount: duplicateErrors.length,
        duplicates: duplicateErrors.map(err => err.op)
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

const getAllCountries = async (req, res) => {
  try {
    const countries = await Countries.find();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCountryById = async (req, res) => {
  try {
    const country = await Countries.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCountry = async (req, res) => {
  try {
    const country = await Countries.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const country = await Countries.findByIdAndDelete(
      req.params.id
    );
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCountry, createAllCountries, getAllCountries, getCountryById, updateCountry, deleteCountry };
