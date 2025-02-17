const ProgramSubjects = require("../models/progSubModel");

const createProgramSubject = async (req, res) => {
  try {
    const programSubject = new ProgramSubjects(req.body);
    await programSubject.save();
    res.status(201).json(programSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllProgramSubjects = async (req, res) => {
  try {
    const programSubjects = await ProgramSubjects.find({ is_active: true })
      .populate("program_id", "name description")
      .populate("subject_id", "name description");
    res.json(programSubjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgramSubjectsByProgram = async (req, res) => {
  try {
    const programSubjects = await ProgramSubjects.find({
      program_id: req.params.programId,
      is_active: true
    })
      .populate("program_id", "name description")
      .populate("subject_id", "name description");
    res.json(programSubjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgramSubjectsBySubject = async (req, res) => {
  try {
    const programSubjects = await ProgramSubjects.find({
      subject_id: req.params.subjectId,
      is_active: true
    })
      .populate("program_id", "name description")
      .populate("subject_id", "name description");
    res.json(programSubjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgramSubjectById = async (req, res) => {
  try {
    const programSubject = await ProgramSubjects.findById(req.params.id)
      .populate("program_id", "name description")
      .populate("subject_id", "name description");
    if (!programSubject) {
      return res.status(404).json({ message: "Program subject not found" });
    }
    res.json(programSubject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProgramSubject = async (req, res) => {
  try {
    const programSubject = await ProgramSubjects.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("program_id", "name description")
      .populate("subject_id", "name description");
    if (!programSubject) {
      return res.status(404).json({ message: "Program subject not found" });
    }
    res.json(programSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteProgramSubject = async (req, res) => {
  try {
    const programSubject = await ProgramSubjects.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!programSubject) {
      return res.status(404).json({ message: "Program subject not found" });
    }
    res.json({ message: "Program subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProgramSubject, getAllProgramSubjects, getProgramSubjectsByProgram, getProgramSubjectsBySubject, getProgramSubjectById, updateProgramSubject, deleteProgramSubject };