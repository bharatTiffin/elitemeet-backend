// src/middleware/auth.js

const admin = require("../config/firebase-admin");
const User = require("../models/User");

/**
 * Verifies Firebase idToken sent in Authorization header:
 * Authorization: Bearer <token>
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    
    // Check if user already exists in MongoDB
    let user = await User.findOne({ firebaseUid: decoded.uid });

    // Attach Firebase decoded info to req.user for authController to use
    req.user = {
      id: decoded.uid, // This is the Firebase UID!
      email: decoded.email,
      name: decoded.name || decoded.display_name,
      photoUrl: decoded.picture,
      role: user ? user.role : 'user'
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = auth;
