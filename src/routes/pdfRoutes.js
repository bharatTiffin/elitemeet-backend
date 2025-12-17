const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getPDFInfo, createPurchase, getMyPurchases } = require("../controllers/pdfController");

// Public route
router.get("/info", getPDFInfo);

// Protected routes
router.post("/create-purchase", auth, createPurchase);
router.get("/my-purchases", auth, getMyPurchases);

module.exports = router;

