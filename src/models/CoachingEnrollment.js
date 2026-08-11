const mongoose = require("mongoose");

const coachingEnrollmentSchema = new mongoose.Schema(
  {
    // Make userFirebaseUid optional so guest enrollments are allowed
    userFirebaseUid: { type: String, required: false, index: true, default: null },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    fatherName: { type: String, required: true },
    mobile: { type: String, required: true },
    // Storing plain text as requested, though encryption is usually recommended
    appPassword: { type: String, required: true }, 
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "fee_pending"],
      default: "pending",
      index: true,
    },
    addedByAdmin: {
      type: String, // admin user ID or email
      required: false
    },
    type: {
      type: String,
      enum: ["student", "teacher", "friend", "offline student","offline fatehgarh sahib"],
      default: "student",
      index: true,
    },
    amount: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["full", "partial"],
      default: "full",
    },
    pendingPaymentAmount: { type: Number, required: false },
    paymentExpiryDate: { type: Date, required: false },
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
coachingEnrollmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } });

module.exports = mongoose.model("CoachingEnrollment", coachingEnrollmentSchema);