const express = require("express");
const router = express.Router();
const tutorPayoutController = require("../controllers/tutorPayController");

router.post("/", tutorPayoutController.createTutorPayout);
router.get("/", tutorPayoutController.getAllTutorPayouts);
router.get("/tutor/:tutorId", tutorPayoutController.getTutorPayoutsByTutor);
router.put("/:id", tutorPayoutController.updateTutorPayout);

module.exports = router;
