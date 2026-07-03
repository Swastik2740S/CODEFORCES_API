const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controller/peers.controller");

router.use(auth);

// ── Friends ───────────────────────────────────────────────────────────────────
router.get("/",                controller.listFriends);
router.get("/leaderboard",     controller.leaderboard);
router.post("/:handle/follow", controller.follow);
router.delete("/:handle",      controller.unfollow);

// ── Compare ───────────────────────────────────────────────────────────────────
// Sync progress is polled via the shared /api/codeforces/sync/session/:id.
router.post("/:handle/sync",   controller.syncPeer);
router.get("/compare/:handle", controller.compare);

module.exports = router;
