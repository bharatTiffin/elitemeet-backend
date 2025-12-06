// src/utils/cleanupExpiredSlots.js
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");

/**
 * Cleanup expired pending slots and bookings
 * Run this as a cron job every 1-5 minutes
 */
const cleanupExpiredSlots = async () => {
  try {
    const now = new Date();

    // Find and reset expired pending slots
    const expiredSlots = await Slot.updateMany(
      { 
        status: "pending", 
        expiresAt: { $lte: now } 
      },
      { 
        $set: { 
          status: "free", 
          reservedBy: null, 
          bookingId: null, 
          expiresAt: null 
        } 
      }
    );

    // Mark expired bookings
    const expiredBookings = await Booking.updateMany(
      { 
        status: "pending_payment", 
        expiresAt: { $lte: now } 
      },
      { 
        $set: { status: "expired" } 
      }
    );

    if (expiredSlots.modifiedCount > 0 || expiredBookings.modifiedCount > 0) {
      console.log(
        `Cleanup: ${expiredSlots.modifiedCount} slots, ${expiredBookings.modifiedCount} bookings expired`
      );
    }

    return { 
      slotsReleased: expiredSlots.modifiedCount, 
      bookingsExpired: expiredBookings.modifiedCount 
    };
  } catch (error) {
    console.error("Error in cleanupExpiredSlots:", error);
    throw error;
  }
};

module.exports = { cleanupExpiredSlots };
