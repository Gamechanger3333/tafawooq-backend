const Session = require("../models/sessionModel");
const Users = require("../models/usersModel");

// Create a session request
const createSession = async (req, res) => {
    try {
        const { teacherId, studentId, date, duration, field, courseName, message, price } = req.body;

        // Validate that teacher exists and is a tutor
        const teacher = await Users.findById(teacherId);
        if (!teacher || teacher.role !== 'tutor') {
            return res.status(400).json({ message: "Invalid teacher ID" });
        }

        // Validate that student exists
        const student = await Users.findById(studentId);
        if (!student) {
            return res.status(400).json({ message: "Invalid student ID" });
        }

        // Check for conflicting sessions
        const sessionDate = new Date(date);
        const sessionEnd = new Date(sessionDate.getTime() + duration * 60000);

        const conflictingSession = await Session.findOne({
            teacherId,
            status: { $in: ['pending', 'approved'] },
            $or: [
                {
                    date: { $lt: sessionEnd },
                    $expr: {
                        $gt: [
                            { $add: ['$date', { $multiply: ['$duration', 60000] }] },
                            sessionDate
                        ]
                    }
                }
            ]
        });

        if (conflictingSession) {
            return res.status(400).json({ message: "Teacher is not available at this time" });
        }

        const session = await Session.create({
            teacherId,
            studentId,
            date: sessionDate,
            duration,
            field,
            courseName,
            message,
            price
        });

        // Populate teacher and student info
        const populatedSession = await Session.findById(session._id)
            .populate('teacherId', 'first_name last_name profile_pic')
            .populate('studentId', 'first_name last_name profile_pic');

        res.status(201).json(populatedSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all sessions for a user (student or teacher)
const getUserSessions = async (req, res) => {
    const { userId, role } = req.params;
    const { status, startDate, endDate } = req.query;

    try {
        let query = {};

        if (role === "teacher") {
            query.teacherId = userId;
        } else {
            query.studentId = userId;
        }

        if (status) {
            query.status = status;
        }

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const sessions = await Session.find(query)
            .populate('teacherId', 'first_name last_name profile_pic teacherProfile.rating')
            .populate('studentId', 'first_name last_name profile_pic')
            .sort({ date: 1 });

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get session by ID
const getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findById(sessionId)
            .populate('teacherId', 'first_name last_name profile_pic teacherProfile')
            .populate('studentId', 'first_name last_name profile_pic');

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Approve or reject session
const updateSessionStatus = async (req, res) => {
    const { sessionId } = req.params;
    const { status, notes, meetingLink, location, cancellationReason } = req.body;

    try {
        const updateData = { status };

        if (notes) updateData.notes = notes;
        if (meetingLink) updateData.meetingLink = meetingLink;
        if (location) updateData.location = location;
        if (cancellationReason) updateData.cancellationReason = cancellationReason;

        const session = await Session.findByIdAndUpdate(
            sessionId,
            updateData,
            { new: true }
        ).populate('teacherId', 'first_name last_name')
            .populate('studentId', 'first_name last_name');

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Update teacher's total sessions count if approved
        if (status === 'approved') {
            await Users.findByIdAndUpdate(
                session.teacherId._id,
                { $inc: { 'teacherProfile.totalSessions': 1 } }
            );
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get teachers for session booking
const getTeachersForBooking = async (req, res) => {
    try {
        const { search, field, favorites, studentId } = req.query;
        let query = { role: 'tutor' };

        // Search by name or specialization
        if (search) {
            query.$or = [
                { first_name: { $regex: search, $options: 'i' } },
                { last_name: { $regex: search, $options: 'i' } },
                { 'teacherProfile.specializations': { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by field
        if (field) {
            query['teacherProfile.specializations'] = { $in: [field] };
        }

        let teachers = await Users.find(query)
            .select('first_name last_name profile_pic teacherProfile')
            .sort({ 'teacherProfile.rating.average': -1 });

        // Filter favorites if requested
        if (favorites === 'true' && studentId) {
            const student = await Users.findById(studentId);
            if (student && student.studentProfile.favoriteTeachers) {
                const favoriteIds = student.studentProfile.favoriteTeachers.map(id => id.toString());
                teachers = teachers.filter(teacher =>
                    favoriteIds.includes(teacher._id.toString())
                );
            }
        }

        res.json(teachers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add teacher to favorites
const addTeacherToFavorites = async (req, res) => {
    try {
        const { studentId, teacherId } = req.body;

        const student = await Users.findByIdAndUpdate(
            studentId,
            { $addToSet: { 'studentProfile.favoriteTeachers': teacherId } },
            { new: true }
        );

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Teacher added to favorites" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove teacher from favorites
const removeTeacherFromFavorites = async (req, res) => {
    try {
        const { studentId, teacherId } = req.body;

        const student = await Users.findByIdAndUpdate(
            studentId,
            { $pull: { 'studentProfile.favoriteTeachers': teacherId } },
            { new: true }
        );

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Teacher removed from favorites" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get teacher's availability
const getTeacherAvailability = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { date } = req.query;

        const teacher = await Users.findById(teacherId);
        if (!teacher || teacher.role !== 'tutor') {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Get teacher's general availability
        const availability = teacher.teacherProfile.availability || [];

        // Get booked sessions for the specific date
        const requestedDate = new Date(date);
        const dayStart = new Date(requestedDate.setHours(0, 0, 0, 0));
        const dayEnd = new Date(requestedDate.setHours(23, 59, 59, 999));

        const bookedSessions = await Session.find({
            teacherId,
            status: { $in: ['pending', 'approved'] },
            date: { $gte: dayStart, $lte: dayEnd }
        }).select('date duration');

        res.json({
            availability,
            bookedSessions,
            sessionCourses: teacher.teacherProfile.sessionCourses || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get dashboard data for student
const getStudentDashboard = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Get upcoming sessions
        const upcomingSessions = await Session.find({
            studentId,
            status: 'approved',
            date: { $gte: new Date() }
        })
            .populate('teacherId', 'first_name last_name profile_pic')
            .sort({ date: 1 })
            .limit(5);

        // Get recent sessions
        const recentSessions = await Session.find({
            studentId,
            status: { $in: ['completed', 'approved'] },
            date: { $lte: new Date() }
        })
            .populate('teacherId', 'first_name last_name profile_pic')
            .sort({ date: -1 })
            .limit(5);

        // Get purchased courses
        const student = await Users.findById(studentId)
            .populate('purchasedCourses', 'title description thumbnail');

        res.json({
            upcomingSessions,
            recentSessions,
            purchasedCourses: student.purchasedCourses || [],
            totalSessions: await Session.countDocuments({ studentId }),
            completedSessions: await Session.countDocuments({
                studentId,
                status: 'completed'
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createSession, getUserSessions, getSessionById, updateSessionStatus, getTeachersForBooking, addTeacherToFavorites, removeTeacherFromFavorites, getTeacherAvailability, getStudentDashboard };