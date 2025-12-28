// src/controllers/polityController.js

const Razorpay = require("razorpay");
const PolityPurchase = require("../models/PolityPurchase");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get Polity price from environment variable, default to 199 if not set
const getPolityPrice = () => {
  const price = process.env.POLITY_PRICE;
  if (price) {
    const parsedPrice = parseInt(price, 10);
    if (!isNaN(parsedPrice) && parsedPrice > 0) {
      return parsedPrice;
    }
  }
  return 199; // Default price
};

/**
 * GET /api/polity/info
 * Get Polity Book information (public)
 */
const getPolityInfo = async (req, res, next) => {
  try {
    res.json({
      success: true,
      polity: {
        name: "Complete Polity Package",
        description: "Complete PSSSB & Punjab Exams Polity Package for scoring full marks",
        price: getPolityPrice(),
        features: [
          "90 Pages Full Polity Notes",
          "20 Pages PYQs (2012–2025)",
          "December 2025 Updated",
          "100% PSSSB + Punjab Exam Oriented"
        ],
        highlights: [
          "Score full marks - No extra books needed",
          "Complete coverage of all polity topics",
          "Latest PYQs updated till December 2025",
          "Exam-specific preparation material"
        ]
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/polity/create-purchase
 * Create Polity purchase and Razorpay order (requires auth)
 */
const createPurchase = async (req, res, next) => {
  try {
    const { user } = req; // From auth middleware

    // Get or create user in MongoDB (auto-sync if doesn't exist)
    const userDoc = await User.findOneAndUpdate(
      { firebaseUid: user.id },
      {
        firebaseUid: user.id,
        email: user.email,
        name: user.name || user.email?.split('@')[0] || 'User',
        role: 'user',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials missing");
      return res.status(500).json({
        error: "Payment service configuration error. Please contact support."
      });
    }

    // Create Razorpay order
    const timestamp = Date.now().toString().slice(-10);
    const userIdShort = user.id.substring(0, 8);
    const receipt = `polity_${timestamp}_${userIdShort}`;
    const polityPrice = getPolityPrice();

    const options = {
      amount: polityPrice * 100, // Convert to paise
      currency: "INR",
      receipt: receipt,
      notes: {
        type: "polity_purchase",
        userFirebaseUid: user.id,
        userName: user.name || userDoc.name,
        userEmail: user.email || userDoc.email,
      },
    };

    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (razorpayError) {
      console.error("Razorpay order creation error:", razorpayError);
      return res.status(500).json({
        error: "Failed to create payment order. Please try again or contact support."
      });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      message: "Payment order created. Complete payment to receive the Polity Book PDF.",
    });
  } catch (err) {
    console.error("Error creating Polity purchase:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation error: " + err.message
      });
    }
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      console.error("Database error:", err);
      return res.status(500).json({
        error: "Database error. Please try again later."
      });
    }
    next(err);
  }
};

/**
 * GET /api/polity/my-purchases
 * Get user's Polity purchases (requires auth)
 */
const getMyPurchases = async (req, res, next) => {
  try {
    const { user } = req;
    const purchases = await PolityPurchase.find({
      userFirebaseUid: user.id,
      status: "confirmed",
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      purchases,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPolityInfo,
  createPurchase,
  getMyPurchases,
};
