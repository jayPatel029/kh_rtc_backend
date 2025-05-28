const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { authenticate, authorizeRoles, auth } = require("../middleware/auth");
const clinicController = require('../controllers/clinicController');


router.post("/addClinic", clinicController.addClinic);
router.get("/allClinics", clinicController.getAllClinics);


router.post(
  "/uploadFiles",
  
  upload.fields([
    { name: "clinic_icon", maxCount: 1 },
    { name: "bar_code", maxCount: 1 },
    { name: "qr_code", maxCount: 1 },
  ]),
  clinicController.uploadClinicFiles
);


module.exports = router;