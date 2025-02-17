const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewsController");

router.post("/", reviewController.createReview);
router.get("/", reviewController.getAllReviews);
router.get("/course/:courseId", reviewController.getReviewsByCourse);
router.get("/student/:studentId", reviewController.getReviewsByStudent);
router.put("/:id", reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
