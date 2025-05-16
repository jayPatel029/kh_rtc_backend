const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Add lab report
const addLabReport = async (req, res) => {
  const { patient_id, Lab_Report, date, doctor } = req.body;
  
  try {
    // Add lab report
    const result = await sequelize.query(
      'INSERT INTO labreport (patient_id, date, doctor, lab_report) VALUES (:patient_id, :date, :doctor, :lab_report)',
      {
        replacements: { patient_id, date, doctor, lab_report: Lab_Report },
        type: QueryTypes.INSERT
      }
    );

    // Update appointment alert
    await sequelize.query(
      'UPDATE appointments SET doc = 1 WHERE patient_id = :patient_id',
      {
        replacements: { patient_id },
        type: QueryTypes.UPDATE
      }
    );

    res.status(201).json({ message: 'Lab report added successfully', id: result[0] });
  } catch (err) {
    console.error('Error adding lab report:', err);
    res.status(500).json({ error: 'An error occurred while adding the lab report.' });
  }
};

// Get lab reports by patient ID
const getLabReportsByPatientId = async (req, res) => {
  const { patientId } = req.params;
  
  try {
    const results = await sequelize.query(
      'SELECT * FROM labreport WHERE patient_id = :patientId',
      {
        replacements: { patientId },
        type: QueryTypes.SELECT
      }
    );
    res.json({ data: results });
  } catch (err) {
    console.error('Error fetching lab reports:', err);
    res.status(500).json({ error: 'An error occurred while fetching the lab reports.' });
  }
};

// Delete lab report
const deleteLabReport = async (req, res) => {
  const { id } = req.params;
  
  try {
    await sequelize.query(
      'DELETE FROM labreport WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
    res.json({ message: 'Lab report deleted successfully' });
  } catch (err) {
    console.error('Error deleting lab report:', err);
    res.status(500).json({ error: 'An error occurred while deleting the lab report.' });
  }
};

module.exports = {
  addLabReport,
  getLabReportsByPatientId,
  deleteLabReport
}; 