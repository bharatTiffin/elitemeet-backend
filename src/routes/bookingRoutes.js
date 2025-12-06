const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createBooking, verifyPayment, cancelPayment } = require("../controllers/bookingController");

router.post("/", auth, createBooking);
router.post("/verify-payment", auth, verifyPayment);
router.post("/cancel-payment", auth, cancelPayment);

module.exports = router;
