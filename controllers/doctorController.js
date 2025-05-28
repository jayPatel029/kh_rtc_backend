const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");
const upload = require("../middleware/upload");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateTimeSlots } = require("../utils/appointmentUtils");
const { trackLoginActivity } = require("./authController");

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
      upi_details,
      bank_details,
      whatsapp_no,
      medical_license,
      qualification,
      services,
      clinic_id,
      role_in_clinic,
      isVitals,
      speech_to_text,

    } = req.body;

    const existingDoctor = await sequelize.query(
      "SELECT * FROM tele_doctor WHERE email = :email",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (existingDoctor.length > 0) {
      return res
        .status(400)
        .json({ error: "Doctor with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedServices =
      typeof services === "string" ? JSON.parse(services) : services;
    const serviceNamesCSV = parsedServices
      .map((service) => service.serviceName)
      .join(",");
    const unitPricesCSV = parsedServices
      .map((service) => service.unitPrice)
      .join(",");
    const discountsCSV = parsedServices
      .map((service) => service.discount)
      .join(",");

    // Validate opd_timing format
    let parsedOpdTiming;
    try {
      parsedOpdTiming = typeof opd_timing === 'string' ? JSON.parse(opd_timing) : opd_timing;
      
      // Validate required weekdays
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const missingDays = weekdays.filter(day => !(day in parsedOpdTiming));
      
      if (missingDays.length > 0) {
        return res.status(400).json({ 
          error: `Missing timings for days: ${missingDays.join(', ')}` 
        });
      }

      // Validate time format for each day
      for (const [day, timing] of Object.entries(parsedOpdTiming)) {
        if (timing === null) continue; // Skip null timings (e.g., for sunday)
        
        const [start, end] = timing.split('-');
        if (!start || !end) {
          return res.status(400).json({ 
            error: `Invalid time format for ${day}. Expected format: "HH:MM-HH:MM"` 
          });
        }
      }
    } catch (err) {
      return res.status(400).json({ 
        error: "Invalid opd_timing format. Expected JSON with weekday timings." 
      });
    }

    const docResult = await sequelize.query(
      `
      INSERT INTO tele_doctor (
        doctor, email, password, slot_duration, opd_timing, 
        service, unit_price, discount, emergency_charge,
        upi_details, bank_details,
        whatsapp_no, medical_license, qualification, clinic_id, role_in_clinic,
        isVitals, speech_to_text
      ) VALUES (
        :doctor, :email, :password, :slot_duration, :opd_timing,
        :service, :unit_price, :discount, :emergency_charge,
        :upi_details, :bank_details,
        :whatsapp_no, :medical_license, :qualification , :clinic_id, :role_in_clinic,
        :isVitals, :speech_to_text
      )
    `,
      {
        replacements: {
          doctor,
          email,
          password: hashedPassword,
          slot_duration,
          opd_timing: JSON.stringify(parsedOpdTiming),
          service: serviceNamesCSV,
          unit_price: unitPricesCSV,
          discount: discountsCSV,
          emergency_charge,
          upi_details,
          bank_details,
          whatsapp_no,
          medical_license,
          qualification,
          clinic_id,
          role_in_clinic,
          isVitals,
          speech_to_text,
        },
        type: QueryTypes.INSERT,
      }
    );

    res
      .status(201)
      .json({
        message: "Doctor created successfully",
        doctor_id: docResult[0],
      });
  } catch (err) {
    console.error("Error creating doctor:", err);
    res.status(500).json({ error: "An error occurred while creating doctor" });
  }
};


const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const results = await sequelize.query(
      "SELECT * FROM tele_doctor WHERE email = :email",
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const doctor = results[0];
    const validPassword = await bcrypt.compare(password, doctor.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Create JWT with role 'doctor'
    const token = jwt.sign(
      {
        userId: doctor.id,
        role: "doctor", // hardcoded
        email: doctor.email,
        ric: doctor.role_in_clinic,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "24h" }
    );

    // Remove password before sending response
    delete doctor.password;
    await trackLoginActivity(doctor.id, "doctor");
    res.json({
      message: "Login successful",
      token,
      doctor,
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "An error occurred during login" });
  }
};


const getDoctorDetails = async (req, res) => {
  try {
    const doctorId = req.query.doctor_id;

    if (!doctorId) {
      return res.status(400).json({ error: "Doctor ID is required" });
    }

    const doctorResults = await sequelize.query(
      "SELECT * FROM tele_doctor WHERE id = :id",
      {
        replacements: { id: doctorId },
        type: QueryTypes.SELECT,
      }
    );

    if (doctorResults.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const doctor = doctorResults[0];
    delete doctor.password; // 

    const clinicResults = await sequelize.query(
      `SELECT * FROM tele_clinic WHERE id = :clinic_id`,
      {
        replacements: { clinic_id: doctor.clinic_id },
        type: QueryTypes.SELECT,
      }
    );

    const clinic = clinicResults.length > 0 ? clinicResults[0] : null;

    res.json({
      doctor,
      clinic: clinic || {},
    });

  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({
      error: "An error occurred while fetching doctor details",
    });
  }
};



// Get all doctors
const getDoctors = async (req, res) => {
  try {
    // const results = await sequelize.query(
    //   "SELECT id, doctor, email, language, opd_timing, emergency_charge, created_at, clinic_id FROM tele_doctor",
    //   {
    //     type: QueryTypes.SELECT,
    //   }
    // );

    const allDocs = await sequelize.query(
      `Select d.id, d.doctor, d.email, d.language, d.opd_timing, d.emergency_charge, d.created_at, d.clinic_id, c.clinic_name, c.address from tele_doctor d left join tele_clinic c on d.clinic_id = c.id`,
      {
        type: QueryTypes.SELECT,
      }
    );

    // console.log("cid:", allDocs);

    res.json(allDocs);
  } catch (err) {
    console.error("Error fetching doctors:", err);
    res.status(500).json({ error: "An error occurred while fetching doctors" });
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
      upi_details,
      bank_details,
      language,
      whatsapp_no,
      medical_license,
      qualification,
      services,
      clinic_id
    } = req.body;

    const parsedServices =
      typeof services === "string" ? JSON.parse(services) : services;

    const serviceNamesCSV = parsedServices
      .map((service) => service.serviceName)
      .join(",");
    const unitPricesCSV = parsedServices
      .map((service) => service.unitPrice)
      .join(",");
    const discountsCSV = parsedServices
      .map((service) => service.discount)
      .join(",");

    // Validate opd_timing format
    let parsedOpdTiming;
    try {
      parsedOpdTiming = typeof opd_timing === 'string' ? JSON.parse(opd_timing) : opd_timing;
      
      // Validate required weekdays
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const missingDays = weekdays.filter(day => !(day in parsedOpdTiming));
      
      if (missingDays.length > 0) {
        return res.status(400).json({ 
          error: `Missing timings for days: ${missingDays.join(', ')}` 
        });
      }

      // Validate time format for each day
      for (const [day, timing] of Object.entries(parsedOpdTiming)) {
        if (timing === null) continue; // Skip null timings (e.g., for sunday)
        
        const [start, end] = timing.split('-');
        if (!start || !end) {
          return res.status(400).json({ 
            error: `Invalid time format for ${day}. Expected format: "HH:MM-HH:MM"` 
          });
        }
      }
    } catch (err) {
      return res.status(400).json({ 
        error: "Invalid opd_timing format. Expected JSON with weekday timings." 
      });
    }

    await sequelize.query(
      `
      UPDATE tele_doctor
      SET 
        doctor = :doctor,
        slot_duration = :slot_duration,
        opd_timing = :opd_timing,
        service = :service,
        unit_price = :unit_price,
        discount = :discount,
        emergency_charge = :emergency_charge,
        upi_details = :upi_details,
        bank_details = :bank_details,
        language = :language,
        whatsapp_no = :whatsapp_no,
        medical_license = :medical_license,
        qualification = :qualification,
        clinic_id = :clinic_id,
        updated_at = NOW()
      WHERE id = :id
    `,
      {
        replacements: {
          id,
          doctor,
          slot_duration,
          opd_timing: JSON.stringify(parsedOpdTiming),
          service: serviceNamesCSV,
          unit_price: unitPricesCSV,
          discount: discountsCSV,
          emergency_charge,
          upi_details,
          bank_details,
          language,
          whatsapp_no,
          medical_license,
          qualification,
          clinic_id,
        },
        type: QueryTypes.UPDATE,
      }
    );

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
      bar_code: req.files["bar_code"]
        ? `/uploads/${req.files["bar_code"][0].filename}`
        : null,
      qr_code: req.files["qr_code"]
        ? `/uploads/${req.files["qr_code"][0].filename}`
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
        type: QueryTypes.UPDATE,
      }
    );

    res
      .status(200)
      .json({ message: "Doctor file uploads updated successfully" });
  } catch (err) {
    console.error("Error uploading doctor files:", err);
    res.status(500).json({ error: "Server error during file upload" });
  }
};


const getDoctorsByClinic = async (req, res) => {
  try {
    const { clinic_id } = req.query;

    if (!clinic_id) {
      return res.status(400).json({ error: "Clinic ID is required" });
    }

    // Fetch clinic info
    const [clinic] = await sequelize.query(
      `
      SELECT clinic_name, clinic_icon, address
      FROM tele_clinic
      WHERE id = :clinic_id
      `,
      {
        replacements: { clinic_id },
        type: QueryTypes.SELECT,
      }
    );

    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    // Fetch doctors for the clinic
    const doctors = await sequelize.query(
      `
      SELECT 
        id, doctor, email, slot_duration, doctor_signature, 
        medical_license, qualification, created_at
      FROM tele_doctor
      WHERE clinic_id = :clinic_id
      `,
      {
        replacements: { clinic_id },
        type: QueryTypes.SELECT,
      }
    );

    if (doctors.length === 0) {
      return res.status(404).json({ message: "No doctors found for this clinic" });
    }

    // Attach clinic info to each doctor
    const enrichedDoctors = doctors.map((doc) => ({
      ...doc,
      clinic_name: clinic.clinic_name,
      clinic_icon: clinic.clinic_icon,
      address: clinic.address,
    }));

    res.json({ doctors: enrichedDoctors });
  } catch (err) {
    console.error("Error fetching doctors by clinic:", err);
    res.status(500).json({ error: "An error occurred while fetching doctors" });
  }
};


const deleteDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;

    if (!doctor_id) {
      return res.status(400).json({ error: "doctor_id is required" });
    }

    // Check if the doctor exists
    const existingDoctor = await sequelize.query(
      "SELECT * FROM tele_doctor WHERE id = :doctor_id",
      {
        replacements: { doctor_id },
        type: QueryTypes.SELECT,
      }
    );

    if (existingDoctor.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // Delete related appointments
    await sequelize.query(
      "DELETE FROM tele_appointments WHERE doctor_id = :doctor_id",
      {
        replacements: { doctor_id },
        type: QueryTypes.DELETE,
      }
    );

    // Delete the doctor
    await sequelize.query(
      "DELETE FROM tele_doctor WHERE id = :doctor_id",
      {
        replacements: { doctor_id },
        type: QueryTypes.DELETE,
      }
    );

    res.status(200).json({ message: "Doctor and related appointments deleted successfully" });
  } catch (err) {
    console.error("Error deleting doctor:", err);
    res.status(500).json({ error: "An error occurred while deleting doctor" });
  }
};


module.exports = {
  createDoctor,
  loginDoctor,
  getDoctorDetails,
  getDoctors,
  updateDoctorDetails,
  uploadDoctorFiles,
  getDoctorsByClinic,
  deleteDoctor,
};
