// src/routes/mentorshipRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getProgram,
  createEnrollment,
  getAllEnrollments,
  getMyEnrollment,
  updateProgram,
} = require("../controllers/mentorshipController");

// Public route - Get program details
router.get("/program", getProgram);

// Protected routes - require authentication
router.post("/create-enrollment", auth, createEnrollment);
router.get("/my-enrollment", auth, getMyEnrollment);

// Admin routes - require authentication (admin check in controller if needed)
router.get("/enrollments", auth, getAllEnrollments);
router.put("/program", auth, updateProgram);

module.exports = router;

