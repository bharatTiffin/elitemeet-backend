const PlannerPurchase = require("../models/PlannerPurchase");
const Razorpay = require("razorpay");
const { sendPlannerSoftcopyEmail, sendPlannerHardcopyEmail, sendTrackingEmail } = require("../utils/email");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Fetch live prices from environment
exports.getInfo = async (req, res) => {
  try {
    const hardcopyPrice = parseInt(process.env.PLANNER_HARDCOPY_PRICE) || 798;
    const softcopyPrice = parseInt(process.env.PLANNER_SOFTCOPY_PRICE) || 398;
    
    console.log("hardcopyPrice: ",hardcopyPrice);
    console.log("hardcopyPrice: ",softcopyPrice);
    res.status(200).json({
      success: true,
      book: {
        name: "PSSSB 90-Day Master Success Planner",
        hardcopyPrice,
        hardcopyOriginalPrice: Math.round(hardcopyPrice * 1.5),
        softcopyPrice,
        softcopyOriginalPrice: Math.round(softcopyPrice * 1.5),
        description: "The Elite Academy 90-Day Master Success Planner tells you exactly what to study every single day for 90 days."
      }
    });
  } catch (error) {
    console.error("Error in planner getInfo:", error);
    res.status(500).json({ success: false, message: "Error fetching planner info" });
  }
};

// 2. Online Order Creation
exports.createOrder = async (req, res) => {
  try {
    const { 
      fullName, email, phone, medium, purchaseType,
      flatNo, area, landmark, district, city, state, pincode, country 
    } = req.body;

    if (!["hardcopy", "softcopy"].includes(purchaseType)) {
      return res.status(400).json({ success: false, message: "Invalid purchase type" });
    }

    const price = purchaseType === "hardcopy" 
      ? parseInt(process.env.PLANNER_HARDCOPY_PRICE) || 799
      : parseInt(process.env.PLANNER_SOFTCOPY_PRICE) || 399;

    const options = {
      amount: price * 100,
      currency: "INR",
      receipt: `receipt_planner_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    const newPurchase = new PlannerPurchase({
      fullName, email, phone, medium, purchaseType,
      flatNo, area, landmark, district, city, state, pincode, country,
      amount: price,
      razorpayOrderId: order.id,
      status: "pending"
    });

    await newPurchase.save();

    res.status(201).json({
      success: true,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Error creating planner order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* ==========================================================================
   ADMIN DASHBOARD CRUD OPERATIONS
   ========================================================================== */
const access = (req) => {
  return (req.user && req.user.role === "admin");
};
// Fetch all orders for dashboard view
exports.getAllOrders = async (req, res) => {
  try {
    // Restrict to admins if needed
    if (!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });
    // if (req.user && req.user.role !== "admin") {
    //   return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });
    // }

    // Fetch all orders from database, sorting by most recent first
    const orders = await PlannerPurchase.find({}).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve orders ledger" });
  }
};

// Create a Manual Generation Order (Offline Cash / Direct Bank Transfer)
exports.createManualOrder = async (req, res) => {
  try {
    if (!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });

    const { fullName, email, phone, medium, purchaseType, amount, ...address } = req.body;

    const newOrder = new PlannerPurchase({
      fullName, email, phone, medium, purchaseType, ...address,
      amount: amount || (purchaseType === "hardcopy" ? 799 : 399),
      status: "confirmed", // Manual additions bypass pending gateways
      isManualOrder: true,
      expiresAt: null // Remove standard automatic expiration timers
    });

    await newOrder.save();

    // Trigger instant email confirmations cleanly
    if (purchaseType === "softcopy") {
      await sendPlannerSoftcopyEmail(newOrder, "MANUAL_PAYMENT");
    } else {
      await sendPlannerHardcopyEmail(newOrder, "MANUAL_PAYMENT");
    }

    res.status(201).json({ success: true, message: "Manual order generated successfully!", order: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to build manual tracking order" });
  }
};

// Add / Send Tracking details to user
// exports.sendTrackerId = async (req, res) => {
//   try {
    // if(!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });

//     const { orderId } = req.params;
//     const { trackerId } = req.body;

//     const order = await PlannerPurchase.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     order.trackerId = trackerId;
//     await order.save();

//     await sendTrackingEmail(order, trackerId);

//     res.status(200).json({ success: true, message: "Tracker email successfully dispatched to student!", order });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Tracking dispatch workflow failed" });
//   }
// };

// Add / Send Tracking details to user
exports.sendTrackerId = async (req, res) => {
  try {
    if (!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });
    const { orderId } = req.params;
    const { trackerId } = req.body;

    const order = await PlannerPurchase.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.trackerId = trackerId;
    
    // Automatically switch status to "confirmed" if it was pending since it's now packed/shipped
    if (order.status === "pending") {
      order.status = "confirmed";
    }
    
    await order.save();

    // Sends the email via your utils/email.js configuration
    await sendTrackingEmail(order, trackerId);

    res.status(200).json({ success: true, message: "Tracker email successfully dispatched to student!", order });
  } catch (error) {
    console.error("Error sending tracker ID:", error);
    res.status(500).json({ success: false, message: "Tracking dispatch workflow failed" });
  }
};

// Complete fulfillment route: Mark order as Sent / Delivered
exports.markDelivered = async (req, res) => {
  try {
    if (!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });

    const { orderId } = req.params;
    const order = await PlannerPurchase.findByIdAndUpdate(orderId, { status: "delivered" }, { new: true });
    
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, message: "Status marked to Delivered!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delivery updates failed" });
  }
};

// Cancel order route
exports.cancelOrder = async (req, res) => {
  try {
    if (!access(req)) return res.status(403).json({ success: false, message: "Unauthorized dashboard access" });

    const { orderId } = req.params;
    const order = await PlannerPurchase.findByIdAndUpdate(orderId, { status: "cancelled" }, { new: true });
    
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, message: "Order marked as Cancelled!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Cancellation failed" });
  }
};