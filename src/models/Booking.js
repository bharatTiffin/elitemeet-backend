// src/models/Booking.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
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
      enum: ["pending", "confirmed", "cancelled", "completed"], // Added "pending"
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
      required: false, // Made optional
      default: function() {
        return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      },
      index: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

// TTL index to auto-delete expired pending bookings after 15 minutes
bookingSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "pending" }
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
