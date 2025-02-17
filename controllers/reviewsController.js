const Reviews = require("../models/reviewsModel");

const createReview = async (req, res) => {
  try {
    const review = new Reviews(req.body);
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Reviews.find()
      .populate('student_id', 'first_name last_name')
      .populate('course_id');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByCourse = async (req, res) => {
  try {
    const reviews = await Reviews.find({ course_id: req.params.courseId })
      .populate('student_id', 'first_name last_name');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByStudent = async (req, res) => {
  try {
    const reviews = await Reviews.find({ student_id: req.params.studentId })
      .populate('course_id');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReview = async (req, res) => {
  try {
    const review = await Reviews.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Reviews.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getAllReviews, getReviewsByCourse, getReviewsByStudent, updateReview, deleteReview };
