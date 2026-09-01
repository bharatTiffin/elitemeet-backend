const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponSetting,
  updateCouponSetting,
} = require("../controllers/couponController");

// Public routes
router.post("/validate", validateCoupon);
router.get("/settings/:serviceType", getCouponSetting);

// Admin routes - protected
router.get("/", auth, getAllCoupons);
router.post("/", auth, createCoupon);
router.put("/settings/:serviceType", auth, updateCouponSetting);
router.put("/:id", auth, updateCoupon);
router.delete("/:id", auth, deleteCoupon);

module.exports = router;
