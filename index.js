const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
require("dotenv").config();

const app = express();

// Database connection
connectDB();

// Middleware
// app.use(cors());
app.use(cors({
  origin: true, // Allow all origins (NOT RECOMMENDED FOR PRODUCTION!)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Elite Meet API is running" });
});

// 🔥 ROUTES - Make sure auth routes are registered!
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/slots", require("./src/routes/slotRoutes"));
app.use("/api/bookings", require("./src/routes/bookingRoutes"));
app.use("/api/payments", require("./src/routes/paymentRoutes"));
app.use("/api/webhook", require("./src/routes/webhookRoutes"));
app.use("/api/cron", require("./src/routes/cronRoutes"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
