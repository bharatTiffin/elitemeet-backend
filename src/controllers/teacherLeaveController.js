// src/controllers/teacherLeaveController.js
const Teacher = require("../models/Teacher");
const TeacherLeave = require("../models/TeacherLeave");
const { sendEmail } = require("../utils/email");

const requireAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

// Teachers we track. Seeded on first use; update emails later via the dashboard/DB.
const DEFAULT_TEACHERS = [
  { name: "Sourab Sir", subject: "Maths", email: "sourabhsoni629@gmail.com", payType: "per_lecture", ratePerLecture: 500 },
  { name: "Manish Sir", subject: "", email: "manishjagota89@gmail.com", payType: "salary" },
  { name: "Sumit Sir", subject: "", email: "growwkoundalsam90@gmail.com", payType: "salary" },
];

const seedTeachersIfEmpty = async () => {
  if ((await Teacher.countDocuments()) === 0) await Teacher.insertMany(DEFAULT_TEACHERS);
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const fmtDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
};

const fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const TYPE_LABEL = { lecture: "Lecture missed", half_day: "Half day", full_day: "Full day" };

const describeLeave = (l) =>
  l.type === "full_day"
    ? "Full day"
    : `${TYPE_LABEL[l.type]}${l.startTime ? ` (${fmtTime(l.startTime)} - ${fmtTime(l.endTime)})` : ""}`;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sendLeaveEmail = async (teacher, leaves, cancelled = false) => {
  const rows = leaves
    .map((l) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${fmtDate(l.date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><b>${describeLeave(l)}</b></td></tr>`)
    .join("");
  const note = leaves[0]?.note ? `<p><b>Note:</b> ${escapeHtml(leaves[0].note)}</p>` : "";
  const heading = cancelled ? "Leave cancelled" : "You have been marked absent";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
    <h2 style="color:${cancelled ? "#16a34a" : "#dc2626"}">${heading}</h2>
    <p>Hello ${escapeHtml(teacher.name)},</p>
    <p>${cancelled ? "The following leave has been removed from your record:" : "As informed, the following leave has been recorded by Elite Academy:"}</p>
    <table style="border-collapse:collapse;width:100%">${rows}</table>${note}
    <p style="color:#64748b;font-size:13px">This is an automated message from Elite Academy admin.</p></div>`;
  const text = `${heading}\n` + leaves.map((l) => `${fmtDate(l.date)} - ${describeLeave(l)}`).join("\n");
  await sendEmail({
    to: teacher.email,
    subject: `${cancelled ? "Leave cancelled" : "Absence recorded"} - ${fmtDate(leaves[0].date)}${leaves.length > 1 ? ` (+${leaves.length - 1} more)` : ""}`,
    text,
    html,
  });
};

/** GET /api/admin/teachers */
exports.getTeachers = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await seedTeachersIfEmpty();
    const teachers = await Teacher.find({ active: true }).sort({ createdAt: 1 });
    res.json({ success: true, teachers });
  } catch (err) { next(err); }
};

/** PUT /api/admin/teachers/:id  (update email / rate / salary) */
exports.updateTeacher = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const allowed = ["name", "subject", "email", "ratePerLecture", "monthlySalary"];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json({ success: true, teacher });
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/teacher-leaves
 * body: { teacherId, type, date, dateTo?, startTime?, endTime?, note?, notify? }
 * For full_day, dateTo creates one record per weekday in the range.
 */
exports.createLeave = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { teacherId, type, date, dateTo, startTime = "", endTime = "", note = "", notify = true } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    if (!["lecture", "half_day", "full_day"].includes(type)) return res.status(400).json({ error: "Invalid leave type" });
    if (!DATE_RE.test(date || "")) return res.status(400).json({ error: "Valid date required" });
    if (type !== "full_day") {
      if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return res.status(400).json({ error: "Start and end time required" });
      if (endTime <= startTime) return res.status(400).json({ error: "End time must be after start time" });
    }

    let dates = [date];
    if (type === "full_day" && dateTo && dateTo !== date) {
      if (!DATE_RE.test(dateTo) || dateTo < date) return res.status(400).json({ error: "Invalid end date" });
      dates = [];
      const cur = new Date(`${date}T00:00:00Z`);
      const end = new Date(`${dateTo}T00:00:00Z`);
      while (cur <= end && dates.length < 62) {
        const dow = cur.getUTCDay();
        if (dow !== 0 && dow !== 6) dates.push(cur.toISOString().slice(0, 10)); // skip Sat/Sun
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      if (!dates.length) return res.status(400).json({ error: "No weekdays in that range" });
    }

    const isFull = type === "full_day";
    const created = [];
    for (const d of dates) {
      // Skip exact duplicates (same teacher/date/type/time)
      const exists = await TeacherLeave.findOne({
        teacher: teacher._id, date: d, type, startTime: isFull ? "" : startTime,
      });
      if (exists) continue;
      created.push(await TeacherLeave.create({
        teacher: teacher._id, date: d, type,
        startTime: isFull ? "" : startTime,
        endTime: isFull ? "" : endTime,
        note,
      }));
    }
    if (!created.length) return res.status(409).json({ error: "This leave is already recorded" });

    let emailSent = false;
    let emailError = null;
    if (notify) {
      try {
        await sendLeaveEmail(teacher, created);
        emailSent = true;
        await TeacherLeave.updateMany({ _id: { $in: created.map((c) => c._id) } }, { emailSent: true });
      } catch (e) {
        console.error("Teacher leave email failed:", e.message);
        emailError = e.message;
      }
    }
    res.status(201).json({ success: true, created: created.length, emailSent, emailError });
  } catch (err) { next(err); }
};

/** DELETE /api/admin/teacher-leaves/:id?notify=true */
exports.deleteLeave = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const leave = await TeacherLeave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    let emailSent = false;
    if (req.query.notify === "true") {
      const teacher = await Teacher.findById(leave.teacher);
      if (teacher) {
        try { await sendLeaveEmail(teacher, [leave], true); emailSent = true; }
        catch (e) { console.error("Cancel email failed:", e.message); }
      }
    }
    res.json({ success: true, emailSent });
  } catch (err) { next(err); }
};

/**
 * GET /api/admin/teacher-leaves/summary?month=YYYY-MM
 * Per teacher: counts of full days, half days, lectures missed + the list.
 */
exports.getSummary = async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await seedTeachersIfEmpty();
    const now = new Date();
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "")
      ? req.query.month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [teachers, leaves] = await Promise.all([
      Teacher.find({ active: true }).sort({ createdAt: 1 }).lean(),
      TeacherLeave.find({ date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: 1, startTime: 1 }).lean(),
    ]);

    const summary = teachers.map((t) => {
      const mine = leaves.filter((l) => String(l.teacher) === String(t._id));
      return {
        teacher: t,
        fullDays: mine.filter((l) => l.type === "full_day").length,
        halfDays: mine.filter((l) => l.type === "half_day").length,
        lectures: mine.filter((l) => l.type === "lecture").length,
        leaves: mine,
      };
    });
    res.json({ success: true, month, summary });
  } catch (err) { next(err); }
};
