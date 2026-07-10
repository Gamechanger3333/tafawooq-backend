const Users = require('../models/usersModel');
const Courses = require('../models/coursesModel');
const Session = require('../models/sessionModel');

// Public, unauthenticated snapshot of real platform numbers for the landing
// page. Deliberately conservative — only counts verified users and
// completed sessions, and computes the rating average from actual tutor
// review data instead of a hardcoded marketing number.
exports.getPublicStats = async (req, res) => {
  try {
    const [studentsCount, tutorsCount, coursesCount, completedSessionsCount, ratingAgg] = await Promise.all([
      Users.countDocuments({ role: 'student', isVerified: true }),
      Users.countDocuments({ role: 'tutor', isVerified: true }),
      Courses.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
      Users.aggregate([
        { $match: { role: 'tutor', 'teacherProfile.rating.count': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$teacherProfile.rating.average' },
            ratedTutors: { $sum: 1 }
          }
        }
      ])
    ]);

    const averageRating = ratingAgg[0]?.averageRating
      ? Math.round(ratingAgg[0].averageRating * 10) / 10
      : null;

    return res.status(200).json({
      success: true,
      stats: {
        studentsCount,
        tutorsCount,
        coursesCount,
        completedSessionsCount,
        averageRating, // null until at least one tutor has been rated
        ratedTutorsCount: ratingAgg[0]?.ratedTutors || 0
      }
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return res.status(500).json({ success: false, message: 'Could not load platform stats' });
  }
};
