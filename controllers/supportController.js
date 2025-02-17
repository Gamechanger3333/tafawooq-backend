const Support = require("../models/supportModel");

const createSupportTicket = async (req, res) => {
  try {
    const ticket = new Support(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllSupportTickets = async (req, res) => {
  try {
    const tickets = await Support.find()
      .populate('user_id', 'first_name last_name email');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupportTicketsByUser = async (req, res) => {
  try {
    const tickets = await Support.find({ user_id: req.params.userId })
      .populate('user_id', 'first_name last_name email');
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSupportTicket = async (req, res) => {
  try {
    const ticket = await Support.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createSupportTicket, getAllSupportTickets, getSupportTicketsByUser, updateSupportTicket };
