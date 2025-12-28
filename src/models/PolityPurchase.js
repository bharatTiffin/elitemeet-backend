// src/models/PolityPurchase.js

const mongoose = require("mongoose");

const polityPurchaseSchema = new mongoose.Schema(
  {
    userFirebaseUid: {
      type: String,
      required: true,
      index: true,
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
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: false,
      default: function() {
        return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      },
      index: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
polityPurchaseSchema.index({ userFirebaseUid: 1, createdAt: -1 });
polityPurchaseSchema.index({ status: 1, expiresAt: 1 });

// MongoDB TTL INDEX - Auto-deletes expired pending purchases
polityPurchaseSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "pending" }
  }
);

module.exports = mongoose.model("PolityPurchase", polityPurchaseSchema);
