const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const upload = require("../middleware/upload");
const calendarService = require('../utils/calendarService');
const { authenticate, authorizeRoles, auth } = require("../middleware/auth");
const { generateTimeSlots } = require("../utils/appointmentUtils");




// Public routes
router.post("/register", doctorController.createDoctor);
// router.post("/login", doctorController.loginDoctor);
// router.get("/all", doctorController.getDoctors);
// router.delete("/delete/:doctor_id", doctorController.deleteDoctor);

// Protected routes
router.get("/profile", doctorController.getDoctorDetails);
router.post("/update",  doctorController.updateDoctorDetails);
router.post(
  "/uploadFiles",
  
  upload.fields([
    { name: "doctor_signature", maxCount: 1 },
    { name: "bar_code", maxCount: 1 },
    { name: "qr_code", maxCount: 1 },
    { name: "letterhead", maxCount: 1 },
  ]),
  doctorController.uploadDoctorFiles
);

router.get('/getSlots', async (req, res) => {
  const docId = req.query.id;
  const date = req.query.date || null;

  try {
    const slots = await generateTimeSlots(docId,date);
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// sched a new meet
router.post("/schedule-meeting",calendarService.scheduleMeetingDoctor);
router.get("/getDoctorsByClinic", doctorController.getDoctorsByClinic);


//!! routes below this reqires auth!!!
router.use(authenticate);

router.get("/all",  doctorController.getDoctors);
router.delete("/delete/:doctor_id", doctorController.deleteDoctor);



module.exports = router;
