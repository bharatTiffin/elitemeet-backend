// src/controllers/webhookController.js
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const { sendEmail } = require("../utils/email");

const handleRazorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // ✅ Handle different body formats safely
    let body;
    if (Buffer.isBuffer(req.body)) {
      // Raw buffer (ideal case from express.raw())
      body = req.body.toString();
    } else if (typeof req.body === 'string') {
      // Already stringified
      body = req.body;
    } else if (typeof req.body === 'object') {
      // Already parsed as JSON (Vercel might do this)
      body = JSON.stringify(req.body);
    } else {
      console.error("❌ Unexpected body type:", typeof req.body);
      return res.status(400).send("Invalid body format");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Invalid webhook signature");
      console.error("Expected:", expectedSignature);
      console.error("Received:", signature);
      return res.status(400).send("Invalid webhook signature");
    }

    console.log("✅ Webhook signature verified");

    // Parse event (handle both cases)
    const event = typeof req.body === 'object' ? req.body : JSON.parse(body);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      console.log("💰 Processing payment.captured for order:", orderId);

      // Find booking and populate slot details
      const booking = await Booking.findOne({ razorpayOrderId: orderId })
        .populate('slotId');

      if (!booking) {
        console.warn("⚠️ Booking not found for order", orderId);
        return res.json({ status: "ok" });
      }

      // Prevent duplicate processing
      if (booking.status === "confirmed") {
        console.log("ℹ️ Booking already confirmed:", booking._id);
        return res.json({ status: "ok" });
      }

      // Update booking
      booking.status = "confirmed";
      booking.razorpayPaymentId = paymentId;
      await booking.save();

      const slot = booking.slotId;

      // ATOMIC UPDATE: Mark slot as booked
      await Slot.findOneAndUpdate(
        { _id: slot._id, status: "pending" },
        {
          $set: {
            status: "booked",
            bookedByFirebaseUid: booking.userFirebaseUid,
          },
        }
      );

      // Fetch admin details
      const admin = await User.findOne({ firebaseUid: slot.adminFirebaseUid });

      console.log("📧 Sending confirmation emails...");

      // ✅ SEND EMAILS
      const emailPromises = [];

      // Email to User
      if (booking.userEmail) {
        emailPromises.push(
          sendEmail({
            to: booking.userEmail,
            subject: "Booking Confirmed - Elite Meet",
            html: `
              <h2>Booking Confirmed! 🎉</h2>
              <p>Your consultation slot has been successfully booked.</p>
              <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p><strong>Duration:</strong> ${slot.duration} minutes</p>
              <p><strong>Amount Paid:</strong> ₹${booking.amount}</p>
              <p><strong>Payment ID:</strong> ${paymentId}</p>
              <p>You will receive the meeting link 15 minutes before the scheduled time.</p>
              <p>Best regards,<br>Elite Meet Team</p>
            `,
          })
        );
      }

      // Email to Admin
      if (admin && admin.email) {
        emailPromises.push(
          sendEmail({
            to: admin.email,
            subject: "New Booking Received - Elite Meet",
            html: `
              <h2>New Booking Alert! 📅</h2>
              <p>You have a new booking for your consultation slot.</p>
              <p><strong>Client Name:</strong> ${booking.userName}</p>
              <p><strong>Client Email:</strong> ${booking.userEmail}</p>
              ${booking.purpose ? `<p><strong>Purpose/Topic:</strong> ${booking.purpose}</p>` : ''}
              <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p><strong>Duration:</strong> ${slot.duration} minutes</p>
              <p><strong>Amount:</strong> ₹${booking.amount}</p>
              <p>Please prepare for the scheduled consultation.</p>
              <p>Best regards,<br>Elite Meet Team</p>
            `,
          })
        );
      }

      // Send emails (non-blocking, catch errors)
      const results = await Promise.allSettled(emailPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Email ${index + 1} sent successfully`);
        } else {
          console.error(`❌ Email ${index + 1} failed:`, result.reason);
        }
      });

      console.log("✅ Webhook processed successfully:", booking._id);
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook error");
  }
};

module.exports = {
  handleRazorpayWebhook,
};
