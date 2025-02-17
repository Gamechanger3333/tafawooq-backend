const TutorPayouts = require("../models/tutorPayModel");

const createTutorPayout = async (req, res) => {
  try {
    const payout = new TutorPayouts(req.body);
    await payout.save();
    res.status(201).json(payout);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllTutorPayouts = async (req, res) => {
  try {
    const payouts = await TutorPayouts.find()
      .populate('tutor_id', 'first_name last_name email');
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTutorPayoutsByTutor = async (req, res) => {
  try {
    const payouts = await TutorPayouts.find({ tutor_id: req.params.tutorId })
      .populate('tutor_id', 'first_name last_name email');
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTutorPayout = async (req, res) => {
  try {
    const payout = await TutorPayouts.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }
    res.json(payout);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createTutorPayout, getAllTutorPayouts, getTutorPayoutsByTutor, updateTutorPayout };
