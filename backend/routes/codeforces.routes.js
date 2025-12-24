const express = require("express");
const router = express.Router();
const controller = require("../controller/codeforces.controller");

router.post("/link-handle", controller.linkHandle);
router.get("/handles", controller.getHandles);


module.exports = router;
