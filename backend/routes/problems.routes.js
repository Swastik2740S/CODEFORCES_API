const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const controller = require("../controller/problems.controller");

router.use(auth);

router.get("/",     controller.listProblems);
router.get("/tags", controller.listTags);

module.exports = router;
