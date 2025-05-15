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

    // Admin endpoints
    getAllTransactions,
    getAdminBalance,
    adminWithdrawFunds,

    // Tutor earnings
    getTutorEarnings,
    getTutorCoursesSales,

    // Webhook
    handleStripeWebhook
} = require('../controllers/stripeController');
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

// Student routes
router.post('/add-card', auth, AddCardInfo);
router.post('/remove-card', auth, RemoveCard);
router.post('/purchase-course', auth, authorize('student'), purchaseCourse);

// Tutor routes
router.post('/connect-account', auth, authorize('tutor'), createConnectAccount);
router.get('/account-link', auth, authorize('tutor'), getAccountLink);
router.get('/account-status', auth, authorize('tutor'), getAccountStatus);
router.get('/earnings', auth, authorize('tutor'), getTutorEarnings);
router.get('/course-sales', auth, authorize('tutor'), getTutorCoursesSales);

// Admin routes
router.get('/transactions', auth, authorize('admin'), getAllTransactions);
router.get('/admin-balance', auth, authorize('admin'), getAdminBalance);
router.post('/admin-withdraw', auth, authorize('admin'), adminWithdrawFunds);

// Webhook - this endpoint needs to be public
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;;
