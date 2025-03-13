const Users = require("../models/usersModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { uploadFileToCloudinary } = require ("../utils/Cloudinary.js");

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

    // 4. Log for debugging (ONLY in development)
    console.log("User found:", user.email, "Auth provider:", user.auth_provider);
    console.log("Stored password hash:", user.password_hash.substring(0, 15) + "...");
    console.log("Attempting to compare password of length:", password.length);

    // 5. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    // 6. Log password comparison result (ONLY in development)
    console.log("Password comparison result:", isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

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
   
    // 2. Retrieve active users only
    const users = await Users.find().select('-password_hash');

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
    const userId = req.params.id;

    // 1. Ensure that the user has permission to delete (admin or self-delete)
    if (!(req.user && (req.user.role === "admin" || req.user._id.toString() === userId))) {
      return res.status(403).json({ message: "Unauthorized access. You can only delete your own account or require admin privileges." });
    }

    // 2. Check if the user exists
    const existingUser = await Users.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // 3. Perform actual deletion 
    const deletedUser = await Users.findByIdAndDelete(userId);

    // 4. Return success message
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const changeProfilePic = async (req, res) => {
  try {
    const filePath = req.file?.path;

    // 1. Validate file upload
    if (!filePath) {
      return res.status(400).json({ message: "Please upload a file." });
    }

    // 3. Find the user
    const user = await Users.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 4. Upload file to Cloudinary
    const uploadedFile = await uploadFileToCloudinary(filePath);
    if (!uploadedFile?.secure_url) {
      return res.status(500).json({ message: "Error uploading file to Cloudinary." });
    }

    // 5. Update user profile picture
    await user.updateOne({ $set: { profile_pic: uploadedFile.secure_url } });

    // 6. Return success message
    res.status(200).json({ message: "Profile picture updated successfully", user });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

module.exports = { registerUser, loginUser, getAllUsers, getUserById, updateUser, deleteUser, changeProfilePic };
