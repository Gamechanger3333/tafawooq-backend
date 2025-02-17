const Users = require("../models/usersModel");
const bcrypt = require("bcryptjs");

const registerUser = async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new Users({
      ...userData,
      password_hash: hashedPassword
    });
    
    await user.save();
    const { password_hash, ...userResponse } = user.toObject();
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res, next) => {
  const MAX_FAILED_ATTEMPTS = 8;
  const LOCK_TIME = 10 * 60 * 1000; // 10 minutes

  try {
    const { username, password, loginAs } = req.body;
    const ipAddress = req.ip;

    // Validate user input
    if (
      !(username && password) ||
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({ message: "All input is required" });
    }

    // Validate if user exists in our database
    const user = await Users.findOne({
      $or: [
        { email: username.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });

    // Check if user exists and if the account is locked
    if (user) {
      const isLocked = user.lockUntil && user.lockUntil > Date.now();
      if (isLocked) {
        return res
          .status(403)
          .json({ message: "Account is locked. Please try again later." });
      }

      // Check if user is enabled
      if (!user.is_active) {
        return res.status(400).json({ message: "User has been deactivated" });
      }

      // Check if the password is correct
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (passwordMatch) {
        // Reset failed login attempts on successful login
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;

        // Parse device info from user agent
        const agent = useragent.parse(req.headers['user-agent']);
        const deviceInfo = {
          deviceType: "Unknown",
          browser: `${agent.family} ${agent.major}.${agent.minor}.${agent.patch}`,
          os: agent.os.toString(),
          deviceInfo: agent
        };

        // Determine device type
        if (agent.os.toString().includes("Windows") || agent.os.toString().includes("Macintosh")) {
          deviceInfo.deviceType = "PC/Laptop";
        } else if (agent.os.toString().includes("Android") || agent.os.toString().includes("iPhone") || agent.os.toString().includes("iPad")) {
          deviceInfo.deviceType = "Mobile";
        } else if (agent.os.toString().includes("Linux") && agent.source.includes("Android")) {
          deviceInfo.deviceType = "Mobile";
        } else if (agent.os.toString().includes("Tablet") || agent.os.toString().includes("iPad")) {
          deviceInfo.deviceType = "Tablet";
        }

        // Generate device fingerprint
        const deviceFingerprint = generateDeviceFingerprint(agent, ipAddress);

        // Check if the device exists
        const existingDevice = await Deviceinfo.findOne({ 
          userId: user._id, 
          deviceFingerprint 
        });

        if (existingDevice) {
          existingDevice.loginTimestamp = new Date();
          await existingDevice.save();
        } else {
          const newDevice = new Deviceinfo({
            userId: user._id,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            deviceInfo: deviceInfo.deviceInfo,
            deviceFingerprint: deviceFingerprint,
            loginTimestamp: new Date(),
          });
          await newDevice.save();
        }

        // Generate JWT token
        const token = jwt.sign(
          { user_id: user._id, username, loginAs },
          process.env.TOKEN_KEY,
          { expiresIn: process.env.TOKEN_TIME }
        );

        // Update user information
        user.token = token;
        user.loginAs = loginAs;
        user.lastLogin = new Date();
        await user.save();

        // Remove sensitive data before sending response
        const { password_hash, ...userResponse } = user.toObject();
        return res.status(200).json({ status: true, data: userResponse });
      } else {
        // Handle failed login attempt
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        // Lock account if failed attempts exceed max
        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = Date.now() + LOCK_TIME;
        }
        user.lastLogin = new Date();
        await user.save();
        
        return res.status(400).json({ message: "Incorrect username or password" });
      }
    } else {
      return res.status(400).json({ message: "Incorrect username or password" });
    }
  } catch (err) {
    return next(err);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await Users.find({ is_active: true })
      .select('-password_hash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await Users.findById(req.params.id)
      .select('-password_hash');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    
    const user = await Users.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password_hash');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await Users.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getAllUsers, getUserById, updateUser, deleteUser };
