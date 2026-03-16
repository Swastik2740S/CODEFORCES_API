const express = require("express");
const router = express.Router();
const controller = require("../controller/dashboard.controller");

router.get("/summary", controller.getSummary);
router.get("/focus-areas", controller.getFocusAreas);
router.get("/activity", controller.getActivity); // ✅ NEW: heatmap data

module.exports = router;