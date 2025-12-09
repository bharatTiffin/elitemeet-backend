// src/utils/cleanupExpiredSlots.js
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");

/**
 * Cleanup expired pending slots and bookings
 * Run this as a cron job every 1-5 minutes
 */
const cleanupExpiredSlots = async () => {
  try {
    console.log("cleanupExpiredSlots function called!!");
    const now = new Date();
    const cutoff = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes
    console.log("cutoff:", cutoff);
    // 1) Free slots that have been pending for > 15 minutes
    const slotResult = await Slot.updateMany(
      { status: "pending", updatedAt: { $lte: cutoff } },
      { $set: { status: "free", bookedBy: null } }
    );
    console.log("slotResult:", slotResult);
    // 2) Cancel bookings that are still pending after expiry and release slot if still pending
    const expiredBookings = await Booking.find({
      status: "pending",
      expiresAt: { $lte: now },
    });
    console.log("expiredBookings:", expiredBookings);
    for (const booking of expiredBookings) {
      booking.status = "cancelled";
      await booking.save();

      await Slot.findOneAndUpdate(
        { _id: booking.slotId, status: "pending" },
        { $set: { status: "free", bookedBy: null } }
      );
    }
    console.log("slotResult.modifiedCount:", slotResult.modifiedCount);
    console.log("expiredBookings.length:", expiredBookings.length);
    if (slotResult.modifiedCount > 0 || expiredBookings.length > 0) {
      console.log(
        `Cleanup: released ${slotResult.modifiedCount} pending slots, cancelled ${expiredBookings.length} expired bookings`
      );
    }
    console.log("cleanupExpiredSlots function ended!!");
    console.log("cleanupExpiredSlots function returned!!"); 
    console.log("cleanupExpiredSlots function returned value:", {
      slotsReleased: slotResult.modifiedCount,
      bookingsCancelled: expiredBookings.length,
    });
    return {
      slotsReleased: slotResult.modifiedCount,
      bookingsCancelled: expiredBookings.length,
    };
  } catch (error) {
    console.error("Error in cleanupExpiredSlots:", error);
    throw error;
  }
};

module.exports = { cleanupExpiredSlots };
