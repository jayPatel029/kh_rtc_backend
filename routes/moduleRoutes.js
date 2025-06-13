const express = require('express');
const router = express.Router();

const moduleController = require('../models/moduleConnection');


router.post('/connectDoctor', moduleController.connectDoctor);


router.post('/connectPatient', moduleController.connectPatient);

router.get('/getPresc', moduleController.getPatientPrescriptions);

router.get('/getLabR', moduleController.getPatientLabReports);

router.get('/getVitals', moduleController.getPatientVitals);

// router.get('/participants', chatController.getChatParticipants);

// // unread cnt
// router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;