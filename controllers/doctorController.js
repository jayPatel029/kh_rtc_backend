const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');
const upload = require('../middleware/upload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateTimeSlots } = require('../utils/appointmentUtils');

// Create new doctor
const createDoctor = async (req, res) => {
  try {
    const {
      doctor,
      email,
      password,
      slot_duration,
      opd_timing,
      emergency_charge,
      clinic_name,
      address,
      upi_details,
      bank_details,
      language,
      whatsapp_no,
      clinic_email,
      medical_license,
      qualification,
      services
    } = req.body;

    const existingDoctor = await sequelize.query(
      'SELECT * FROM tele_doctor WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    if (existingDoctor.length > 0) {
      return res.status(400).json({ error: 'Doctor with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
    const serviceNamesCSV = parsedServices.map(service => service.serviceName).join(",");
    const unitPricesCSV = parsedServices.map(service => service.unitPrice).join(",");
    const discountsCSV = parsedServices.map(service => service.discount).join(",");

    await sequelize.query(`
      INSERT INTO tele_doctor (
        doctor, email, password, slot_duration, opd_timing, 
        service, unit_price, discount, emergency_charge,
        clinic_name, address, upi_details, bank_details, language,
        whatsapp_no, clinic_email, medical_license, qualification
      ) VALUES (
        :doctor, :email, :password, :slot_duration, :opd_timing,
        :service, :unit_price, :discount, :emergency_charge,
        :clinic_name, :address, :upi_details, :bank_details, :language,
        :whatsapp_no, :clinic_email, :medical_license, :qualification
      )
    `, {
      replacements: {
        doctor,
        email,
        password: hashedPassword,
        slot_duration,
        opd_timing,
        service: serviceNamesCSV,
        unit_price: unitPricesCSV,
        discount: discountsCSV,
        emergency_charge,
        clinic_name,
        address,
        upi_details,
        bank_details,
        language,
        whatsapp_no,
        clinic_email,
        medical_license,
        qualification
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({ message: 'Doctor created successfully' });
  } catch (err) {
    console.error('Error creating doctor:', err);
    res.status(500).json({ error: 'An error occurred while creating doctor' });
  }
};


// Doctor login
// const loginDoctor = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const results = await sequelize.query(
//       'SELECT * FROM tele_doctor WHERE email = :email',
//       {
//         replacements: { email },
//         type: QueryTypes.SELECT
//       }
//     );

//     if (results.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const doctor = results[0];
//     const validPassword = await bcrypt.compare(password, doctor.password);

//     if (!validPassword) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Create JWT token
//     const token = jwt.sign(
//       { id: doctor.id, email: doctor.email },
//       process.env.JWT_SECRET_KEY,
//       { expiresIn: '24h' }
//     );

//     // Remove password from response
//     delete doctor.password;

//     res.json({
//       message: 'Login successful',
//       token,
//       doctor
//     });
//   } catch (err) {
//     console.error('Error during login:', err);
//     res.status(500).json({ error: 'An error occurred during login' });
//   }
// };


const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const results = await sequelize.query(
      'SELECT * FROM tele_doctor WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const doctor = results[0];
    const validPassword = await bcrypt.compare(password, doctor.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ Create JWT with role 'doctor'
    const token = jwt.sign(
      {
        userId: doctor.id,
        role: 'doctor',  // hardcoded
        email: doctor.email
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Remove password before sending response
    delete doctor.password;

    res.json({
      message: 'Login successful',
      token,
      doctor
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};


// Get doctor details
const getDoctorDetails = async (req, res) => {
  try {
    const doctorId = req.user.id; 

    const results = await sequelize.query(
      'SELECT * FROM tele_doctor WHERE id = :id',
      {
        replacements: { id: doctorId },
        type: QueryTypes.SELECT
      }
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctor = results[0];
    delete doctor.password; // Remove password from response

    res.json(doctor);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'An error occurred while fetching doctor details' });
  }
};

// Get all doctors
const getDoctors = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT id, doctor, email, clinic_name, address, created_at FROM tele_doctor',
      {
        type: QueryTypes.SELECT
      }
    );

    res.json(results);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'An error occurred while fetching doctors' });
  }
};

// Update doctor details
const updateDoctorDetails = async (req, res) => {
  try {
    const {
      id,
      doctor,
      slot_duration,
      opd_timing,
      emergency_charge,
      clinic_name,
      address,
      upi_details,
      bank_details,
      language,
      whatsapp_no,
      clinic_email,
      medical_license,
      qualification,
      services
    } = req.body;

    const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;

    const serviceNamesCSV = parsedServices.map(service => service.serviceName).join(",");
    const unitPricesCSV = parsedServices.map(service => service.unitPrice).join(",");
    const discountsCSV = parsedServices.map(service => service.discount).join(",");

    await sequelize.query(`
      UPDATE tele_doctor
      SET 
        doctor = :doctor,
        slot_duration = :slot_duration,
        opd_timing = :opd_timing,
        service = :service,
        unit_price = :unit_price,
        discount = :discount,
        emergency_charge = :emergency_charge,
        clinic_name = :clinic_name,
        address = :address,
        upi_details = :upi_details,
        bank_details = :bank_details,
        language = :language,
        whatsapp_no = :whatsapp_no,
        clinic_email = :clinic_email,
        medical_license = :medical_license,
        qualification = :qualification,
        updated_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id,
        doctor,
        slot_duration,
        opd_timing,
        service: serviceNamesCSV,
        unit_price: unitPricesCSV,
        discount: discountsCSV,
        emergency_charge,
        clinic_name,
        address,
        upi_details,
        bank_details,
        language,
        whatsapp_no,
        clinic_email,
        medical_license,
        qualification
      },
      type: QueryTypes.UPDATE
    });

    res.status(200).json({ message: "Doctor details updated successfully" });
  } catch (err) {
    console.error("Error updating doctor (JSON):", err);
    res.status(500).json({ error: "Server error during doctor update" });
  }
};



const uploadDoctorFiles = async (req, res) => {
  try {
    const id = req.body.id;

    const updates = {
      doctor_signature: req.files["doctor_signature"]
        ? `/uploads/${req.files["doctor_signature"][0].filename}`
        : null,
      clinic_icon: req.files["clinic_icon"]
        ? `/uploads/${req.files["clinic_icon"][0].filename}`
        : null,
      bar_code: req.files["bar_code"]
        ? `/uploads/${req.files["bar_code"][0].filename}`
        : null,
      qr_code: req.files["qr_code"]
        ? `/uploads/${req.files["qr_code"][0].filename}`
        : null,
      letterhead: req.files["letterhead"]
        ? `/uploads/${req.files["letterhead"][0].filename}`
        : null,
    };

    const updateFields = Object.entries(updates)
      .filter(([, value]) => value !== null)
      .map(([key]) => `${key} = :${key}`)
      .join(", ");

    if (!updateFields) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    await sequelize.query(
      `UPDATE tele_doctor SET ${updateFields}, updated_at = NOW() WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE
      }
    );

    res.status(200).json({ message: "Doctor file uploads updated successfully" });
  } catch (err) {
    console.error("Error uploading doctor files:", err);
    res.status(500).json({ error: "Server error during file upload" });
  }
};






module.exports = {
  createDoctor,
  loginDoctor,
  getDoctorDetails,
  getDoctors,
  updateDoctorDetails,
  uploadDoctorFiles
};
