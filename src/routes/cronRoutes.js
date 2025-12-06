const express = require("express");
const router = express.Router();
const { cleanupExpiredSlots } = require("../utils/cleanupExpiredSlots");

// This route will be called by Vercel Cron
router.get("/cleanup", async (req, res) => {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await cleanupExpiredSlots();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
