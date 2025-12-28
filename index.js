const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
require("dotenv").config();

const app = express();

// Database connection
connectDB();

// CORS configuration
app.use(cors({
  origin: [
    '*',
    'https://www.eliteacademy.pro',
    'https://eliteacademy.pro',
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:5174',
    'https://elite-academy-meet.vercel.app',
    'https://elitemeet-frontend.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Requested-With']
}));

// ✅ IMPORTANT: Webhook route MUST come BEFORE express.json()
// This is because Razorpay webhook signature verification needs raw body
app.use("/api/webhook", require("./src/routes/webhookRoutes"));

// ✅ NOW parse JSON for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Elite Meet API is running" });
});

// 🔥 OTHER ROUTES (after express.json())
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/slots", require("./src/routes/slotRoutes"));
app.use("/api/bookings", require("./src/routes/bookingRoutes"));
app.use("/api/payments", require("./src/routes/paymentRoutes"));
app.use("/api/mentorship", require("./src/routes/mentorshipRoutes"));
app.use("/api/pdf", require("./src/routes/pdfRoutes"));
app.use("/api/cron", require("./src/routes/cronRoutes"));
app.use("/api/typing", require("./src/routes/typingRoutes"));
app.use("/api/polity", require("./src/routes/polityRoutes"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
