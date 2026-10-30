// src/models/Teacher.js
const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    // per_lecture = paid per class (e.g. Sourab sir), salary = fixed monthly salary
    payType: { type: String, enum: ["per_lecture", "salary"], required: true },
    ratePerLecture: { type: Number, default: 0 },
    monthlySalary: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
