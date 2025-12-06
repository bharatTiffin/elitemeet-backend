// src/controllers/bookingController.js

const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const { sendEmail } = require("../utils/email");

/**
 * POST /api/bookings
 * Create a new booking and Razorpay order
 * RACE CONDITION SAFE - Uses atomic findOneAndUpdate
 */
const createBooking = async (req, res, next) => {
  try {
    const { slotId, userName, userEmail, purpose } = req.body;
    const userId = req.user.id;

    // 1. ATOMIC UPDATE: Check and lock slot in ONE operation
    // This prevents race conditions when multiple users try to book same slot
    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        status: "free", // Only update if currently free
      },
      {
        $set: {
          status: "pending",
          updatedAt: new Date(),
        },
      },
      {
        new: true, // Return updated document
        populate: 'adminId', // Populate admin details
      }
    );

    // If slot is null, it means it was already taken or doesn't exist
    if (!slot) {
      return res.status(400).json({ 
        error: "Slot not available. It may have been booked by another user." 
      });
    }

    try {
      // 2. Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: slot.price * 100, // Convert to paise
        currency: "INR",
        receipt: `booking_${Date.now()}`,
        notes: {
          slotId: slot._id.toString(),
          userId,
          userEmail,
        },
      });

      // 3. Create booking with adminId
      const booking = await Booking.create({
        userId,
        slotId,
        adminId: slot.adminId._id,
        userName,
        userEmail,
        purpose: purpose || '',
        amount: slot.price,
        razorpayOrderId: razorpayOrder.id,
        status: "pending",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      res.status(201).json({
        booking,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: slot.price,
        currency: "INR",
      });
    } catch (error) {
      // If anything fails after locking slot, revert it back to free
      await Slot.findByIdAndUpdate(slotId, { status: "free" });
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookings/verify-payment
 * Verify Razorpay payment signature
 */
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // 1. Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 2. Update booking
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id })
      .populate('slotId')
      .populate('userId');
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if already confirmed (prevent duplicate verification)
    if (booking.status === "confirmed") {
      return res.json({
        success: true,
        message: "Booking already confirmed",
        booking,
      });
    }

    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    booking.status = "confirmed";
    await booking.save();

    // 3. ATOMIC UPDATE: Mark slot as booked (only if it's still pending)
    const slot = await Slot.findOneAndUpdate(
      {
        _id: booking.slotId._id,
        status: "pending", // Only update if still pending
      },
      {
        $set: {
          status: "booked",
          bookedBy: booking.userId._id,
        },
      },
      {
        new: true,
        populate: 'adminId',
      }
    );

    if (!slot) {
      // This should rarely happen, but handle it gracefully
      console.error("Slot was not pending during payment verification");
      return res.status(400).json({ 
        error: "Payment verified but slot is no longer available" 
      });
    }

    // 4. Get admin details
    const admin = await User.findById(slot.adminId);

    // 5. Send confirmation emails (non-blocking)
    const emailPromises = [];

    // Email to User
    emailPromises.push(
      sendEmail({
        to: booking.userEmail,
        subject: "Booking Confirmed - Elite Meet",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Booking Confirmed! 🎉</h2>
            <p>Hi ${booking.userName},</p>
            <p>Your consultation slot has been successfully booked.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
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
              <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
            </div>
            
            <p>You will receive the meeting link 15 minutes before the scheduled time.</p>
            
            <p>Best regards,<br>Elite Meet Team</p>
          </div>
        `,
      }).catch(err => console.error("Failed to send user email:", err))
    );

    // Email to Admin
    emailPromises.push(
      sendEmail({
        to: admin.email,
        subject: "New Booking Received - Elite Meet",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Booking Received 📅</h2>
            <p>Hi ${admin.name},</p>
            <p>You have a new booking for your consultation slot.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
              <p><strong>Client Name:</strong> ${booking.userName}</p>
              <p><strong>Client Email:</strong> ${booking.userEmail}</p>
              ${booking.purpose ? `<p><strong>Purpose/Topic:</strong><br/>${booking.purpose}</p>` : ''}
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
            </div>
            
            <p>Please prepare for the scheduled consultation.</p>
            
            <p>Best regards,<br>Elite Meet Team</p>
          </div>
        `,
      }).catch(err => console.error("Failed to send admin email:", err))
    );

    // Send emails in background
    Promise.all(emailPromises).catch(err => 
      console.error("Some emails failed to send:", err)
    );

    res.json({
      success: true,
      message: "Payment verified and booking confirmed",
      booking,
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    next(err);
  }
};

/**
 * POST /api/bookings/cancel-payment
 * Handle payment cancellation/failure
 */
const cancelPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id } = req.body;

    // Find and cancel booking
    const booking = await Booking.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: "cancelled" },
      { new: true }
    );

    if (booking) {
      // Release the slot back to free
      await Slot.findByIdAndUpdate(booking.slotId, { 
        status: "free",
        bookedBy: null,
      });
    }

    res.json({ success: true, message: "Booking cancelled" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  verifyPayment,
  cancelPayment,
};
