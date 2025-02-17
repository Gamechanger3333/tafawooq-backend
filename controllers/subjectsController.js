const Subjects = require("../models/subjectsModel");

const createSubject = async (req, res) => {
  try {
    const subject = new Subjects(req.body);
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllActiveSubjects = async (req, res) => {
  try {
    const subjects = await Subjects.find({ is_active: true });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubjectById = async (req, res) => {
  try {
    const subject = await Subjects.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSubject = async (req, res) => {
  try {
    const subject = await Subjects.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const softDeleteSubject = async (req, res) => {
  try {
    const subject = await Subjects.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSubject, getAllActiveSubjects, getSubjectById, updateSubject, softDeleteSubject };
