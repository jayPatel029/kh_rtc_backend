const express = require('express');
const router = express.Router();
const { sendMail, VerifyOtp } = require('../utils/mail');


router.post('/sendMail', sendMail )
router.post('/verifyOtp', VerifyOtp)

module.exports = router; 