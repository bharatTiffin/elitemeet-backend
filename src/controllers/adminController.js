const CoachingEnrollment = require("../models/CoachingEnrollment");
const CrashCourse = require("../models/CrashCourse");
const WeeklyTestSeries = require("../models/WeeklyTestSeries");
const Slot = require("../models/Slot");

/**
 * Fetch all confirmed enrollments with full details
 * Excludes appPassword for security
 */
exports.getAllConfirmedDetails = async (req, res) => {
  try {
    // 1. Filter by "confirmed" status and exclude teachers and friends
    // 2. .select("-appPassword") removes the password from the results
    // 3. .sort("-createdAt") puts the newest users at the top
    const confirmedUsers = await CoachingEnrollment.find({ 
      status: "confirmed",
      $or: [
        { type: "student" },
        { type: { $exists: false } }
      ]
    })
      .select("-appPassword") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: confirmedUsers.length,
      users: confirmedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment details",
      error: error.message
    });
  }
};



exports.getAllConfirmedDetailsCrashCourse = async (req, res) => {
  try {
    // 1. Filter by "confirmed" status
    // 2. .select("-appPassword") removes the password from the results
    // 3. .sort("-createdAt") puts the newest users at the top
    const confirmedUsers = await CrashCourse.find({ status: "confirmed" })
      .select("-appPassword") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: confirmedUsers.length,
      users: confirmedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment details",
      error: error.message
    });
  }
};


exports.getAllConfirmedDetailsWeeklyTest = async (req, res) => {
  try {
    // 1. Filter by "confirmed" status
    // 2. .select("-appPassword") removes the password from the results
    // 3. .sort("-createdAt") puts the newest users at the top
    const confirmedUsers = await WeeklyTestSeries.find({ status: "confirmed" })
      .select("-appPassword") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: confirmedUsers.length,
      users: confirmedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment details",
      error: error.message
    });
  }
};

/**
 * Fetch all confirmed teachers and friends
 * Excludes appPassword for security
 */
exports.getAllConfirmedTeachersAndFriends = async (req, res) => {
  try {
    // Filter by "confirmed" status and include only teachers and friends
    const confirmedUsers = await CoachingEnrollment.find({ 
      status: "confirmed",
      type: { $in: ["teacher", "friend"] }
    })
      .select("-appPassword") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: confirmedUsers.length,
      users: confirmedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve teachers and friends details",
      error: error.message
    });
  }
};

/**
 * Fetch all confirmed offline students
 * Excludes appPassword for security
 */
exports.getAllConfirmedOfflineStudents = async (req, res) => {
  try {
    // Filter by "confirmed" status and include only offline students
    const confirmedUsers = await CoachingEnrollment.find({
      status: "confirmed",
      type: "offline student"
    })
      .select("-appPassword")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: confirmedUsers.length,
      users: confirmedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve offline students details",
      error: error.message
    });
  }
};

/**
 * Auto-create daily slot at 9pm for ₹599
 * Triggered by Uptime Robot with secret validation
 */
exports.autoCreateDailySlot = async (req, res) => {
  try {
    // http://192.168.31.11:5000/api/admin/auto-create-daily-slot?secret=johnkhore
    const { secret } = req.query;
    const USER_SECRET = process.env.JWT_SECRET;
    const ADMIN_FIREBASE_UID = "qDXjTuqdoZbF26ROCsl6Wyxgm152";
    console.log("api called and secret is this: ",secret)
    console.log("backend secret is this:",USER_SECRET)

    // Validate secret
    if (secret !== USER_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Invalid secret"
      });
    }

    // Remove free slots from previous days, but keep booked slots intact
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cleanupResult = await Slot.deleteMany({
      adminFirebaseUid: ADMIN_FIREBASE_UID,
      status: "free",
      startTime: { $lt: todayStart }
    });

    // Calculate next day's 9pm time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 0, 0, 0); // 9:00 PM

    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30 minutes duration

    // Check if slot already exists for this time
    const existingSlot = await Slot.findOne({
      startTime: tomorrow
    });

    if (existingSlot) {
      return res.status(200).json({
        success: true,
        message: "Slot already exists for this time",
        slot: existingSlot
      });
    }

    // Create new slot
    const newSlot = new Slot({
      adminFirebaseUid: ADMIN_FIREBASE_UID,
      startTime: tomorrow,
      endTime: endTime,
      duration: 59,
      price: 599,
      status: "free"
    });

    await newSlot.save();

    res.status(201).json({
      success: true,
      message: "Daily slot created successfully",
      deletedFreeSlots: cleanupResult.deletedCount || 0,
      slot: newSlot
    });
  } catch (error) {
    console.error("Error creating daily slot:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create daily slot",
      error: error.message
    });
  }
};