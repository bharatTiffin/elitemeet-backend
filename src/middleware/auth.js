// src/middleware/auth.js
const admin = require("../config/firebase");
const User = require("../models/User");

/**
 * Verifies Firebase idToken sent in Authorization header:
 * Authorization: Bearer <idToken>
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.displayName,
        photoUrl: decoded.picture,
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = auth;
