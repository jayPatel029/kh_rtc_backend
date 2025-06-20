const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");
const { generateTemplateId } = require("../utils/appointmentUtils");

const createPrescriptionTemplate = async (req, res) => {
  const {
    template_name,
    template_description,
    medicines,
    advice,
    complaints,
    next_visit,
    referred_to,
    investigation,
    past_medication,
  } = req.body;

  try {
    // Generate a unique template_id
    const template_id = generateTemplateId();
    // 1. Insert into tele_prescription (no appointment_id)
    const [result] = await sequelize.query(
      `INSERT INTO tele_prescription 
        (template_id, template_name, template_description, next_visit, referred_to, investigation, past_medication)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          template_id,
          template_name,
          template_description,
          next_visit || null,
          referred_to ? JSON.stringify(referred_to) : null,
          investigation || null,
          past_medication || null,
        ],
        type: sequelize.QueryTypes.INSERT,
      }
    );
    const templatePrescriptionId = result;

    // 2. Insert medicines, advice, complaints (if provided)
    // Medicines
    if (medicines && Array.isArray(medicines)) {
      for (const med of medicines) {
        await sequelize.query(
          `INSERT INTO tele_medicines (prescription_id, medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              templatePrescriptionId,
              med.medicine_no,
              med.name,
              med.type,
              med.dosage,
              med.frequency,
              med.duration,
              med.when_to_take,
              med.from_date,
              med.to_date,
            ],
            type: sequelize.QueryTypes.INSERT,
          }
        );
      }
    }
    // Advice
    if (advice && Array.isArray(advice)) {
      for (const adv of advice) {
        await sequelize.query(
          `INSERT INTO tele_advice (prescription_id, advice_text, date)
           VALUES (?, ?, ?)`,
          {
            replacements: [
              templatePrescriptionId,
              adv.advice_text,
              adv.date,
            ],
            type: sequelize.QueryTypes.INSERT,
          }
        );
      }
    }
    // Complaints
    if (complaints && Array.isArray(complaints)) {
      for (const comp of complaints) {
        await sequelize.query(
          `INSERT INTO tele_complaints (prescription_id, complaint_no, complaint, severity, duration, date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              templatePrescriptionId,
              comp.complaint_no,
              comp.complaint,
              comp.severity,
              comp.duration,
              comp.date,
            ],
            type: sequelize.QueryTypes.INSERT,
          }
        );
      }
    }

    res
      .status(201)
      .json({ message: "Template created successfully", template_id });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
};

const getAllPrescriptionTemplates = async (req, res) => {
  const { template_name } = req.query;
  try {
let query = `
  SELECT 
    template_name, 
    template_description, 
    template_id, 
    id AS prescription_id, 
    created_at 
  FROM tele_prescription 
  WHERE appointment_id IS NULL`;
    const replacements = {  };
    if (template_name) {
      query += ` AND LOWER(template_name) LIKE LOWER(:template_name)`;
      replacements.template_name = `%${template_name}%`;
    }
    const templates = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    res.json({ templates });
  } catch (error) {
    console.error("Failed to fetch templates", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

const getPrescriptionTemplateById = async (req, res) => {
  const { template_id } = req.query;
  try {
    // Get template
    const [template] = await sequelize.query(
      `SELECT * FROM tele_prescription WHERE template_id = :template_id AND appointment_id IS NULL`,
      {
        replacements: { template_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (!template) return res.status(404).json({ error: "Template not found" });

    // Get related medicines, advice, complaints
    const medicines = await sequelize.query(
      `SELECT * FROM tele_medicines WHERE prescription_id = :template_id`,
      { replacements: { template_id }, type: sequelize.QueryTypes.SELECT }
    );
    const advice = await sequelize.query(
      `SELECT * FROM tele_advice WHERE prescription_id = :template_id`,
      { replacements: { template_id }, type: sequelize.QueryTypes.SELECT }
    );
    const complaints = await sequelize.query(
      `SELECT * FROM tele_complaints WHERE prescription_id = :template_id`,
      { replacements: { template_id }, type: sequelize.QueryTypes.SELECT }
    );

    res.json({ template, medicines, advice, complaints });
  } catch (error) {
        console.error("Failed to load template", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

module.exports = {
  createPrescriptionTemplate,
  getAllPrescriptionTemplates,
  getPrescriptionTemplateById,
};
