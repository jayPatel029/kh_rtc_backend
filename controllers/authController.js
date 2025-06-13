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






module.exports = {
    loginUserByRole: adminLogin,
    trackLoginActivity,
}