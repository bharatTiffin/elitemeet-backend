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

    const decoded = await admin.auth().verifyIdToken(token);
    
    // 🔥 ONLY FETCH USER - DON'T CREATE!
    let user = await User.findOne({ firebaseUid: decoded.uid });

    // Attach decoded Firebase info to req.user (authController will handle creation)
    req.user = {
      id: decoded.uid, // Use Firebase UID here
      email: decoded.email,
      name: decoded.name || decoded.display_name,
      photoUrl: decoded.picture,
      role: user ? user.role : 'user', // Use existing role if found
      mongoUser: user // Pass existing MongoDB user if found
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = auth;
