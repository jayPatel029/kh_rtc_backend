
const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");

//bills
// POST /api/bills/create
const createBill = async (req, res) => {
  try {
    const {
      appointment_id,
      prescription_id,
      service_type,
      consultation_type,
      total_amt,
    } = req.body;

    if (!appointment_id && !prescription_id) {
      return res.status(400).json({
        error: "Either appointment_id or prescription_id is required",
      });
    }

    await sequelize.query(
      `
      INSERT INTO tele_bills (
        appointment_id, prescription_id, service_type,
        consultation_type, total_amt
      ) VALUES (
        :appointment_id, :prescription_id, :service_type,
        :consultation_type, :total_amt
      )
      `,
      {
        replacements: {
          appointment_id,
          prescription_id,
          service_type,
          consultation_type,
          total_amt,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ message: "Bill created successfully" });
  } catch (err) {
    console.error("Error creating bill:", err);
    res.status(500).json({ error: "Failed to create bill" });
  }
};

const getAllBills = async (req, res) => {
  try {
    const { doctor_id, patient_id, appointment_id, prescription_id, date } = req.query;

    let query = `
      SELECT b.*, a.doctor_id, a.patient_id
      FROM tele_bills b
      JOIN tele_appointments a ON b.appointment_id = a.id
      WHERE 1=1
    `;
    const replacements = {};

    if (doctor_id) {
      query += " AND a.doctor_id = :doctor_id";
      replacements.doctor_id = doctor_id;
    }

    if (patient_id) {
      query += " AND a.patient_id = :patient_id";
      replacements.patient_id = patient_id;
    }

    if (appointment_id) {
      query += " AND b.appointment_id = :appointment_id";
      replacements.appointment_id = appointment_id;
    }

    if (prescription_id) {
      query += " AND b.prescription_id = :prescription_id";
      replacements.prescription_id = prescription_id;
    }

    if (date) {
      query += " AND DATE(b.created_at) = :date";
      replacements.date = date;
    }

    const bills = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.json(bills);
  } catch (err) {
    console.error("Error fetching bills:", err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
};


module.exports = {
createBill,
getAllBills,
}