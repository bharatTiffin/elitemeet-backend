const express = require("express");
const router = express.Router();
const { cleanupExpiredSlots } = require("../utils/cleanupExpiredSlots");

// This route will be called by Vercel Cron
router.get("/cleanup", async (req, res) => {
  try {
    console.log("Cron cleanup started");

    // Verify cron secret for security
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const tokenFromQuery = req.query.token;
    const token = tokenFromHeader || tokenFromQuery;

    if (token !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("cleanupExpiredSlots function called!!");
    const result = await cleanupExpiredSlots();
    console.log("Cleanup expired slots result:", result);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
