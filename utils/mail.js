const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { generateJwtFromUser } = require("../utils/tokenHelpers.js");
const verifyMailTemplate = require("../utils/verifyOtpTemplate.js");
// const { sequelize } = require("../config/database.js");
const { QueryTypes } = require("sequelize");
const { sequelize, pool } = require("../config/database");
const jwt = require("jsonwebtoken");
const { trackLoginActivity } = require("../controllers/authController.js");

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

  const OTP_CHARS = "0123456789";

  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += OTP_CHARS.charAt(Math.floor(Math.random() * OTP_CHARS.length));
  }
  return otp;
}

// // todo update the email check logic!!!
// const sendMail = async (req, res) => {
//     try {
//         let OTP = generateOTP();

//         // Trim and extract email from request body
//         let email = req.body.email;
//         email = email.trim();

//         // Send email with OTP
//         let info = await transporter.sendMail({
//             from: process.env.MAIL_USER,
//             to: email,
//             subject: `${OTP} is your Kifayti Health - Teleconsultation Verification Code`,
//             html: verifyMailTemplate(OTP),
//         });

//         // Store OTP in database
//         const timestamp = new Date();
//         const query = `INSERT INTO mail_otp (email, otp, timestamp) VALUES (?, ?, ?)`;
//         const values = [email, OTP, timestamp];

//         try {
//             await sequelize.query(query, { replacements: values });
//         } catch (error) {
//             console.error('Failed to store OTP:', error);
//         }

//         res.status(200).json("Email Sent Successfully");
//     } catch (err) {
//         console.error('Error sending mail:', err);
//         res.status(500).json("Failed to send email");
//     }
// };

const sendMail = async (req, res) => {
  try {
    let OTP = generateOTP();
    let { email, role } = req.body;
    email = email.trim();

    // Check if email belongs to correct role
    let userExists = false;
    if (role === "doctor") {
      const result = await sequelize.query(
        "SELECT id FROM tele_doctor WHERE email = :email",
        { replacements: { email }, type: QueryTypes.SELECT }
      );
      userExists = result.length > 0;
    } else if (role === "front_desk") {
      const result = await sequelize.query(
        "SELECT id FROM tele_users WHERE email = :email AND LOWER(role) = 'front_desk'",
        { replacements: { email }, type: QueryTypes.SELECT }
      );
      userExists = result.length > 0;
    } else {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (!userExists) {
      return res
        .status(404)
        .json({ error: "User not found for specified role" });
    }

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: `${OTP} is your Kifayti Health - Teleconsultation Verification Code`,
      html: verifyMailTemplate(OTP),
    });

    const timestamp = new Date();
    await sequelize.query(
      `INSERT INTO mail_otp (email, otp, timestamp) VALUES (?, ?, ?)`,
      { replacements: [email, OTP, timestamp] }
    );

    res.status(200).json("Email Sent Successfully");
  } catch (err) {
    console.error("Error sending mail:", err);
    res.status(500).json("Failed to send email");
  }
};

// const VerifyOtp = async (req, res) => {
//     const { email, otp } = req.body;
//     const parsedOTP = parseInt(otp);
//     console.log('Request body:', req.body);
//   try {
//     const rows = await sequelize.query(
//       'SELECT * FROM mail_otp WHERE email = ? ORDER BY timestamp DESC LIMIT 1',
//       {replacements: [email], type: sequelize.QueryTypes.SELECT }
//     );

//     if (rows.length === 0) {
//       res.json({ status: 'notFound' });
//     } else {
//       const mailOtpUser = rows[0];
//       const timeDifferenceInMinutes = Math.floor(
//         (new Date() - mailOtpUser.timestamp) / (1000 * 60)
//       );

//       if (timeDifferenceInMinutes < 5) {
//         if (parsedOTP === mailOtpUser.otp) {
//           const user = {
//             email: email,
//           }
//           const token = generateJwtFromUser(user);
//           res.json({ status: 'true', token});
//         } else {
//           res.json({ status: 'incorrect' });
//         }
//       } else {
//         res.json({ status: 'expired' });
//       }
//     }
//   } catch (err) {
//     console.error('Error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }

// }

const VerifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const parsedOTP = parseInt(otp);

  try {
    const rows = await sequelize.query(
      "SELECT * FROM mail_otp WHERE email = ? ORDER BY timestamp DESC LIMIT 1",
      { replacements: [email], type: sequelize.QueryTypes.SELECT }
    );

    if (rows.length === 0) {
      return res.json({ status: "notFound" });
    }

    const mailOtpUser = rows[0];
    const timeDifferenceInMinutes = Math.floor(
      (new Date() - mailOtpUser.timestamp) / (1000 * 60)
    );

    if (timeDifferenceInMinutes >= 5) {
      return res.json({ status: "expired" });
    }

    if (parsedOTP !== mailOtpUser.otp) {
      return res.json({ status: "incorrect" });
    }

    // Step 1: Check if email belongs to a doctor
    const doctorResult = await sequelize.query(
      "SELECT * FROM tele_doctor WHERE email = :email",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (doctorResult.length > 0) {
      const doctor = doctorResult[0];

      const token = jwt.sign(
        {
          userId: doctor.id,
          role: "doctor",
          email: doctor.email,
          ric: doctor.role_in_clinic,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      await trackLoginActivity(doctor.id, "doctor");

      delete doctor.password;

      return res.json({
        status: "true",
        token,
        user: doctor,
        role: "doctor",
      });
    }

    // Step 2: Check if email belongs to front_desk
    const frontDeskResult = await sequelize.query(
      "SELECT * FROM tele_users WHERE email = :email",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (frontDeskResult.length === 0) {
      return res.json({ status: "notFound" });
    }

    const user = frontDeskResult[0];

    if (user.role.toLowerCase() !== "front_desk") {
      return res
        .status(403)
        .json({ error: "Access denied: not a front desk user" });
    }

    const [clinic] = await sequelize.query(
      `
  SELECT c.id AS clinic_id
  FROM tele_clinic c
  JOIN tele_frontdesk_clinic fdc ON fdc.clinic_id = c.id
  WHERE fdc.front_desk_id = :front_desk_id
  LIMIT 1
  `,
      {
        replacements: { front_desk_id: user.id },
        type: QueryTypes.SELECT,
      }
    );

    if (!clinic) {
      return res
        .status(404)
        .json({ error: "Clinic not found for this front desk user" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        clinic_id: clinic.clinic_id,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" }
    );

    await trackLoginActivity(user.id, "front_desk");

    delete user.user_password;

    return res.json({
      status: "true",
      token,
      user: {
        ...user,
        clinic_id: clinic.clinic_id,
      },
      role: "front_desk",
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  sendMail,
  VerifyOtp,
};
