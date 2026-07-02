const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controller/dashboard.controller");

router.use(auth);

// Dashboard data only changes when a sync runs — let the browser cache it but
// revalidate each time (Express ETags turn unchanged responses into 304s).
router.use((req, res, next) => {
  res.set("Cache-Control", "private, no-cache");
  next();
});

// ── Combined ──────────────────────────────────────────────────────────────────
router.get("/overview",      controller.getOverview);   // everything in one call

// ── Individual (kept for compatibility) ───────────────────────────────────────
router.get("/summary",       controller.getSummary);
router.get("/focus-areas",   controller.getFocusAreas);
router.get("/activity",      controller.getActivity);   // ?days=365

router.get("/contests",         controller.getContests); // ?limit=20
router.get("/rating-history",   controller.getRatingHistory);
router.get("/verdict-stats",    controller.getVerdictStats);
router.get("/language-stats",   controller.getLanguageStats);
router.get("/difficulty-stats", controller.getDifficultyStats);
router.get("/attempts-stats",   controller.getAttemptsStats);
router.get("/tag-mastery",      controller.getTagMastery);
router.get("/contest-extremes", controller.getContestExtremes);

module.exports = router;
