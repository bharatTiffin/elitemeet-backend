// src/controllers/authController.js

const User = require("../models/User");

/**
 * POST /api/auth/sync
 * Syncs Firebase user to MongoDB
 */
const syncUser = async (req, res, next) => {
  try {
    // req.user is set by auth middleware (from Firebase token)
    const { id, email, name, role } = req.user;

    // 🔥 SAVE/UPDATE USER IN MONGODB
    const user = await User.findOneAndUpdate(
      { firebaseUid: id }, // Find by Firebase UID
      {
        firebaseUid: id,
        email: email,
        name: name || email.split('@')[0], // Use email prefix if no name
        role: role || 'user', // Default to 'user'
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        setDefaultsOnInsert: true
      }
    );

    console.log('✅ User synced to MongoDB:', user);

    res.json({
      success: true,
      message: "User synced successfully",
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Error syncing user:', err);
    next(err);
  }
};

module.exports = {
  syncUser,
};
