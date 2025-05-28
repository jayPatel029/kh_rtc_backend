const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Add lab report
const addLabReport = async (req, res) => {
  try {
    const { Report_Type, Lab_Report, Date, patient_id } = req.body;

    await sequelize.query(
      `
      INSERT INTO tele_labreport (Report_Type, Lab_Report, Date, patient_id)
      VALUES (:Report_Type, :Lab_Report, :Date, :patient_id)
    `,
      {
        replacements: { Report_Type, Lab_Report, Date, patient_id },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ message: "Lab report added successfully" });
  } catch (err) {
    console.error("Error adding lab report:", err);
    res.status(500).json({ error: "Failed to add lab report" });
  }
};

//get by patient_id or get all
const getLabReports = async (req, res) => {
  try {
    const { patient_id } = req.query;

    let query = "SELECT * FROM tele_labreport";
    const replacements = {};

    if (patient_id) {
      query += " WHERE patient_id = :patient_id";
      replacements.patient_id = patient_id;
    }

    const reports = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.json({ count: reports.length, data: reports });
  } catch (err) {
    console.error("Error fetching lab reports:", err);
    res.status(500).json({ error: "Failed to fetch lab reports" });
  }
};


const deleteLabReport = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sequelize.query(
      `
      DELETE FROM tele_labreport WHERE id = :id
    `,
      {
        replacements: { id },
        type: QueryTypes.DELETE,
      }
    );

    res.json({ message: "Lab report deleted successfully" });
  } catch (err) {
    console.error("Error deleting lab report:", err);
    res.status(500).json({ error: "Failed to delete lab report" });
  }
};

module.exports = {
  addLabReport,
  getLabReports,
  deleteLabReport
}; 