const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { syncUser } = require("../controllers/authController");

router.post("/sync", auth, syncUser);

module.exports = router;
