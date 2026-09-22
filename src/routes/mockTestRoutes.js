const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getInfo, enrollAndCreateOrder, checkAccess, adminAddEnrollment } = require("../controllers/mockTestController");

router.get("/info", getInfo);
router.post("/enroll", enrollAndCreateOrder);
router.get("/check-access", checkAccess);
router.post("/admin/add-enrollment", auth, adminAddEnrollment);

module.exports = router;
