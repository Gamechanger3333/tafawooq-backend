const StudentProgress = require("../models/studProgModel");

const createStudentProgress = async (req, res) => {
  try {
    const progress = new StudentProgress(req.body);
    await progress.save();
    res.status(201).json(progress);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllStudentProgress = async (req, res) => {
  try {
    const progress = await StudentProgress.find()
      .populate('student_id', 'first_name last_name email')
      .populate('course_id');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentProgressByStudent = async (req, res) => {
  try {
    const progress = await StudentProgress.find({ student_id: req.params.studentId })
      .populate('course_id');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentProgressByCourse = async (req, res) => {
  try {
    const progress = await StudentProgress.find({ course_id: req.params.courseId })
      .populate('student_id', 'first_name last_name email');
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStudentProgress = async (req, res) => {
  try {
    const progress = await StudentProgress.findByIdAndUpdate(
      req.params.id,
      { ...req.body, last_updated: Date.now() },
      { new: true }
    );
    if (!progress) {
      return res.status(404).json({ message: "Progress record not found" });
    }
    res.json(progress);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createStudentProgress, getAllStudentProgress, getStudentProgressByStudent, getStudentProgressByCourse, updateStudentProgress };
