const express = require("express");
const router = express.Router();
// const frontDescController = require('../controllers/frontDeskController');
const authController = require('../controllers/authController');
const { authenticate, authorizeRoles } = require("../middleware/auth");

router.post("/login", authController.loginUserByRole);
router.get("/getActiveUsers", authController.getActiveUsers);
router.get("/getDashboardStats", authController.getDashboardStats);

//! routes below this requires auth!!!
router.use(authenticate);


module.exports = router;