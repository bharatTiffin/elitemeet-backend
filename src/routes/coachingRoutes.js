const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getInfo, enrollAndCreateOrder,checkAccess,adminAddEnrollment,checkCrashCourseAccess,admincrashAddEnrollment,checkWeeklyAccess,adminweeklyAddEnrollment,checkSectionalTestAccess,adminsectionalTestAddEnrollment,getPendingPayments,suspendStudent,sendPaymentReminder } = require("../controllers/coachingController");

router.get("/info", getInfo);
// We combine enrollment and purchase into one call for a better UX
router.post("/enroll", enrollAndCreateOrder);

router.post("/admin/add-enrollment", auth, adminAddEnrollment);
router.post("/admin/crash-add-enrollment", auth, admincrashAddEnrollment);
router.post("/admin/weekly-add-enrollment", auth, adminweeklyAddEnrollment);
router.post("/admin/sectional-test-add-enrollment", auth, adminsectionalTestAddEnrollment);
router.get("/admin/pending-payments", auth, getPendingPayments);
router.put("/admin/suspend/:enrollmentId", auth, suspendStudent);
router.post("/admin/send-reminder/:enrollmentId", auth, sendPaymentReminder);
router.get("/check-access", checkAccess);
router.get("/check-crash-access", checkCrashCourseAccess);
router.get("/check-weekly-access", checkWeeklyAccess);
router.get("/check-sectional-test-access", checkSectionalTestAccess);


module.exports = router;