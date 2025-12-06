// src/controllers/webhookController.js
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const { createGoogleMeetEvent } = require("../config/googleCalendar");

/**
 * POST /api/webhooks/razorpay
 * Razorpay webhook handler
 */
const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    
    // req.body is raw buffer from express.raw()
    const body = req.body.toString();
    
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).send("Invalid webhook signature");
    }

    // Parse the body manually since we used express.raw()
    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;

      const booking = await Booking.findOne({ razorpayOrderId: orderId });
      if (!booking) {
        console.warn("Booking not found for order", orderId);
        return res.json({ status: "ok" });
      }

      // Update booking & slot
      booking.status = "confirmed";
      booking.razorpayPaymentId = paymentEntity.id;
      await booking.save();

      const slot = await Slot.findById(booking.slotId);
      if (slot) {
        slot.status = "booked";
        await slot.save();
      }

      // Fetch user & admin
      const user = await User.findById(booking.userId);
      const admin = await User.findById(booking.adminId);

      // Create Google Meet event
      if (slot && user && admin) {
        try {
          const { meetLink, eventId } = await createGoogleMeetEvent({
            startTime: slot.startTime,
            endTime: slot.endTime,
            userEmail: user.email,
            userName: user.name,
            adminEmail: admin.email,
            bookingId: booking._id.toString(),
          });

          booking.meetLink = meetLink;
          booking.googleEventId = eventId;
          await booking.save();

          // TODO: Implement email sending
          // await sendBookingEmails({ user, admin, slot, meetLink });
          console.log("Booking confirmed:", booking._id, "Meet Link:", meetLink);
        } catch (meetError) {
          console.error("Error creating Google Meet event:", meetError);
          // Continue even if Meet creation fails
        }
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook error");
  }
};

module.exports = {
  handleRazorpayWebhook,
};
