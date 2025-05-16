const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const { generateJwtFromUser } = require('../utils/tokenHelpers.js');
const verifyMailTemplate = require("../utils/verifyOtpTemplate.js");
const { sequelize } = require("../config/database.js");

dotenv.config();

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

function generateOTP() {
    const OTP_LENGTH = 6;

    const OTP_CHARS = '0123456789';

    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        otp += OTP_CHARS.charAt(Math.floor(Math.random() * OTP_CHARS.length));
    }
    return otp;
}

// todo update the email check logic!!!
const sendMail = async (req, res) => {
    try {
        let OTP = generateOTP();

        // Trim and extract email from request body
        let email = req.body.email;
        email = email.trim();

        // Send email with OTP
        let info = await transporter.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: `${OTP} is your Kifayti Health RTC Verification Code`,
            html: verifyMailTemplate(OTP),
        });

        // Store OTP in database
        const timestamp = new Date();
        const query = `INSERT INTO mail_otp (email, otp, timestamp) VALUES (?, ?, ?)`;
        const values = [email, OTP, timestamp];

        try {
            await sequelize.query(query, { replacements: values });
        } catch (error) {
            console.error('Failed to store OTP:', error);
        }

        res.status(200).json("Email Sent Successfully");
    } catch (err) {
        console.error('Error sending mail:', err);
        res.status(500).json("Failed to send email");
    }
};


const VerifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    const parsedOTP = parseInt(otp);
  try {
    const rows = await pool.query(
      'SELECT * FROM mail_otp WHERE email = ? ORDER BY timestamp DESC LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      res.json({ status: 'notFound' });
    } else {
      const mailOtpUser = rows[0];
      const timeDifferenceInMinutes = Math.floor(
        (new Date() - mailOtpUser.timestamp) / (1000 * 60)
      );

      if (timeDifferenceInMinutes < 5) {
        if (parsedOTP === mailOtpUser.otp) {
          const user = {
            email: email,
          }
          const token = generateJwtFromUser(user);
          res.json({ status: 'true', token});
        } else {
          res.json({ status: 'incorrect' });
        }
      } else {
        res.json({ status: 'expired' });
      }
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }

}


module.exports = {
    sendMail,
    VerifyOtp
}