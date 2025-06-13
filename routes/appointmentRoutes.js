const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { authenticate, auth } = require("../middleware/auth");
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
  appointmentController.getTotalAppointments
);

router.get(
  "/allPending",
  appointmentController.getPendingAppointments
);
router.get(
  "/clinicPending",
  appointmentController.getPendingAppointmentsForClinic
);
router.get(
  "/doctorPending",
  appointmentController.getPendingAppointmentsForDoctor
);

router.get(
  "/completed",
  appointmentController.getCompletedAppointments
);
router.get(
  "/clinicCompleted",
  appointmentController.getCompletedAppointmentsForClinic
);
router.get(
  "/doctorCompleted",
  appointmentController.getCompletedAppointmentsForDoctor
);

router.get(
  "/past/patient",
  appointmentController.getPastAppointmentsByPatient
);
router.get(
  "/past/doctor",
  appointmentController.getPastAppointmentsByDoctor
);
router.get(
  "/docToday",
  appointmentController.getTodaysAppointmentsByDoctor
);
router.get(
  "/doctorConsultations",
  appointmentController.fetchAllConsultationsForDoctor
);

router.get(
  "/clinicConsultations",
  appointmentController.fetchAllConsultationsForClinic
);


router.get(
  "/doctorConsultationsCount",
  appointmentController.countConsultationsForDoctor
);

router.get(
  "/todayClinic",
  appointmentController.getTodaysAppointmentsByClinic
);

// // Appointment CRUD operations
// // router.post("/add", appointmentController.addAppointment);
router.put(
  "/update",
  appointmentController.updateAppointment
);

router.get(
  "/booked-times",
  appointmentController.getBookedTimes
);

router.delete(
  "/delete/:appointment_id",
  appointmentController.deleteAppointment
);

router.post(
  "/createBill",
  appointmentController.createBill
);

// // Status updates
router.post(
  "/updateStatus",
  appointmentController.updateStatus
);
router.post(
  "/updatePaymentStatus",
  appointmentController.updatePaymentStatus
);
router.post(
  "/markAsEmergency/:appointment_id",
  appointmentController.markAsEmergency
);
router.post(
  "/updateApptStatus",
  appointmentController.updateAppointmentStatus
);
router.post(
  "/uploadBill",
  upload.fields([{ name: "payment_receipt", maxCount: 1 }]),
  appointmentController.uploadPaymentReceipt
);

router.post(
  "/getAppointmentsByDateRangebyClinic",
  appointmentController.getAppointmentsByDateRangebyClinic
);

router.post(
  "/getAppointmentsByDateRangeByDoctor",
  appointmentController.getAppointmentsByDateRangeByDoctor
);


router.post(
  "/updatePaymentStatus",
  appointmentController.updatePaymentStatus
);


router.get(
  "/getAppointmentById",
  appointmentController.getAppointmentById
);

module.exports = router;
