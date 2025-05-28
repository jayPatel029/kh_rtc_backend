const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');



//! admin or front_desk

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user by email
    const results = await sequelize.query(
      'SELECT * FROM tele_users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.user_password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Only allow admin login
    const role = user.role.toLowerCase();
    console.log("role is:", role);

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admin can log in.' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    delete user.user_password;
    await trackLoginActivity(user.id, "admin");
    res.json({
      message: `Admin login successful`,
      token,
      user
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};


const createAdmin = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      user_password,
      phoneno,
      regdate
    } = req.body;

    const existingFD = await sequelize.query(
      'SELECT * FROM tele_users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    if (existingFD.length > 0) {
      return res.status(400).json({ error: 'Admin this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(user_password, 10);

    await sequelize.query(`
      INSERT INTO tele_users (
      firstname,
      lastname,
      email,
      user_password,
      role,
      phoneno,
      regdate
      ) VALUES (:firstname, :lastname, :email, :user_password, :role, :phoneno, :regdate)
    `, {
      replacements: {
      firstname,
      lastname,
      email,
      user_password: hashedPassword,
      role: "admin",
      phoneno,
      regdate
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    console.error('Error creating ADmin:', err);
    res.status(500).json({ error: 'An error occurred while creating Admin' });
  }
};

const trackLoginActivity = async (userId, role) => {
  try {
    
    await sequelize.query(
      `INSERT INTO tele_login_activity (user_id, role) VALUES (:userId, :role)`,
      {
        replacements: { userId, role },
        type: QueryTypes.INSERT
      }
    );
  } catch (err) {
    console.error('Error tracking login activity:', err);
  }
};



const getActiveUsers = async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const formattedOneWeekAgo = oneWeekAgo.toISOString().split("T")[0];

    // Count of active users by role from login activity
    const loginCounts = await sequelize.query(
      `
SELECT 
  role, 
  COUNT(DISTINCT user_id) AS count
FROM 
  tele_login_activity
WHERE 
  login_time >= :oneWeekAgo
GROUP BY 
  role
    `,
      {
        replacements: { oneWeekAgo:formattedOneWeekAgo },
        type: QueryTypes.SELECT,
      }
    );

    const roleWiseCount = {};
    loginCounts.forEach(({ role, count }) => {
      roleWiseCount[role] = count;
    });

    // Count of active patients by appointment in last 7 days (exclude if already counted)
    const patientOnlyCount = await sequelize.query(
      `
   SELECT COUNT(DISTINCT p.patient_id) AS count
  FROM tele_appointments a
  INNER JOIN tele_patient p ON a.patient_id = p.patient_id
  WHERE a.appointment_date >= :oneWeekAgo

    `,
      {
        replacements: { oneWeekAgo:formattedOneWeekAgo },
        type: QueryTypes.SELECT,
      }
    );

    const additionalPatients = patientOnlyCount[0]?.count || 0;

    // Add or update patient count
    roleWiseCount["patient"] = (roleWiseCount["patient"] || 0) + additionalPatients;


        const frontDeskClinics = await sequelize.query(
      `
      SELECT DISTINCT fdc.clinic_id
      FROM tele_login_activity la
      INNER JOIN tele_frontdesk_clinic fdc ON la.user_id = fdc.front_desk_id
      WHERE la.role = 'front_desk' AND la.login_time >= :oneWeekAgo
      `,
      {
        replacements: { oneWeekAgo: formattedOneWeekAgo },
        type: QueryTypes.SELECT,
      }
    );

    // 4. Active clinics by doctor logins
    const doctorClinics = await sequelize.query(
      `
      SELECT DISTINCT d.clinic_id
      FROM tele_login_activity la
      INNER JOIN tele_doctor d ON la.user_id = d.id
      WHERE la.role = 'doctor' AND la.login_time >= :oneWeekAgo
      `,
      {
        replacements: { oneWeekAgo: formattedOneWeekAgo },
        type: QueryTypes.SELECT,
      }
    );

    // Combine and deduplicate clinic IDs
    const clinicIds = new Set();
    frontDeskClinics.forEach(row => clinicIds.add(row.clinic_id));
    doctorClinics.forEach(row => clinicIds.add(row.clinic_id));

    const activeClinicsCount = clinicIds.size;


    res.json({
      success: true,
      roleWiseCount,
      activeClinic: activeClinicsCount,
    });
  } catch (err) {
    console.error("Error getting active user counts:", err);
    res.status(500).json({
      error: "An error occurred while fetching active user counts",
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await sequelize.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM tele_patient) AS total_patients,
        (SELECT COUNT(*) FROM tele_doctor) AS total_doctors,
        (SELECT COUNT(*) FROM tele_appointments) AS total_appointments,
        (SELECT COUNT(*) FROM tele_users WHERE role = 'front_desk') AS total_front_desk,
        (SELECT COUNT(*) FROM tele_clinic) AS total_clinics
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    // Since this returns a single object in an array
    res.status(200).json(stats[0]);
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard statistics." });
  }
};

module.exports = {
    loginUserByRole: adminLogin,
    trackLoginActivity,
    getActiveUsers,
    getDashboardStats,
}