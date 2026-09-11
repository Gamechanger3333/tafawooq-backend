const express = require('express');
const router = express.Router();
const {
    // Original methods
    AddCardInfo,
    RemoveCard,

    // Tutor onboarding
    createConnectAccount,
    getAccountLink,
    getAccountStatus,

    // Course purchasing
    purchaseCourse,
    purchaseSessions,

    // Admin endpoints
    getAllTransactions,
    getAdminBalance,
    adminWithdrawFunds,

    // Tutor earnings
    getTutorEarnings,
    getTutorCoursesSales

} = require('../controllers/stripeController');
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

// Student routes
router.post('/add-card', auth, AddCardInfo);
router.post('/remove-card', auth, RemoveCard);
router.post('/purchase-course', auth, authorize('student'), purchaseCourse);
router.post('/purchase-session', auth, authorize('student'), purchaseSessions);

// Tutor routes
router.get('/account-status', auth, authorize('tutor'), getAccountStatus);
router.post('/connect-account', auth, authorize('tutor'), createConnectAccount);
router.get('/account-link', auth, authorize('tutor'), getAccountLink);
router.get('/earnings', auth, authorize('tutor'), getTutorEarnings);
router.get('/course-sales', auth, authorize('tutor'), getTutorCoursesSales);

// Admin routes
router.get('/transactions', auth, authorize('admin'), getAllTransactions);
router.get('/admin-balance', auth, authorize('admin'), getAdminBalance);
router.post('/admin-withdraw', auth, authorize('admin'), adminWithdrawFunds);

// NOTE: POST /stripe/webhook is intentionally registered in app.js, before
// the global express.json() middleware — Stripe's signature check needs
// the raw, unparsed body. See app.js for details. Do not re-add it here.

module.exports = router;;
