const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

// Common template routes
router.get('/common', templateController.getCommonTemplateIds);

// Complaints template routes
router.get('/complaints', templateController.getComplaintsTemplateIds);
router.patch('/complaints', templateController.updateComplaintsTemplateId);
router.get('/complaints/:templateId', templateController.getComplaintsByTemplateId);

// Diagnosis template routes
router.get('/diagnosis', templateController.getDiagnosisTemplateIds);
router.patch('/diagnosis', templateController.updateDiagnosisTemplateId);
router.get('/diagnosis/:templateId', templateController.getDiagnosisByTemplateId);

// Medicines template routes
router.get('/medicines', templateController.getMedicinesTemplateIds);
router.patch('/medicines', templateController.updateMedicinesTemplateId);
router.get('/medicines/:templateId', templateController.getMedicinesByTemplateId);

// Advice template routes
router.get('/advice', templateController.getAdviceTemplateIds);
router.patch('/advice', templateController.updateAdviceTemplateId);
router.get('/advice/:templateId', templateController.getAdviceByTemplateId);

module.exports = router; 