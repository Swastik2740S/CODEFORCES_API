const express = require("express");
const router  = express.Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controller/codeforces.controller");

router.use(auth);

router.post("/link-handle",        controller.linkHandle);
router.get("/handles",             controller.getHandles);
router.post("/sync",               controller.createSyncJob);

// Session route must come before the parameterized single-job route,
// otherwise "session" would be captured as a :jobId.
router.get("/sync/session/:sessionId", controller.getSyncSessionStatus);
router.get("/sync/:jobId",         controller.getSyncJobStatus);

router.get("/rating-graph",        controller.getRatingGraph);

// ── Settings page ─────────────────────────────────────────────────────────────
router.patch("/handle/:id/activate", controller.activateHandle);
router.delete("/handle/:id",         controller.removeHandle);

module.exports = router;
