const express = require("express");
const router = express.Router();
const controller = require("../controller/user.controller");

router.get("/bootstrap",controller.bootstrap);      // check if CF handle connected
router.patch("/profile",controller.updateProfile);  // update name/email
router.delete("/account",controller.deleteAccount); // delete account

module.exports = router;