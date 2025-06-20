const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.get("/getAll", templateController.getAllPrescriptionTemplates);
router.get("loadData", templateController.getPrescriptionTemplateById);
router.post("/create", templateController.createPrescriptionTemplate);


module.exports = router; 