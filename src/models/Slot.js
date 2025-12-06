// src/models/Slot.js

const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      enum: ["free", "pending", "booked", "completed", "cancelled"], // Added "pending"
      default: "free",
      index: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    meetingLink: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for faster queries
slotSchema.index({ adminId: 1, startTime: 1 });
slotSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model("Slot", slotSchema);
