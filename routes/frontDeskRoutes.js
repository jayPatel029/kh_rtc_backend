const express = require("express");
const router = express.Router();
const frontDescController = require('../controllers/frontDeskController');
const authController = require('../controllers/authController');
const upload = require("../middleware/upload");

router.post("/register", frontDescController.createFrontDesk);
router.post("/login", frontDescController.loginFrontDesk);


module.exports = router;