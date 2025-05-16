const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
     
// Get appointment counts
router.get('/total', appointmentController.getTotalAppointments);
router.get('/pending', appointmentController.getPendingAppointments);
router.get('/completed', appointmentController.getCompletedAppointments);
router.get('/past/patient', appointmentController.getPastAppointmentsByPatient);
router.get('/past/doctor', appointmentController.getPastAppointmentsByDoctor);
router.get('/today', appointmentController.getTodaysAppointmentsByDoctor);
router.get('/consultations', appointmentController.fetchAllConsultations);


// Appointment CRUD operations
router.post('/add', appointmentController.addAppointment);
router.put('/update', appointmentController.updateAppointment);
router.get('/booked-times', appointmentController.getBookedTimes);
router.delete('/delete/:appointment_id', appointmentController.deleteAppointment);

// Status updates
router.post('/updateStatus', appointmentController.updateStatus);
router.post('/updatePaymentStatus', appointmentController.updatePaymentStatus);
// router.post('/updatePastAppointments', appointmentController.updatePastAppointments);

module.exports = router; 