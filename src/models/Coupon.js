// src/models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    maxUses: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Which services this coupon can be applied to.
    // "oneOnOne" is the only service wired up today; more service keys can be
    // added here later without changing the schema.
    applicableServices: {
      type: [String],
      default: ["oneOnOne"],
    },
    createdByFirebaseUid: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
