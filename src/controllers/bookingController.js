// src/controllers/bookingController.js

const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const { sendEmail } = require("../utils/email");
const { sendBookingEmails } = require("../utils/email");
/**
 * POST /api/bookings
 * Create a new booking and Razorpay order
 * RACE CONDITION SAFE - Uses atomic findOneAndUpdate
 */
const createBooking = async (req, res, next) => {
  try {
    const { slotId, userName, userEmail, purpose } = req.body;
    const userFirebaseUid = req.user.id; // Firebase UID from auth middleware

    // 1. ATOMIC UPDATE: Check and lock slot in ONE operation
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
          userFirebaseUid,
          userEmail,
        },
      });

      // 3. Create booking with Firebase UIDs
      const booking = await Booking.create({
        userFirebaseUid,
        slotId,
        adminFirebaseUid: slot.adminFirebaseUid,
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
// const verifyPayment = async (req, res, next) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;

//     // 1. Verify signature
//     const sign = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSign = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(sign.toString())
//       .digest("hex");

//     if (razorpay_signature !== expectedSign) {
//       return res.status(400).json({ error: "Invalid payment signature" });
//     }

//     // 2. Update booking
//     const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id })
//       .populate('slotId');

//     if (!booking) {
//       return res.status(404).json({ error: "Booking not found" });
//     }

//     // Check if already confirmed (prevent duplicate verification)
//     if (booking.status === "confirmed") {
//       return res.json({
//         success: true,
//         message: "Booking already confirmed",
//         booking,
//       });
//     }

//     booking.razorpayPaymentId = razorpay_payment_id;
//     booking.razorpaySignature = razorpay_signature;
//     booking.status = "confirmed";
//     await booking.save();

//     // 3. ATOMIC UPDATE: Mark slot as booked (only if it's still pending)
//     const slot = await Slot.findOneAndUpdate(
//       {
//         _id: booking.slotId._id,
//         status: "pending", // Only update if still pending
//       },
//       {
//         $set: {
//           status: "booked",
//           bookedByFirebaseUid: booking.userFirebaseUid,
//         },
//       },
//       {
//         new: true,
//       }
//     );

//     if (!slot) {
//       // This should rarely happen, but handle it gracefully
//       console.error("Slot was not pending during payment verification");
//       return res.status(400).json({
//         error: "Payment verified but slot is no longer available"
//       });
//     }

//     // 4. Get admin and user details
//     const admin = await User.findOne({ firebaseUid: slot.adminFirebaseUid });
//     const user = await User.findOne({ firebaseUid: booking.userFirebaseUid });

//     console.log("admin: ",admin);
//     console.log("user: ",user);

//     // 5. Send confirmation emails (non-blocking)
//     const emailPromises = [];

//     console.log("Email to User!!!")
//     // Email to User
//     if (user && user.email) {
//       emailPromises.push(
//         sendEmail({
//           to: booking.userEmail,
//           subject: "Booking Confirmed - Elite Meet",
//           html: `
//             <h2>Hi ${booking.userName},</h2>
//             <p>Your consultation slot has been successfully booked.</p>
            
//             <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
//               weekday: 'long',
//               year: 'numeric',
//               month: 'long',
//               day: 'numeric'
//             })}</p>
            
//             <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: true
//             })}</p>
            
//             <p><strong>Duration:</strong> ${slot.duration} minutes</p>
//             <p><strong>Amount Paid:</strong> ₹${booking.amount}</p>
//             <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
            
//             <p>You will receive the meeting link 15 minutes before the scheduled time.</p>
            
//             <p>Best regards,<br>Elite Meet Team</p>
//           `,
//         }).catch(err => console.error("Failed to send user email:", err))
//       );
//     }

//     console.log("Email to Admin!!")
//     // Email to Admin
//     if (admin && admin.email) {
//       emailPromises.push(
//         sendEmail({
//           to: admin.email,
//           subject: "New Booking Received - Elite Meet",
//           html: `
//             <h2>Hi ${admin.name},</h2>
//             <p>You have a new booking for your consultation slot.</p>
            
//             <p><strong>Client Name:</strong> ${booking.userName}</p>
//             <p><strong>Client Email:</strong> ${booking.userEmail}</p>
//             ${booking.purpose ? `<p><strong>Purpose/Topic:</strong><br>${booking.purpose}</p>` : ''}
            
//             <p><strong>Date:</strong> ${new Date(slot.startTime).toLocaleDateString('en-IN', {
//               weekday: 'long',
//               year: 'numeric',
//               month: 'long',
//               day: 'numeric'
//             })}</p>
            
//             <p><strong>Time:</strong> ${new Date(slot.startTime).toLocaleTimeString('en-IN', {
//               hour: '2-digit',
//               minute: '2-digit',
//               hour12: true
//             })}</p>
            
//             <p><strong>Duration:</strong> ${slot.duration} minutes</p>
//             <p><strong>Amount:</strong> ₹${booking.amount}</p>
            
//             <p>Please prepare for the scheduled consultation.</p>
            
//             <p>Best regards,<br>Elite Meet Team</p>
//           `,
//         }).catch(err => console.error("Failed to send admin email:", err))
//       );
//     }

//     // Wait for emails (non-blocking, don't fail if emails fail)
//     Promise.all(emailPromises)
//     .then(() => console.log('✅ Confirmation emails sent to user and admin'))
//     .catch(err => console.error('❌ Error sending emails:', err));
  

//     res.json({
//       success: true,
//       message: "Payment verified successfully",
//       booking,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

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
      .populate('slotId');

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
          bookedByFirebaseUid: booking.userFirebaseUid,
        },
      },
      {
        new: true,
      }
    );

    if (!slot) {
      // This should rarely happen, but handle it gracefully
      console.error("Slot was not pending during payment verification");
      return res.status(400).json({
        error: "Payment verified but slot is no longer available"
      });
    }

    // 4. Get admin and user details
    const admin = await User.findOne({ firebaseUid: slot.adminFirebaseUid });
    const user = await User.findOne({ firebaseUid: booking.userFirebaseUid });

    console.log("admin: ", admin);
    console.log("user: ", user);

    // 5. Send confirmation emails
    try {
      const emailPromises = [];

      // Email to User
      if (user && user.email) {
        console.log("Sending email to user:", booking.userEmail);
        emailPromises.push(
          sendEmail({
            to: booking.userEmail,
            subject: "Booking Confirmed - Elite Meet",
            html: `
              <h2>Hi ${booking.userName},</h2>
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
              <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
              
              <p>You will receive the meeting link 15 minutes before the scheduled time.</p>
              
              <p>Best regards,<br>Elite Meet Team</p>
            `,
          })
        );
      }

      // Email to Admin
      if (admin && admin.email) {
        console.log("Sending email to admin:", admin.email);
        emailPromises.push(
          sendEmail({
            to: admin.email,
            subject: "New Booking Received - Elite Meet",
            html: `
              <h2>Hi ${admin.name},</h2>
              <p>You have a new booking for your consultation slot.</p>
              
              <p><strong>Client Name:</strong> ${booking.userName}</p>
              <p><strong>Client Email:</strong> ${booking.userEmail}</p>
              ${booking.purpose ? `<p><strong>Purpose/Topic:</strong><br>${booking.purpose}</p>` : ''}
              
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

      // Wait for emails to send
      await Promise.all(emailPromises);
      console.log('✅ Confirmation emails sent successfully');
    } catch (emailError) {
      console.error('❌ Error sending emails:', emailError);
      // Don't fail the booking if email fails
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      booking,
    });
  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/bookings/cancel-payment
 * Cancel a pending booking if payment fails
 */
const cancelPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId } = req.body;

    const booking = await Booking.findOne({ razorpayOrderId });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ error: "Booking is not in pending state" });
    }

    // Mark booking as cancelled
    booking.status = "cancelled";
    await booking.save();

    // Free up the slot
    await Slot.findByIdAndUpdate(booking.slotId, { status: "free" });

    res.json({ success: true, message: "Booking cancelled" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings
 * Get all bookings (Admin sees all, User sees only their bookings)
 */
const getAllBookings = async (req, res, next) => {
  try {
    const { role, id: firebaseUid } = req.user;

    let query = {};

    if (role === "admin") {
      // Admin sees all their consultation bookings
      query.adminFirebaseUid = firebaseUid;
    } else {
      // User sees only their own bookings
      query.userFirebaseUid = firebaseUid;
    }

    const bookings = await Booking.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id
 * Get single booking details
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: firebaseUid } = req.user;

    const booking = await Booking.findById(id).populate('slotId');

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check authorization
    if (role !== "admin" && booking.userFirebaseUid !== firebaseUid) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  verifyPayment,
  cancelPayment,
  getAllBookings,
  getBookingById,
};
