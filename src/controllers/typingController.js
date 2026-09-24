// src/controllers/typingController.js
const Razorpay = require("razorpay");
const TypingPurchase = require("../models/TypingPurchase");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ACCESS_MONTHS = 6;

// Random 6-digit numeric password, skipping guessable ones (123456, 111111, 000123...)
const generateNumericPassword = () => {
  while (true) {
    const pwd = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const digits = pwd.split("").map(Number);
    const allSame = digits.every((d) => d === digits[0]);
    const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
    const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
    if (!allSame && !ascending && !descending) return pwd;
  }
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Access end date: stored value, or purchaseDate + 6 months for legacy rows
const getExpiryDate = (purchase) =>
  purchase.expiresAt || addMonths(purchase.purchaseDate || Date.now(), ACCESS_MONTHS);

const isExpired = (purchase) => getExpiryDate(purchase) <= new Date();

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findConfirmedPurchasesByEmail = (email) =>
  TypingPurchase.find({
    userEmail: new RegExp(`^${escapeRegex(String(email).trim())}$`, "i"),
    status: "confirmed",
  }).sort({ purchaseDate: -1 });

// Get typing course info (price, description, etc.)
const getTypingInfo = async (req, res, next) => {
  try {
    const getTypingPrice = () => 799;

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
const createTypingPurchase = async (req, res, next) => {
  try {
    const { user } = req; // Optional if authenticated
    const { userName: bodyUserName, fullName, userEmail: bodyUserEmail, email } = req.body || {};
    const finalEmail = user?.email || bodyUserEmail || email;
    const finalUserName = user?.name || user?.displayName || bodyUserName || fullName;
    const finalFirebaseUid = user?.id || (finalEmail ? String(finalEmail).toLowerCase() : null);

    if (!finalEmail || !finalUserName) {
      return res.status(400).json({ error: "Name and email are required to continue" });
    }

    const getTypingPrice = () => 799;

    const typingPrice = getTypingPrice();

    // Create Razorpay order
    const options = {
      amount: typingPrice * 100, // Convert to paise
      currency: "INR",
      receipt: `typing_${Date.now()}`,
      notes: {
        type: "typing_purchase",
        userFirebaseUid: finalFirebaseUid,
        userName: finalUserName,
        userEmail: finalEmail,
      },
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay order created:", order.id);

    // Create purchase record in database with pending status
    const purchase = new TypingPurchase({
      userFirebaseUid: finalFirebaseUid,
      userName: finalUserName,
      userEmail: finalEmail,
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
      console.log("req.user: ",req.user);
      console.log("user:",user);

      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
  
      // ✅ FIX: Use user.id instead of user.firebaseUid
      // const userFirebaseUid = user.id || user.firebaseUid || user.email;
      // console.log("user.id",user?.id);
      // console.log("user.firebaseUid: ",user?.firebaseUid)
  
      const purchases = await findConfirmedPurchasesByEmail(user.email);
      const active = purchases.find((p) => !isExpired(p));

      if (active) {
        return res.json({
          hasAccess: true,
          purchase: {
            purchaseDate: active.purchaseDate,
            amount: active.amount,
            expiresAt: getExpiryDate(active),
          }
        });
      }

      // Purchased before but every purchase has lapsed
      res.json({ hasAccess: false, expired: purchases.length > 0 });
    } catch (error) {
      console.error("Error checking typing access:", error);
      next(error);
    }
  };

// Manual login with the email + 6-digit password sent after payment
const typingManualLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const purchases = await findConfirmedPurchasesByEmail(email);
    const matches = purchases.filter((p) => p.password && p.password === String(password).trim());

    if (matches.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const active = matches.find((p) => !isExpired(p));
    if (!active) {
      return res.status(403).json({
        code: "ACCESS_EXPIRED",
        error: "Your 6-month access has expired. Please purchase the course again.",
      });
    }

    const expiresAt = getExpiryDate(active);
    const jwtSecret = process.env.JWT_SECRET || "elite-academy-secret-key-2025";
    // Token never outlives the course access
    const expiresInSec = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const token = jwt.sign(
      { isTypingAuth: true, purchaseId: active._id.toString(), email: active.userEmail },
      jwtSecret,
      { expiresIn: expiresInSec }
    );

    res.json({
      token,
      email: active.userEmail,
      name: active.userName,
      expiresAt,
    });
  } catch (error) {
    console.error("Error in typing manual login:", error);
    next(error);
  }
};

module.exports = {
  getTypingInfo,
  createTypingPurchase,
  getMyTypingPurchases,
  checkTypingAccess,
  typingManualLogin,
  generateNumericPassword,
  addMonths,
  ACCESS_MONTHS,
  isExpired,
  getExpiryDate,
};
