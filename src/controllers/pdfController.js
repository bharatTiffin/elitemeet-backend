// src/controllers/pdfController.js
const Razorpay = require("razorpay");
const PDFPurchase = require("../models/PDFPurchase");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get PDF price from environment variable, default to 99 if not set
const getPDFPrice = () => {
  const price = process.env.PDF_PRICE;
  if (price) {
    const parsedPrice = parseInt(price, 10);
    if (!isNaN(parsedPrice) && parsedPrice > 0) {
      return parsedPrice;
    }
  }
  return 99; // Default price
};

/**
 * GET /api/pdf/info
 * Get PDF information (public)
 */
const getPDFInfo = async (req, res, next) => {
  try {
    res.json({
      success: true,
      pdf: {
        name: "Elite Academy Magazine",
        description: "PSSSB Exam Preparation Guide",
        price: getPDFPrice(),
        features: [
          "Sports - 10 pages",
          "Index - 10 pages",
          "Days & Themes - 10 pages",
          "Military Exercises - 10 pages",
          "Appointments - 10 pages",
          "Awards & Honours - 10 pages"
        ],
        highlights: [
          "Only crisp, exam-oriented facts",
          "Questions expected in upcoming PSSSB exams",
          "No theory, no fillers",
          "Maximum marks, minimum time"
        ]
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/pdf/create-purchase
 * Create PDF purchase and Razorpay order (requires auth)
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
    const receipt = `pdf_${timestamp}_${userIdShort}`;
    
    const pdfPrice = getPDFPrice();
    
    const options = {
      amount: pdfPrice * 100, // Convert to paise
      currency: "INR",
      receipt: receipt,
      notes: {
        type: "pdf_purchase",
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
      message: "Payment order created. Complete payment to receive the PDF.",
    });
  } catch (err) {
    console.error("Error creating PDF purchase:", err);
    
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
 * GET /api/pdf/my-purchases
 * Get user's PDF purchases (requires auth)
 */
const getMyPurchases = async (req, res, next) => {
  try {
    const { user } = req;
    const purchases = await PDFPurchase.find({
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
  getPDFInfo,
  createPurchase,
  getMyPurchases,
};

