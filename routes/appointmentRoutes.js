const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { authenticate, authorizeRoles, auth } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/add", appointmentController.addAppointment);

// router.get("/past/patient", authorizeRoles('doctor'),appointmentController.getPastAppointmentsByPatient);
// router.get("/past/doctor", authorizeRoles('front_desk') ,appointmentController.getPastAppointmentsByDoctor);
// router.get("/today", appointmentController.getTodaysAppointmentsByDoctor);
// router.get("/consultations", appointmentController.fetchAllConsultations);
router.get("/todayClinic", appointmentController.getTodaysAppointmentsByClinic);

// Appointment CRUD operations
// router.post("/add", appointmentController.addAppointment);
// router.put("/update", appointmentController.updateAppointment);
// router.get("/booked-times", appointmentController.getBookedTimes);
// router.delete(
//   "/delete/:appointment_id",
//   appointmentController.deleteAppointment
// );
// router.post("/createBill", appointmentController.createBill);

// // Status updates
// router.post("/updateStatus", appointmentController.updateStatus);
// router.post("/updatePaymentStatus", appointmentController.updatePaymentStatus);
// router.post(
//   "/markAsEmergency/:appointment_id",
//   appointmentController.markAsEmergency
// );
// router.post("/updateApptStatus", appointmentController.updateAppointmentStatus);
// // router.post('/updatePastAppointments', appointmentController.updatePastAppointments);
// router.post(
//   "/uploadBill",
//   upload.fields([{ name: "payment_receipt", maxCount: 1 }]),
//   appointmentController.uploadPaymentReceipt
// );

//!! routes below this reqires auth!!!
router.use(authenticate);

// Get appointment counts
router.get(
  "/totalForDoctor",
  authorizeRoles("admin", "front_desk", "doctor"),
  appointmentController.getTotalAppointments
);

router.get(
  "/allPending",
  authorizeRoles("admin"),
  appointmentController.getPendingAppointments
);
router.get(
  "/clinicPending",
  authorizeRoles("front_desk","admin"),
  appointmentController.getPendingAppointmentsForClinic
);
router.get(
  "/doctorPending",
  authorizeRoles("doctor", "admin"),
  appointmentController.getPendingAppointmentsForDoctor
);

router.get(
  "/completed",
  authorizeRoles("admin"),
  appointmentController.getCompletedAppointments
);
router.get(
  "/clinicCompleted",
  authorizeRoles("front_desk", "admin"),
  appointmentController.getCompletedAppointmentsForClinic
);
router.get(
  "/doctorCompleted",
  authorizeRoles("doctor", "admin"),
  appointmentController.getCompletedAppointmentsForDoctor
);

router.get(
  "/past/patient",
  authorizeRoles("doctor", "admin"),
  appointmentController.getPastAppointmentsByPatient
);
router.get(
  "/past/doctor",
  authorizeRoles("front_desk", "admin"),
  appointmentController.getPastAppointmentsByDoctor
);
router.get(
  "/docToday",
  authorizeRoles("front_desk", "doctor", 'admin'),
  appointmentController.getTodaysAppointmentsByDoctor
);
router.get(
  "/consultations",
  authorizeRoles("doctor", "admin", "front_desk"),
  appointmentController.fetchAllConsultations
);
router.get(
  "/todayClinic",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.getTodaysAppointmentsByClinic
);

// // Appointment CRUD operations
// // router.post("/add", appointmentController.addAppointment);
router.put(
  "/update",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.updateAppointment
);

router.get(
  "/booked-times",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.getBookedTimes
);

router.delete(
  "/delete/:appointment_id",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.deleteAppointment
);

router.post(
  "/createBill",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.createBill
);

// // Status updates
router.post(
  "/updateStatus",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.updateStatus
);
router.post(
  "/updatePaymentStatus",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.updatePaymentStatus
);
router.post(
  "/markAsEmergency/:appointment_id",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.markAsEmergency
);
router.post(
  "/updateApptStatus",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.updateAppointmentStatus
);
// // router.post('/updatePastAppointments', appointmentController.updatePastAppointments);
router.post(
  "/uploadBill",
  upload.fields([{ name: "payment_receipt", maxCount: 1 }]),
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.uploadPaymentReceipt
);

router.post(
  "/getAppointmentsByDateRangebyClinic",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.getAppointmentsByDateRangebyClinic
);

router.post(
  "/getAppointmentsByDateRangeByDoctor",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.getAppointmentsByDateRangeByDoctor
);


router.post(
  "/updatePaymentStatus",
  authorizeRoles("front_desk", "doctor", "admin"),
  appointmentController.updatePaymentStatus
);


module.exports = router;
