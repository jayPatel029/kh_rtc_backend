const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const billsController = require("../controllers/billsController");

router.use(authenticate);

router.get("/getAllBills",billsController.getAllBills);

router.post("/create", billsController.createBill);

router.post("/upload", billsController.uploadPaymentReceipt);


module.exports = router;
