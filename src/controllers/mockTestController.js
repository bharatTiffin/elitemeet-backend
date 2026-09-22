const MockTestEnrollment = require("../models/MockTestEnrollment");
const User = require("../models/User");
const Razorpay = require("razorpay");
const bcrypt = require("bcrypt");
const { sendMockTestEmail } = require("../utils/email");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getInfo = async (req, res) => {
  res.json({
    package: {
      name: "🎯 Prep Mode — Mock Test & Weak Topic Tracker",
      price: process.env.MOCK_TEST_PRICE || 999,
      originalPrice: 1999,
      description: "For students who've finished the syllabus and want to know exactly where they stand. Take a Mock Test, get your weak topics, drill 100+ questions per topic, and only then unlock your next Mock Test — so your score climbs every round."
    }
  });
};

exports.enrollAndCreateOrder = async (req, res) => {
  try {
    const { fullName, fatherName, mobile, email, agreedToTerms } = req.body;
    const amount = process.env.MOCK_TEST_PRICE || 999;

    if (!fullName || !fatherName || !mobile || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!agreedToTerms) {
      return res.status(400).json({ message: "You must agree to the terms and conditions" });
    }

    // 1. Create Razorpay Order
    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { purchaseType: "mock_test", userEmail: email }
    };

    const order = await razorpay.orders.create(options);

    // 2. Save Enrollment Data (Pending) — app password always defaults to 123456
    const newEnrollment = new MockTestEnrollment({
      fullName,
      email,
      fatherName,
      mobile,
      appPassword: "123456",
      amount,
      razorpayOrderId: order.id,
      status: "pending"
    });

    await newEnrollment.save();

    res.status(201).json({
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating enrollment", error: error.message });
  }
};

exports.checkAccess = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        hasAccess: false,
        message: "Email parameter is required"
      });
    }

    const confirmedEnrollment = await MockTestEnrollment.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
      status: "confirmed"
    });

    if (confirmedEnrollment) {
      return res.status(200).json({
        hasAccess: true,
        message: "Access granted"
      });
    } else {
      return res.status(200).json({
        hasAccess: false,
        message: "No confirmed enrollment found"
      });
    }
  } catch (error) {
    return res.status(500).json({
      hasAccess: false,
      message: "Error checking access",
      error: error.message
    });
  }
};

exports.adminAddEnrollment = async (req, res) => {
  try {
    const { fullName, fatherName, mobile, email, amount, sendEmail } = req.body;

    if (!fullName || !fatherName || !mobile || !email) {
      return res.status(400).json({
        message: "All fields are required",
        required: ["fullName", "fatherName", "mobile", "email"]
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        message: "Invalid mobile number. Must be 10 digits starting with 6-9"
      });
    }

    const existingEnrollment = await MockTestEnrollment.findOne({
      email: email.toLowerCase(),
      status: "confirmed"
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message: "User already has confirmed Prep Mode access"
      });
    }

    // Find-or-create the website User account (password always 123456)
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        signupType: 'manual',
        role: 'user'
      });
    }

    const newEnrollment = new MockTestEnrollment({
      fullName,
      email: email.toLowerCase(),
      fatherName,
      mobile,
      appPassword: "123456",
      amount: amount || process.env.MOCK_TEST_PRICE || 999,
      razorpayOrderId: `admin_${Date.now()}_${user._id}`,
      status: "confirmed",
      addedByAdmin: req.user.email
    });

    await newEnrollment.save();

    if (sendEmail) {
      await sendMockTestEmail(newEnrollment, "admin_granted");
    }

    res.status(201).json({
      success: true,
      message: "Prep Mode access granted successfully",
      enrollment: {
        id: newEnrollment._id,
        email: newEnrollment.email,
        fullName: newEnrollment.fullName,
        mobile: newEnrollment.mobile,
        status: newEnrollment.status,
        addedBy: req.user.email,
        amount: newEnrollment.amount
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "User with this email already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Error granting access",
      error: error.message
    });
  }
};
