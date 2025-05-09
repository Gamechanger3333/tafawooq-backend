const Courses = require("../models/coursesModel");
const Countries = require("../models/countriesModel");
const { uploadFileToCloudinary } = require('../utils/Cloudinary');
const { default: mongoose } = require("mongoose");

const createCourse = async (req, res) => {
  try {
    console.log(`[CREATE COURSE] Incoming request from user: ${req.user._id}`);

    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User authentication required",
      });
    }

    // Add this code here - beginning of new code
    if (!req.body.country_id && req.user.country_id) {
      req.body.country_id = req.user.country_id;
    } else if (!req.body.country_id && !req.user.country_id) {
      return res.status(400).json({
        success: false,
        message: "Country is required. Please update your profile with a country or specify a country for this course."
      });
    }
    // End of new code

    // Validate country exists (keep your existing validation)
    if (!req.body.country_id) {
      return res.status(400).json({
        success: false,
        message: "Country is required",
      });
    }

    const countryExists = await Countries.findById(req.body.country_id);
    if (!countryExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid country specified",
      });
    }

    // Validate education level
    if (!req.body.education_level) {
      return res.status(400).json({
        success: false,
        message: "Education level is required",
      });
    }

    const validEducationLevels = ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL'];
    if (!validEducationLevels.includes(req.body.education_level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid education level. Must be one of: PRIMARY, SECONDARY, HIGHER, PROFESSIONAL",
      });
    }

    console.log("BEFORE SAVE - req.body.country_id:", req.body.country_id);
    console.log("BEFORE SAVE - req.body.education_level:", req.body.education_level);
    
    // Log the course object right after creation
    const course = new Courses({
      ...req.body,
      user_id: req.user._id
    });
    
    console.log("AFTER CREATION - course.country_id:", course);
    
    // Then validate and save
    await course.validate();
    
    await course.save();

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
    // Extract filter parameters from query string
    const { country_id, education_level } = req.query;

    // Build filter object based on provided parameters
    const filter = {};

    if (country_id) {
      filter.country_id = country_id;
    }

    if (education_level) {
      filter.education_level = education_level;
    }

    // Apply filters to query
    const courses = await Courses.find(filter)
      .populate('user_id')
      .populate('country_id');

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserSpecificCourses = async (req, res) => {
  try {
    // Check if user has a country_id
    if (!req.user.country_id) {
      // Instead of returning an error, return default courses
      const defaultCourses = await Courses.find()
        .sort({ created_at: -1 })
        .limit(10)
        .populate('user_id')
        .populate('country_id');

      return res.json({
        success: true,
        message: "Showing default courses. Set your country in profile settings to see location-specific courses.",
        isDefault: true,
        data: defaultCourses
      });
    }

    const courses = await Courses.find({ country_id: req.user.country_id })
      .populate('user_id')
      .populate('country_id');

    res.json({
      success: true,
      isDefault: false,
      data: courses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Courses.findById(req.params.id)
      .populate('user_id')
      .populate('country_id');

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
    // First check if the course exists and belongs to the user
    const existingCourse = await Courses.findById(req.params.id);

    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the user is authorized to update this course
    if (existingCourse.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only update your own courses"
      });
    }

    // If updating country, validate it exists
    if (req.body.country_id) {
      const countryExists = await Countries.findById(req.body.country_id);
      if (!countryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid country specified",
        });
      }
    }

    // If updating education level, validate it's valid
    if (req.body.education_level) {
      const validEducationLevels = ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL'];
      if (!validEducationLevels.includes(req.body.education_level)) {
        return res.status(400).json({
          success: false,
          message: "Invalid education level. Must be one of: PRIMARY, SECONDARY, HIGHER, PROFESSIONAL",
        });
      }
    }

    // Update the course
    const course = await Courses.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('user_id')
      .populate('country_id');

    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    // First check if the course exists and belongs to the user
    const existingCourse = await Courses.findById(req.params.id);

    if (!existingCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if the user is authorized to delete this course
    if (existingCourse.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own courses"
      });
    }

    const course = await Courses.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get courses by country
const getCoursesByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    // Validate country exists
    const countryExists = await Countries.findById(countryId);
    if (!countryExists) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    // Find courses for the specified country
    const courses = await Courses.find({ country_id: countryId })
      .populate('user_id')
      .populate('country_id');

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get courses by education level
const getCoursesByEducationLevel = async (req, res) => {
  try {
    const { level } = req.params;

    // Validate education level
    const validEducationLevels = ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL'];
    if (!validEducationLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid education level. Must be one of: PRIMARY, SECONDARY, HIGHER, PROFESSIONAL",
      });
    }

    // Find courses for the specified education level
    const courses = await Courses.find({ education_level: level })
      .populate('user_id')
      .populate('country_id');

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get courses by country and education level
const getCoursesByCountryAndLevel = async (req, res) => {
  try {
    const { countryId, level } = req.params;

    // Validate country exists
    const countryExists = await Countries.findById(countryId);
    if (!countryExists) {
      return res.status(404).json({
        success: false,
        message: "Country not found",
      });
    }

    // Validate education level
    const validEducationLevels = ['PRIMARY', 'SECONDARY', 'HIGHER', 'PROFESSIONAL'];
    if (!validEducationLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid education level. Must be one of: PRIMARY, SECONDARY, HIGHER, PROFESSIONAL",
      });
    }

    // Find courses for the specified country and education level
    const courses = await Courses.find({
      country_id: countryId,
      education_level: level
    })
      .populate('user_id')
      .populate('country_id');

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Keep your existing content and topic functions
const addContentToCourse = async (req, res) => {
  try {
    console.log(`[ADD CONTENT] Incoming request from user: ${req.user._id} - ${req.user.name}`);

    const { courseId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Content title is required"
      });
    }

    // Find the course
    const course = await Courses.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user is authorized (owner of the course)
    if (course.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only modify your own courses"
      });
    }

    // Create new content object
    const newContent = {
      title: title,
      topics: []
    };

    // Add content to the course
    course.courseDetails.content.push(newContent);
    await course.save();

    console.log(`[ADD CONTENT] Content added successfully to course: ${courseId}`);

    res.status(201).json({
      success: true,
      message: "Content added successfully",
      data: course
    });
  } catch (error) {
    console.error(`[ADD CONTENT] Error:`, error.message);

    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};

const addTopicToContent = async (req, res) => {
  try {
    console.log(`[ADD TOPIC] Incoming request from user: ${req.user._id}`);

    const { courseId, contentId } = req.params;
    const { title } = req.body;

    // Check if video file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video is required"
      });
    }

    // Validate inputs
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Topic title is required"
      });
    }

    // Find the course
    const course = await Courses.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user is authorized (owner of the course)
    if (course.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only modify your own courses"
      });
    }

    // Find the content
    const content = course.courseDetails.content.id(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    // Upload video to Cloudinary
    const uploadedVideo = await uploadFileToCloudinary(req.file.path, {
      resource_type: 'video',
      folder: 'course_videos'
    });

    if (!uploadedVideo) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload video"
      });
    }

    // Create new topic with video URL
    const newTopic = {
      title: title,
      video: uploadedVideo.secure_url
    };

    // Add topic to the content
    content.topics.push(newTopic);
    await course.save();

    console.log(`[ADD TOPIC] Topic added successfully to content: ${contentId} in course: ${courseId}`);

    res.status(201).json({
      success: true,
      message: "Topic added successfully",
      data: course
    });
  } catch (error) {
    console.error(`[ADD TOPIC] Error:`, error.message);

    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
  
};


// Add this function to your coursesController.js file

const getTutorCourses = async (req, res) => {
  try {
    const { tutorId } = req.params;
    
    // Validate that tutorId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tutor ID format"
      });
    }

    // Find all courses created by this tutor
    const tutorCourses = await Courses.find({ user_id: tutorId })
      // .populate('user_id')
      // .populate('country_id');

    // Check if any courses were found
    if (tutorCourses.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No courses found for this tutor",
        data: []
      });
    }

    // Return the courses
    res.status(200).json({
      success: true,
      count: tutorCourses.length,
      data: tutorCourses
    });
  } catch (error) {
    console.error(`[GET TUTOR COURSES] Error:`, error.message);
    
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};


module.exports = {
  createCourse,
  getAllCourses,
  getUserSpecificCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addContentToCourse,
  addTopicToContent,
  getCoursesByCountry,
  getCoursesByEducationLevel,
  getCoursesByCountryAndLevel,
  getTutorCourses
};