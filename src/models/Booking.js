// src/models/Booking.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userFirebaseUid: {  // Changed from userId
      type: String,     // Changed from ObjectId to String
      required: true,
      index: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,  // Keep this as ObjectId
      ref: "Slot",
      required: true,
      index: true,
    },
    adminFirebaseUid: {  // Changed from adminId
      type: String,      // Changed from ObjectId to String
      required: false,
    },
    userName: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: false,
      maxlength: 500,
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
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
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
bookingSchema.index({ userFirebaseUid: 1, createdAt: -1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

// 🔥 MONGODB TTL INDEX - Auto-deletes expired pending bookings
bookingSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "pending" }
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
