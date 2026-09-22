const mongoose = require("mongoose");

const mockTestEnrollmentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    fatherName: { type: String, required: true },
    mobile: { type: String, required: true },
    // Storing plain text as requested, matches CoachingEnrollment's existing convention
    appPassword: { type: String, required: true, default: "123456" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    addedByAdmin: {
      type: String, // admin user email
      required: false,
    },
    amount: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 mins to pay
      index: true,
    },
  },
  { timestamps: true }
);

// TTL index to clean up failed/pending attempts
mockTestEnrollmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } });

module.exports = mongoose.model("MockTestEnrollment", mockTestEnrollmentSchema);
