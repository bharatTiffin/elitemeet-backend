const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
require("dotenv").config();

const app = express();

// Database connection
connectDB();

// 🔥 FIXED CORS - Allow both localhost and Vercel frontend
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:5174',
    'https://elitemeet-frontend.vercel.app', // Add your actual Vercel frontend URL
    /\.vercel\.app$/ // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Requested-With']
}));

// ❌ REMOVE THIS LINE - it's causing the error
// app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Elite Meet API is running" });
});

// 🔥 ROUTES
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
