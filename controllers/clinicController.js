const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");

const addClinic = async (req, res) => {
  try {
    const {
      clinic_name,
      address,
      upi_details,
      bank_details,
      whatsapp_no,
      phoneno,
      clinic_email,
    } = req.body;

    // Validation
    if (!clinic_name) {
      return res.status(400).json({ error: "clinic_name is required" });
    }

    // Insert clinic
    const result = await sequelize.query(
      `
      INSERT INTO tele_clinic (
        clinic_name,
        address,
        upi_details,
        bank_details,
        whatsapp_no,
        phoneno,
        clinic_email
      ) VALUES (
        :clinic_name,
        :address,
        :upi_details,
        :bank_details,
        :whatsapp_no,
        :phoneno,
        :clinic_email
        )
    `,
      {
        replacements: {
          clinic_name,
          address,
          upi_details,
          bank_details,
          whatsapp_no,
          phoneno,
          clinic_email,
        },
        type: QueryTypes.INSERT,
      }
    );

    res
      .status(201)
      .json({ message: "Clinic added successfully", clinic_id: result[0] });
  } catch (err) {
    console.error("Error adding clinic:", err);
    res.status(500).json({ error: "An error occurred while adding clinic" });
  }
};

const uploadClinicFiles = async (req, res) => {
  try {
    const id = req.body.id;

    const updates = {
      clinic_icon: req.files["clinic_icon"]
        ? `/uploads/${req.files["clinic_icon"][0].filename}`
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
      `UPDATE tele_clinic SET ${updateFields}, updated_at = NOW() WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE,
      }
    );

    res
      .status(200)
      .json({ message: "Clinic file uploads updated successfully" });
  } catch (err) {
    console.error("Error uploading doctor files:", err);
    res.status(500).json({ error: "Server error during file upload" });
  }
};

const getAllClinics = async (req, res) => {
  try {
    const clinics = await sequelize.query(
      `SELECT id AS clinic_id, clinic_name FROM tele_clinic`,
      { type: QueryTypes.SELECT }
    );

    res.status(200).json({ clinics });
  } catch (err) {
    console.error("Error fetching clinics:", err);
    res.status(500).json({ error: "An error occurred while fetching clinics" });
  }
};

module.exports = {
  addClinic,
  getAllClinics,
  uploadClinicFiles,
};
