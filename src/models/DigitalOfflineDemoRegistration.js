const mongoose = require("mongoose");

const DigitalOfflineDemoRegistrationSchema = new mongoose.Schema(
  {
    userFirebaseUid: { type: String, required: false, index: true, default: null },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, index: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true, trim: true },
    branch: {
      type: String,
      enum: ["fatehgarh-sahib", "chandigarh"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    amount: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000),
      index: true,
    },
  },
  { timestamps: true }
);

DigitalOfflineDemoRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("DigitalOfflineDemoRegistration", DigitalOfflineDemoRegistrationSchema);