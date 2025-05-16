const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const upload = require('../middleware/upload');

// Get patient lists
router.get('/getpatientlist', patientController.getPatientList);
router.get('/getPatients', patientController.getActivePatients);
router.get('/getPatientbydate', patientController.getPatientsByDate);

// Search patients
router.get('/search', patientController.searchPatients);

// Add new patient
router.post('/AddnewPatients', upload.single('profilePhoto'), patientController.addNewPatient);

module.exports = router; 