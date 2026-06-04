const Countries = require('../models/countriesModel');

// ================= CREATE SINGLE COUNTRY =================
const createCountry = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    const existing = await Countries.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: `Country with code "${code}" already exists` });
    }

    const country = new Countries({ name: name.trim(), code: code.toUpperCase().trim() });
    await country.save();

    res.status(201).json(country);
  } catch (error) {
    console.error('[createCountry] Error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// ================= CREATE BULK COUNTRIES =================
const createAllCountries = async (req, res) => {
  try {
    const countries = req.body;

    if (!Array.isArray(countries) || countries.length === 0) {
      return res.status(400).json({ message: 'Request body must be a non-empty array of countries' });
    }

    // Normalize codes to uppercase
    const normalized = countries.map(c => ({
      name: c.name?.trim(),
      code: c.code?.toUpperCase().trim()
    }));

    const result = await Countries.insertMany(normalized, { ordered: false });

    res.status(201).json({
      message: `Successfully created ${result.length} countries`,
      countries: result
    });
  } catch (error) {
    // Handle duplicate key errors (code: 11000)
    if (error.code === 11000) {
      const duplicateErrors = error.writeErrors || [];
      const successCount = error.result?.insertedCount || 0;

      return res.status(207).json({
        message: 'Bulk insert completed with some duplicates',
        successCount,
        duplicateCount: duplicateErrors.length,
        duplicates: duplicateErrors.map(err => err.op)
      });
    }

    console.error('[createAllCountries] Error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// ================= GET ALL COUNTRIES =================
const getAllCountries = async (req, res) => {
  try {
    const countries = await Countries.find().sort({ name: 1 }); // alphabetical order
    res.status(200).json(countries);
  } catch (error) {
    console.error('[getAllCountries] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ================= GET COUNTRY BY ID =================
const getCountryById = async (req, res) => {
  try {
    const country = await Countries.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (error) {
    console.error('[getCountryById] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE COUNTRY =================
const updateCountry = async (req, res) => {
  try {
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name.trim();
    if (req.body.code) updateData.code = req.body.code.toUpperCase().trim();

    const country = await Countries.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }

    res.status(200).json(country);
  } catch (error) {
    console.error('[updateCountry] Error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// ================= DELETE COUNTRY =================
const deleteCountry = async (req, res) => {
  try {
    const country = await Countries.findByIdAndDelete(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('[deleteCountry] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCountry,
  createAllCountries,
  getAllCountries,
  getCountryById,
  updateCountry,
  deleteCountry
};