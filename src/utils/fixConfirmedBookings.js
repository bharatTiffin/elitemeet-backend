// src/utils/fixConfirmedBookings.js
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");

/**
 * Fix all confirmed bookings that have slots still showing as "free"
 * This fixes the issue where webhook updated booking but slot wasn't updated
 * due to the old code only updating slots with status "pending"
 */
const fixConfirmedBookings = async () => {
  try {
    console.log("🔧 Starting fixConfirmedBookings...");
    
    // Find all confirmed bookings
    const confirmedBookings = await Booking.find({ status: "confirmed" })
      .populate('slotId');

    console.log(`📋 Found ${confirmedBookings.length} confirmed bookings`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = [];

    for (const booking of confirmedBookings) {
      try {
        if (!booking.slotId) {
          console.warn(`⚠️ Booking ${booking._id} has no slot`);
          continue;
        }

        const slot = booking.slotId;
        
        // Check if slot status is not "booked"
        if (slot.status !== "booked") {
          // Update slot to booked
          await Slot.findByIdAndUpdate(
            slot._id,
            {
              $set: {
                status: "booked",
                bookedBy: booking.userFirebaseUid,
              },
            }
          );

          console.log(`✅ Fixed booking ${booking._id} - slot ${slot._id} updated from "${slot.status}" to "booked"`);
          fixedCount++;
        } else {
          alreadyCorrectCount++;
        }
      } catch (error) {
        console.error(`❌ Error fixing booking ${booking._id}:`, error);
        errors.push({ bookingId: booking._id, error: error.message });
      }
    }

    const result = {
      totalConfirmedBookings: confirmedBookings.length,
      fixed: fixedCount,
      alreadyCorrect: alreadyCorrectCount,
      errors: errors.length,
      errorDetails: errors,
    };

    console.log("✅ fixConfirmedBookings completed:", result);
    return result;
  } catch (error) {
    console.error("❌ Error in fixConfirmedBookings:", error);
    throw error;
  }
};

module.exports = { fixConfirmedBookings };

