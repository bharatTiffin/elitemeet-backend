// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cron = require("node-cron");
const connectDB = require("./src/config/db");
const { cleanupExpiredSlots } = require("./src/utils/cleanupExpiredSlots");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const slotRoutes = require("./src/routes/slotRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const webhookRoutes = require("./src/routes/webhookRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// CORS Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://192.168.18.15:5173',
    'https://financial-statement-tracker.vercel.app',
  ],
  credentials: true
}));

// Webhook route BEFORE body parser (needs raw body)
app.use("/api/webhooks", webhookRoutes);

// Body parser middleware (after webhook routes)
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "API is running ✅" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Cron job: Run every 2 minutes to cleanup expired slots
cron.schedule("*/2 * * * *", async () => {
  console.log("Running cleanup job...");
  await cleanupExpiredSlots();
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Cron job scheduled for slot cleanup every 2 minutes");
});
