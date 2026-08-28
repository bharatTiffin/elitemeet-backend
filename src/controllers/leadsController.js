// src/controllers/leadsController.js
const ExcelJS = require("exceljs");

const CoachingEnrollment = require("../models/CoachingEnrollment");
const CrashCourse = require("../models/CrashCourse");
const WeeklyTestSeries = require("../models/WeeklyTestSeries");
const SectionalTestSeries = require("../models/SectionalTestSeries");
const PstetEnrollment = require("../models/PstetEnrollment");
const PyqsPurchase = require("../models/PyqsPurchase");
const PlannerPurchase = require("../models/PlannerPurchase");
const PDFPurchase = require("../models/PDFPurchase");
const PolityPurchase = require("../models/PolityPurchase");
const TypingPurchase = require("../models/TypingPurchase");
const MonthlyCurrentAffairPurchase = require("../models/MonthlyCurrentAffairPurchase");
const BookPurchase = require("../models/BookPurchase");
const User = require("../models/User");

// Anyone with a confirmed purchase of exactly this amount, in any collection,
// already owns "the ₹5999 course" and should never appear in the call list.
const EXCLUDED_AMOUNT = 5999;

const RANGE_DAYS = {
  "7d": 7,
  "14d": 14,
  "21d": 21,
  "28d": 28,
  "6m": 182,
};

function getSinceDate(range) {
  const days = RANGE_DAYS[range];
  if (!days) return null; // 'lifetime' or unrecognized -> no lower bound
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// One entry per purchase-bearing collection: how to filter "paid" records,
// which field holds the purchase date (defaults to createdAt), and how to
// pull name/email/phone/amount out of a raw document.
const SOURCES = [
  {
    label: "Coaching Program",
    model: CoachingEnrollment,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Crash Course",
    model: CrashCourse,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Weekly Test Series",
    model: WeeklyTestSeries,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Sectional Test Series",
    model: SectionalTestSeries,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "PSTET/CTET Crash Course",
    model: PstetEnrollment,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "PYQs Book",
    model: PyqsPurchase,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.mobile, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Planner Book",
    model: PlannerPurchase,
    statusFilter: { status: { $in: ["confirmed", "delivered"] } },
    map: (d) => ({ name: d.fullName, email: d.email, phone: d.phone, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "PDF",
    model: PDFPurchase,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.userName, email: d.userEmail, phone: null, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Polity Book",
    model: PolityPurchase,
    statusFilter: { status: "confirmed" },
    map: (d) => ({ name: d.userName, email: d.userEmail, phone: null, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Typing Course",
    model: TypingPurchase,
    statusFilter: { status: "confirmed" },
    dateField: "purchaseDate", // this schema has no {timestamps:true}, no createdAt
    map: (d) => ({ name: d.userName, email: d.userEmail, phone: null, amount: d.amount, date: d.purchaseDate }),
  },
  {
    label: "Monthly Current Affairs",
    model: MonthlyCurrentAffairPurchase,
    statusFilter: { status: "completed" },
    map: (d) => ({ name: d.userName, email: d.userEmail, phone: null, amount: d.amount, date: d.createdAt }),
  },
  {
    label: "Book Purchase",
    model: BookPurchase,
    statusFilter: { status: "completed" },
    map: (d) => ({ name: d.userName, email: d.userEmail, phone: null, amount: d.amount, date: d.createdAt }),
  },
];

async function fetchCandidatePurchases(since) {
  const all = [];
  for (const source of SOURCES) {
    const dateField = source.dateField || "createdAt";
    const filter = { ...source.statusFilter };
    if (since) filter[dateField] = { $gte: since };

    const docs = await source.model.find(filter).lean();
    for (const doc of docs) {
      const mapped = source.map(doc);
      if (!mapped.email) continue;
      all.push({ ...mapped, product: source.label });
    }
  }
  return all;
}

// Anyone who already paid ₹5999 for anything, at any time, regardless of the
// selected date range - they should never be called about the ₹5999 course.
async function fetchExcludedEmails() {
  const excluded = new Set();
  for (const source of SOURCES) {
    const filter = { ...source.statusFilter, amount: EXCLUDED_AMOUNT };
    const docs = await source.model.find(filter).select("email userEmail").lean();
    for (const doc of docs) {
      const email = (doc.email || doc.userEmail || "").toLowerCase().trim();
      if (email) excluded.add(email);
    }
  }
  return excluded;
}

exports.exportCourseBuyers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admins only" });
    }

    const range = req.query.range || "lifetime";
    const since = getSinceDate(range);

    const [purchases, excludedEmails] = await Promise.all([
      fetchCandidatePurchases(since),
      fetchExcludedEmails(),
    ]);

    // Merge every purchase into one row per buyer (same person may have bought
    // more than one product), skipping anyone in the excluded set.
    const byEmail = new Map();
    for (const p of purchases) {
      const emailKey = p.email.toLowerCase().trim();
      if (excludedEmails.has(emailKey)) continue;

      const existing = byEmail.get(emailKey);
      if (!existing) {
        byEmail.set(emailKey, {
          name: p.name || "",
          email: p.email,
          phone: p.phone || "",
          products: new Set([p.product]),
          totalAmount: p.amount || 0,
          lastPurchaseDate: p.date || null,
        });
      } else {
        existing.products.add(p.product);
        existing.totalAmount += p.amount || 0;
        if (!existing.phone && p.phone) existing.phone = p.phone;
        if (p.date && (!existing.lastPurchaseDate || new Date(p.date) > new Date(existing.lastPurchaseDate))) {
          existing.lastPurchaseDate = p.date;
        }
      }
    }

    // Several purchase types (PDF, Polity, Typing, Monthly Current Affairs,
    // Book Purchase) never captured a phone number. Backfill from the Users
    // collection where possible.
    const missingPhoneEmails = [...byEmail.values()]
      .filter((v) => !v.phone)
      .map((v) => v.email.toLowerCase());

    if (missingPhoneEmails.length) {
      const users = await User.find({
        email: { $in: missingPhoneEmails },
        phone: { $exists: true, $ne: null },
      })
        .select("email phone")
        .lean();
      const phoneByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.phone]));
      for (const entry of byEmail.values()) {
        if (!entry.phone) {
          const found = phoneByEmail.get(entry.email.toLowerCase());
          if (found) entry.phone = found;
        }
      }
    }

    const rows = [...byEmail.values()].sort((a, b) => {
      const dateA = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
      const dateB = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
      return dateB - dateA;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Course Buyers");
    sheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Products Purchased", key: "products", width: 45 },
      { header: "Total Amount Spent (₹)", key: "totalAmount", width: 20 },
      { header: "Last Purchase Date", key: "lastPurchaseDate", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    rows.forEach((r) => {
      sheet.addRow({
        name: r.name,
        email: r.email,
        phone: r.phone || "MISSING",
        products: [...r.products].join(", "),
        totalAmount: r.totalAmount,
        lastPurchaseDate: r.lastPurchaseDate
          ? new Date(r.lastPurchaseDate).toLocaleDateString("en-IN")
          : "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="course-buyers-${range}-${Date.now()}.xlsx"`
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Error exporting course buyers:", err);
    res.status(500).json({
      success: false,
      message: "Failed to export course buyers",
      error: err.message,
    });
  }
};
