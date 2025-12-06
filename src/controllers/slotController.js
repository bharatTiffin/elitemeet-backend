// src/controllers/slotController.js

const Slot = require("../models/Slot");

/**
 * GET /api/slots
 * Returns available (free) slots
 */
const getAvailableSlots = async (req, res, next) => {
  try {
    console.log("getAvailableSlots");
    const { from, to } = req.query;
    const query = { status: "free" };

    if (from && to) {
      query.startTime = { $gte: new Date(from) };
      query.endTime = { $lte: new Date(to) };
    }

    const slots = await Slot.find(query).sort({ startTime: 1 });
    res.json(slots);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/slots/all
 * Admin only - get all slots including booked ones
 */
const getAllSlots = async (req, res, next) => {
  try {
    console.log("getAllSlots");
    const { role, id: adminFirebaseUid } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const slots = await Slot.find({ adminFirebaseUid }).sort({ startTime: 1 });
    res.json(slots);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/slots
 * Admin creates multiple slots
 * body: { slots: [{ startTime, duration, price }, ...] }
 */
const createSlots = async (req, res, next) => {
  try {
    const { role, id: adminFirebaseUid } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can create slots" });
    }

    const { slots } = req.body;

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: "Slots array required" });
    }

    // Validate each slot
    const docs = [];
    for (const s of slots) {
      const startTime = new Date(s.startTime);
      const duration = parseInt(s.duration) || 30;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      if (isNaN(startTime.getTime())) {
        return res.status(400).json({
          error: "Invalid startTime format"
        });
      }

      // Check for overlapping slots
      const overlap = await Slot.findOne({
        adminFirebaseUid,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });

      if (overlap) {
        return res.status(400).json({
          error: `Slot overlaps with existing slot at ${overlap.startTime}`
        });
      }

      docs.push({
        adminFirebaseUid,
        startTime,
        endTime,
        duration,
        price: s.price || 500,
        status: "free",
      });
    }

    const created = await Slot.insertMany(docs);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/slots/:id
 * Admin updates a slot (only if it's free)
 */
const updateSlot = async (req, res, next) => {
  try {
    const { role, id: adminFirebaseUid } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can update slots" });
    }

    const slot = await Slot.findOne({ _id: id, adminFirebaseUid });

    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }

    if (slot.status !== "free") {
      return res.status(400).json({ error: "Cannot update booked/completed slots" });
    }

    const { startTime, duration, price } = req.body;

    if (startTime) {
      const newStartTime = new Date(startTime);
      const newDuration = duration || slot.duration;
      const newEndTime = new Date(newStartTime.getTime() + newDuration * 60000);

      // Check for overlapping slots (excluding current slot)
      const overlap = await Slot.findOne({
        _id: { $ne: id },
        adminFirebaseUid,
        $or: [
          { startTime: { $lt: newEndTime }, endTime: { $gt: newStartTime } }
        ]
      });

      if (overlap) {
        return res.status(400).json({
          error: `Slot overlaps with existing slot`
        });
      }

      slot.startTime = newStartTime;
      slot.endTime = newEndTime;
      slot.duration = newDuration;
    }

    if (price !== undefined) {
      slot.price = price;
    }

    await slot.save();
    res.json(slot);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/slots/:id
 * Admin deletes a slot (only if it's free)
 */
const deleteSlot = async (req, res, next) => {
  try {
    const { role, id: adminFirebaseUid } = req.user;
    const { id } = req.params;

    if (role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete slots" });
    }

    const slot = await Slot.findOne({ _id: id, adminFirebaseUid });

    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }

    if (slot.status !== "free") {
      return res.status(400).json({ error: "Cannot delete booked/completed slots" });
    }

    await Slot.deleteOne({ _id: id });
    res.json({ message: "Slot deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAvailableSlots,
  getAllSlots,
  createSlots,
  updateSlot,
  deleteSlot,
};
