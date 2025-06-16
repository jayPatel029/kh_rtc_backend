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


const unifiedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First check in tele_users table
    const userResults = await sequelize.query(
      'SELECT * FROM tele_users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    // Then check in tele_doctor table
    const doctorResults = await sequelize.query(
      'SELECT * FROM tele_doctor WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    // Check for email conflict
    if (userResults.length > 0 && doctorResults.length > 0) {
      return res.status(409).json({ 
        error: 'Email conflict: This email exists in both user and doctor tables. Please contact support.' 
      });
    }

    // If not found in either table
    if (userResults.length === 0 && doctorResults.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let user, role, userId, additionalData = {};

    // Handle doctor login
    if (doctorResults.length > 0) {
      user = doctorResults[0];
      role = 'doctor';
      userId = user.id;
      additionalData = { ric: user.role_in_clinic };
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      delete user.password;
    }
    // Handle other user types login
    else {
      user = userResults[0];
      role = user.role.toLowerCase();
      userId = user.id;
      
      const validPassword = await bcrypt.compare(password, user.user_password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      delete user.user_password;

      // If front desk user, get clinic_id
      if (role === 'front_desk') {
        const [clinic] = await sequelize.query(
          `SELECT id AS clinic_id FROM tele_clinic WHERE front_desk_id = :front_desk_id`,
          {
            replacements: { front_desk_id: user.id },
            type: QueryTypes.SELECT,
          }
        );
        if (clinic) {
          additionalData = { clinic_id: clinic.clinic_id };
        }
      }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId,
        role,
        email: user.email,
        ...additionalData
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    await trackLoginActivity(userId, role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        ...user,
        ...additionalData
      }
    });

  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

module.exports = {
    loginUserByRole: adminLogin,
    unifiedLogin,
    trackLoginActivity,
}