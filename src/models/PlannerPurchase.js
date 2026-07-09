const mongoose = require("mongoose");

const plannerPurchaseSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    medium: { type: String, default: "English Medium" },
    purchaseType: { 
      type: String, 
      enum: ["hardcopy", "softcopy"], 
      required: true 
    },
    flatNo: { type: String },
    area: { type: String },
    landmark: { type: String },
    district: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: "India" },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    razorpayOrderId: { type: String }, // Optional now to support manual bookings
    razorpayPaymentId: { type: String },
    trackerId: { type: String, default: "" }, // Added for shipment tracking
    isManualOrder: { type: Boolean, default: false }, // Added to flag manual entries
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 mins TTL for pending orders
      index: true,
    },
  },
  { timestamps: true }
);

// Auto-delete pending unpaid entries after 30 mins (skip manual ones)
plannerPurchaseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PlannerPurchase", plannerPurchaseSchema);