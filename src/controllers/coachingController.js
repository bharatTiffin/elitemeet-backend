const CoachingEnrollment = require("../models/CoachingEnrollment");
const CrashCoachingEnrollment = require("../models/CrashCourse");
const weeklytestSeries = require("../models/WeeklyTestSeries");
const sectionalTestSeries = require("../models/SectionalTestSeries");
const User = require("../models/User");
const Razorpay = require("razorpay");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {sendCoachingEmail,sendCrashCourseEmail,sendPaymentReminderEmail} = require("../utils/email");

const getPDFLinks = () => ({
  'polity': process.env.POLITY_PDF_LINK,
  'economics': process.env.ECONOMICS_PDF_LINK,
  'geography': process.env.GEOGRAPHY_PDF_LINK,
  'environment': process.env.ENVIRONMENT_PDF_LINK,
  'science': process.env.SCIENCE_PDF_LINK,
  'modern-history': process.env.MODERN_HISTORY_PDF_LINK,  // ✅ Hyphen
  'ancient-history': process.env.ANCIENT_HISTORY_PDF_LINK,  // ✅ Hyphen
  'medieval-history': process.env.MEDIEVAL_HISTORY_PDF_LINK  // ✅ Hyphen
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getInfo = async (req, res) => {
  console.log("Coaching info requested");
  console.log("Current coaching price from env:", process.env.COACHING_PRICE);
  res.json({
    package: {
      name: "⏰ Complete Online Coaching Program with Tracker App",
      price: process.env.COACHING_PRICE || 5999,
      originalPrice: 12999,
      description: "Prepare smart with live + recorded classes and 23,000+ PYQs."
    }
  });
};

exports.enrollAndCreateOrder = async (req, res) => {
  try {
    const { fullName, fatherName, mobile, password, email } = req.body;
    console.log("Enrollment request received for:", email);
    const amount = process.env.COACHING_PRICE || 5999;
    console.log("Using coaching price:", amount);
    // Basic validation
    if (!fullName || !fatherName || !mobile || !password || !email) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // 1. Create Razorpay Order
    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { purchaseType: "coaching", userEmail: email }
    };

    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created:", order);
    // 2. Save Enrollment Data (Pending)
    const userFirebaseUid = (req.user && req.user.id) || req.body.userFirebaseUid || null;
    const newEnrollment = new CoachingEnrollment({
      userFirebaseUid,
      fullName,
      email,
      fatherName,
      mobile,
      appPassword: password,
      amount,
      razorpayOrderId: order.id,
      status: "pending"
    });

    console.log("Saving new enrollment to DB:", newEnrollment);
    await newEnrollment.save();



    try {
      const payload = {
        order,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
      };
      console.log('Sending enrollment response payload for order:', order.id);
      res.status(201).json(payload);
    } catch (sendErr) {
      console.error('Error sending enrollment response:', sendErr);
      // If sending fails, return minimal success info
      try {
        res.status(201).json({ orderId: order.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
      } catch (finalErr) {
        console.error('Final error sending enrollment response:', finalErr);
        res.status(500).json({ message: 'Error creating enrollment (response send failed)', error: finalErr.message });
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Error creating enrollment", error: error.message });
  }
};

exports.checkAccess = async (req, res) => {
  try {
    console.log("API hit of the checkAccess")
    const { email } = req.query;
    console.log("Checking access for email:", email);

    // Validate email parameter
    if (!email) {
      return res.status(400).json({ 
        hasAccess: false, 
        message: "Email parameter is required" 
      });
    }

    // Find enrollment with confirmed status for the given email (case-insensitive)
    const confirmedEnrollment = await CoachingEnrollment.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
      status: "confirmed"
    });
    console.log("Found confirmed enrollment:", confirmedEnrollment);

    // Return access status
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


exports.checkCrashCourseAccess = async (req, res) => {
  try {
    console.log("API hit of the checkAccess")
    const { email } = req.query;

    // Validate email parameter
    if (!email) {
      return res.status(400).json({ 
        hasAccess: false, 
        message: "Email parameter is required" 
      });
    }

    // Find enrollment with confirmed status for the given email
    const confirmedEnrollment = await CrashCoachingEnrollment.findOne({
      email: email,
      status: "confirmed"
    });

    // Return access status
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
    const { fullName, fatherName, mobile, password, email, amount, sendEmail, type = "student", paymentType = "full", pendingPaymentAmount, paymentExpiryDate } = req.body;

    console.log(" Admin adding enrollment for:", email);

    // Validation
    if (!fullName || !fatherName || !mobile || !password || !email) {
      return res.status(400).json({ 
        message: "All fields are required",
        required: ["fullName", "fatherName", "mobile", "password", "email"]
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Mobile validation (Indian format)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        message: "Invalid mobile number. Must be 10 digits starting with 6-9" 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters" 
      });
    }

    // Partial payment validation
    if (paymentType === "partial") {
      if (!pendingPaymentAmount || pendingPaymentAmount <= 0) {
        return res.status(400).json({ 
          message: "Pending payment amount is required for partial payment" 
        });
      }
      if (!paymentExpiryDate) {
        return res.status(400).json({ 
          message: "Payment expiry date is required for partial payment" 
        });
      }
    }

    // Check if user already has confirmed enrollment
    const existingEnrollment = await CoachingEnrollment.findOne({
      email: email.toLowerCase(),
      status: "confirmed"
    });

    if (existingEnrollment) {
      return res.status(400).json({ 
        message: "User already has a confirmed enrollment",
        enrollmentMode: existingEnrollment.enrollmentMode
      });
    }

    // Check if user already exists in User collection
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log("✅ User already exists, using existing account");
    } else {
      // Create new manual user account
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        signupType: 'manual',
        role: 'user'
      });

      console.log("✅ New user account created:", {
        mongoId: user._id,
        email: user.email,
        name: user.name
      });
    }

    // Create enrollment directly as confirmed (admin mode)
    const newEnrollment = new CoachingEnrollment({
      userFirebaseUid: user._id.toString(),
      fullName,
      email: email.toLowerCase(),
      fatherName,
      mobile,
      appPassword: password,
      amount: amount || process.env.COACHING_PRICE || 5999,
      razorpayOrderId: `admin_${Date.now()}_${user._id}`, // Generate unique dummy order ID
      status: "confirmed",
      enrollmentMode: "admin",
      addedByAdmin: req.user.email,
      type: type || "student",
      expiresAt: null,
      paymentType: paymentType || "full",
      pendingPaymentAmount: paymentType === "partial" ? pendingPaymentAmount : undefined,
      paymentExpiryDate: paymentType === "partial" ? new Date(paymentExpiryDate) : undefined
    });

    await newEnrollment.save();

    console.log(`✅ Admin ${req.user.email} added enrollment for ${email}`);

    console.log("sendEmail: ",sendEmail);
    if(sendEmail){
      console.log("sendCoachingEmail function called!!");
      const pdfLinks = getPDFLinks();
      await sendCoachingEmail(newEnrollment,pdfLinks,paymentId="scanner");
      console.log("Work done!!");
    }

    res.status(201).json({
      success: true,
      message: "Student enrolled successfully by admin",
      enrollment: {
        id: newEnrollment._id,
        email: newEnrollment.email,
        fullName: newEnrollment.fullName,
        mobile: newEnrollment.mobile,
        status: newEnrollment.status,
        enrollmentMode: newEnrollment.enrollmentMode,
        addedBy: req.user.email,
        amount: newEnrollment.amount
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        wasNewlyCreated: !existingEnrollment
      }
    });

  } catch (error) {
    console.error("❌ Error adding enrollment:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error adding enrollment", 
      error: error.message 
    });
  }
};



exports.admincrashAddEnrollment = async (req, res) => {
  try {
    const { fullName, fatherName, mobile, password, email, amount, sendEmail } = req.body;

    console.log("🔍 Admin adding enrollment for:", email);

    // Validation
    if (!fullName || !fatherName || !mobile || !password || !email) {
      return res.status(400).json({ 
        message: "All fields are required",
        required: ["fullName", "fatherName", "mobile", "password", "email"]
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Mobile validation (Indian format)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        message: "Invalid mobile number. Must be 10 digits starting with 6-9" 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters" 
      });
    }

    // Check if user already has confirmed enrollment
    const existingEnrollment = await CrashCoachingEnrollment.findOne({
      email: email.toLowerCase(),
      status: "confirmed"
    });

    if (existingEnrollment) {
      return res.status(400).json({ 
        message: "User already has a confirmed enrollment",
        enrollmentMode: existingEnrollment.enrollmentMode
      });
    }

    // Check if user already exists in User collection
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log("✅ User already exists, using existing account");
    } else {
      // Create new manual user account
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        signupType: 'manual',
        role: 'user'
      });

      console.log("✅ New user account created:", {
        mongoId: user._id,
        email: user.email,
        name: user.name
      });
    }

    // Create enrollment directly as confirmed (admin mode)
    const newEnrollment = new CrashCoachingEnrollment({
      userFirebaseUid: user._id.toString(),
      fullName,
      email: email.toLowerCase(),
      fatherName,
      mobile,
      appPassword: password,
      amount: amount || process.env.COACHING_PRICE || 5999,
      razorpayOrderId: `admin_${Date.now()}_${user._id}`, // Generate unique dummy order ID
      status: "confirmed",
      enrollmentMode: "admin",
      addedByAdmin: req.user.email,
      expiresAt: null
    });

    await newEnrollment.save();

    console.log(`✅ Admin ${req.user.email} added enrollment for ${email}`);
    
    console.log("sendEmail: ",sendEmail);
    if(sendEmail){
      console.log("sendCrashCourseEmail function called!!");
      const pdfLinks = getPDFLinks();
      await sendCrashCourseEmail(newEnrollment,pdfLinks,paymentId="scanner");
      console.log("Work done!!");
    }
    
    res.status(201).json({
      success: true,
      message: "Student enrolled successfully by admin",
      enrollment: {
        id: newEnrollment._id,
        email: newEnrollment.email,
        fullName: newEnrollment.fullName,
        mobile: newEnrollment.mobile,
        status: newEnrollment.status,
        enrollmentMode: newEnrollment.enrollmentMode,
        addedBy: req.user.email,
        amount: newEnrollment.amount
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        wasNewlyCreated: !existingEnrollment
      }
    });

  } catch (error) {
    console.error("❌ Error adding enrollment:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error adding enrollment", 
      error: error.message 
    });
  }
};


// exports.admincrashAddEnrollment = async (req, res) => {
//   try {
//     const { fullName, fatherName, mobile, password, email, amount } = req.body;

//     console.log("🔍 Admin adding enrollment for:", email);

//     // Validation
//     if (!fullName || !fatherName || !mobile || !password || !email) {
//       return res.status(400).json({ 
//         message: "All fields are required",
//         required: ["fullName", "fatherName", "mobile", "password", "email"]
//       });
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     // Mobile validation (Indian format)
//     const mobileRegex = /^[6-9]\d{9}$/;
//     if (!mobileRegex.test(mobile)) {
//       return res.status(400).json({ 
//         message: "Invalid mobile number. Must be 10 digits starting with 6-9" 
//       });
//     }

//     // Password validation
//     if (password.length < 6) {
//       return res.status(400).json({ 
//         message: "Password must be at least 6 characters" 
//       });
//     }

//     // Check if user already has confirmed enrollment
//     const existingEnrollment = await CrashCoachingEnrollment.findOne({
//       email: email.toLowerCase(),
//       status: "confirmed"
//     });

//     if (existingEnrollment) {
//       return res.status(400).json({ 
//         message: "User already has a confirmed enrollment",
//         enrollmentMode: existingEnrollment.enrollmentMode
//       });
//     }

//     // Check if user already exists in User collection
//     let user = await User.findOne({ email: email.toLowerCase() });
    
//     if (user) {
//       console.log("✅ User already exists, using existing account");
//     } else {
//       // Create new manual user account
//       const hashedPassword = await bcrypt.hash(password, 10);
      
//       user = await User.create({
//         email: email.toLowerCase(),
//         password: hashedPassword,
//         name: fullName,
//         signupType: 'manual',
//         role: 'user'
//       });

//       console.log("✅ New user account created:", {
//         mongoId: user._id,
//         email: user.email,
//         name: user.name
//       });
//     }

//     // Create enrollment directly as confirmed (admin mode)
//     const newEnrollment = new CrashCoachingEnrollment({
//       userFirebaseUid: user._id.toString(),
//       fullName,
//       email: email.toLowerCase(),
//       fatherName,
//       mobile,
//       appPassword: password,
//       amount: amount || process.env.COACHING_PRICE || 5999,
//       razorpayOrderId: `admin_${Date.now()}_${user._id}`, // Generate unique dummy order ID
//       status: "confirmed",
//       enrollmentMode: "admin",
//       addedByAdmin: req.user.email,
//       expiresAt: null
//     });

//     await newEnrollment.save();

//     console.log(`✅ Admin ${req.user.email} added enrollment for ${email}`);

//     res.status(201).json({
//       success: true,
//       message: "Student enrolled successfully by admin",
//       enrollment: {
//         id: newEnrollment._id,
//         email: newEnrollment.email,
//         fullName: newEnrollment.fullName,
//         mobile: newEnrollment.mobile,
//         status: newEnrollment.status,
//         enrollmentMode: newEnrollment.enrollmentMode,
//         addedBy: req.user.email,
//         amount: newEnrollment.amount
//       },
//       user: {
//         id: user._id,
//         email: user.email,
//         name: user.name,
//         wasNewlyCreated: !existingEnrollment
//       }
//     });

//   } catch (error) {
//     console.error("❌ Error adding enrollment:", error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         message: "User with this email already exists" 
//       });
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: "Error adding enrollment", 
//       error: error.message 
//     });
//   }
// };

exports.adminweeklyAddEnrollment = async (req, res) => {
  try {
    const { fullName, fatherName, mobile, password, email, amount } = req.body;

    console.log("🔍 Admin adding enrollment for:", email);

    // Validation
    if (!fullName || !fatherName || !mobile || !password || !email) {
      return res.status(400).json({ 
        message: "All fields are required",
        required: ["fullName", "fatherName", "mobile", "password", "email"]
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Mobile validation (Indian format)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        message: "Invalid mobile number. Must be 10 digits starting with 6-9" 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters" 
      });
    }

    // Check if user already has confirmed enrollment
    const existingEnrollment = await weeklytestSeries.findOne({
      email: email.toLowerCase(),
      status: "confirmed"
    });

    if (existingEnrollment) {
      return res.status(400).json({ 
        message: "User already has a confirmed enrollment",
        enrollmentMode: existingEnrollment.enrollmentMode
      });
    }

    // Check if user already exists in User collection
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log("✅ User already exists, using existing account");
    } else {
      // Create new manual user account
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        signupType: 'manual',
        role: 'user'
      });

      console.log("✅ New user account created:", {
        mongoId: user._id,
        email: user.email,
        name: user.name
      });
    }

    // Create enrollment directly as confirmed (admin mode)
    const newEnrollment = new weeklytestSeries({
      userFirebaseUid: user._id.toString(),
      fullName,
      email: email.toLowerCase(),
      fatherName,
      mobile,
      appPassword: password,
      amount: amount,
      razorpayOrderId: `admin_${Date.now()}_${user._id}`, // Generate unique dummy order ID
      status: "confirmed",
      enrollmentMode: "admin",
      addedByAdmin: req.user.email,
      expiresAt: null
    });

    await newEnrollment.save();

    console.log(`✅ Admin ${req.user.email} added enrollment for ${email}`);

    res.status(201).json({
      success: true,
      message: "Student enrolled successfully by admin",
      enrollment: {
        id: newEnrollment._id,
        email: newEnrollment.email,
        fullName: newEnrollment.fullName,
        mobile: newEnrollment.mobile,
        status: newEnrollment.status,
        enrollmentMode: newEnrollment.enrollmentMode,
        addedBy: req.user.email,
        amount: newEnrollment.amount
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        wasNewlyCreated: !existingEnrollment
      }
    });

  } catch (error) {
    console.error("❌ Error adding enrollment:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Error adding enrollment", 
      error: error.message 
    });
  }
};



exports.checkWeeklyAccess = async (req, res) => {
  try {
    console.log("API hit of the checkAccess")
    const { email } = req.query;

    // Validate email parameter
    if (!email) {
      return res.status(400).json({ 
        hasAccess: false, 
        message: "Email parameter is required" 
      });
    }

    // Find enrollment with confirmed status for the given email
    const confirmedEnrollment = await weeklytestSeries.findOne({
      email: email,
      status: "confirmed"
    });

    // Return access status
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

exports.checkSectionalTestAccess = async (req, res) => {
  try {
    console.log("API hit of the checkSectionalTestAccess")
    const { email } = req.query;

    // Validate email parameter
    if (!email) {
      return res.status(400).json({ 
        hasAccess: false, 
        message: "Email parameter is required" 
      });
    }
    console.log("Checking access for email:", email);
    // Find enrollment with confirmed status for the given email
    const confirmedEnrollment = await sectionalTestSeries.findOne({
      email: email,
      status: "confirmed"
    });

    // Return access status
    if (confirmedEnrollment) {
      console.log("✅ Confirmed enrollment found for email:", email);
      return res.status(200).json({ 
        hasAccess: true,
        message: "Access granted"
      });
    } else {
      console.log("❌ No confirmed enrollment found for email:", email);
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

exports.adminsectionalTestAddEnrollment = async (req, res) => {
  try {
    console.log("Request from Admin to add Sectional Test Series enrollment", req.body);
    const { email, fullName, mobile, appPassword, status } = req.body;

    if (!email || !fullName || !mobile || !appPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, fullName, mobile, and appPassword are required.",
      });
    }

    // Check if enrollment already exists
    let existingEnrollment = await sectionalTestSeries.findOne({ email });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "User already enrolled in Sectional Test Series.",
      });
    }

    // Create new enrollment
    const newEnrollment = new sectionalTestSeries({
      email,
      fullName,
      mobile,
      appPassword,
      status: status || "confirmed", // Default to confirmed for admin additions
    });

    await newEnrollment.save();
    console.log("Sectional Test Series enrollment added:", newEnrollment);

    return res.status(201).json({
      success: true,
      message: "Sectional Test Series enrollment added successfully.",
      data: newEnrollment,
    });
  } catch (error) {
    console.error("Error adding Sectional Test Series enrollment:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding enrollment",
      error: error.message,
    });
  }
};

// Get students with pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const pendingStudents = await CoachingEnrollment.find({
      paymentType: "partial",
      status: { $in: ["confirmed", "fee_pending"] }
    }).sort({ paymentExpiryDate: 1 });

    res.status(200).json({
      success: true,
      students: pendingStudents
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending payments",
      error: error.message
    });
  }
};

// Suspend student (change status to fee_pending)
exports.suspendStudent = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await CoachingEnrollment.findByIdAndUpdate(
      enrollmentId,
      { status: "fee_pending" },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Student suspended successfully",
      enrollment
    });
  } catch (error) {
    console.error("Error suspending student:", error);
    res.status(500).json({
      success: false,
      message: "Error suspending student",
      error: error.message
    });
  }
};

// Send payment reminder email
exports.sendPaymentReminder = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await CoachingEnrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    await sendPaymentReminderEmail(enrollment);

    res.status(200).json({
      success: true,
      message: "Payment reminder email sent successfully"
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    res.status(500).json({
      success: false,
      message: "Error sending payment reminder",
      error: error.message
    });
  }
};