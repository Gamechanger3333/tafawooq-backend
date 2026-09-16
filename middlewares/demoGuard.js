const jwt = require('jsonwebtoken');

/**
 * Read-only guard for the public demo account.
 *
 * Tafawooq is a multi-user marketplace: a student's writes don't stay in
 * their own sandbox. Booking a session puts a row on a real tutor's
 * calendar, sending a message lands in a real user's inbox, and buying a
 * course hits live Stripe Connect and splits money to a real tutor. That
 * makes "wipe and reseed the demo user's rows" unsafe here — deleting
 * demo sessions would silently pull bookings out of real tutors'
 * calendars, and it wouldn't stop the demo account from spamming real
 * inboxes or touching Stripe in the first place.
 *
 * So the demo account is read-only instead. Visitors get the full app
 * with realistic seeded data to click through, and any write attempt
 * comes back with a clear, friendly 403 rather than failing silently
 * (a silent no-op reads as "this app is broken", which is worse for a
 * recruiter than an honest "demo mode" message).
 *
 * This runs globally, before the per-route auth middleware, so it has to
 * verify the token itself rather than relying on req.user.
 */

const DEMO_EMAIL = (process.env.DEMO_USER_EMAIL || 'demo@tafawooq.com').toLowerCase();

// Writes that must keep working for the demo account. These either don't
// touch persisted user data at all, or they're the login plumbing the
// demo depends on to exist.
const WRITE_ALLOWLIST = [
    /^\/users\/login\/?$/,
    /^\/users\/refresh-token\/?$/,
    /^\/users\/logout\/?$/,
    // AI assistant (landing-page chat, course Q&A, quiz/summary generation)
    // is a headline feature and only reads course data, so demo users
    // should be able to try it.
    /^\/assistant(\/|$)/
];

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const demoGuard = (req, res, next) => {
    // Reads always pass straight through.
    if (!WRITE_METHODS.has(req.method)) return next();

    if (WRITE_ALLOWLIST.some(pattern => pattern.test(req.path))) return next();

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded?.email?.toLowerCase() === DEMO_EMAIL) {
            return res.status(403).json({
                success: false,
                demo: true,
                message:
                    "You're signed in to the read-only demo account, so this change wasn't saved. " +
                    'Create a free account to use this for real — everything else here is fully explorable.'
            });
        }
    } catch (err) {
        // Not our problem: an invalid/expired token is the auth
        // middleware's job to reject with a proper 401. Falling through
        // keeps error handling in one place.
        return next();
    }

    next();
};

module.exports = { demoGuard, DEMO_EMAIL };
