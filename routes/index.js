const express = require('express');
const router = express.Router();

// Import all route modules
const uploadRoutes = require('./upload');
const doctorRoutes = require('./doctorRoutes');
const vitalsRoutes = require('./vitalsRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const patientRoutes = require('./patientRoutes');
const templateRoutes = require('./templateRoutes');
const mailRoutes = require('./mailRoutes');
const frontDeskRoutes  = require('./frontDeskRoutes');
const prescriptionRoutes = require('./prescriptionRoutes');
const adminRoutes = require('../routes/adminRoutes');
const reportRoutes = require('./reportsRoutes');
const clinicRoutes = require('./clinicRoutes');
const labRoutes = require('./labReportRoutes');
// const scheduleMeet = require('../utils/calendarService');

// Mount all routes
router.use('/upload', uploadRoutes);
router.use('/doctor', doctorRoutes);
router.use('/vitals', vitalsRoutes);
router.use('/appointment', appointmentRoutes);
router.use('/patients', patientRoutes);
router.use('/templates', templateRoutes);
router.use('/mail',mailRoutes);
router.use('/frontdesk', frontDeskRoutes);
router.use('/prescription',prescriptionRoutes);
router.use('/admin',adminRoutes);
router.use('/report',reportRoutes);
router.use('/clinic',clinicRoutes);
router.use('/lab',labRoutes);
// router.use('/meet',scheduleMeet);


module.exports = router; 