// src/models/Slot.js

const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    adminFirebaseUid: {  // Changed from adminId
      type: String,      // Changed from ObjectId to String
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 30, // in minutes
    },
    price: {
      type: Number,
      default: 500, // in INR
    },
    status: {
      type: String,
      enum: ["free", "pending", "booked", "completed", "cancelled"],
      default: "free",
      index: true,
    },
    bookedBy: {
      type: String,  // Firebase UID of user who booked
    },
    meetingLink: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for faster queries
slotSchema.index({ adminFirebaseUid: 1, startTime: 1 });
slotSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model("Slot", slotSchema);
