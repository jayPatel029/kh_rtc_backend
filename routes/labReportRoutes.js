const express = require('express');
const router = express.Router();
const labReportController = require('../controllers/labReportController');

// Add lab report
router.post('/add', labReportController.addLabReport);

// Get lab reports by patient ID
router.get('/getLabReports/:patientId', labReportController.getLabReports);

// Delete lab report
router.delete('/deleteLabReport/:id', labReportController.deleteLabReport);

module.exports = router; 