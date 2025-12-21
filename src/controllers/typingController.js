// src/controllers/typingController.js
const Razorpay = require("razorpay");
const TypingPurchase = require("../models/TypingPurchase");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get typing course info (price, description, etc.)
const getTypingInfo = async (req, res, next) => {
  try {
    // Get typing price from environment variable
    const getTypingPrice = () => {
      const price = process.env.TYPING_PRICE;
      if (price) {
        const parsedPrice = parseInt(price, 10);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          return parsedPrice;
        }
      }
      return 499; // Default price
    };

    const typingInfo = {
      title: "PUNJABI & ENGLISH TYPING TRAINING",
      subtitle: "CLERK / SENIOR ASSISTANT LEVEL",
      description: "Learn Punjabi and English typing exactly as required for Clerk & Senior Assistant exams.",
      features: [
        "Same exam pattern • Same difficulty level • Real test practice",
        "Suitable for beginners & experienced students",
        "Step-by-step Punjabi typing learning (from zero)",
        "Speed + accuracy focused training",
        "Exam-oriented practice & mock tests"
      ],
      price: getTypingPrice(),
      currency: "INR",
    };

    res.json({ typing: typingInfo });
  } catch (error) {
    console.error("Error getting typing info:", error);
    next(error);
  }
};

// Create typing course purchase
// Create typing course purchase
const createTypingPurchase = async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      console.log("🔍 User object from auth middleware:", user); // Debug log
  
      // ✅ FIX: Use user.id instead of user.firebaseUid
      const userFirebaseUid = user.id || user.firebaseUid;
      
      if (!userFirebaseUid) {
        console.error("❌ No Firebase UID found in user object:", user);
        return res.status(400).json({ error: "User identification failed" });
      }
  
      // Check if user already purchased
      const existingPurchase = await TypingPurchase.findOne({
        userFirebaseUid: userFirebaseUid, // ✅ FIXED
        status: "confirmed",
      });
  
      if (existingPurchase) {
        return res.status(400).json({
          error: "You have already purchased this course",
          message: "Check your email for access details"
        });
      }
  
      // Get typing price from environment
      const getTypingPrice = () => {
        const price = process.env.TYPING_PRICE;
        if (price) {
          const parsedPrice = parseInt(price, 10);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            return parsedPrice;
          }
        }
        return 499; // Default price
      };
  
      const typingPrice = getTypingPrice();
  
      // Create Razorpay order
      const options = {
        amount: typingPrice * 100, // Convert to paise
        currency: "INR",
        receipt: `typing_${Date.now()}`,
        notes: {
          type: "typing_purchase",
          userFirebaseUid: userFirebaseUid, // ✅ FIXED
          userName: user.name || user.email?.split('@')[0] || 'User',
          userEmail: user.email,
        },
      };
  
      const order = await razorpay.orders.create(options);
      console.log("✅ Razorpay order created:", order.id);
  
      // Create purchase record in database with pending status
      const purchase = new TypingPurchase({
        userFirebaseUid: userFirebaseUid, // ✅ FIXED
        userName: user.name || user.email?.split('@')[0] || 'User',
        userEmail: user.email,
        amount: typingPrice,
        razorpayOrderId: order.id,
        status: "pending",
      });
  
      await purchase.save();
      console.log("✅ Typing purchase created:", purchase._id);
  
      res.json({
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      console.error("Error creating typing purchase:", error);
      next(error);
    }
  };
  
// Get user's typing purchases
const getMyTypingPurchases = async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      // ✅ FIX: Use user.id instead of user.firebaseUid
      const userFirebaseUid = user.id || user.firebaseUid;
  
      const purchases = await TypingPurchase.find({
        userFirebaseUid: userFirebaseUid, // ✅ FIXED
      }).sort({ purchaseDate: -1 });
  
      res.json({ purchases });
    } catch (error) {
      console.error("Error fetching typing purchases:", error);
      next(error);
    }
  };
  
// Check if user has access to typing course
const checkTypingAccess = async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      // ✅ FIX: Use user.id instead of user.firebaseUid
      const userFirebaseUid = user.id || user.firebaseUid;
  
      const purchase = await TypingPurchase.findOne({
        userFirebaseUid: userFirebaseUid, // ✅ FIXED
        status: "confirmed",
      });
  
      if (purchase) {
        return res.json({
          hasAccess: true,
          purchase: {
            purchaseDate: purchase.purchaseDate,
            amount: purchase.amount
          }
        });
      }
  
      res.json({ hasAccess: false });
    } catch (error) {
      console.error("Error checking typing access:", error);
      next(error);
    }
  };
  

module.exports = {
  getTypingInfo,
  createTypingPurchase,
  getMyTypingPurchases,
  checkTypingAccess,
};
