const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createBooking, verifyPayment, cancelPayment } = require("../controllers/bookingController");
const { fixConfirmedBookings } = require("../utils/fixConfirmedBookings");

router.post("/", auth, createBooking);
router.post("/verify-payment", auth, verifyPayment);
router.post("/cancel-payment", auth, cancelPayment);

// Admin only - Fix confirmed bookings with incorrect slot status
router.post("/fix-confirmed", auth, async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await fixConfirmedBookings();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Fix confirmed bookings error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
