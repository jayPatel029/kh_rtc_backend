const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');

// Get template IDs
router.get('/templateIds', prescriptionController.getTemplateIds);

// Update template ID
router.patch('/updateTemplateId', prescriptionController.updateTemplateId);

// Get prescription by template ID
router.get('/templates/:templateId', prescriptionController.getPrescriptionByTemplateId);

// Add new prescription
// router.post('/', prescriptionController.addPrescription);

router.post('/create', prescriptionController.saveOrUpdateCompletePrescription);

module.exports = router; 