// src/models/CouponSetting.js
const mongoose = require("mongoose");

// Per-service toggle controlling whether the coupon input box is shown to
// users on that service's checkout UI. Keyed by an arbitrary serviceType
// string ("oneOnOne" today) so more services can opt in later.
const couponSettingSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    showCouponInput: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

couponSettingSchema.statics.getForService = async function (serviceType) {
  let setting = await this.findOne({ serviceType });
  if (!setting) {
    setting = await this.create({ serviceType, showCouponInput: false });
  }
  return setting;
};

module.exports = mongoose.model("CouponSetting", couponSettingSchema);
