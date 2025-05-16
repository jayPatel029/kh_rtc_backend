const { sequelize } = require("../config/database");

// Get template IDs
const getTemplateIds = async (req, res) => {
  try {
    const results = await sequelize.query(
      "SELECT DISTINCT template_id FROM tele_prescription WHERE template_id IS NOT NULL",
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update template ID
const updateTemplateId = async (req, res) => {
  const { templateId } = req.body;
  try {
    await sequelize.query(
      "UPDATE tele_prescription SET template_id = ? WHERE template_id IS NULL",
      {
        replacements: [templateId],
        type: sequelize.QueryTypes.UPDATE,
      }
    );
    res.json({ message: "Template ID updated successfully for prescriptions" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get prescription by template ID
const getPrescriptionByTemplateId = async (req, res) => {
  const { templateId } = req.params;
  try {
    const results = await sequelize.query(
      `
      SELECT 
        p.*,
        a.*,
        d.*,
        m.*,
        adv.*,
        c.*
      FROM tele_prescription p
      LEFT JOIN tele_allergies a ON p.id = a.prescription_id
      LEFT JOIN tele_diagnosis d ON p.id = d.prescription_id
      LEFT JOIN tele_medicines m ON p.id = m.prescription_id
      LEFT JOIN tele_advice adv ON p.id = adv.prescription_id
      LEFT JOIN tele_complaints c ON p.id = c.prescription_id
      WHERE p.template_id = ?
    `,
      {
        replacements: [templateId],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Prescription
const addOrUpdatePrescription = async (req, res) => {
  const { appointment_id, template_id } = req.body;

  try {
    const result = await sequelize.transaction(async (t) => {
      const [existingPrescription] = await sequelize.query(
        "SELECT id FROM tele_prescription WHERE appointment_id = ?",
        {
          replacements: [appointment_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      let prescriptionId;
      if (existingPrescription) {
        prescriptionId = existingPrescription.id;
        await sequelize.query(
          "UPDATE tele_prescription SET template_id = ? WHERE id = ?",
          {
            replacements: [template_id, prescriptionId],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        const [result] = await sequelize.query(
          "INSERT INTO tele_prescription (appointment_id, template_id) VALUES (?, ?)",
          {
            replacements: [appointment_id, template_id],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
        prescriptionId = result;
      }
      return prescriptionId;
    });

    res.json({
      message: "Prescription updated successfully",
      prescription_id: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Allergies
const addOrUpdateAllergies = async (req, res) => {
  const { prescription_id, medicines, food, others } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      const [existing] = await sequelize.query(
        "SELECT id FROM tele_allergies WHERE prescription_id = ?",
        {
          replacements: [prescription_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        await sequelize.query(
          "UPDATE tele_allergies SET medicines = ?, food = ?, others = ? WHERE prescription_id = ?",
          {
            replacements: [medicines, food, others, prescription_id],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        await sequelize.query(
          "INSERT INTO tele_allergies (prescription_id, medicines, food, others) VALUES (?, ?, ?, ?)",
          {
            replacements: [prescription_id, medicines, food, others],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
      }
    });

    res.json({ message: "Allergies updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Diagnosis
const addOrUpdateDiagnosis = async (req, res) => {
  const { prescription_id, diagnosis_no, diagnosis, duration, date } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      const [existing] = await sequelize.query(
        "SELECT id FROM tele_diagnosis WHERE prescription_id = ?",
        {
          replacements: [prescription_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        await sequelize.query(
          "UPDATE tele_diagnosis SET diagnosis_no = ?, diagnosis = ?, duration = ?, date = ? WHERE prescription_id = ?",
          {
            replacements: [
              diagnosis_no,
              diagnosis,
              duration,
              date,
              prescription_id,
            ],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        await sequelize.query(
          "INSERT INTO tele_diagnosis (prescription_id, diagnosis_no, diagnosis, duration, date) VALUES (?, ?, ?, ?, ?)",
          {
            replacements: [
              prescription_id,
              diagnosis_no,
              diagnosis,
              duration,
              date,
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
      }
    });

    res.json({ message: "Diagnosis updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Medicines
const addOrUpdateMedicines = async (req, res) => {
  const {
    prescription_id,
    medicine_no,
    name,
    type,
    dosage,
    frequency,
    duration,
    when_to_take,
    from_date,
    to_date,
  } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      const [existing] = await sequelize.query(
        "SELECT id FROM tele_medicines WHERE prescription_id = ?",
        {
          replacements: [prescription_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        await sequelize.query(
          "UPDATE tele_medicines SET medicine_no = ?, name = ?, type = ?, dosage = ?, frequency = ?, duration = ?, when_to_take = ?, from_date = ?, to_date = ? WHERE prescription_id = ?",
          {
            replacements: [
              medicine_no,
              name,
              type,
              dosage,
              frequency,
              duration,
              when_to_take,
              from_date,
              to_date,
              prescription_id,
            ],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        await sequelize.query(
          "INSERT INTO tele_medicines (prescription_id, medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          {
            replacements: [
              prescription_id,
              medicine_no,
              name,
              type,
              dosage,
              frequency,
              duration,
              when_to_take,
              from_date,
              to_date,
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
      }
    });

    res.json({ message: "Medicines updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Advice
const addOrUpdateAdvice = async (req, res) => {
  const { prescription_id, advice_text, date } = req.body;

  try {
    await sequelize.transaction(async (t) => {
      const [existing] = await sequelize.query(
        "SELECT id FROM tele_advice WHERE prescription_id = ?",
        {
          replacements: [prescription_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        await sequelize.query(
          "UPDATE tele_advice SET advice_text = ?, date = ? WHERE prescription_id = ?",
          {
            replacements: [advice_text, date, prescription_id],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        await sequelize.query(
          "INSERT INTO tele_advice (prescription_id, advice_text, date) VALUES (?, ?, ?)",
          {
            replacements: [prescription_id, advice_text, date],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
      }
    });

    res.json({ message: "Advice updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add or Update Complaints
const addOrUpdateComplaints = async (req, res) => {
  const { prescription_id, complaint_no, complaint, severity, duration, date } =
    req.body;

  try {
    await sequelize.transaction(async (t) => {
      const [existing] = await sequelize.query(
        "SELECT id FROM tele_complaints WHERE prescription_id = ?",
        {
          replacements: [prescription_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        await sequelize.query(
          "UPDATE tele_complaints SET complaint_no = ?, complaint = ?, severity = ?, duration = ?, date = ? WHERE prescription_id = ?",
          {
            replacements: [
              complaint_no,
              complaint,
              severity,
              duration,
              date,
              prescription_id,
            ],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        await sequelize.query(
          "INSERT INTO tele_complaints (prescription_id, complaint_no, complaint, severity, duration, date) VALUES (?, ?, ?, ?, ?, ?)",
          {
            replacements: [
              prescription_id,
              complaint_no,
              complaint,
              severity,
              duration,
              date,
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
      }
    });

    res.json({ message: "Complaints updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const saveOrUpdateCompletePrescription = async (req, res) => {
  const {
    appointment_id,
    template_id,
    allergies,
    diagnosis,
    medicines,
    advice,
    complaints,
    next_visit,
    referred_to,
    investigation,
    past_medication,
  } = req.body;

  try {
    console.log("got this data for presc: ", req.body);

    const result = await sequelize.transaction(async (t) => {
      // Step 1: Upsert Prescription
      const [existingPrescription] = await sequelize.query(
        "SELECT id FROM tele_prescription WHERE appointment_id = ?",
        {
          replacements: [appointment_id],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      let prescriptionId;
      if (existingPrescription) {
        prescriptionId = existingPrescription.id;
        await sequelize.query(
          `UPDATE tele_prescription 
           SET template_id = ?, next_visit = ?, referred_to = ?, investigation = ?, past_medication = ? 
           WHERE id = ?`,

          {
            replacements: [
              template_id,
              next_visit || null,
              referred_to ? JSON.stringify(referred_to) : null,
              investigation || null,
              past_medication || null,
              prescriptionId,
            ],
            type: sequelize.QueryTypes.UPDATE,
            transaction: t,
          }
        );
      } else {
        const [insertResult] = await sequelize.query(
          `INSERT INTO tele_prescription 
            (appointment_id, template_id, next_visit, referred_to, investigation, past_medication)
           VALUES (?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              appointment_id,
              template_id,
              next_visit || null,
              referred_to ? JSON.stringify(referred_to) : null,
              investigation || null,
              past_medication || null,
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t,
          }
        );
        prescriptionId = insertResult;
      }

      // Step 2: Allergies
      if (allergies) {
        const [existing] = await sequelize.query(
          "SELECT id FROM tele_allergies WHERE prescription_id = ?",
          {
            replacements: [prescriptionId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (existing) {
          await sequelize.query(
            "UPDATE tele_allergies SET medicines = ?, food = ?, others = ? WHERE prescription_id = ?",
            {
              replacements: [
                allergies.medicines,
                allergies.food,
                allergies.others,
                prescriptionId,
              ],
              type: sequelize.QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else {
          await sequelize.query(
            "INSERT INTO tele_allergies (prescription_id, medicines, food, others) VALUES (?, ?, ?, ?)",
            {
              replacements: [
                prescriptionId,
                allergies.medicines,
                allergies.food,
                allergies.others,
              ],
              type: sequelize.QueryTypes.INSERT,
              transaction: t,
            }
          );
        }
      }

      // Step 3: Diagnosis
      if (diagnosis) {
        const [existing] = await sequelize.query(
          "SELECT id FROM tele_diagnosis WHERE prescription_id = ?",
          {
            replacements: [prescriptionId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (existing) {
          await sequelize.query(
            "UPDATE tele_diagnosis SET diagnosis_no = ?, diagnosis = ?, duration = ?, date = ? WHERE prescription_id = ?",
            {
              replacements: [
                diagnosis.diagnosis_no,
                diagnosis.diagnosis,
                diagnosis.duration,
                diagnosis.date,
                prescriptionId,
              ],
              type: sequelize.QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else {
          await sequelize.query(
            "INSERT INTO tele_diagnosis (prescription_id, diagnosis_no, diagnosis, duration, date) VALUES (?, ?, ?, ?, ?)",
            {
              replacements: [
                prescriptionId,
                diagnosis.diagnosis_no,
                diagnosis.diagnosis,
                diagnosis.duration,
                diagnosis.date,
              ],
              type: sequelize.QueryTypes.INSERT,
              transaction: t,
            }
          );
        }
      }

      // Step 4: Medicines
      if (medicines) {
        const [existing] = await sequelize.query(
          "SELECT id FROM tele_medicines WHERE prescription_id = ?",
          {
            replacements: [prescriptionId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (existing) {
          await sequelize.query(
            "UPDATE tele_medicines SET medicine_no = ?, name = ?, type = ?, dosage = ?, frequency = ?, duration = ?, when_to_take = ?, from_date = ?, to_date = ? WHERE prescription_id = ?",
            {
              replacements: [
                medicines.medicine_no,
                medicines.name,
                medicines.type,
                medicines.dosage,
                medicines.frequency,
                medicines.duration,
                medicines.when_to_take,
                medicines.from_date,
                medicines.to_date,
                prescriptionId,
              ],
              type: sequelize.QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else {
          await sequelize.query(
            "INSERT INTO tele_medicines (prescription_id, medicine_no, name, type, dosage, frequency, duration, when_to_take, from_date, to_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            {
              replacements: [
                prescriptionId,
                medicines.medicine_no,
                medicines.name,
                medicines.type,
                medicines.dosage,
                medicines.frequency,
                medicines.duration,
                medicines.when_to_take,
                medicines.from_date,
                medicines.to_date,
              ],
              type: sequelize.QueryTypes.INSERT,
              transaction: t,
            }
          );
        }
      }

      // Step 5: Advice
      if (advice) {
        const [existing] = await sequelize.query(
          "SELECT id FROM tele_advice WHERE prescription_id = ?",
          {
            replacements: [prescriptionId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (existing) {
          await sequelize.query(
            "UPDATE tele_advice SET advice_text = ?, date = ? WHERE prescription_id = ?",
            {
              replacements: [advice.advice_text, advice.date, prescriptionId],
              type: sequelize.QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else {
          await sequelize.query(
            "INSERT INTO tele_advice (prescription_id, advice_text, date) VALUES (?, ?, ?)",
            {
              replacements: [prescriptionId, advice.advice_text, advice.date],
              type: sequelize.QueryTypes.INSERT,
              transaction: t,
            }
          );
        }
      }

      // Step 6: Complaints
      if (complaints) {
        const [existing] = await sequelize.query(
          "SELECT id FROM tele_complaints WHERE prescription_id = ?",
          {
            replacements: [prescriptionId],
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        if (existing) {
          await sequelize.query(
            "UPDATE tele_complaints SET complaint_no = ?, complaint = ?, severity = ?, duration = ?, date = ? WHERE prescription_id = ?",
            {
              replacements: [
                complaints.complaint_no,
                complaints.complaint,
                complaints.severity,
                complaints.duration,
                complaints.date,
                prescriptionId,
              ],
              type: sequelize.QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else {
          await sequelize.query(
            "INSERT INTO tele_complaints (prescription_id, complaint_no, complaint, severity, duration, date) VALUES (?, ?, ?, ?, ?, ?)",
            {
              replacements: [
                prescriptionId,
                complaints.complaint_no,
                complaints.complaint,
                complaints.severity,
                complaints.duration,
                complaints.date,
              ],
              type: sequelize.QueryTypes.INSERT,
              transaction: t,
            }
          );
        }
      }

      return prescriptionId;
    });

    res.json({
      message: "Prescription saved successfully",
      prescription_id: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTemplateIds,
  updateTemplateId,
  getPrescriptionByTemplateId,
  addOrUpdatePrescription,
  addOrUpdateAllergies,
  addOrUpdateDiagnosis,
  addOrUpdateMedicines,
  addOrUpdateAdvice,
  addOrUpdateComplaints,
  saveOrUpdateCompletePrescription,
};
