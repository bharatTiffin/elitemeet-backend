// src/controllers/couponController.js
const Coupon = require("../models/Coupon");
const CouponSetting = require("../models/CouponSetting");

const DEFAULT_SERVICE = "oneOnOne";

const requireAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

/**
 * GET /api/coupons
 * Admin only - list all coupons
 */
const getAllCoupons = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/coupons
 * Admin only - create a coupon
 */
const createCoupon = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { code, discountPercent, maxUses, expiryDate, isActive, applicableServices } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: "Coupon code is required" });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const percent = Number(discountPercent);
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
      return res.status(400).json({ error: "Discount percent must be between 1 and 100" });
    }

    const uses = Number(maxUses);
    if (!Number.isInteger(uses) || uses < 1) {
      return res.status(400).json({ error: "Max uses must be a positive whole number" });
    }

    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ error: "A coupon with this code already exists" });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      discountPercent: percent,
      maxUses: uses,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: isActive !== undefined ? !!isActive : true,
      applicableServices: Array.isArray(applicableServices) && applicableServices.length
        ? applicableServices
        : [DEFAULT_SERVICE],
      createdByFirebaseUid: req.user.id,
    });

    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "A coupon with this code already exists" });
    }
    next(err);
  }
};

/**
 * PUT /api/coupons/:id
 * Admin only - update a coupon
 */
const updateCoupon = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    const { discountPercent, maxUses, expiryDate, isActive, applicableServices } = req.body;

    if (discountPercent !== undefined) {
      const percent = Number(discountPercent);
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        return res.status(400).json({ error: "Discount percent must be between 1 and 100" });
      }
      coupon.discountPercent = percent;
    }

    if (maxUses !== undefined) {
      const uses = Number(maxUses);
      if (!Number.isInteger(uses) || uses < 1) {
        return res.status(400).json({ error: "Max uses must be a positive whole number" });
      }
      if (uses < coupon.usedCount) {
        return res.status(400).json({
          error: `Cannot set max uses below ${coupon.usedCount}. It has already been used ${coupon.usedCount} times.`,
        });
      }
      coupon.maxUses = uses;
    }

    if (expiryDate !== undefined) {
      coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    if (isActive !== undefined) {
      coupon.isActive = !!isActive;
    }

    if (applicableServices !== undefined) {
      coupon.applicableServices = Array.isArray(applicableServices) && applicableServices.length
        ? applicableServices
        : [DEFAULT_SERVICE];
    }

    await coupon.save();
    res.json({ success: true, coupon });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/coupons/:id
 * Admin only - delete a coupon
 */
const deleteCoupon = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/coupons/validate
 * Public - validate a coupon code for a given service + amount
 * body: { code, serviceType, amount }
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.body;
    const serviceType = req.body.serviceType || DEFAULT_SERVICE;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: "Coupon code is required" });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ error: "This coupon is no longer active" });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ error: "This coupon has expired" });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: "This coupon has reached its usage limit" });
    }

    if (!coupon.applicableServices.includes(serviceType)) {
      return res.status(400).json({ error: "This coupon is not valid for this service" });
    }

    const numericAmount = Number(amount) || 0;
    const discountAmount = Math.round((numericAmount * coupon.discountPercent) / 100);
    const finalAmount = Math.max(numericAmount - discountAmount, 0);

    res.json({
      success: true,
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount,
      finalAmount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/coupons/settings/:serviceType
 * Public - whether the coupon input box should be shown for a service
 */
const getCouponSetting = async (req, res, next) => {
  try {
    const { serviceType } = req.params;
    const setting = await CouponSetting.getForService(serviceType);
    res.json({ success: true, serviceType, showCouponInput: setting.showCouponInput });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/coupons/settings/:serviceType
 * Admin only - toggle whether the coupon input box is shown for a service
 */
const updateCouponSetting = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { serviceType } = req.params;
    const { showCouponInput } = req.body;

    const setting = await CouponSetting.findOneAndUpdate(
      { serviceType },
      { $set: { showCouponInput: !!showCouponInput } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, serviceType, showCouponInput: setting.showCouponInput });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponSetting,
  updateCouponSetting,
};
