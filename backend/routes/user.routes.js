const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require("../controller/user.controller");

router.get('/me', auth, (req, res) => {
  res.json({ userId: req.userId });
});

router.get("/bootstrap", controller.bootstrap);

module.exports = router;
