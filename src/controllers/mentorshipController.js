// src/controllers/mentorshipController.js
const Razorpay = require("razorpay");
const MentorshipProgram = require("../models/MentorshipProgram");
const MentorshipEnrollment = require("../models/MentorshipEnrollment");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * GET /api/mentorship/program
 * Get mentorship program details (public)
 */
const getProgram = async (req, res, next) => {
  try {
    const program = await MentorshipProgram.getProgram();
    res.json({
      success: true,
      program: {
        _id: program._id,
        name: program.name,
        description: program.description,
        price: program.price,
        totalSeats: program.totalSeats,
        enrolledCount: program.enrolledCount,
        availableSeats: program.totalSeats - program.enrolledCount,
        isActive: program.isActive,
        features: program.features,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/mentorship/create-enrollment
 * Create enrollment and Razorpay order (requires auth)
 */
const createEnrollment = async (req, res, next) => {
  try {
    const { user } = req; // From auth middleware
    const { purpose } = req.body;

    // Get program details
    const program = await MentorshipProgram.getProgram();

    if (!program.isActive) {
      return res.status(400).json({ error: "Mentorship program is currently inactive" });
    }

    // Check available seats
    const availableSeats = program.totalSeats - program.enrolledCount;
    if (availableSeats <= 0) {
      return res.status(400).json({ error: "No seats available. All seats are booked." });
    }

    // Check if user already enrolled
    const existingEnrollment = await MentorshipEnrollment.findOne({
      userFirebaseUid: user.id,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingEnrollment) {
      return res.status(400).json({ 
        error: "You already have an active enrollment. Please complete or cancel your existing enrollment first." 
      });
    }

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
    // Receipt must be max 40 characters - use shortened format
    const timestamp = Date.now().toString().slice(-10); // Last 10 digits
    const userIdShort = user.id.substring(0, 8); // First 8 chars of Firebase UID
    const receipt = `ment_${timestamp}_${userIdShort}`; // Total: ~22 chars, well under 40
    
    const options = {
      amount: program.price * 100, // Convert to paise
      currency: "INR",
      receipt: receipt,
      notes: {
        type: "mentorship_enrollment",
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

    // Create enrollment record
    const enrollment = new MentorshipEnrollment({
      userFirebaseUid: user.id,
      userName: user.name || userDoc.name,
      userEmail: user.email || userDoc.email,
      amount: program.price,
      razorpayOrderId: order.id,
      status: "pending",
    });

    await enrollment.save();

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      enrollment: {
        id: enrollment._id,
        amount: enrollment.amount,
      },
    });
  } catch (err) {
    console.error("Error creating enrollment:", err);
    
    // Provide more specific error messages
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
    
    // For other errors, pass to error handler
    next(err);
  }
};

/**
 * GET /api/mentorship/enrollments
 * Get all enrollments (admin only)
 */
const getAllEnrollments = async (req, res, next) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ firebaseUid: req.user.id });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const enrollments = await MentorshipEnrollment.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      enrollments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/mentorship/my-enrollment
 * Get user's enrollment (requires auth)
 */
const getMyEnrollment = async (req, res, next) => {
  try {
    const { user } = req;
    const enrollment = await MentorshipEnrollment.findOne({
      userFirebaseUid: user.id,
      status: { $in: ["pending", "confirmed"] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      enrollment: enrollment || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/mentorship/program
 * Update program settings (admin only)
 */
const updateProgram = async (req, res, next) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ firebaseUid: req.user.id });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, price, totalSeats, isActive, features } = req.body;

    const program = await MentorshipProgram.getProgram();

    // Validate seats
    if (totalSeats !== undefined) {
      if (totalSeats < program.enrolledCount) {
        return res.status(400).json({ 
          error: `Cannot set total seats to ${totalSeats}. There are already ${program.enrolledCount} enrolled students.` 
        });
      }
    }

    // Update fields
    if (name !== undefined) program.name = name;
    if (description !== undefined) program.description = description;
    if (price !== undefined) program.price = price;
    if (totalSeats !== undefined) program.totalSeats = totalSeats;
    if (isActive !== undefined) program.isActive = isActive;
    if (features !== undefined) program.features = features;

    await program.save();

    res.json({
      success: true,
      message: "Program updated successfully",
      program: {
        _id: program._id,
        name: program.name,
        description: program.description,
        price: program.price,
        totalSeats: program.totalSeats,
        enrolledCount: program.enrolledCount,
        availableSeats: program.totalSeats - program.enrolledCount,
        isActive: program.isActive,
        features: program.features,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProgram,
  createEnrollment,
  getAllEnrollments,
  getMyEnrollment,
  updateProgram,
};

