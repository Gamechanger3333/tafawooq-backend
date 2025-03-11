const Users = require("../models/usersModel");
const { stripemodel } = require("../models/stripeModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const mongoose = require("mongoose");
const Courses = require("../models/coursesModel");

const createSellerAccount = async (req, res) => {
  const { userId } = req.body;
  const userById = await Users.findById(userId);
  try {
    const account = await stripe.accounts.create({
      type: "standard",
    });
    const accountID = account.id;
    if (userById) {
      const userData = await Users.findByIdAndUpdate(userById, {
        $set: { stripe_account_id: accountID },
      });
    }
    res.send({ account_id: accountID });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

const generateOAuthLink = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get tutor's Stripe account ID from database
    const user = await Users.findById(userId);
    if (!user || !user.stripe_account_id) {
      return res.status(400).json({ error: "User not found or Stripe account missing" });
    }

    // Generate an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: user.stripe_account_id,
      refresh_url: "http://localhost:3000/stripe/reauth", // Change this to your frontend
      return_url: "http://localhost:3000/stripe/success", // Change this to your frontend
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe OAuth Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const authorizeSeller = async (req, res) => {
  const { code } = req.body;
  const { userId } = req.params;

  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const { access_token, refresh_token, stripe_user_id } = response;

    let userData;

    if (userId) {
      let userCheck = await Users.findById({ _id: userId });
      if (!userCheck) {
        return res.status(400).json({ message: "user not exist" });
      }
      await Users.findByIdAndUpdate(
        { _id: userId },
        {
          $set: {
            stripe_account_id: stripe_user_id,
            stripe_refresh_token: refresh_token,
            stripe_access_token: access_token,
          },
        }
      );
      userData = await Users.findById({ _id: userId });
    }

    res.json({
      userData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

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

const Checkout = async (req, res) => {
  const userId = req.user._id;
  
  try {
    const { amount, currency = "usd", description = "Payment charge" } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user has a payment method
    if (!user.cardInfo || user.cardInfo.length === 0) {
      return res.status(400).json({ error: "No payment method available. Please add a card first." });
    }
    
    // Find primary card or use the first one
    const primaryCard = user.cardInfo.find(card => card.primary) || user.cardInfo[0];
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      customer: user.stripeCustomerId,
      payment_method: primaryCard.paymentMethodId,
      description,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      },
      metadata: {
        userId: userId.toString()
      }
    });
    
    // Save to database
    const chargeData = new stripemodel({
      charge: JSON.stringify(paymentIntent),
      userId: userId,
      chargeFor: 'orderCharge',
      amount,
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id
    });
    
    const savedCharge = await chargeData.save();

    res.json({
      success: true,
      message: "Payment successful",
      paymentIntent,
      savedCharge
    });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Failed to process payment" 
    });
  }
};

const getSellerBalance = async (req, res) => {
  const { account_id } = req.params;

  try {
    const balance = await stripe.balance.retrieve({
      stripe_account: account_id,
    });

    res.send(balance);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

const userSubscription = async (req, res) => {
  const { email, courseId } = req.body;
  const userId = req.user._id;
  
  if (!email || !courseId) {
    return res.status(400).json({ success: false, message: "Required fields are missing" });
  }

  try {
    const userData = await Users.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const course = await Courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const coursePrice = course.price;
    if (!coursePrice) {
      return res.status(400).json({ success: false, message: "Course price is not set" });
    }

    let customer = await stripe.customers.list({ email, limit: 1 });
    let stripeCustomerId = customer.data.length ? customer.data[0].id : null;

    // Create Stripe Customer if Not Exists
    if (!stripeCustomerId) {
      customer = await stripe.customers.create({ 
        email, 
        name: userData.first_name + " " + userData.last_name,
        metadata: { id: userId.toString() } 
      });
      stripeCustomerId = customer.id;
      
      // Update user's stripe customer ID if not already set
      if (!userData.stripeCustomerId) {
        await Users.findByIdAndUpdate(userId, { stripeCustomerId });
      }
    }

    // Create Stripe Checkout Session for Course Payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.courseTitle,
              description: course.desc,
              images: [course.image],
            },
            unit_amount: Math.round(coursePrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/paymentsuccess?userId=${userId}&courseId=${courseId}`,
      cancel_url: `http://localhost:3000/paymenterror`,
      metadata: {
        userId: userId.toString(),
        courseId: courseId.toString()
      }
    });

    console.log("Stripe Checkout Session Created:", session);
    return res.json({ sessionId: session.id });

  } catch (err) {
    console.error("Error in course payment:", err);
    res.status(500).send({ error: err.message });
  }
};

const userSubscriptionAfterSuccess = async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user._id;
  
  if (!userId || !courseId) {
    return res.status(400).json({ success: false, message: "Required fields are missing" });
  }
  
  try {
    // Verify the course exists
    const course = await Courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Add courseId to user's purchasedCourses array
    await Users.findByIdAndUpdate(userId, {
      $addToSet: { purchasedCourses: courseId } // Use addToSet to prevent duplicates
    });

    // Create a record in the stripe model for this purchase
    const paymentRecord = new stripemodel({
      userId,
      courseId,
      chargeFor: 'appCharge',
      amount: course.price,
      status: 'succeeded',
      plan: course.courseTitle
    });

    await paymentRecord.save();

    res.status(200).json({
      success: true, 
      message: "Payment processed successfully. You are now enrolled in this course."
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
};

const refundPayment = async (req, res) => {
  const { paymentIntentId, amount, courseId } = req.body;
  const userId = req.user._id;
  
  if (!paymentIntentId || !amount || !courseId) {
    return res.status(400).json({
      success: false,
      message: "Invalid request. Please provide paymentIntentId, amount, and courseId.",
    });
  }

  try {
    // Verify the course exists and user purchased it
    const course = await Courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    const user = await Users.findById(userId);
    if (!user || !user.purchasedCourses || !user.purchasedCourses.includes(courseId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have a purchase record for this course"
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || !paymentIntent.latest_charge) {
      return res.status(404).json({
        success: false,
        message: "PaymentIntent or associated charge not found.",
      });
    }

    const chargeId = paymentIntent.latest_charge;
    const charge = await stripe.charges.retrieve(chargeId);

    const unrefundedAmount = charge.amount - charge.amount_refunded;

    const refundAmountInCents = Math.round(amount * 100);
    if (refundAmountInCents <= 0) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than zero.",
      });
    }

    if (refundAmountInCents > unrefundedAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${amount}) exceeds the remaining refundable amount (${unrefundedAmount / 100}).`,
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmountInCents,
    });

    // Remove the course from the user's purchased courses
    await Users.findByIdAndUpdate(userId, {
      $pull: { purchasedCourses: courseId }
    });

    // Update the payment record
    await stripemodel.findOneAndUpdate(
      { paymentIntentId, userId },
      { $set: { status: 'refunded' } }
    );

    return res.status(200).json({
      success: true,
      message: "Refund successful. Course has been removed from your purchased courses.",
    });
  } catch (error) {
    console.error("Error processing refund:", error);

    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({
        success: false,
        message: `Invalid request: ${error.message}`,
      });
    }

    if (error.type === "StripeAPIError") {
      return res.status(500).json({
        success: false,
        message: "An error occurred while communicating with Stripe.",
      });
    }

    if (error.type === "StripeCardError") {
      return res.status(400).json({
        success: false,
        message: `Card error: ${error.message}`,
      });
    }

    if (error.type === "StripeAuthenticationError") {
      return res.status(401).json({
        success: false,
        message: "Authentication with Stripe API failed. Please check your API keys.",
      });
    }

    if (error.type === "StripeRateLimitError") {
      return res.status(429).json({
        success: false,
        message: "Too many requests made to Stripe API too quickly. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while processing the refund.",
      error: error.message,
    });
  }
};

const allTransections = async (req, res) => {
  try {
    const allCharges = [];
    let hasMore = true;
    let startingAfter;

    while (hasMore) {
      const chargesList = await stripe.charges.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer']
      });

      const chargesDetails = chargesList.data.map(charge => {
        const customer = charge.customer || {};

        return {
          transactionId: charge.id,
          date: new Date(charge.created * 1000).toISOString(),
          transactionType: charge.object,
          amount: charge.amount / 100,
          paymentMethod: charge.payment_method_details?.type,
          cardBrand: charge.payment_method_details?.card?.brand,
          last4: charge.payment_method_details?.card?.last4,
          expMonth: charge.payment_method_details?.card?.exp_month,
          expYear: charge.payment_method_details?.card?.exp_year,
          description: charge.description,
          source: charge.source?.id,
          receiptUrl: charge.receipt_url,
          status: charge.status,
          name: charge.billing_details.name || null,
          email: customer.email || null,
        };
      });

      allCharges.push(...chargesDetails);
      hasMore = chargesList.has_more;

      if (hasMore) {
        startingAfter = chargesList.data[chargesList.data.length - 1].id;
      }
    }

    res.json(allCharges);
  } catch (error) {
    console.error("Error retrieving charges:", error);
    res.status(500).json({ error: "Failed to retrieve transactions" });
  }
};

const trackPayment = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await Users.findById(userId, "email stripeCustomerId purchasedCourses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const user_email = user.email;
    let stripeCustomerId = user.stripeCustomerId;
    let coursePayments = [];

    // Fetch purchased courses data
    if (user.purchasedCourses && user.purchasedCourses.length > 0) {
      const courseIds = user.purchasedCourses.map(id => new mongoose.Types.ObjectId(id));
      
      const coursesData = await Courses.find({
        _id: { $in: courseIds }
      }, {
        _id: 1,
        courseTitle: 1,
        price: 1,
        image: 1
      });
      
      // Get payment information for these courses from Stripe model
      const payments = await stripemodel.find({
        userId: userId,
        courseId: { $in: courseIds }
      });
      
      coursePayments = coursesData.map(course => {
        const payment = payments.find(p => p.courseId && p.courseId.toString() === course._id.toString());
        
        return {
          course_id: course._id,
          title: course.courseTitle,
          price: course.price,
          image: course.image,
          payment_id: payment?.paymentIntentId || null,
          payment_status: payment?.status || 'succeeded',
          payment_date: payment?.createdAt || new Date()
        };
      });
    }

    let stripeSubscriptions = [];
    if (stripeCustomerId) {
      // For completeness - if you want to include any actual Stripe subscriptions in the future
      // This would be where you'd fetch them
    }

    res.status(200).json({
      userData: coursePayments,
      stripeSubscription: stripeSubscriptions
    });

  } catch (error) {
    console.error("Error in trackPayment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const subscriptionDetail = async (req, res) => {
  const { user_email } = req.body;
  const userId = req.user._id;
  
  if (!user_email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  try {
    // Get user's purchased courses
    const user = await Users.findById(userId, "purchasedCourses");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    let courseDetails = [];
    if (user.purchasedCourses && user.purchasedCourses.length > 0) {
      courseDetails = await Courses.find({
        _id: { $in: user.purchasedCourses }
      }, {
        courseTitle: 1,
        price: 1,
        image: 1,
        created_at: 1
      });
    }
    
    // Get payment information from Stripe model
    const payments = await stripemodel.find({
      userId: userId,
      courseId: { $in: user.purchasedCourses || [] }
    });
    
    // Format course purchase data as subscription-like data
    const formattedCourseData = courseDetails.map(course => {
      const payment = payments.find(p => p.courseId && p.courseId.toString() === course._id.toString());
      
      return {
        purchase_id: course._id,
        status: "active",
        amount: course.price,
        plan: course.courseTitle,
        start_date: payment?.createdAt || course.created_at.toISOString(),
        current_period_end: null,
        auto_renewal: false
      };
    });

    res.status(200).json({
      stripeSubscription: formattedCourseData
    });
  } catch (error) {
    console.error("Error retrieving subscription details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const cancelSubscription = async (req, res) => {
  const userId = req.params.id;
  const { subscriptionId } = req.body;
  
  if (!subscriptionId || !userId) {
    return res.status(400).json({ success: false, message: "Subscription ID and User ID are required" });
  }
  
  try {
    // In this context, we're treating course purchases as "subscriptions"
    // So we'll remove the course from the user's purchased courses
    
    // First verify that the course exists
    const course = await Courses.findById(subscriptionId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    
    // Then verify the user has purchased this course
    const user = await Users.findById(userId);
    if (!user || !user.purchasedCourses || !user.purchasedCourses.includes(subscriptionId)) {
      return res.status(404).json({ success: false, message: "No active purchase found for this course" });
    }
    
    // Remove the course from purchasedCourses
    await Users.findByIdAndUpdate(userId, {
      $pull: { purchasedCourses: subscriptionId }
    });
    
    // Update the payment record status
    await stripemodel.findOneAndUpdate(
      { userId, courseId: subscriptionId },
      { $set: { status: 'canceled' } }
    );
    
    res.status(200).json({
      success: true,
      message: "Course access revoked successfully",
      course_id: subscriptionId
    });
  } catch (error) {
    console.error("Error canceling course access:", error);
    res.status(500).json({ success: false, message: "Failed to cancel course access", error: error.message });
  }
};

module.exports = {
  createSellerAccount,
  generateOAuthLink,
  authorizeSeller,
  Checkout,
  getSellerBalance,
  AddCardInfo,
  RemoveCard,
  userSubscription,
  userSubscriptionAfterSuccess,
  refundPayment,
  allTransections,
  trackPayment,
  cancelSubscription,
  subscriptionDetail
};