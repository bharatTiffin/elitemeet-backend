// src/models/MentorshipProgram.js
const mongoose = require("mongoose");

const mentorshipProgramSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "6-Month Full Mentor Guidance Program",
    },
    description: {
      type: String,
      default: "Get comprehensive mentorship with Happy, regular feedback, sessions, and 6-month commitment",
    },
    price: {
      type: Number,
      required: true,
      default: 14999, // ₹14,999
    },
    totalSeats: {
      type: Number,
      required: true,
      default: 6,
    },
    enrolledCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [
        "6-month full mentor guidance with Happy",
        "Regular feedback and guidance",
        "Personalized sessions",
        "6-month commitment",
        "Dedicated support",
      ],
    },
  },
  { timestamps: true }
);

// Ensure only one program document exists
mentorshipProgramSchema.statics.getProgram = async function () {
  let program = await this.findOne();
  if (!program) {
    program = await this.create({});
  }
  return program;
};

module.exports = mongoose.model("MentorshipProgram", mentorshipProgramSchema);

