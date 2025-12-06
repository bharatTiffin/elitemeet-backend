const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { 
  getAvailableSlots, 
  getAllSlots, 
  createSlots,
  updateSlot,
  deleteSlot
} = require("../controllers/slotController");

// Public route - get available slots
router.get("/", getAvailableSlots);

// Admin routes - protected
router.get("/all", auth, getAllSlots);
router.post("/", auth, createSlots);
router.put("/:id", auth, updateSlot);
router.delete("/:id", auth, deleteSlot);

module.exports = router;
