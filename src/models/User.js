// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      unique: true,
    },
    name: {
      type: String,
    },
    phone: {
      type: String,
      sparse: true, // Only required for manual signup
    },
    photoUrl: {
      type: String,
    },
    password: {
      type: String,
      sparse: true, // Only required for manual signup
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    signupType: {
      type: String,
      enum: ["google", "manual"],
      default: "google",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
