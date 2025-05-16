const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const { generateTimeSlots } = require("../utils/appointmentUtils");

// Public routes
router.post("/register", doctorController.createDoctor);
router.post("/login", doctorController.loginDoctor);
router.get("/all", doctorController.getDoctors);

// Protected routes
router.get("/profile", auth, doctorController.getDoctorDetails);
router.post("/update", auth, doctorController.updateDoctorDetails);
router.post(
  "/uploadFiles",
  auth,
  upload.fields([
    { name: "doctor_signature", maxCount: 1 },
    { name: "clinic_icon", maxCount: 1 },
    { name: "bar_code", maxCount: 1 },
    { name: "qr_code", maxCount: 1 },
    { name: "letterhead", maxCount: 1 },
  ]),
  doctorController.uploadDoctorFiles
);

router.get('/getSlots/:id', async (req, res) => {
  try {
    const slots = await generateTimeSlots(req.params.id);
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
