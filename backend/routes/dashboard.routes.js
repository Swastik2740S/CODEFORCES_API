const express = require("express");
const router = express.Router();
const controller = require("../controller/dashboard.controller");

// ── Existing ──────────────────────────────────────────────────────────────────
router.get("/summary",       controller.getSummary);
router.get("/focus-areas",   controller.getFocusAreas);
router.get("/activity",      controller.getActivity);

// ── Insights ──────────────────────────────────────────────────────────────────
router.get("/contests",         controller.getContests);         // ?limit=20
router.get("/rating-history",   controller.getRatingHistory);
router.get("/verdict-stats",    controller.getVerdictStats);
router.get("/language-stats",   controller.getLanguageStats);
router.get("/difficulty-stats", controller.getDifficultyStats);
router.get("/attempts-stats",   controller.getAttemptsStats);
router.get("/tag-mastery",      controller.getTagMastery);
router.get("/contest-extremes", controller.getContestExtremes);

module.exports = router;