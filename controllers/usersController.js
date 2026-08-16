const mongoose = require("mongoose");
const Users = require("../models/usersModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { uploadFileToCloudinary } = require("../utils/Cloudinary.js");
const Courses = require("../models/coursesModel.js");
const sendOtp = require("../utils/sendOtp");
const crypto = require("crypto");

const ALLOWED_REGISTRATION_ROLES = ['student', 'tutor'];

const registerUser = async (req, res) => {
  try {
    const { email, password, country_id, first_name, last_name, role } = req.body;

    // 1. Check if email, password and country_id are provided
    if (!email || !password || !country_id) {
      return res.status(400).json({ message: "Email, password and country_id are required." });
    }

    if (!first_name || !last_name) {
      return res.status(400).json({ message: "First name and last name are required." });
    }

    // Validate country_id exists in database
    const countryExists = await mongoose.model('Countries').findById(country_id);
    if (!countryExists) {
      return res.status(400).json({ message: "Invalid country selected." });
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

    // 4. Check if user already exists in database
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    // 5. Only take the specific fields we expect from the client — never
    // spread the raw request body into the new user. Doing so previously
    // let a client set arbitrary fields (e.g. "role": "admin") on their
    // own account.
    const safeRole = ALLOWED_REGISTRATION_ROLES.includes(role) ? role : 'student';

    // 6. Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 7. Create the user in the database right away (unverified). This
    // avoids ever putting the password hash inside a token that gets sent
    // back to the client — JWTs are signed, not encrypted, so anything in
    // the payload is readable by whoever holds the token.
    const newUser = await Users.create({
      email,
      password_hash: hashedPassword,
      country_id,
      first_name,
      last_name,
      role: safeRole,
      isVerified: false,
      otp: otpHash,
      otpExpiresAt,
      lastOtpRequestTime: new Date()
    });

    // Send OTP email after the user is safely persisted
    await sendOtp(email, otp);

    const userResponse = {
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: newUser.role,
      country_id: newUser.country_id,
      isVerified: false
    };

    res.status(200).json({
      user: userResponse,
      message: "Registration initiated. Please verify your email with the OTP sent.",
      requiresVerification: true
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_BYTES = 40;

/**
 * Issues a fresh short-lived access token + a long-lived refresh token for
 * a user. The refresh token is only ever returned to the client once, in
 * plaintext — the DB only ever stores its SHA-256 hash, the same pattern
 * already used for OTPs and password-reset tokens in this file. Every call
 * overwrites the stored hash, so calling this again (i.e. rotating) makes
 * any previously issued refresh token stop working.
 */
const issueTokenPair = async user => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      isVerified: true
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  user.refreshTokenHash = refreshTokenHash;
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
  await user.save();

  return { accessToken, refreshToken };
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    // Registration now always creates the user record up front (see
    // registerUser), so verification only ever needs to look the user up
    // by email — there's no separate "pending" state held outside the DB.
    const user = await Users.findOne({ email }).populate('country_id');

    if (!user) {
      return res.status(404).json({ message: "No pending registration found for this email." });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid request or already verified." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (user.otp !== hashedOtp || user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Update user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const { accessToken, refreshToken } = await issueTokenPair(user);

    const { password_hash, otp: otpField, otpExpiresAt: otpExpires, ...userResponse } = user.toObject();

    return res.status(200).json({
      message: "Email verified successfully.",
      token: accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    // Basic cooldown so a visitor can't spam the email service — the
    // lastOtpRequestTime field already existed on the schema but was never
    // actually checked anywhere.
    const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

    if (user.lastOtpRequestTime && Date.now() - user.lastOtpRequestTime.getTime() < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - user.lastOtpRequestTime.getTime())) / 1000
      );

      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another OTP.` });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    user.otp = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.lastOtpRequestTime = new Date();
    await user.save();

    // Send OTP Email
    await sendOtp(email, otp);

    res.status(200).json({
      message: "OTP has been resent to your email."
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
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

    // 3. Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email
      });
    }

    // 4. Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // 5. Update last login
    user.last_login = new Date();
    await user.save();

    // 6. Generate access + refresh token pair
    const { accessToken, refreshToken } = await issueTokenPair(user);

    // 7. Remove sensitive data from response
    const { password_hash, ...userResponse } = user.toObject();

    res.json({
      user: userResponse,
      token: accessToken,
      refreshToken
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

    // 2. Fetch user by ID
    const user = await Users.findById(userId).select('-password_hash').populate('country_id').populate('purchasedCourses');

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

const getTutorIdsFromPurchasedCourses = async (req, res) => {
  try {
    // 1. Get the authenticated user's ID
    const userId = req.user._id;

    // 2. Find the user and populate the purchased courses with tutor details
    const user = await Users.findById(userId)
      .populate({
        path: 'purchasedCourses',
        select: 'user_id courseTitle price',
        // Nested populate to get tutor details
        populate: {
          path: 'user_id',
          select: 'first_name last_name email profile_pic' // Select only necessary fields
        }
      });

    // 3. Handle user not found
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // 4. Extract tutor information from purchased courses
    const tutors = user.purchasedCourses.map(course => ({
      _id: course.user_id._id,
      first_name: course.user_id.first_name,
      last_name: course.user_id.last_name,
      email: course.user_id.email,
      profile_pic: course.user_id.profile_pic,
    }));

    // Check if we found any tutors
    if (!tutors || tutors.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tutors found for your purchased courses",
        data: []
      });
    }

    // 5. Return the list of tutors with their details in the same format as getStudentsByCourse
    res.status(200).json({
      success: true,
      message: `Found ${tutors.length} tutors from your purchased courses`,
      data: tutors
    });
  } catch (error) {
    console.error("Error fetching tutor IDs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve tutors",
      error: error.message
    });
  }
};


// Controller for searching users
const searchUsers = async (req, res) => {
  try {
    console.log("🔍 [START] User search initiated");
    console.log("👉 Query Params:", req.query);
    console.log("🔐 Authenticated User:", req.user);

    const { query, course_id } = req.query;
    let searchCriteria = {};

    // 1. Apply search query to name/email
    if (query) {
      searchCriteria.$or = [
        { first_name: { $regex: query, $options: 'i' } },
        { last_name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    // 2. Apply course filter if provided
    if (course_id) {
      console.log("📘 Filtering by course ID:", course_id);
      searchCriteria.purchasedCourses = course_id;
    }

    // 3. Exclude self from results (optional)
    searchCriteria._id = { $ne: req.user._id };

    console.log("🔎 Final search criteria:", searchCriteria);

    const users = await Users.find(searchCriteria).select('-password_hash');

    console.log(`✅ Found ${users.length} users`);
    return res.status(200).json({
      success: true,
      message: `Found ${users.length} users`,
      data: users
    });

  } catch (error) {
    console.error("❌ Error in user search:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Add this to your users controller file

const updatePassword = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Ensure the user has permission (only self-update for passwords)
    if (!(req.user && req.user._id.toString() === userId)) {
      return res.status(403).json({
        message: "Unauthorized access. You can only update your own password."
      });
    }

    const { current_password, new_password } = req.body;

    // 2. Validate that both passwords are provided
    if (!current_password || !new_password) {
      return res.status(400).json({
        message: "Both current password and new password are required."
      });
    }

    // 3. Retrieve the user with password_hash
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 4. Verify current password is correct
    const isPasswordCorrect = await bcrypt.compare(current_password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "The current password is incorrect."
      });
    }

    // 5. Validate new password requirements
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with one uppercase letter, one number, and one special character."
      });
    }

    // 6. Hash the new password
    const new_password_hash = await bcrypt.hash(new_password, 10);

    // 7. Update the password
    user.password_hash = new_password_hash;
    await user.save();

    // 8. Return success message
    res.json({
      message: "Password updated successfully",
      user: {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        // Include other fields as needed, excluding password_hash
      }
    });

  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      message: "Internal server error. Please try again later."
    });
  }
};


const getTutorStudents = async (req, res) => {
  try {
    const tutorId = req.params.tutorId || req.user._id; // Get from params or auth token

    // Check if tutor exists and has role 'tutor'
    const tutor = await Users.findOne({
      _id: tutorId,
      role: 'tutor'
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found or user is not a tutor'
      });
    }

    // Find all courses created by this tutor
    const tutorCourses = await Courses.find({ user_id: tutorId });

    if (tutorCourses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No courses found for this tutor'
      });
    }

    // Extract course IDs from the tutor's courses
    const courseIds = tutorCourses.map(course => course._id);

    // Find all students who have purchased any of these courses
    // We're using aggregate to get more detailed student information
    const students = await Users.aggregate([
      {
        // Match only students who have purchased at least one of the tutor's courses
        $match: {
          role: 'student',
          purchasedCourses: { $in: courseIds }
        }
      },
      {
        // Add field to show which courses each student purchased
        $addFields: {
          purchasedTutorCourses: {
            $filter: {
              input: "$purchasedCourses",
              as: "course",
              cond: { $in: ["$$course", courseIds] }
            }
          }
        }
      },
      {
        // Lookup course details for the purchased courses
        $lookup: {
          from: 'courses',
          localField: 'purchasedTutorCourses',
          foreignField: '_id',
          as: 'enrolledCourses'
        }
      },
      {
        // Include only necessary fields for security and privacy
        $project: {
          _id: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          profile_pic: 1,
          enrolledCourses: {
            _id: 1,
            courseTitle: 1,
            education_level: 1,
            price: 1,
            image: 1
          },
          purchaseCount: { $size: "$purchasedTutorCourses" }
        }
      },
      {
        // Sort by the number of courses purchased (descending)
        $sort: { purchaseCount: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error fetching tutor students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * POST /users/refresh-token
 * Exchanges a still-valid refresh token for a brand-new access token +
 * refresh token pair (rotation). The old refresh token is invalidated the
 * moment this succeeds, since issueTokenPair() overwrites the stored hash.
 */
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await Users.findOne({ refreshTokenHash }).select('+refreshTokenHash +refreshTokenExpiresAt');

    if (!user || !user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < Date.now()) {
      return res.status(401).json({ message: "Invalid or expired refresh token. Please log in again." });
    }

    const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user);

    return res.status(200).json({
      token: accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

/**
 * POST /users/logout
 * Revokes the current refresh token so it can't be used again even if it
 * leaks later. The short-lived access token itself is stateless and just
 * expires naturally — revoking it would require a token blocklist, which
 * is intentionally out of scope given how short-lived it already is.
 */
const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await Users.updateOne(
        { refreshTokenHash },
        { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
      );
    } else if (req.user) {
      // Fallback: caller is authenticated but didn't send a refresh token —
      // revoke whatever refresh token is on file for this account.
      await Users.updateOne(
        { _id: req.user._id },
        { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } }
      );
    }

    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

module.exports = { registerUser, loginUser, getAllUsers, getUserById, updateUser, deleteUser, changeProfilePic, getTutorIdsFromPurchasedCourses, searchUsers, updatePassword, getTutorStudents, verifyOtp, resendOtp, refreshAccessToken, logoutUser };
