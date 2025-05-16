const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createFrontDesk = async (req, res) => {
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
      return res.status(400).json({ error: 'Front Desk this email already exists' });
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
      role: "front_desk",
      phoneno,
      regdate
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({ message: 'Front Desk created successfully' });
  } catch (err) {
    console.error('Error creating FD:', err);
    res.status(500).json({ error: 'An error occurred while creating FD' });
  }
};

module.exports = {
    createFrontDesk,
}