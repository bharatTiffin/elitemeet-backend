const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getInfo, enrollAndCreateOrder, checkAccess, adminAddEnrollment,
  getPendingPayments, suspendStudent, reactivateStudent, sendPaymentReminder, updatePendingPayment
} = require("../controllers/mockTestController");

router.get("/info", getInfo);
router.post("/enroll", enrollAndCreateOrder);
router.get("/check-access", checkAccess);
router.post("/admin/add-enrollment", auth, adminAddEnrollment);
router.get("/admin/pending-payments", auth, getPendingPayments);
router.put("/admin/suspend/:enrollmentId", auth, suspendStudent);
router.put("/admin/reactivate/:enrollmentId", auth, reactivateStudent);
router.post("/admin/send-reminder/:enrollmentId", auth, sendPaymentReminder);
router.put("/admin/update-payment/:enrollmentId", auth, updatePendingPayment);

module.exports = router;
