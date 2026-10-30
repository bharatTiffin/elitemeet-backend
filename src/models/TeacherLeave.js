// src/models/TeacherLeave.js
const mongoose = require("mongoose");

const teacherLeaveSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    // Calendar day as "YYYY-MM-DD" (no timezone shifting)
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    // lecture = missed one class, half_day = half the day, full_day = whole day
    type: { type: String, enum: ["lecture", "half_day", "full_day"], required: true },
    // How many lectures a "lecture" entry covers (1-10)
    lectureCount: { type: Number, default: 1, min: 1, max: 10 },
    // "HH:mm" 24h, empty for full_day
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    note: { type: String, default: "", trim: true },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherLeave", teacherLeaveSchema);
