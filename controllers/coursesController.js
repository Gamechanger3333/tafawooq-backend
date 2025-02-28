const Courses = require("../models/coursesModel");

const createCourse = async (req, res) => {
  try {
    const course = new Courses(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Courses.find({ is_active: true })
      .populate('program_subject_id')
      .populate('tutor_id', 'first_name last_name email');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id)
      .populate('program_subject_id')
      .populate('tutor_id', 'first_name last_name email');
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Courses.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('program_subject_id').populate('tutor_id', 'first_name last_name email');
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Courses.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse };