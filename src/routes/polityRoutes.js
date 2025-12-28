const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getPolityInfo, createPurchase, getMyPurchases } = require("../controllers/polityController");

// Public route
router.get("/info", getPolityInfo);

// Protected routes
router.post("/create-purchase", auth, createPurchase);
router.get("/my-purchases", auth, getMyPurchases);

module.exports = router;
