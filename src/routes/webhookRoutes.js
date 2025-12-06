// src/routes/webhookRoutes.js
const express = require("express");
const router = express.Router();
const { handleRazorpayWebhook } = require("../controllers/webhookController");

// Use raw body for signature verification
router.post("/razorpay", express.raw({ type: "application/json" }), handleRazorpayWebhook);

module.exports = router;
