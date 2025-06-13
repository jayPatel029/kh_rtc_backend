const express = require("express");
const router = express.Router();
// const frontDescController = require('../controllers/frontDeskController');
const authController = require('../controllers/authController');
const { authenticate, authorizeRoles } = require("../middleware/auth");

router.post("/login", authController.loginUserByRole);

//! routes below this requires auth!!!
router.use(authenticate);


module.exports = router;