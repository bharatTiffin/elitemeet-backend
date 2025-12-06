// src/controllers/authController.js

const User = require("../models/User");

/**
 * POST /api/auth/sync
 * Syncs Firebase user to MongoDB
 */
const syncUser = async (req, res, next) => {
  try {
    // req.user is set by auth middleware
    const { id, email, name, role } = req.user;

    res.json({
      success: true,
      message: "User synced successfully",
      user: { id, email, name, role },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  syncUser,
};
