const Courses = require("../models/coursesModel");

const createCourse = async (req, res) => {
  try {
    console.log(`[CREATE COURSE] Incoming request from user: ${req.user._id} - ${req.user.name}`);

    // Ensure user is authenticated (redundant check for safety)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User authentication required",
      });
    }

    // Create a new course instance, linking it to the authenticated user
    const course = new Courses({
      ...req.body,
      user_id: req.user._id
    });

    // Validate before saving
    await course.validate();

    // Save the course to the database
    await course.save();

    console.log(`[CREATE COURSE] Course created successfully: ${course._id}`);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error(`[CREATE COURSE] Error:`, error.message);

    if (error.name === "ValidationError") {
      // Extract validation errors
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Courses.find().populate('user_id');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id)
      .populate('user_id'); // 🔥 Removed program_subject_id

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
    ).populate('user_id');

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
    const course = await Courses.findByIdAndDelete(
      req.params.id
    ).populate('user_id');
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse };