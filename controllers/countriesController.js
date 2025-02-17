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

const getAllCountries = async (req, res) => {
  try {
    const countries = await Countries.find({ is_active: true });
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
    const country = await Countries.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCountry, getAllCountries, getCountryById, updateCountry, deleteCountry };
