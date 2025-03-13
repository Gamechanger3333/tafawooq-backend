const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripeController");
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorize");

// Routes for Admins - restricted to admin role only
router.post("/create-account", auth, authorize('admin'), stripeController.createSellerAccount);
router.get("/generate-oauth-link/:userId", auth, authorize('admin'), stripeController.generateOAuthLink);
router.post("/authorize-seller/:userId", auth, authorize('admin'), stripeController.authorizeSeller);
router.get("/sellerbalance/:account_id", auth, authorize('admin'), stripeController.getSellerBalance);
router.get("/transactions", auth, authorize('admin'), stripeController.allTransections);
router.get("/trackpayment/:id", auth, authorize('admin'), stripeController.trackPayment);
router.post("/cancelsubscription/:id", auth, authorize('admin'), stripeController.cancelSubscription);

// Routes for Students - need to add proper role authorization
router.post("/AddCardInfo", auth, authorize('student', 'parent', 'tutor'), stripeController.AddCardInfo);
router.post("/removeCard", auth, authorize('student', 'parent', 'tutor'), stripeController.RemoveCard);
router.post("/credit", auth, authorize('student', 'parent'), stripeController.Checkout);
router.post("/subscriptiondetail", auth, authorize('student', 'parent', 'tutor'), stripeController.subscriptionDetail);
router.post("/create-checkout-session", auth, authorize('student', 'parent'), stripeController.userSubscription);
router.post("/success_payment", auth, authorize('student', 'parent'), stripeController.userSubscriptionAfterSuccess);
router.post("/refundpayment", auth, authorize('student', 'parent'), stripeController.refundPayment);

module.exports = router;
