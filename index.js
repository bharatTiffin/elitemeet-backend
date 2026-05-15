const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const { cloudinaryConnect } = require("./src/config/cloudinary");
require("dotenv").config();
const dns = require("dns");
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// Database connection
connectDB();
// Cloudinary (for job resume uploads)
cloudinaryConnect();


// CORS configuration
app.use(cors({
  origin: [
    '*',
    'https://www.eliteacademy.pro',
    'https://eliteacademy.pro',
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:5174',
    'http://localhost:5175',
    'https://elite-academy-meet.vercel.app',
    'https://elitemeet-frontend.vercel.app',
    'https://elite-academy-backend-proxy.vercel.app',
    'https://elite-academy-production.up.railway.app',
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
app.use("/api/currentaffair", require("./src/routes/currentaffair"));
app.use("/api/cron", require("./src/routes/cronRoutes"));
app.use("/api/typing", require("./src/routes/typingRoutes"));
app.use("/api/polity", require("./src/routes/polityRoutes"));
app.use("/api/books", require("./src/routes/bookRoutes")); 
app.use("/api/pyqs", require("./src/routes/pyqsRoutes"));
app.use("/api/monthly-current-affairs", require("./src/routes/monthlyCurrentAffairRoutes"));
app.use("/api/admin/monthly-current-affairs", require("./src/routes/adminMonthlyCurrentAffairRoutes"));
app.use("/api/coaching", require("./src/routes/coachingRoutes")); 
app.use("/api/videocoaching", require("./src/routes/videocoachingRoutes"));
app.use("/api/videocrashcoaching", require("./src/routes/videocrashcoachingRoutes"));
app.use("/api/crashcourse", require("./src/routes/crashcourseRoutes.js"));
app.use("/api/job", require("./src/routes/jobRoutes.js"));
app.use("/api/french-course", require("./src/routes/frenchCourseRoutes.js"));
app.use("/api/weeklytest", require("./src/routes/weeklytestSeries.js"));
app.use("/api/sectional-test", require("./src/routes/sectionalTestSeriesRoutes.js"));
app.use("/api/pstet", require("./src/routes/pstetRoutes.js"));
app.use("/api/excise-inspector", require("./src/routes/exciseInspectorRoutes.js"));
app.use("/api/admin", require("./src/routes/adminRoutes")); 
app.use("/api/inquiry", require("./src/routes/inquiryRoutes"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
