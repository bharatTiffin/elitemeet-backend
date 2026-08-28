// src/controllers/authController.js

const User = require("../models/User");
const PyqsPurchase = require("../models/PyqsPurchase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * POST /api/auth/sync
 * Syncs Firebase user to MongoDB
 */
const syncUser = async (req, res, next) => {
  try {
    // req.user is set by auth middleware (from Firebase token)
    const { id, email, name, role } = req.user;

    console.log('🔍 Syncing user with Firebase UID:', id);

    // 🔥 SAVE/UPDATE USER IN MONGODB - Using firebaseUid as unique identifier
    const user = await User.findOneAndUpdate(
      { firebaseUid: id }, // Find by Firebase UID (prevents duplicates!)
      {
        firebaseUid: id,
        email: email,
        name: name || email.split('@')[0], // Use email prefix if no name
        role: role || 'user', // Default to 'user'
        signupType: 'google',
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    console.log('✅ User synced to MongoDB:', {
      mongoId: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: "User synced successfully",
      user: {
        id: user._id.toString(), // MongoDB ID
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

/**
 * POST /api/auth/signup
 * Manual signup with email and password
 */
const manualSignup = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validation
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and phone number are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a valid 10-digit number"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone: phone.trim(),
      signupType: 'manual',
      role: 'user'
    });

    // Generate JWT token for manual auth
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        isManualAuth: true
      },
      process.env.JWT_SECRET || 'elite-academy-secret-key-2025',
      { expiresIn: '7d' }
    );

    console.log('✅ User created manually:', {
      mongoId: user._id,
      email: user.email,
      name: user.name
    });

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Error in manual signup:', err);
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Manual login with email and password
 */
const manualLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if user has a password (manual signup)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account was created with Google. Please sign in with Google."
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT token for manual auth
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        isManualAuth: true
      },
      process.env.JWT_SECRET || 'elite-academy-secret-key-2025',
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in manually:', {
      mongoId: user._id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ Error in manual login:', err);
    next(err);
  }
};

/**
 * POST /api/auth/pyqs-login
 * PYQs book login with email and appPassword (authenticates against PyqsPurchase)
 */
const pyqsLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find purchase by email and confirmed status
    const purchase = await PyqsPurchase.findOne({
      email: email.toLowerCase(),
      status: 'confirmed'
    });

    if (!purchase) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password, or purchase not confirmed"
      });
    }

    // Compare plain text passwords (as per model comment, passwords are stored in plain text)
    if (purchase.appPassword !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        purchaseId: purchase._id.toString(),
        email: purchase.email,
        fullName: purchase.fullName,
        isPyqsAuth: true
      },
      process.env.JWT_SECRET || 'Im12@khorejohn',
      { expiresIn: '30d' } // 30 days to minimize backend calls
    );

    console.log('✅ PYQs user logged in:', {
      purchaseId: purchase._id,
      email: purchase.email,
      fullName: purchase.fullName
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: purchase._id.toString(),
        email: purchase.email,
        fullName: purchase.fullName,
      },
    });
  } catch (err) {
    console.error('❌ Error in PYQs login:', err);
    next(err);
  }
};

module.exports = {
  syncUser,
  manualSignup,
  manualLogin,
  pyqsLogin,
};
