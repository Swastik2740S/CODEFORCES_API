const express = require("express");
const router  = express.Router();
const controller = require("../controller/codeforces.controller");

// ── Existing ──────────────────────────────────────────────────────────────────
router.post("/link-handle",        controller.linkHandle);
router.get("/handles",             controller.getHandles);
router.post("/sync",               controller.createSyncJob);
router.get("/sync/:jobId",         controller.getSyncJobStatus);
router.get("/rating-graph",        controller.getRatingGraph);

// ── Settings page ─────────────────────────────────────────────────────────────
router.patch("/handle/:id/activate", controller.activateHandle);
router.delete("/handle/:id",         controller.removeHandle);

module.exports = router;