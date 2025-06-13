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
      onVacation,
    } = req.body;

    const existingDoctor = await sequelize.query(
      `
      SELECT * 
      FROM tele_doctor 
      WHERE email = :email AND whatsapp_no = :whatsapp_no`,
      {
        replacements: { email, whatsapp_no },
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
      parsedOpdTiming =
        typeof opd_timing === "string" ? JSON.parse(opd_timing) : opd_timing;

      // Validate required weekdays
      const weekdays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const missingDays = weekdays.filter((day) => !(day in parsedOpdTiming));

      if (missingDays.length > 0) {
        return res.status(400).json({
          error: `Missing timings for days: ${missingDays.join(", ")}`,
        });
      }

      // Validate time format for each day
      for (const [day, timing] of Object.entries(parsedOpdTiming)) {
        if (timing === null) continue; // Skip null timings (e.g., for sunday)

        const [start, end] = timing.split("-");
        if (!start || !end) {
          return res.status(400).json({
            error: `Invalid time format for ${day}. Expected format: "HH:MM-HH:MM"`,
          });
        }
      }
    } catch (err) {
      return res.status(400).json({
        error: "Invalid opd_timing format. Expected JSON with weekday timings.",
      });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Insert into tele_doctor table
      const docResult = await sequelize.query(
        `
        INSERT INTO tele_doctor (
          doctor, email, password, slot_duration, opd_timing, 
          service, unit_price, discount, emergency_charge,
          upi_details, bank_details,
          whatsapp_no, medical_license, qualification, role_in_clinic,
          isVitals, speech_to_text, onVacation
        ) VALUES (
          :doctor, :email, :password, :slot_duration, :opd_timing,
          :service, :unit_price, :discount, :emergency_charge,
          :upi_details, :bank_details,
          :whatsapp_no, :medical_license, :qualification, :role_in_clinic,
          :isVitals, :speech_to_text, :onVacation
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
            role_in_clinic,
            isVitals,
            speech_to_text,
            onVacation: onVacation || 0,
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );

      const doctorId = docResult[0];

      // If clinic_id is provided, create the doctor-clinic relationship
      if (clinic_id) {
        await sequelize.query(
          `
          INSERT INTO tele_doctor_clinic (doctor_id, clinic_id)
          VALUES (:doctor_id, :clinic_id)
          `,
          {
            replacements: {
              doctor_id: doctorId,
              clinic_id,
            },
            type: QueryTypes.INSERT,
            transaction,
          }
        );
      }

      // Commit the transaction
      await transaction.commit();

      res.status(201).json({
        message: "Doctor created successfully",
        doctor_id: doctorId,
      });
    } catch (err) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw err;
    }
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
    delete doctor.password;

    // Get clinic details through the junction table
    const clinicResults = await sequelize.query(
      `
      SELECT c.* 
      FROM tele_clinic c
      INNER JOIN tele_doctor_clinic dc ON c.id = dc.clinic_id
      WHERE dc.doctor_id = :doctor_id
      `,
      {
        replacements: { doctor_id: doctorId },
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
      `
      SELECT 
        d.id, d.doctor, d.email, d.language, d.opd_timing, 
        d.emergency_charge, d.created_at, c.id as clinic_id, 
        c.clinic_name, c.address 
      FROM tele_doctor d 
      LEFT JOIN tele_doctor_clinic dc ON d.id = dc.doctor_id
      LEFT JOIN tele_clinic c ON dc.clinic_id = c.id
      `,
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

//! todo for vacation add from to dates

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
      clinic_id,
      onVacation,
      vacation_from,
      vacation_to,
    } = req.body;

    // Validate vacation dates if doctor is going on vacation
    if (onVacation) {
      if (!vacation_from || !vacation_to) {
        return res.status(400).json({
          error: "Vacation start and end dates are required when setting vacation status",
        });
      }

      const fromDate = new Date(vacation_from);
      const toDate = new Date(vacation_to);
      const today = new Date();

      if (fromDate < today) {
        return res.status(400).json({
          error: "Vacation start date cannot be in the past",
        });
      }

      if (toDate < fromDate) {
        return res.status(400).json({
          error: "Vacation end date cannot be before start date",
        });
      }
    }

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
      parsedOpdTiming =
        typeof opd_timing === "string" ? JSON.parse(opd_timing) : opd_timing;

      // Validate required weekdays
      const weekdays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const missingDays = weekdays.filter((day) => !(day in parsedOpdTiming));

      if (missingDays.length > 0) {
        return res.status(400).json({
          error: `Missing timings for days: ${missingDays.join(", ")}`,
        });
      }

      // Validate time format for each day
      for (const [day, timing] of Object.entries(parsedOpdTiming)) {
        if (timing === null) continue; // Skip null timings (e.g., for sunday)

        const [start, end] = timing.split("-");
        if (!start || !end) {
          return res.status(400).json({
            error: `Invalid time format for ${day}. Expected format: "HH:MM-HH:MM"`,
          });
        }
      }
    } catch (err) {
      return res.status(400).json({
        error: "Invalid opd_timing format. Expected JSON with weekday timings.",
      });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Update doctor details
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
          onVacation = :onVacation,
          vacation_from = :vacation_from,
          vacation_to = :vacation_to,
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
            onVacation: onVacation || 0,
            vacation_from: vacation_from || null,
            vacation_to: vacation_to || null,
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );

      // If doctor is going on vacation, reschedule appointments
      if (onVacation) { 
        // Get all appointments during vacation period
        const vacationAppointments = await sequelize.query(
          `
          SELECT * FROM tele_appointments 
          WHERE doctor_id = :doctor_id 
          AND appointment_date BETWEEN :vacation_from AND :vacation_to
          AND status IN ('BOOKED', 'PENDING')
          `,
          {
            replacements: {
              doctor_id: id,
              vacation_from,
              vacation_to,
            },
            type: QueryTypes.SELECT,
            transaction,
          }
        );

        // For each appt, find next available slot and reschd
        for (const appointment of vacationAppointments) {
          const nextAvailableDate = await findNextAvailableDate(
            id,
            appointment.appointment_date,
            parsedOpdTiming,
            transaction
          );

          if (nextAvailableDate) {
            // updated appts with new date
            await sequelize.query(
              `
              UPDATE tele_appointments 
              SET appointment_date = :new_date,
                  status = 'PENDING'
              WHERE id = :appointment_id
              `,
              {
                replacements: {
                  appointment_id: appointment.id,
                  new_date: nextAvailableDate,
                },
                type: QueryTypes.UPDATE,
                transaction,
              }
            );
          }
        }
      }

      // if cid
      if (clinic_id) {
        // delete existing and insert again 
        await sequelize.query(
          `DELETE FROM tele_doctor_clinic WHERE doctor_id = :doctor_id`,
          {
            replacements: { doctor_id: id },
            type: QueryTypes.DELETE,
            transaction,
          }
        );

        
        await sequelize.query(
          `
          INSERT INTO tele_doctor_clinic (doctor_id, clinic_id)
          VALUES (:doctor_id, :clinic_id)
          `,
          {
            replacements: {
              doctor_id: id,
              clinic_id,
            },
            type: QueryTypes.INSERT,
            transaction,
          }
        );
      }


      await transaction.commit();

      res.status(200).json({ message: "Doctor details updated successfully" });
    } catch (err) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error updating doctor (JSON):", err);
    res.status(500).json({ error: "Server error during doctor update" });
  }
};

// helper func: finds next availabel date for resched
const findNextAvailableDate = async (doctorId, startDate, opdTiming, transaction) => {
  let currentDate = new Date(startDate);
  const maxAttempts = 30; // try for 30 days
  let attempts = 0;
  console.log("CURR DATE: ", currentDate);
const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  while (attempts < maxAttempts) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = weekdays[currentDate.getDay()];
    
    // check docs sched
    if (opdTiming[dayOfWeek]) {
      // check for all existing appointments by date 
      const existingAppointments = await sequelize.query(
        `
        SELECT COUNT(*) as count 
        FROM tele_appointments 
        WHERE doctor_id = :doctor_id 
        AND appointment_date = :date
        `,
        {
          replacements: {
            doctor_id: doctorId,
            date: currentDate.toISOString().split('T')[0],
          },
          type: QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingAppointments[0].count === 0) {
        return currentDate.toISOString().split('T')[0];
      }
    }
    
    attempts++;
  }

  return null; // No dates found!!
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

    // Fetch doctors for the clinic using the junction table
    const doctors = await sequelize.query(
      `
      SELECT 
        d.id, d.doctor, d.email, d.slot_duration, d.doctor_signature, 
        d.medical_license, d.qualification, d.created_at
      FROM tele_doctor d
      INNER JOIN tele_doctor_clinic dc ON d.id = dc.doctor_id
      WHERE dc.clinic_id = :clinic_id
      `,
      {
        replacements: { clinic_id },
        type: QueryTypes.SELECT,
      }
    );

    if (doctors.length === 0) {
      return res
        .status(404)
        .json({ message: "No doctors found for this clinic" });
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

    // Start a transaction
    const transaction = await sequelize.transaction();

    try {
      // Delete related appointments
      await sequelize.query(
        "DELETE FROM tele_appointments WHERE doctor_id = :doctor_id",
        {
          replacements: { doctor_id },
          type: QueryTypes.DELETE,
          transaction,
        }
      );

      // Delete doctor-clinic relationships
      await sequelize.query(
        "DELETE FROM tele_doctor_clinic WHERE doctor_id = :doctor_id",
        {
          replacements: { doctor_id },
          type: QueryTypes.DELETE,
          transaction,
        }
      );

      // Delete the doctor
      await sequelize.query("DELETE FROM tele_doctor WHERE id = :doctor_id", {
        replacements: { doctor_id },
        type: QueryTypes.DELETE,
        transaction,
      });

      // Commit the transaction
      await transaction.commit();

      res.status(200).json({
        message: "Doctor and related records deleted successfully",
      });
    } catch (err) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw err;
    }
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
