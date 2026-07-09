const express = require("express");
const router = express.Router();
const { 
  getInfo, 
  createOrder, 
  getAllOrders, 
  createManualOrder, 
  sendTrackerId, 
  markDelivered 
} = require("../controllers/plannerBookController");

// Public Client Routes
router.get("/info", getInfo);
router.post("/create-order", createOrder);

// Admin Dashboard Routes
router.get("/admin/orders", getAllOrders);
router.post("/admin/manual-order", createManualOrder);
router.post("/admin/send-tracker/:orderId", sendTrackerId);
router.put("/admin/mark-delivered/:orderId", markDelivered);

module.exports = router;