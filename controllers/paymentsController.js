const Payments = require("../models/paymentsModel");

const createPayment = async (req, res) => {
  try {
    const payment = new Payments(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await Payments.find().populate("booking_id");
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payments.findById(req.params.id).populate("booking_id");
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const payment = await Payments.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    res.json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createPayment, getAllPayments, getPaymentById, updatePayment };
