const express = require("express");
const router = express.Router();
const frontDescController = require('../controllers/frontDeskController');
const authController = require('../controllers/authController');

router.post("/register", frontDescController.createFrontDesk);
router.post("/login", authController.loginUserByRole);


module.exports = router;