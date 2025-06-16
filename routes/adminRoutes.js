const express = require("express");
const router = express.Router();
// const frontDescController = require('../controllers/frontDeskController');
const authController = require('../controllers/authController');
const { authenticate} = require("../middleware/auth");

// router.post("/login", authController.loginUserByRole);


module.exports = router;