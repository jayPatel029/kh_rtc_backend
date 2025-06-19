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
const chatRoutes = require('./chatRoutes');
const moduleRoutes = require('./moduleRoutes');
const billsRoutes = require('./billsRoutes');
const { unifiedLogin } = require('../controllers/authController');
const { uploadFile, upload } = require('../utils/dataUpload');

// const scheduleMeet = require('../utils/calendarService');

//unified 
router.post('/login', unifiedLogin);
router.post('/upload', upload.single('file'), uploadFile);
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
router.use('/chat',chatRoutes);
router.use('/connectModule',moduleRoutes);
router.use('/bills',billsRoutes);
// router.use('/meet',scheduleMeet);


module.exports = router; 