// src/controllers/webhookController.js
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const MentorshipEnrollment = require("../models/MentorshipEnrollment");
const MentorshipProgram = require("../models/MentorshipProgram");
const { sendEmail } = require("../utils/email");

const handleRazorpayWebhook = async (req, res) => {
  try {
    console.log("handleRazorpayWebhook");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    console.log("secret: ", secret);
    console.log("signature: ", signature);

    // ✅ Handle different body formats safely
    let bodyString;
    let event;

    if (Buffer.isBuffer(req.body)) {
      // Raw buffer (ideal case from express.raw())
      bodyString = req.body.toString("utf-8");
      event = JSON.parse(bodyString);
    } else if (typeof req.body === "string") {
      // Already stringified
      bodyString = req.body;
      event = JSON.parse(bodyString);
    } else if (typeof req.body === "object" && req.body !== null) {
      // Already parsed as JSON (Vercel might do this)
      bodyString = JSON.stringify(req.body);
      event = req.body;
    } else {
      console.error("❌ Unexpected body type:", typeof req.body);
      return res.status(400).send("Invalid body format");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Invalid webhook signature");
      console.error("Expected:", expectedSignature);
      console.error("Received:", signature);
      return res.status(400).send("Invalid webhook signature");
    }

    console.log("✅ Webhook signature verified");
    console.log("📦 Webhook event type:", event?.event);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      console.log("💰 Processing payment.captured for order:", orderId);

      // Check if it's a mentorship enrollment by checking order notes
      // First, get the order to check its notes
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      let orderDetails;
      try {
        orderDetails = await razorpay.orders.fetch(orderId);
      } catch (err) {
        console.error("Error fetching order:", err);
        // Continue with existing logic if order fetch fails
      }

      const isMentorshipEnrollment = orderDetails?.notes?.type === "mentorship_enrollment" ||
                                     (await MentorshipEnrollment.findOne({ razorpayOrderId: orderId }));

      if (isMentorshipEnrollment) {
        // Handle mentorship enrollment
        console.log("🎓 Processing mentorship enrollment payment");

        // Get program (needed for amount and email)
        const program = await MentorshipProgram.getProgram();
        
        // Find or create enrollment
        let enrollment = await MentorshipEnrollment.findOne({ razorpayOrderId: orderId });
        let isNewEnrollment = false;

        if (enrollment) {
          // Prevent duplicate processing
          if (enrollment.status === "confirmed") {
            console.log("ℹ️ Enrollment already confirmed:", enrollment._id);
            return res.json({ status: "ok" });
          }

          // Update existing enrollment
          enrollment.status = "confirmed";
          enrollment.razorpayPaymentId = paymentId;
          await enrollment.save();
        } else {
          // Create new enrollment from order notes (payment was successful)
          if (!orderDetails || !orderDetails.notes) {
            console.error("❌ Cannot create enrollment: order details or notes missing");
            return res.status(400).json({ error: "Order details missing" });
          }

          const userFirebaseUid = orderDetails.notes.userFirebaseUid;
          const userName = orderDetails.notes.userName;
          const userEmail = orderDetails.notes.userEmail;

          if (!userFirebaseUid || !userEmail) {
            console.error("❌ Cannot create enrollment: missing user info in order notes");
            return res.status(400).json({ error: "User information missing" });
          }
          
          // Create enrollment record (only after successful payment)
          enrollment = new MentorshipEnrollment({
            userFirebaseUid: userFirebaseUid,
            userName: userName,
            userEmail: userEmail,
            amount: program.price,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            status: "confirmed", // Directly confirmed since payment is successful
          });

          await enrollment.save();
          isNewEnrollment = true;
          console.log("✅ Created new enrollment after successful payment:", enrollment._id);
        }

        // Update program enrolled count only for new enrollments
        if (isNewEnrollment) {
          program.enrolledCount += 1;
          await program.save();
          console.log("📊 Updated program enrolled count:", program.enrolledCount);
        }

        console.log("📧 Sending mentorship enrollment confirmation emails...");

        // Get admin details (first admin user)
        const admin = await User.findOne({ role: "admin" });

        // ✅ SEND EMAILS
        const emailPromises = [];

        // Email to User
        if (enrollment.userEmail) {
          emailPromises.push(
            sendEmail({
              to: enrollment.userEmail,
              subject: "Mentorship Program Enrollment Confirmed - Elite Meet",
              html: `
                <h2>Welcome to the 6-Month Full Mentor Guidance Program! 🎉</h2>
                <p>Dear ${enrollment.userName},</p>
                <p>Congratulations! Your enrollment in our premium mentorship program has been confirmed.</p>
                <p><strong>Program Details:</strong></p>
                <ul>
                  <li>6-month full mentor guidance with Happy</li>
                  <li>Regular feedback and guidance</li>
                  <li>Personalized sessions</li>
                  <li>6-month commitment</li>
                  <li>Dedicated support</li>
                </ul>
                <p><strong>Amount Paid:</strong> ₹${enrollment.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(enrollment.enrollmentDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p>You will receive further instructions and access details via email shortly.</p>
                <p>We're excited to have you on this journey!</p>
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
              subject: "New Mentorship Program Enrollment - Elite Meet",
              html: `
                <h2>New Mentorship Enrollment! 🎓</h2>
                <p>You have a new enrollment in the mentorship program.</p>
                <p><strong>Student Name:</strong> ${enrollment.userName}</p>
                <p><strong>Student Email:</strong> ${enrollment.userEmail}</p>
                <p><strong>Amount:</strong> ₹${enrollment.amount}</p>
                <p><strong>Payment ID:</strong> ${paymentId}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(enrollment.enrollmentDate).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p><strong>Remaining Seats:</strong> ${program.totalSeats - program.enrolledCount}</p>
                <p>Please reach out to the student to begin their mentorship journey.</p>
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

        console.log("✅ Mentorship enrollment webhook processed successfully:", enrollment._id);
        return res.json({ status: "ok" });
      }

      // Handle regular booking
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
            bookedBy: booking.userFirebaseUid,
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
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
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
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
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
    } else if (event.event === "payment.failed") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;

      console.log("⚠️ Handling payment.failed for order:", orderId);

      // Check if it's a mentorship enrollment
      const enrollment = await MentorshipEnrollment.findOne({ razorpayOrderId: orderId });

      if (enrollment) {
        // Handle mentorship enrollment failure
        if (enrollment.status === "pending") {
          enrollment.status = "cancelled";
          await enrollment.save();
          console.log("✅ Cancelled mentorship enrollment after payment failure:", enrollment._id);
        }
        return res.json({ status: "ok" });
      }

      // Handle regular booking failure
      const booking = await Booking.findOne({ razorpayOrderId: orderId });

      if (!booking) {
        console.warn("⚠️ Booking not found for failed payment", orderId);
        return res.json({ status: "ok" });
      }

      // Only revert pending bookings
      if (booking.status === "pending") {
        booking.status = "cancelled";
        await booking.save();

        await Slot.findOneAndUpdate(
          { _id: booking.slotId, status: "pending" },
          { $set: { status: "free", bookedBy: null } }
        );

        console.log("✅ Released slot after payment failure:", booking.slotId.toString());
      }
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
