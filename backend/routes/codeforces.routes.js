const express = require("express");
const router = express.Router();
const controller = require("../controller/codeforces.controller");

router.post("/link-handle", controller.linkHandle);
router.get("/handles", controller.getHandles);
router.post("/sync", controller.createSyncJob);
router.get("/sync/:jobId", controller.getSyncJobStatus);
router.get("/rating-graph", controller.getRatingGraph);




module.exports = router;
