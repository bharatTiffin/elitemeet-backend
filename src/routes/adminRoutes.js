const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const leadsController = require("../controllers/leadsController");
const teacherLeave = require("../controllers/teacherLeaveController");
const auth = require("../middleware/auth")
// Single route to get all details of all confirmed users (minus passwords)
router.get("/all-confirmed",auth, adminController.getAllConfirmedDetails);
// Export everyone who has bought any course/product (except the ₹5999 one) as an Excel call list
router.get("/course-buyers-export", auth, leadsController.exportCourseBuyers);
router.get("/all-confirmed-crash-course",auth, adminController.getAllConfirmedDetailsCrashCourse);
router.get("/all-confirmed-weekly-test",auth, adminController.getAllConfirmedDetailsWeeklyTest);
router.get("/all-confirmed-teachers-friends",auth, adminController.getAllConfirmedTeachersAndFriends);
router.get("/all-confirmed-offline-students",auth, adminController.getAllConfirmedOfflineStudents);
router.get("/all-confirmed-mock-test",auth, adminController.getAllConfirmedMockTest);
// Auto-create daily slot at 9pm for ₹599 (triggered by Uptime Robot)
router.get("/auto-create-daily-slot", adminController.autoCreateDailySlot);

// Teacher leave tracking
router.get("/teachers", auth, teacherLeave.getTeachers);
router.put("/teachers/:id", auth, teacherLeave.updateTeacher);
router.get("/teacher-leaves/summary", auth, teacherLeave.getSummary);
router.post("/teacher-leaves", auth, teacherLeave.createLeave);
router.delete("/teacher-leaves/:id", auth, teacherLeave.deleteLeave);

module.exports = router;