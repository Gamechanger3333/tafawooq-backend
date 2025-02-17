const Programs = require("../models/programsModel");

const createProgram = async (req, res) => {
  try {
    const program = new Programs(req.body);
    await program.save();
    res.status(201).json(program);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllPrograms = async (req, res) => {
  try {
    const programs = await Programs.find({ is_active: true }).populate("country_id", "name code");
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgramsByCountry = async (req, res) => {
  try {
    const programs = await Programs.find({
      country_id: req.params.countryId,
      is_active: true
    }).populate("country_id", "name code");
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgramById = async (req, res) => {
  try {
    const program = await Programs.findById(req.params.id).populate("country_id", "name code");
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProgram = async (req, res) => {
  try {
    const program = await Programs.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("country_id", "name code");
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.json(program);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteProgram = async (req, res) => {
  try {
    const program = await Programs.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.json({ message: "Program deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProgram, getAllPrograms, getProgramsByCountry, getProgramById, updateProgram, deleteProgram };
