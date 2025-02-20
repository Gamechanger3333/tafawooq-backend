const Users = require("../models/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // 3. Check password strength (at least 8 chars, 1 uppercase, 1 number, 1 special character)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters, include one uppercase letter, one number, and one special character.",
      });
    }

    // 4. Check if user already exists
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    // 5. Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Create user in database
    const user = new Users({
      ...userData,
      email,
      password_hash: hashedPassword,
    });

    await user.save();

    // 7. Remove password from response
    const { password_hash, ...userResponse } = user.toObject();

    // 8. Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );

    res.status(201).json({
      user: userResponse,
      token, // Return the token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // 3. Check if user exists
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 4. Check if the user is active
    if (!user.is_active) {
      return res.status(403).json({ message: "Your account is inactive. Please contact support." });
    }

    // 5. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 6. Update last login timestamp
    user.last_login = new Date();
    await user.save();

    // 7. Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );

    // 8. Remove sensitive data from response
    const { password_hash, ...userResponse } = user.toObject();

    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // 1. Ensure request is coming from an authorized admin (if needed)
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access. Admin privileges required." });
    }

    // 2. Retrieve active users only
    const users = await Users.find({ is_active: true }).select('-password_hash');

    // 3. Check if users exist
    if (!users.length) {
      return res.status(404).json({ message: "No active users found." });
    }

    // 4. Respond with user data
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const getUserById = async (req, res) => {
  try {
    // 1. Ensure request is coming from an authorized admin or the user themselves
    const userId = req.params.id;
    if (!(req.user && (req.user.role === "admin" || req.user._id.toString() === userId))) {
      return res.status(403).json({ message: "Unauthorized access. You can only view your own profile or require admin privileges." });
    }

    // 2. Fetch user by ID
    const user = await Users.findById(userId).select('-password_hash');

    // 3. Handle user not found
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 4. Return user data
    res.json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // 1. Ensure the user has permission to update the profile (admin or self-update)
    if (!(req.user && (req.user.role === "admin" || req.user._id.toString() === userId))) {
      return res.status(403).json({ message: "Unauthorized access. You can only update your own profile or require admin privileges." });
    }

    // 2. Handle missing data (empty body)
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "No data provided for update." });
    }

    const { password, ...updateData } = req.body;

    // 3. If password is being updated, hash it before saving
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // 4. Update the user data
    const user = await Users.findByIdAndUpdate(userId, updateData, { new: true }).select('-password_hash');

    // 5. Handle user not found
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 6. Return the updated user data
    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const deleteUser = async (req, res) => {
  try {
    console.log("req body", req);
    const userId = req.params.id;
    console.log(userId);
    console.log(req.user.role)

    // 1. Ensure that the user has permission to delete (admin or self-delete)
    if (!(req.user && (req.user.role === "admin" || req.user._id.toString() === userId))) {
      return res.status(403).json({ message: "Unauthorized access. You can only delete your own account or require admin privileges." });
    }

    // 2. Check if the user is already inactive (soft delete)
    const existingUser = await Users.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!existingUser.is_active) {
      return res.status(400).json({ message: "User is already deleted or inactive." });
    }

    // 3. Proceed with deactivating the user (soft delete)
    const user = await Users.findByIdAndUpdate(
      userId,
      { is_active: false },
      { new: true }
    );

    // 4. Handle user not found after checking
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 5. Return success message
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

module.exports = { registerUser, loginUser, getAllUsers, getUserById, updateUser, deleteUser };
