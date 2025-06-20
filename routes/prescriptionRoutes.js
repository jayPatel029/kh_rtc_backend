const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const upload = require('../middleware/upload');


// Get all prescriptions with filters
router.get('/getPrescriptions', prescriptionController.getPrescriptions);

// Get prescription by ID
router.get('/getPrescriptionById', prescriptionController.getPrescriptionById);


router.post('/create', prescriptionController.saveOrUpdateCompletePrescription);

router.post('/upload', prescriptionController.uploadPrescription);


router.post('/uploadAdvices', upload.single('file'),prescriptionController.uploadAdvices);
router.get('/getAdvices', prescriptionController.getEnglishAdvices);
router.get('/getAdvicesTranslation', prescriptionController.getAdviceTranslations);
router.post('/addAdvice', prescriptionController.addAdvice);


module.exports = router; 