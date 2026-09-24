// src/middleware/auth.js

const admin = require("../config/firebase-admin");
const User = require("../models/User");
const PyqsPurchase = require("../models/PyqsPurchase");
const jwt = require("jsonwebtoken");

/**
 * Verifies Firebase idToken OR Manual JWT token sent in Authorization header:
 * Authorization: Bearer <token>
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    console.log('🔍 Received token (first 50 chars):', token.substring(0, 50) + '...');

    let decoded;
    let isManualAuth = false;

    try {
      // Try to verify as Firebase token first
      decoded = await admin.auth().verifyIdToken(token);
      console.log('✅ Firebase token verified');
    } catch (firebaseError) {
      console.log('Firebase token verification failed, trying manual auth...');
      console.log('Firebase error:', firebaseError.message);
      
      // If Firebase verification fails, try manual JWT token
      try {
        const jwtSecret = process.env.JWT_SECRET || 'elite-academy-secret-key-2025';
        decoded = jwt.verify(token, jwtSecret);
        isManualAuth = true;
        console.log('✅ Manual JWT token verified');
        console.log('Decoded manual token:', { userId: decoded.userId, email: decoded.email });
      } catch (jwtError) {
        console.error("❌ JWT verification failed:", jwtError.message);
        console.error("Both token verifications failed");
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    if (isManualAuth) {
      if (decoded.isTypingAuth) {
        // Typing manual login: re-check expiry on every request
        const TypingPurchase = require("../models/TypingPurchase");
        const { isExpired } = require("../controllers/typingController");
        const purchase = await TypingPurchase.findById(decoded.purchaseId);

        if (!purchase || purchase.status !== "confirmed") {
          return res.status(401).json({ error: "Purchase not found or not confirmed" });
        }
        if (isExpired(purchase)) {
          return res.status(403).json({ code: "ACCESS_EXPIRED", error: "Access expired" });
        }

        req.user = {
          id: purchase._id.toString(),
          email: purchase.userEmail,
          name: purchase.userName,
          isTypingAuth: true
        };
      // Check if this is a PYQs auth token
      } else if (decoded.isPyqsAuth) {
        const purchase = await PyqsPurchase.findById(decoded.purchaseId);

        if (!purchase || purchase.status !== 'confirmed') {
          console.error("❌ PYQs purchase not found or not confirmed:", decoded.purchaseId);
          return res.status(401).json({ error: "Purchase not found or not confirmed" });
        }

        req.user = {
          id: purchase._id.toString(),
          email: purchase.email,
          name: purchase.fullName,
          isPyqsAuth: true
        };
        console.log('✅ PYQs auth user set:', req.user.email);
      } else {
        // Manual auth - user is in MongoDB with _id
        const user = await User.findById(decoded.userId);

        if (!user) {
          console.error("❌ User not found in MongoDB:", decoded.userId);
          return res.status(401).json({ error: "User not found" });
        }

        req.user = {
          id: user._id.toString(), // MongoDB ID for manual auth
          email: user.email,
          name: user.name,
          role: user.role,
          isManualAuth: true
        };
        console.log('✅ Manual auth user set:', req.user.email);
      }
    } else {
      // Firebase auth
      // Check if user already exists in MongoDB
      let user = await User.findOne({ firebaseUid: decoded.uid });

      // Attach Firebase decoded info to req.user for authController to use
      req.user = {
        id: decoded.uid, // This is the Firebase UID!
        email: decoded.email,
        name: decoded.name || decoded.display_name,
        photoUrl: decoded.picture,
        role: user ? user.role : 'user',
        isManualAuth: false
      };
      console.log('✅ Firebase auth user set:', req.user.email);
    }

    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = auth;
