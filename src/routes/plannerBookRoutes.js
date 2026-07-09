const express = require("express");
const router = express.Router();
const { 
  getInfo, 
  createOrder, 
  getAllOrders, 
  createManualOrder, 
  sendTrackerId, 
  markDelivered,
  cancelOrder
} = require("../controllers/plannerBookController");
const auth = require("../middleware/auth");

// Public Client Routes
router.get("/info", getInfo);
router.post("/create-order", createOrder);

// Admin Dashboard Routes
router.get("/admin/orders", auth, getAllOrders);
router.post("/admin/manual-order", auth, createManualOrder);
router.post("/admin/send-tracker/:orderId", auth, sendTrackerId);
router.put("/admin/mark-delivered/:orderId", auth, markDelivered);
router.put("/admin/cancel-order/:orderId", auth, cancelOrder);

module.exports = router;