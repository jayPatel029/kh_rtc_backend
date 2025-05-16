const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Get common template IDs
const getCommonTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(`
      SELECT template_id
      FROM (
          SELECT DISTINCT template_id FROM tele_complaints
          UNION
          SELECT DISTINCT template_id FROM tele_diagnosis
          UNION
          SELECT DISTINCT template_id FROM tele_medicines
          UNION
          SELECT DISTINCT template_id FROM tele_advice
      ) AS combined_templates;
    `, { type: QueryTypes.SELECT });
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching common template IDs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get complaints template IDs
const getComplaintsTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT DISTINCT template_id FROM tele_complaints WHERE template_id IS NOT NULL',
      { type: QueryTypes.SELECT }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching complaints template IDs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update complaints template ID
const updateComplaintsTemplateId = async (req, res) => {
  const { templateId } = req.body;
  try {
    await sequelize.query(
      'UPDATE tele_complaints SET template_id = ? WHERE template_id IS NULL',
      {
        replacements: [templateId],
        type: QueryTypes.UPDATE
      }
    );
    res.json({ message: 'Template ID updated successfully for complaints' });
  } catch (err) {
    console.error('Error updating complaints template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get complaints by template ID
const getComplaintsByTemplateId = async (req, res) => {
  const { templateId } = req.params;
  try {
    const results = await sequelize.query(
      'SELECT * FROM tele_complaints WHERE template_id = ?',
      {
        replacements: [templateId],
        type: QueryTypes.SELECT
      }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching complaints by template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get diagnosis template IDs
const getDiagnosisTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT DISTINCT template_id FROM tele_diagnosis WHERE template_id IS NOT NULL',
      { type: QueryTypes.SELECT }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching diagnosis template IDs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update diagnosis template ID
const updateDiagnosisTemplateId = async (req, res) => {
  const { templateId } = req.body;
  try {
    await sequelize.query(
      'UPDATE tele_diagnosis SET template_id = ? WHERE template_id IS NULL',
      {
        replacements: [templateId],
        type: QueryTypes.UPDATE
      }
    );
    res.json({ message: 'Template ID updated successfully for diagnosis' });
  } catch (err) {
    console.error('Error updating diagnosis template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get diagnosis by template ID
const getDiagnosisByTemplateId = async (req, res) => {
  const { templateId } = req.params;
  try {
    const results = await sequelize.query(
      'SELECT * FROM tele_diagnosis WHERE template_id = ?',
      {
        replacements: [templateId],
        type: QueryTypes.SELECT
      }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching diagnosis by template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get medicines template IDs
const getMedicinesTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT DISTINCT template_id FROM tele_medicines WHERE template_id IS NOT NULL',
      { type: QueryTypes.SELECT }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching medicines template IDs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update medicines template ID
const updateMedicinesTemplateId = async (req, res) => {
  const { templateId } = req.body;
  try {
    await sequelize.query(
      'UPDATE tele_medicines SET template_id = ? WHERE template_id IS NULL',
      {
        replacements: [templateId],
        type: QueryTypes.UPDATE
      }
    );
    res.json({ message: 'Template ID updated successfully for medicines' });
  } catch (err) {
    console.error('Error updating medicines template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get medicines by template ID
const getMedicinesByTemplateId = async (req, res) => {
  const { templateId } = req.params;
  try {
    const results = await sequelize.query(
      'SELECT * FROM tele_medicines WHERE template_id = ?',
      {
        replacements: [templateId],
        type: QueryTypes.SELECT
      }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching medicines by template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get advice template IDs
const getAdviceTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT DISTINCT template_id FROM tele_advice WHERE template_id IS NOT NULL',
      { type: QueryTypes.SELECT }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching advice template IDs:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update advice template ID
const updateAdviceTemplateId = async (req, res) => {
  const { templateId } = req.body;
  try {
    await sequelize.query(
      'UPDATE tele_advice SET template_id = ? WHERE template_id IS NULL',
      {
        replacements: [templateId],
        type: QueryTypes.UPDATE
      }
    );
    res.json({ message: 'Template ID updated successfully for advice' });
  } catch (err) {
    console.error('Error updating advice template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get advice by template ID
const getAdviceByTemplateId = async (req, res) => {
  const { templateId } = req.params;
  try {
    const results = await sequelize.query(
      'SELECT * FROM tele_advice WHERE template_id = ?',
      {
        replacements: [templateId],
        type: QueryTypes.SELECT
      }
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching advice by template ID:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCommonTemplateIds,
  getComplaintsTemplateIds,
  updateComplaintsTemplateId,
  getComplaintsByTemplateId,
  getDiagnosisTemplateIds,
  updateDiagnosisTemplateId,
  getDiagnosisByTemplateId,
  getMedicinesTemplateIds,
  updateMedicinesTemplateId,
  getMedicinesByTemplateId,
  getAdviceTemplateIds,
  updateAdviceTemplateId,
  getAdviceByTemplateId
}; 