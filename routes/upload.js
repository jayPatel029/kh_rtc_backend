const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

router.post('/uploads', upload.single('file'), uploadController.uploadFile);

module.exports = router;
