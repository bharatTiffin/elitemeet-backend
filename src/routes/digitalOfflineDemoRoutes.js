const express = require("express");
const router = express.Router();
const { getInfo, createOrder } = require("../controllers/digitalOfflineDemoController");

router.get("/info", getInfo);
router.post("/create-order", createOrder);

module.exports = router;