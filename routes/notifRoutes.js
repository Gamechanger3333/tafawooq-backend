const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notifController");

router.post("/", notificationController.createNotification);
router.get("/", notificationController.getAllNotifications);
router.get("/user/:userId", notificationController.getNotificationsByUser);
router.put("/:id/read", notificationController.markNotificationAsRead);

module.exports = router;
