const express = require('express');
const router = express.Router();
const labReportController = require('../controllers/labReportController');
const upload = require('../middleware/upload');

// Add lab report
router.post('/add', upload.single('Lab_Report'),labReportController.addLabReport);

// Get lab reports by patient ID
router.get('/getLabReports', labReportController.getLabReports);

// Delete lab report
router.delete('/deleteLabReport/:id', labReportController.deleteLabReport);

module.exports = router; 