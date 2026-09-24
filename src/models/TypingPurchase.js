// src/models/TypingPurchase.js
const mongoose = require("mongoose");

const typingPurchaseSchema = new mongoose.Schema({
  userFirebaseUid: {
    type: String,
    required: false,
    default: null,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "pending",
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  // Manual-login credentials (plain text on purpose, per product decision)
  password: {
    type: String,
    default: null,
  },
  // Access ends here (6 months after payment). Null on legacy rows -> derived from purchaseDate.
  expiresAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("TypingPurchase", typingPurchaseSchema);
