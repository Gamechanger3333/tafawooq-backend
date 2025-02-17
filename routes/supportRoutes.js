const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");

router.post("/", supportController.createSupportTicket);
router.get("/", supportController.getAllSupportTickets);
router.get("/user/:userId", supportController.getSupportTicketsByUser);
router.put("/:id", supportController.updateSupportTicket);

module.exports = router;
