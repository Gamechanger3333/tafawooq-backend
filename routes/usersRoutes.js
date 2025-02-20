const express = require("express");
const router = express.Router();
const userController = require("../controllers/usersController");
const auth = require("../middlewares/authMiddleware");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Protected routes (require authentication)
router.get("/", auth, userController.getAllUsers);
router.get("/:id", auth, userController.getUserById);
router.put("/:id", auth, userController.updateUser);
router.delete("/:id", auth, userController.deleteUser);

module.exports = router;
