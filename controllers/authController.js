const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');



//! admin or front_desk

const loginUserByRole = async (req, res) => {
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

    // Only allow admin or front_desk login depending on role
    if (user.role !== 'Admin' && user.role !== 'front_desk') {
      return res.status(403).json({ error: 'Access denied for this role' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role, // role from DB
        email: user.email
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    delete user.user_password;

    res.json({
      message: `${user.role} login successful`,
      token,
      user
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};



module.exports = {
    loginUserByRole,
}