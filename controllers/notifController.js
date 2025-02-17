const Notifications = require("../models/notifModel");

const createNotification = async (req, res) => {
  try {
    const notification = new Notifications(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notifications.find()
      .populate('user_id', 'first_name last_name email');
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotificationsByUser = async (req, res) => {
  try {
    const notifications = await Notifications.find({ 
      user_id: req.params.userId,
      is_read: false 
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notifications.findByIdAndUpdate(
      req.params.id,
      { is_read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createNotification, getAllNotifications, getNotificationsByUser, markNotificationAsRead };