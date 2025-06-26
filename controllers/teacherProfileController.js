const Users = require("../models/usersModel");

// Get teacher profile
const getTeacherProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const teacher = await Users.findById(teacherId)
            .select('-password_hash -otp -otpExpiresAt -resetToken -resetTokenExpiresAt')
            .populate('purchasedCourses', 'title description thumbnail price');

        if (!teacher || teacher.role !== 'tutor') {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.json(teacher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update teacher profile
const updateTeacherProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const updateData = req.body;

        // Only allow updates to teacherProfile fields
        const allowedUpdates = [
            'teacherProfile.description',
            'teacherProfile.experience',
            'teacherProfile.education',
            'teacherProfile.certifications',
            'teacherProfile.specializations',
            'teacherProfile.hourlyRate',
            'teacherProfile.availability',
            'teacherProfile.sessionTypes',
            'teacherProfile.sessionCourses'
        ];

        const update = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key) || key.startsWith('teacherProfile.')) {
                update[key] = updateData[key];
            }
        });

        const teacher = await Users.findByIdAndUpdate(
            teacherId,
            { $set: update },
            { new: true, runValidators: true }
        ).select('-password_hash -otp -otpExpiresAt -resetToken -resetTokenExpiresAt');

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.json(teacher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add session course to teacher profile
const addSessionCourse = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { courseName, field, description, duration, price } = req.body;

        const teacher = await Users.findByIdAndUpdate(
            teacherId,
            {
                $push: {
                    'teacherProfile.sessionCourses': {
                        courseName,
                        field,
                        description,
                        duration,
                        price
                    }
                }
            },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.json(teacher.teacherProfile.sessionCourses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove session course from teacher profile
const removeSessionCourse = async (req, res) => {
    try {
        const { teacherId, courseId } = req.params;

        const teacher = await Users.findByIdAndUpdate(
            teacherId,
            {
                $pull: {
                    'teacherProfile.sessionCourses': { _id: courseId }
                }
            },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.json(teacher.teacherProfile.sessionCourses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update teacher availability
const updateTeacherAvailability = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { availability } = req.body;

        const teacher = await Users.findByIdAndUpdate(
            teacherId,
            { 'teacherProfile.availability': availability },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        res.json(teacher.teacherProfile.availability);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTeacherProfile, updateTeacherProfile, addSessionCourse, removeSessionCourse, updateTeacherAvailability };