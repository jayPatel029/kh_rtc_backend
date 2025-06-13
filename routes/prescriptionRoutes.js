const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const upload = require('../middleware/upload');

// Get template IDs
router.get('/templateIds', prescriptionController.getTemplateIds);

// Update template ID
router.patch('/updateTemplateId', prescriptionController.updateTemplateId);

// Get prescription by template ID
router.get('/templates/:templateId', prescriptionController.getPrescriptionByTemplateId);


// Get all prescriptions with filters
router.get('/getPrescriptions', prescriptionController.getPrescriptions);

// Get prescription by ID
router.get('/getPrescriptionById', prescriptionController.getPrescriptionById);

// Get all templates
router.get('/templates', prescriptionController.getAllTemplates);

// Add new prescription
// router.post('/', prescriptionController.addPrescription);

router.post('/create', prescriptionController.saveOrUpdateCompletePrescription);

router.post('/upload', prescriptionController.uploadPrescription);


router.post('/uploadAdvices', upload.single('file'),prescriptionController.uploadAdvices);
router.get('/getAdvices', prescriptionController.getEnglishAdvices);
router.get('/getAdvicesTranslation', prescriptionController.getAdviceTranslations);
router.post('/addAdvice', prescriptionController.addAdvice);


module.exports = router; 