const Users = require("../models/usersModel");
const { stripemodel } = require("../models/stripeModel");
const Courses = require("../models/coursesModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Session = require("../models/sessionModel");

// Constants
const PLATFORM_FEE_PERCENT = 25; // 25% platform fee

// Helper functions
const createStripeToken = async (cardNumber, expiryDate, cvv, cardName) => {
  let expMonth, expYear;
  if (expiryDate) {
    [expMonth, expYear] = expiryDate.split("/");
  }

  try {
    const stripeToken = await stripe.tokens.create({
      card: {
        number: cardNumber,
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear),
        cvc: cvv,
        name: cardName,
      },
    });

    if (stripeToken && stripeToken.id) {
      return stripeToken;
    } else {
      throw new Error("Failed to create Stripe token");
    }
  } catch (error) {
    console.error("error :::::", error);
    throw error;
  }
};

// ======================== TUTOR ONBOARDING ENDPOINTS ========================

/**
 * Create Stripe Connect account for tutors
 */
const createConnectAccount = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await Users.findById(userId).populate('country_id');;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== 'tutor') {
      return res.status(403).json({ error: "Only tutors can create Stripe Connect accounts" });
    }

    // Check if tutor already has a Stripe account
    if (user.stripe_account_id) {
      return res.status(400).json({
        error: "You already have a Stripe account connected",
        accountId: user.stripe_account_id
      });
    }


    // Get the country code from the populated country data
    const countryCode = user.country_id?.code;

    console.log("[createConnectAccount - countryCode]", countryCode)


    if (!countryCode) {
      return res.status(400).json({
        error: "Country information is required to create a Stripe account"
      });
    }


    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: countryCode.toUpperCase(), // can be made dynamic based on user's country
      email: user.email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }
      },
      business_type: 'individual',
      business_profile: {
        name: `${user.first_name} ${user.last_name}`,
        url: process.env.WEBSITE_URL || 'https://yourtutoringwebsite.com',
      },
      metadata: { userId: userId.toString(), userCountry: user.country_id.name }
    });

    // Save the account ID to the user
    user.stripe_account_id = account.id;
    await user.save();

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/apps/tutor/dashboard`,
      type: 'account_onboarding',
    });

    res.status(200).json({
      success: true,
      message: "Stripe Connect account created",
      accountId: account.id,
      onboardingUrl: accountLink.url,
      country: user.country_id.name,
      countryCode: countryCode.toUpperCase()
    });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    res.status(500).json({ error: error.message || "Failed to create Stripe account" });
  }
};

/**
 * Get fresh onboarding/dashboard link for tutor's Stripe account
 */
const getAccountLink = async (req, res) => {
  const userId = req.user._id;
  const { accountAction } = req.query; // 'onboarding' or 'dashboard'

  try {
    const user = await Users.findById(userId);

    if (!user || !user.stripe_account_id) {
      return res.status(404).json({ error: "Stripe account not found" });
    }

    if (accountAction === 'dashboard') {
      // Create login link to Stripe dashboard
      const loginLink = await stripe.accounts.createLoginLink(user.stripe_account_id);

      return res.status(200).json({
        success: true,
        url: loginLink.url
      });
    } else {
      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: user.stripe_account_id,
        refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL}/apps/tutor/dashboard`,
        type: 'account_onboarding',
      });

      return res.status(200).json({
        success: true,
        url: accountLink.url
      });
    }
  } catch (error) {
    console.error("Error creating account link:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if tutor's Stripe account is properly set up
 */
const getAccountStatus = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await Users.findById(userId);

    if (!user || !user.stripe_account_id) {
      return res.status(404).json({ error: "Stripe account not found" });
    }

    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    // console.log('[backed stripeS STATUS]', account)

    const isComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;
    res.status(200).json({
      success: true,
      accountId: account.id,
      isComplete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
  } catch (error) {
    console.error("Error checking account status:", error);
    res.status(500).json({ error: error.message });
  }
};

// ======================== STUDENT PAYMENT ENDPOINTS ========================

/**
 * Add a payment card for students
 */
const AddCardInfo = async (req, res) => {
  const { stripeToken, cardName, isPrimary } = req.body;
  const userId = req.user._id;

  try {
    if (!stripeToken || !cardName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.cardInfo && user.cardInfo.length >= 2) {
      return res.status(400).json({ error: "You can only add up to two cards." });
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.first_name + " " + user.last_name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token: stripeToken },
    });

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: stripeCustomerId,
    });

    // Set as Default Payment Method if Primary
    if (isPrimary) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethod.id },
      });

      // Ensure only one primary card
      if (user.cardInfo) {
        user.cardInfo.forEach(card => card.primary = false);
      } else {
        user.cardInfo = [];
      }
    }

    const paymentMethodDetails = await stripe.paymentMethods.retrieve(paymentMethod.id);

    if (!user.cardInfo) {
      user.cardInfo = []; // Initialize as an empty array if it doesn't exist
    }

    user.cardInfo.push({
      paymentMethodId: paymentMethod.id,
      cardName: cardName,
      cardNumber: `**** **** **** ${paymentMethodDetails.card.last4}`,
      expiryDate: `${paymentMethodDetails.card.exp_month}/${paymentMethodDetails.card.exp_year}`,
      cardType: paymentMethodDetails.card.brand,
      country: paymentMethodDetails.card.country,
      funding: paymentMethodDetails.card.funding,
      primary: isPrimary || user.cardInfo.length === 0,
    });

    await user.save();

    res.status(200).json({ message: 'Card information saved successfully' });
  } catch (error) {
    console.error("Error saving card information:", error);
    res.status(500).json({ error: error.raw?.message || "Your card was declined." });
  }
};

/**
 * Remove a saved payment card
 */
const RemoveCard = async (req, res) => {
  const { cardId } = req.body;
  const userId = req.user._id;

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.cardInfo || user.cardInfo.length === 0) {
      return res.status(400).json({ error: "No cards available to remove." });
    }
    const updatedCards = user.cardInfo.filter(card => card._id.toString() !== cardId.toString());
    if (updatedCards.length === user.cardInfo.length) {
      return res.status(404).json({ error: "Card not found." });
    }
    if (!updatedCards.some(card => card.primary) && updatedCards.length > 0) {
      updatedCards[0].primary = true;
    }
    user.cardInfo = updatedCards;
    await user.save();
    res.status(200).json({ message: "Card removed successfully" });
  } catch (error) {
    console.error("Error removing card:", error);
    res.status(500).json({ error: "Failed to remove card." });
  }
};

/**
 * Course purchase endpoint - handles payment with commission split
 */
const purchaseCourse = async (req, res) => {
  const userId = req.user._id;
  const { courseId } = req.body;

  try {
    // Find the course
    const course = await Courses.findById(courseId).populate('user_id');
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Get the tutor's stripe account id
    const tutorStripeAccountId = course.user_id.stripe_account_id;
    if (!tutorStripeAccountId) {
      return res.status(400).json({ error: "This tutor hasn't completed their payment setup yet." });
    }

    // Find the student
    const student = await Users.findById(userId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student already purchased this course
    if (student.purchasedCourses && student.purchasedCourses.includes(courseId)) {
      return res.status(400).json({ error: "You have already purchased this course" });
    }

    // Check if student has a payment method
    if (!student.cardInfo || student.cardInfo.length === 0) {
      return res.status(400).json({ error: "No payment method available. Please add a card first." });
    }

    // Find primary card or use the first one
    const primaryCard = student.cardInfo.find(card => card.primary) || student.cardInfo[0];

    // Calculate price in cents and fee split
    const coursePriceInCents = Math.round(course.price * 100);
    const platformFeeInCents = Math.round(coursePriceInCents * (PLATFORM_FEE_PERCENT / 100));
    const tutorAmountInCents = coursePriceInCents - platformFeeInCents;

    // Create a payment intent with the destination charge/connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: coursePriceInCents,
      currency: 'usd',
      customer: student.stripeCustomerId,
      payment_method: primaryCard.paymentMethodId,
      confirm: true,
      description: `Course: ${course.courseTitle}`,
      metadata: {
        courseId: courseId.toString(),
        studentId: userId.toString(),
        tutorId: course.user_id._id.toString()
      },
      application_fee_amount: platformFeeInCents,
      transfer_data: {
        destination: tutorStripeAccountId,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      return_url: `${process.env.FRONTEND_URL}/payment-confirmation`
    });

    // Save the payment record in our database
    const paymentRecord = new stripemodel({
      charge: JSON.stringify(paymentIntent),
      userId: userId,
      courseId: courseId,
      chargeFor: 'appCharge',
      amount: course.price,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
      plan: course.courseTitle
    });

    await paymentRecord.save();

    // Add course to student's purchasedCourses
    await Users.findByIdAndUpdate(userId, {
      $addToSet: { purchasedCourses: courseId }
    });

    res.status(200).json({
      success: true,
      message: "Payment processed successfully. You are now enrolled in this course.",
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        created: new Date(paymentIntent.created * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process payment"
    });
  }
};

/**
 * Session purchase endpoint purchaseSessions - handles payment with commission split
 */
const purchaseSessions = async (req, res) => {
  const studentId = req.user._id;
  const { teacherId, amount } = req.body;

  try {
    // Find the teacher
    const teacher = await Users.findById(teacherId);

    console.log("Teacher found:", teacher);
    console.log("Teacher ID being searched:", teacherId);


    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Verify teacher has stripe account
    if (!teacher.stripe_account_id) {
      return res.status(400).json({ error: "This teacher hasn't completed their payment setup yet." });
    }

    // Find the student
    const student = await Users.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Check if student has a payment method
    if (!student.cardInfo || student.cardInfo.length === 0) {
      return res.status(400).json({ error: "No payment method available. Please add a card first." });
    }

    // Find primary card or use the first one
    const primaryCard = student.cardInfo.find(card => card.primary) || student.cardInfo[0];

    const totalAmountInCents = Math.round(amount * 100);
    const platformFeeInCents = Math.round(totalAmountInCents * (PLATFORM_FEE_PERCENT / 100));

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: 'usd',
      customer: student.stripeCustomerId,
      payment_method: primaryCard.paymentMethodId,
      confirm: true,
      description: `Advance Payment to ${teacher.first_name} ${teacher.last_name}`,
      metadata: {
        studentId: studentId.toString(),
        teacherId: teacherId.toString(),
        paymentType: 'advance_payment'
      },
      application_fee_amount: platformFeeInCents,
      transfer_data: {
        destination: teacher.stripe_account_id,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    // If payment is successful
    if (paymentIntent.status === 'succeeded') {
      // Save payment record
      const paymentRecord = new stripemodel({
        charge: JSON.stringify(paymentIntent),
        userId: studentId,
        chargeFor: 'appCharge',
        amount: amount,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        plan: 'Advance Payment'
      });

      await paymentRecord.save();

      res.status(200).json({
        success: true,
        message: "Advance payment processed successfully.",
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: amount,
          platformFee: platformFeeInCents / 100,
          teacherReceives: (totalAmountInCents - platformFeeInCents) / 100,
          created: new Date(paymentIntent.created * 1000).toISOString()
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        error: "Payment failed or requires additional authentication",
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret
        }
      });
    }

  } catch (error) {
    console.error("Advance payment error:", error);

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: "Payment failed: " + error.message
      });
    }

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: "Invalid payment request: " + error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to process advance payment"
    });
  }
};

// ======================== ADMIN PAYMENT ENDPOINTS ========================

/**
 * Get all transactions with details (Admin only)
 */
const getAllTransactions = async (req, res) => {
  // Verify admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  try {
    // Fetch all transactions from our database
    const transactions = await stripemodel.find()
      .populate('userId', 'email first_name last_name')
      .populate('courseId', 'courseTitle price creator_id')
      .sort({ createdAt: -1 });

    const formattedTransactions = [];

    for (const transaction of transactions) {
      let paymentData = {
        id: transaction.paymentIntentId || 'unknown',
        created: transaction.createdAt,
        amount: transaction.amount,
        status: transaction.status || 'unknown'
      };

      // Only try to fetch from Stripe if we have a payment intent ID
      if (transaction.paymentIntentId) {
        try {
          // Get payment intent details from Stripe, but don't try to expand transfer
          const paymentIntent = await stripe.paymentIntents.retrieve(
            transaction.paymentIntentId
          );

          // Calculate fees based on our platform fee percentage instead of relying on transfer expansion
          const totalAmount = paymentIntent.amount / 100;
          const applicationFee = totalAmount * (PLATFORM_FEE_PERCENT / 100);
          const tutorAmount = totalAmount - applicationFee;

          // Get receipt URL if available
          let receiptUrl = null;
          if (paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data.length > 0) {
            receiptUrl = paymentIntent.charges.data[0].receipt_url;
          }

          paymentData = {
            id: paymentIntent.id,
            created: new Date(paymentIntent.created * 1000).toISOString(),
            amount: totalAmount,
            application_fee: applicationFee,
            tutor_amount: tutorAmount,
            status: paymentIntent.status,
            receipt_url: receiptUrl
          };
        } catch (err) {
          console.error(`Failed to fetch payment intent ${transaction.paymentIntentId}:`, err);
          // If we can't get from Stripe, we still have the basic data from our database
        }
      }

      // Get tutor information if courseId is available and has creator_id
      let tutorInfo = null;
      if (transaction.courseId && transaction.courseId.creator_id) {
        try {
          const tutor = await Users.findById(transaction.courseId.creator_id, 'first_name last_name email');
          if (tutor) {
            tutorInfo = {
              id: tutor._id,
              name: `${tutor.first_name} ${tutor.last_name}`,
              email: tutor.email
            };
          }
        } catch (err) {
          console.error(`Failed to fetch tutor info:`, err);
        }
      }

      formattedTransactions.push({
        _id: transaction._id,
        paymentData,
        createdAt: transaction.createdAt,
        student: transaction.userId ? {
          id: transaction.userId._id,
          name: `${transaction.userId.first_name} ${transaction.userId.last_name}`,
          email: transaction.userId.email
        } : null,
        course: transaction.courseId ? {
          id: transaction.courseId._id,
          title: transaction.courseId.courseTitle,
          price: transaction.courseId.price,
          tutorId: transaction.courseId.creator_id
        } : null,
        tutor: tutorInfo
      });
    }

    res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "Failed to retrieve transactions" });
  }
};

/**
 * Get admin balance (platform fees collected)
 */
const getAdminBalance = async (req, res) => {
  // Verify admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  try {
    // Retrieve the Stripe balance for the platform account
    const balance = await stripe.balance.retrieve();

    // Format the balance data
    const availableBalance = balance.available.reduce((sum, item) =>
      sum + (item.currency === 'usd' ? item.amount : 0), 0) / 100;

    const pendingBalance = balance.pending.reduce((sum, item) =>
      sum + (item.currency === 'usd' ? item.amount : 0), 0) / 100;

    // Get recent payouts (withdrawals from the Stripe balance to the bank account)
    const payouts = await stripe.payouts.list({
      limit: 10,
      expand: ['data.destination']
    });

    const formattedPayouts = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      created: new Date(payout.created * 1000).toISOString(),
      arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      status: payout.status,
      destination: payout.destination
    }));

    res.status(200).json({
      success: true,
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        currency: 'usd'
      },
      recent_payouts: formattedPayouts
    });
  } catch (error) {
    console.error("Error retrieving admin balance:", error);
    res.status(500).json({ error: "Failed to retrieve balance information" });
  }
};

/**
 * Admin withdraw funds to bank account
 */
const adminWithdrawFunds = async (req, res) => {
  // Verify admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }

  const { amount, currency = 'usd' } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Valid amount required" });
  }

  try {
    // Get available balance
    const balance = await stripe.balance.retrieve();
    const availableAmount = balance.available.find(b => b.currency === currency)?.amount || 0;

    if (availableAmount < (amount * 100)) {
      return res.status(400).json({
        error: `Insufficient funds. Available: ${availableAmount / 100} ${currency}`
      });
    }

    // Create a payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency,
      description: 'Admin withdrawal'
    });

    res.status(200).json({
      success: true,
      message: `Successfully initiated withdrawal of ${amount} ${currency}`,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        created: new Date(payout.created * 1000).toISOString(),
        estimated_arrival: payout.arrival_date ?
          new Date(payout.arrival_date * 1000).toISOString() : 'Unknown',
        status: payout.status
      }
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(500).json({ error: error.message || "Failed to process withdrawal" });
  }
};

// ======================== TUTOR EARNINGS ENDPOINTS ========================

/**
 * Get tutor earnings and balance
 */
const getTutorEarnings = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await Users.findById(userId);

    if (!user || !user.stripe_account_id) {
      return res.status(404).json({ error: "Stripe account not found" });
    }

    // Retrieve the tutor's Stripe balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripe_account_id
    });

    // Format the balance data
    const availableBalance = balance.available.reduce((sum, item) =>
      sum + (item.currency === 'usd' ? item.amount : 0), 0) / 100;

    const pendingBalance = balance.pending.reduce((sum, item) =>
      sum + (item.currency === 'usd' ? item.amount : 0), 0) / 100;

    // Get recent payouts (withdrawals to bank account)
    const payouts = await stripe.payouts.list({
      limit: 5,
      stripeAccount: user.stripe_account_id
    });

    const formattedPayouts = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      created: new Date(payout.created * 1000).toISOString(),
      arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      status: payout.status
    }));

    // Get earnings by course (recent payments received)
    const payments = await stripemodel.find({
      courseId: { $in: await Courses.find({ creator_id: userId }).distinct('_id') },
      status: 'succeeded'
    })
      .populate('courseId', 'courseTitle price')
      .populate('userId', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .limit(20);

    const courseSales = payments.map(payment => ({
      id: payment._id,
      course: payment.courseId ? {
        id: payment.courseId._id,
        title: payment.courseId.courseTitle,
        price: payment.courseId.price
      } : { title: "Unknown Course" },
      student: payment.userId ? {
        name: `${payment.userId.first_name} ${payment.userId.last_name}`,
        email: payment.userId.email
      } : { name: "Unknown Student" },
      amount: payment.amount,
      tutorAmount: payment.amount * (1 - PLATFORM_FEE_PERCENT / 100),
      platformFee: payment.amount * (PLATFORM_FEE_PERCENT / 100),
      date: payment.createdAt
    }));

    res.status(200).json({
      success: true,
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        currency: 'usd'
      },
      recent_payouts: formattedPayouts,
      course_sales: courseSales
    });
  } catch (error) {
    console.error("Error retrieving tutor earnings:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get tutor courses with sales data
 */
const getTutorCoursesSales = async (req, res) => {
  const userId = req.user._id;

  try {
    // Find all courses created by this tutor
    const courses = await Courses.find({ creator_id: userId });

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No courses found",
        courses: []
      });
    }

    const courseIds = courses.map(course => course._id);

    // Get sales data for each course
    const salesData = await Promise.all(courseIds.map(async (courseId) => {
      const course = courses.find(c => c._id.toString() === courseId.toString());

      // Get total sales for the course
      const sales = await stripemodel.find({
        courseId: courseId,
        status: 'succeeded'
      });

      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, item) => sum + (item.amount || 0), 0);
      const tutorRevenue = totalRevenue * (1 - PLATFORM_FEE_PERCENT / 100);

      return {
        courseId: course._id,
        title: course.courseTitle,
        price: course.price,
        totalSales,
        totalRevenue,
        tutorRevenue,
        platformFee: totalRevenue * (PLATFORM_FEE_PERCENT / 100),
        lastPurchased: sales.length > 0 ?
          sales.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt : null
      };
    }));

    res.status(200).json({
      success: true,
      coursesSales: salesData
    });
  } catch (error) {
    console.error("Error retrieving course sales data:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Webhook handler for Stripe events
 */
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
      // Update the payment status in your database
      await stripemodel.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { $set: { status: 'succeeded' } }
      );
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`PaymentIntent ${failedPayment.id} failed`);
      await stripemodel.findOneAndUpdate(
        { paymentIntentId: failedPayment.id },
        { $set: { status: 'failed' } }
      );
      break;

    case 'account.updated':
      const account = event.data.object;
      // If the account is now fully set up, you might want to update your database
      if (account.charges_enabled && account.payouts_enabled) {
        await Users.findOneAndUpdate(
          { stripe_account_id: account.id },
          { $set: { stripe_account_status: 'active' } }
        );
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
};

module.exports = {
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
  handleStripeWebhook,

  purchaseSessions
};