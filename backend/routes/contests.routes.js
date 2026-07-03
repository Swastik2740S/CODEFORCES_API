const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controller/contests.controller");

router.use(auth);

router.get("/upcoming", controller.upcoming);
router.get("/history",  controller.history);

module.exports = router;
