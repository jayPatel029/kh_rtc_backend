const express = require('express');
const router = express.Router();
const vitalsController = require('../controllers/vitalsController');

// Get vitals by appointment ID
router.get('/:appointment_id', vitalsController.getVitalsByAppointmentId);

// Add or update vitals
router.post('/add', vitalsController.addOrUpdateVitals);

module.exports = router;
