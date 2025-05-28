const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { trackLoginActivity } = require("./authController");

// const createFrontDesk = async (req, res) => {
//   try {
//     const {
//       firstname,
//       lastname,
//       email,
//       user_password,
//       phoneno,
//       regdate
//     } = req.body;

//     const existingFD = await sequelize.query(
//       'SELECT * FROM tele_users WHERE email = :email',
//       {
//         replacements: { email },
//         type: QueryTypes.SELECT
//       }
//     );

//     if (existingFD.length > 0) {
//       return res.status(400).json({ error: 'Front Desk this email already exists' });
//     }

//     const hashedPassword = await bcrypt.hash(user_password, 10);

//     await sequelize.query(`
//       INSERT INTO tele_users (
//       firstname,
//       lastname,
//       email,
//       user_password,
//       role,
//       phoneno,
//       regdate
//       ) VALUES (:firstname, :lastname, :email, :user_password, :role, :phoneno, :regdate)
//     `, {
//       replacements: {
//       firstname,
//       lastname,
//       email,
//       user_password: hashedPassword,
//       role: "front_desk",
//       phoneno,
//       regdate
//       },
//       type: QueryTypes.INSERT
//     });

//     res.status(201).json({ message: 'Front Desk created successfully' });
//   } catch (err) {
//     console.error('Error creating FD:', err);
//     res.status(500).json({ error: 'An error occurred while creating FD' });
//   }
// };

// const createFrontDesk = async (req, res) => {
//   try {
//     const {
//       firstname,
//       lastname,
//       email,
//       user_password,
//       phoneno,
//       regdate,
//       clinic_name,
//       address,
//       upi_details,
//       bank_details,
//       whatsapp_no,
//       topMargin,
//       bottomMargin,
//       clinic_email,
//     } = req.body;

//     const existingFD = await sequelize.query(
//       "SELECT * FROM tele_users WHERE email = :email",
//       {
//         replacements: { email },
//         type: QueryTypes.SELECT,
//       }
//     );

//     if (existingFD.length > 0) {
//       return res
//         .status(400)
//         .json({ error: "Front Desk with this email already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(user_password, 10);

//     // Insert user into tele_users
//     const [userResult] = await sequelize.query(
//       `
//       INSERT INTO tele_users (
//         firstname,
//         lastname,
//         email,
//         user_password,
//         role,
//         phoneno,
//         regdate
//       ) VALUES (:firstname, :lastname, :email, :user_password, :role, :phoneno, :regdate)
//     `,
//       {
//         replacements: {
//           firstname,
//           lastname,
//           email,
//           user_password: hashedPassword,
//           role: "front_desk",
//           phoneno,
//           regdate,
//         },
//         type: QueryTypes.INSERT,
//       }
//     );

//     const front_desk_id = userResult;


//     await sequelize.query(
//       `
//       INSERT INTO tele_clinic (
//         clinic_name,
//         address,
//         upi_details,
//         bank_details,
//         whatsapp_no,
//         topMargin,
//         bottomMargin,
//         clinic_email,
//         front_desk_id
//       ) VALUES (:clinic_name, :address, :upi_details,:bank_details,
//        :whatsapp_no,:topMargin,:bottomMargin,:clinic_email, :front_desk_id)
//     `,
//       {
//         replacements: {
//           clinic_name,
//           address,
//           upi_details,
//           bank_details,
//           whatsapp_no,
//           topMargin,
//           bottomMargin,
//           clinic_email,
//           front_desk_id,
//         },
//         type: QueryTypes.INSERT,
//       }
//     );

//     res
//       .status(201)
//       .json({ message: "Front Desk and Clinic created successfully" });
//   } catch (err) {
//     console.error("Error creating Front Desk and Clinic:", err);
//     res
//       .status(500)
//       .json({
//         error: "An error occurred while creating Front Desk and Clinic",
//       });
//   }
// };



const createFrontDesk = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      user_password,
      phoneno,
      regdate,
      whatsapp_no,
      clinic_id,
    } = req.body;

    const existingFD = await sequelize.query(
      "SELECT * FROM tele_users WHERE email = :email",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (existingFD.length > 0) {
      return res
        .status(400)
        .json({ error: "Front Desk with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(user_password, 10);

    // Insert into tele_users
    const [result] = await sequelize.query(
      `
      INSERT INTO tele_users (
        firstname,
        lastname,
        email,
        user_password,
        role,
        phoneno,
        regdate,
        whatsapp_no      
        ) VALUES (:firstname, :lastname, :email, :user_password, :role, :phoneno, :regdate, :whatsapp_no)
    `,
      {
        replacements: {
          firstname,
          lastname,
          email,
          user_password: hashedPassword,
          role: "front_desk",
          phoneno,
          regdate,
          whatsapp_no,
        },
        type: QueryTypes.INSERT,
      }
    );
    // console.log(result);
    const front_desk_id = result;

    
    await sequelize.query(
      `
      INSERT INTO tele_frontdesk_clinic (
        front_desk_id,
        clinic_id
      ) VALUES (:front_desk_id, :clinic_id)
    `,
      {
        replacements: {
          front_desk_id,
          clinic_id,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({
      message: "Front Desk user created and linked to clinic successfully",
    });
  } catch (err) {
    console.error("Error creating Front Desk and linking to clinic:", err);
    res.status(500).json({
      error: "An error occurred while creating Front Desk and linking to clinic",
    });
  }
};



const loginFrontDesk = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get front desk user by email
    const results = await sequelize.query(
      'SELECT * FROM tele_users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];

    // Ensure the role is 'front_desk' only
    if (user.role.toLowerCase() !== 'front_desk') {
      return res.status(403).json({ error: 'Access denied: not a front desk user' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.user_password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get clinic_id for this front desk user
    const [clinic] = await sequelize.query(
      `SELECT id AS clinic_id FROM tele_clinic WHERE front_desk_id = :front_desk_id`,
      {
        replacements: { front_desk_id: user.id },
        type: QueryTypes.SELECT,
      }
    );

    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found for this front desk user' });
    }

    // Create JWT token with clinic_id
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        clinic_id: clinic.clinic_id,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Remove password before sending response
    delete user.user_password;
    await trackLoginActivity(user.id, "front_desk");

    res.json({
      message: 'Front desk login successful',
      token,
      user: {
        ...user,
        clinic_id: clinic.clinic_id,
      },
    });
  } catch (err) {
    console.error('Error during front desk login:', err);
    res.status(500).json({ error: 'An error occurred during front desk login' });
  }
};


// const uploadClinicFiles = async (req, res) => {
//   try {
//     const id = req.body.id;

//     const updates = {
//       clinic_icon: req.files["clinic_icon"]
//         ? `/uploads/${req.files["clinic_icon"][0].filename}`
//         : null,
//       bar_code: req.files["bar_code"]
//         ? `/uploads/${req.files["bar_code"][0].filename}`
//         : null,
//       qr_code: req.files["qr_code"]
//         ? `/uploads/${req.files["qr_code"][0].filename}`
//         : null,
//       letterhead: req.files["letterhead"]
//         ? `/uploads/${req.files["letterhead"][0].filename}`
//         : null,
//     };

//     const updateFields = Object.entries(updates)
//       .filter(([, value]) => value !== null)
//       .map(([key]) => `${key} = :${key}`)
//       .join(", ");

//     if (!updateFields) {
//       return res.status(400).json({ message: "No files uploaded." });
//     }

//     await sequelize.query(
//       `UPDATE tele_clinic SET ${updateFields}, updated_at = NOW() WHERE id = :id`,
//       {
//         replacements: { ...updates, id },
//         type: QueryTypes.UPDATE,
//       }
//     );

//     res
//       .status(200)
//       .json({ message: "Clinic file uploads updated successfully" });
//   } catch (err) {
//     console.error("Error uploading doctor files:", err);
//     res.status(500).json({ error: "Server error during file upload" });
//   }
// };

// const getAllClinics = async (req, res) => {
//   try {
//     const clinics = await sequelize.query(
//       `SELECT id AS clinic_id, clinic_name FROM tele_clinic`,
//       { type: QueryTypes.SELECT }
//     );

//     res.status(200).json({ clinics });
//   } catch (err) {
//     console.error('Error fetching clinics:', err);
//     res.status(500).json({ error: 'An error occurred while fetching clinics' });
//   }
// };


module.exports = {
  createFrontDesk,
  loginFrontDesk,
  // uploadClinicFiles,
};
