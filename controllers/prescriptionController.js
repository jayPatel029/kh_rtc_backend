const { sequelize } = require("../config/database");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { QueryTypes } = require("sequelize");
const upload = multer({ dest: "uploads/" }); // multer setup

//! todo add a upload prescription funciton here

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
    template_name,
    template_description,
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

    // const pid = await sequelize.query( "select patient_id from tele_appointments where id = :appointment_id" )
    // console.log("the pid", pid);
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
           SET template_id = ?, 
               template_name = ?,
               template_description = ?,
               next_visit = ?, 
               referred_to = ?, 
               investigation = ?, 
               past_medication = ? 
           WHERE id = ?`,
          {
            replacements: [
              template_id || null,
              template_id ? template_name : null,
              template_id ? template_description : null,
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
            (appointment_id, template_id, template_name, template_description, next_visit, referred_to, investigation, past_medication)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              appointment_id,
              template_id || null,
              template_id ? template_name : null,
              template_id ? template_description : null,
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

const uploadPrescription = async (req, res) => {
  try {
    const id = req.body.id;
    const prescription = req.file;
    // const updates = {
    //   prescription: req.files["prescription"]
    //     ? `/uploads/${req.files["prescription"][0].filename}`
    //     : null,
    // };

    const prescFIle = req.files?.prescription?.[0];

    if(!prescFIle ) {
      console.log("NO file uploaded!!");
      res.status(400).json({message: "No file uploaded."})
    }

    const updates = {
      prescription: `uploads/${prescription.filename}`,
    };
    console.log("file received", updates);

    const updateFields = 
    Object.entries(updates)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key]) => `${key} = :${key}`)
      .join(", ");

    if (!updateFields) {
      return res.status(400).json({ message: "No files uploaded." });
    }

    await sequelize.query(
      `UPDATE tele_prescription SET ${updateFields}, updated_at = NOW() WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE,
      }
    );

    res.status(200).json({ message: "prescription uploaded successfully" });
  } catch (err) {
    console.error("Error uploading prescription:", err);
    res.status(500).json({ error: "Server error during file upload" });
  }
};

const languageMap = {
  Hindi: "hi",
  Bengali: "bn",
  Marathi: "mr",
  Telugu: "te",
  Tamil: "ta",
  Gujarati: "gu",
  Assamese: "as",
  Kannada: "kn",
  Malayalam: "ml",
  Punjabi: "pa",
};

const uploadAdvices = async (req, res) => {
  const file = req.file;
  const { doctor_id = null, clinic_id = null } = req.body; // Optional fields

  if (!file) return res.status(400).json({ error: "CSV file is required." });

  const filePath = path.join(__dirname, "../", file.path);
  const adviceRows = [];

  fs.createReadStream(filePath)
    .pipe(
      csv({
        mapHeaders: ({ header }) => header.trim(),
      })
    )
    .on("data", (row) => {
      adviceRows.push(row);
    })
    .on("end", async () => {
      try {
        for (const row of adviceRows) {
          const englishAdvice = row["Advice (English)"]?.trim();

          if (!englishAdvice) {
            console.warn("Skipping row with missing English advice:", row);
            continue;
          }

          // Insert into tele_advice with optional doctor_id and clinic_id
          const [result] = await sequelize.query(
            `
            INSERT INTO tele_advice (advice_text, doctor_id, clinic_id)
            VALUES (:advice_text, :doctor_id, :clinic_id)
            `,
            {
              replacements: {
                advice_text: englishAdvice,
                doctor_id,
                clinic_id,
              },
              type: QueryTypes.INSERT,
            }
          );

          const adviceId = result;

          // Insert translations (may include nulls)
          for (const [language, langCode] of Object.entries(languageMap)) {
            const translation = row[language]?.trim() || null;

            await sequelize.query(
              `
              INSERT INTO tele_advice_translations (advice_id, language_code, translation)
              VALUES (:advice_id, :language_code, :translation)
              `,
              {
                replacements: {
                  advice_id: adviceId,
                  language_code: langCode,
                  translation,
                },
                type: QueryTypes.INSERT,
              }
            );
          }
        }

        fs.unlinkSync(filePath);
        res.status(200).json({ message: "Advice data uploaded successfully." });
      } catch (err) {
        console.error("Error inserting data:", err);
        res.status(500).json({ error: "Error inserting data." });
      }
    });
};

const getEnglishAdvices = async (req, res) => {
  const { clinic_id, doctor_id } = req.query;

  try {
    let query = `
      SELECT id, advice_text
      FROM tele_advice
      WHERE 1 = 1
    `;

    const replacements = {};

    if (clinic_id) {
      query += ` AND clinic_id = :clinic_id`;
      replacements.clinic_id = clinic_id;
    }

    if (doctor_id) {
      query += ` AND doctor_id = :doctor_id`;
      replacements.doctor_id = doctor_id;
    }

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.status(200).json({ data: results });
  } catch (error) {
    console.error("Error fetching English advices:", error);
    res.status(500).json({ error: "Failed to fetch English advices." });
  }
};

const getAdviceTranslations = async (req, res) => {
  const { advice_id } = req.query;

  if (!advice_id) {
    return res.status(400).json({ error: "advice_id is required." });
  }

  try {
    const query = `
      SELECT language_code, translation
      FROM tele_advice_translations
      WHERE advice_id = :advice_id
    `;

    const translations = await sequelize.query(query, {
      replacements: { advice_id },
      type: QueryTypes.SELECT,
    });

    res.status(200).json({ data: translations });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: "Failed to fetch translations." });
  }
};

const addAdvice = async (req, res) => {
  const {
    advice_text,
    clinic_id = null,
    doctor_id = null,
    translations = {}, // { Hindi: "translation", Tamil: "translation", ... }
  } = req.body;

  console.log("the body: ", req.body);

  if (!advice_text || advice_text.trim() === "") {
    return res.status(400).json({ error: "advice_text is required." });
  }

  try {
    // Insert English advice
    const [result] = await sequelize.query(
      `
      INSERT INTO tele_advice (advice_text, clinic_id, doctor_id, date)
      VALUES (:advice_text, :clinic_id, :doctor_id, CURDATE())
    `,
      {
        replacements: {
          advice_text: advice_text.trim(),
          clinic_id,
          doctor_id,
        },
        type: QueryTypes.INSERT,
      }
    );

    const adviceId = result;

    // Insert translations if provided
    for (const [language, translationText] of Object.entries(translations)) {
      const language_code = languageMap[language]; // Make sure languageMap is defined globally

      if (!language_code) {
        console.warn(`Skipping unknown language: ${language}`);
        continue;
      }

      await sequelize.query(
        `
        INSERT INTO tele_advice_translations (advice_id, language_code, translation)
        VALUES (:advice_id, :language_code, :translation)
      `,
        {
          replacements: {
            advice_id: adviceId,
            language_code,
            translation: translationText?.trim() || null,
          },
          type: QueryTypes.INSERT,
        }
      );
    }

    res
      .status(200)
      .json({ message: "Advice added successfully.", advice_id: adviceId });
  } catch (error) {
    console.error("Error adding advice:", error);
    res.status(500).json({ error: "Failed to add advice." });
  }
};

const getPrescriptions = async (req, res) => {
  const { doctor_id, patient_id, appointment_id } = req.query;

  try {
    let query = `
      SELECT DISTINCT 
        p.id AS prescription_id,
        p.appointment_id,
        p.template_id,
        p.next_visit,
        p.referred_to,
        p.investigation,
        p.past_medication,
        p.created_at AS prescription_created_at,
        p.updated_at AS prescription_updated_at,

        a.medicines AS allergy_medicines,
        a.food AS allergy_food,
        a.others AS allergy_others,

        d.diagnosis_no,
        d.diagnosis,
        d.duration AS diagnosis_duration,
        d.date AS diagnosis_date,

        m.medicine_no,
        m.name AS medicine_name,
        m.type AS medicine_type,
        m.dosage,
        m.frequency,
        m.duration AS medicine_duration,
        m.when_to_take,
        m.from_date,
        m.to_date,

        adv.advice_text,
        adv.date AS advice_date,

        c.complaint_no,
        c.complaint,
        c.severity,
        c.duration AS complaint_duration,
        c.date AS complaint_date,

        apt.appointment_date,
        apt.appointment_time,
        apt.status AS appointment_status,

        doc.id AS doctor_id,
        doc.doctor AS doctor_name,
        cl.id AS clinic_id,
        cl.clinic_name,

        pat.patient_id,
        pat.name AS patient_name,
        pat.phone_no AS patient_phone
      FROM tele_prescription p
      LEFT JOIN tele_allergies a ON p.id = a.prescription_id
      LEFT JOIN tele_diagnosis d ON p.id = d.prescription_id
      LEFT JOIN tele_medicines m ON p.id = m.prescription_id
      LEFT JOIN tele_advice adv ON p.id = adv.prescription_id
      LEFT JOIN tele_complaints c ON p.id = c.prescription_id
      LEFT JOIN tele_appointments apt ON p.appointment_id = apt.id
      LEFT JOIN tele_doctor doc ON apt.doctor_id = doc.id
      LEFT JOIN tele_patient pat ON apt.patient_id = pat.patient_id
      LEFT JOIN tele_doctor_clinic dcl ON doc.id = dcl.doctor_id
      LEFT JOIN tele_clinic cl ON dcl.clinic_id = cl.id
      WHERE 1=1
    `;

    const replacements = {};

    if (doctor_id) {
      query += ` AND doc.id = :doctor_id`;
      replacements.doctor_id = doctor_id;
    }

    if (patient_id) {
      query += ` AND pat.patient_id = :patient_id`;
      replacements.patient_id = patient_id;
    }

    if (appointment_id) {
      query += ` AND apt.id = :appointment_id`;
      replacements.appointment_id = appointment_id;
    }

    query += ` ORDER BY p.created_at DESC`;

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const groupedResults = results.reduce((acc, row) => {
      const prescriptionId = row.prescription_id;
      if (!acc[prescriptionId]) {
        acc[prescriptionId] = {
          prescription: {
            id: row.prescription_id,
            appointment_id: row.appointment_id,
            template_id: row.template_id,
            next_visit: row.next_visit,
            referred_to: row.referred_to,
            investigation: row.investigation,
            past_medication: row.past_medication,
            created_at: row.prescription_created_at,
            updated_at: row.prescription_updated_at,
          },
          appointment: {
            date: row.appointment_date,
            time: row.appointment_time,
            status: row.appointment_status,
          },
          doctor: {
            id: row.doctor_id,
            name: row.doctor_name,
          },
          patient: {
            id: row.patient_id,
            name: row.patient_name,
            phone: row.patient_phone,
          },
          clinic: {
            id: row.clinic_id,
            name: row.clinic_name,
          },
          allergies: {
            medicines: row.allergy_medicines,
            food: row.allergy_food,
            others: row.allergy_others,
          },
          diagnosis: {
            diagnosis_no: row.diagnosis_no,
            diagnosis: row.diagnosis,
            duration: row.diagnosis_duration,
            date: row.diagnosis_date,
          },
          medicines: {
            medicine_no: row.medicine_no,
            name: row.medicine_name,
            type: row.medicine_type,
            dosage: row.dosage,
            frequency: row.frequency,
            duration: row.medicine_duration,
            when_to_take: row.when_to_take,
            from_date: row.from_date,
            to_date: row.to_date,
          },
          advice: {
            advice_text: row.advice_text,
            date: row.advice_date,
          },
          complaints: {
            complaint_no: row.complaint_no,
            complaint: row.complaint,
            severity: row.severity,
            duration: row.complaint_duration,
            date: row.complaint_date,
          },
        };
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(groupedResults),
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch prescriptions",
    });
  }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
  const { id } = req.query;

  try {
    const query = `
      SELECT 
        p.id AS prescription_id,
        p.appointment_id,
        p.template_id,
        p.next_visit,
        p.referred_to,
        p.investigation,
        p.past_medication,
        p.created_at AS prescription_created_at,
        p.updated_at AS prescription_updated_at,

        a.medicines AS allergy_medicines,
        a.food AS allergy_food,
        a.others AS allergy_others,

        d.diagnosis_no,
        d.diagnosis,
        d.duration AS diagnosis_duration,
        d.date AS diagnosis_date,

        m.medicine_no,
        m.name AS medicine_name,
        m.type AS medicine_type,
        m.dosage,
        m.frequency,
        m.duration AS medicine_duration,
        m.when_to_take,
        m.from_date,
        m.to_date,

        adv.advice_text,
        adv.date AS advice_date,

        c.complaint_no,
        c.complaint,
        c.severity,
        c.duration AS complaint_duration,
        c.date AS complaint_date,

        apt.appointment_date,
        apt.appointment_time,
        apt.status AS appointment_status,

        doc.id AS doctor_id,
        doc.doctor AS doctor_name,

        pat.patient_id,
        pat.name AS patient_name,
        pat.phone_no AS patient_phone,

        cl.id AS clinic_id,
        cl.clinic_name
      FROM tele_prescription p
      LEFT JOIN tele_allergies a ON p.id = a.prescription_id
      LEFT JOIN tele_diagnosis d ON p.id = d.prescription_id
      LEFT JOIN tele_medicines m ON p.id = m.prescription_id
      LEFT JOIN tele_advice adv ON p.id = adv.prescription_id
      LEFT JOIN tele_complaints c ON p.id = c.prescription_id
      LEFT JOIN tele_appointments apt ON p.appointment_id = apt.id
      LEFT JOIN tele_doctor doc ON apt.doctor_id = doc.id
      LEFT JOIN tele_patient pat ON apt.patient_id = pat.patient_id
      LEFT JOIN tele_doctor_clinic dcl ON doc.id = dcl.doctor_id
      LEFT JOIN tele_clinic cl ON dcl.clinic_id = cl.id
      WHERE p.id = :id
    `;

    const results = await sequelize.query(query, {
      replacements: { id },
      type: QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Prescription not found",
      });
    }

    const row = results[0];

    const prescription = {
      prescription: {
        id: row.prescription_id,
        appointment_id: row.appointment_id,
        template_id: row.template_id,
        next_visit: row.next_visit,
        referred_to: row.referred_to,
        investigation: row.investigation,
        past_medication: row.past_medication,
        created_at: row.prescription_created_at,
        updated_at: row.prescription_updated_at,
      },
      appointment: {
        date: row.appointment_date,
        time: row.appointment_time,
        status: row.appointment_status,
      },
      doctor: {
        id: row.doctor_id,
        name: row.doctor_name,
      },
      patient: {
        id: row.patient_id,
        name: row.patient_name,
        phone: row.patient_phone,
      },
      clinic: {
        id: row.clinic_id,
        name: row.clinic_name,
      },
      allergies: {
        medicines: row.allergy_medicines,
        food: row.allergy_food,
        others: row.allergy_others,
      },
      diagnosis: {
        diagnosis_no: row.diagnosis_no,
        diagnosis: row.diagnosis,
        duration: row.diagnosis_duration,
        date: row.diagnosis_date,
      },
      medicines: {
        medicine_no: row.medicine_no,
        name: row.medicine_name,
        type: row.medicine_type,
        dosage: row.dosage,
        frequency: row.frequency,
        duration: row.medicine_duration,
        when_to_take: row.when_to_take,
        from_date: row.from_date,
        to_date: row.to_date,
      },
      advice: {
        advice_text: row.advice_text,
        date: row.advice_date,
      },
      complaints: {
        complaint_no: row.complaint_no,
        complaint: row.complaint,
        severity: row.severity,
        duration: row.complaint_duration,
        date: row.complaint_date,
      },
    };

    res.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch prescription",
    });
  }
};

const getAllTemplates = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        p.id AS prescription_id,
        p.template_id,
        p.template_name,
        p.template_description,
        p.created_at,
        p.updated_at,
        
        a.medicines AS allergy_medicines,
        a.food AS allergy_food,
        a.others AS allergy_others,

        d.diagnosis_no,
        d.diagnosis,
        d.duration AS diagnosis_duration,
        d.date AS diagnosis_date,

        m.medicine_no,
        m.name AS medicine_name,
        m.type AS medicine_type,
        m.dosage,
        m.frequency,
        m.duration AS medicine_duration,
        m.when_to_take,
        m.from_date,
        m.to_date,

        adv.advice_text,
        adv.date AS advice_date,

        c.complaint_no,
        c.complaint,
        c.severity,
        c.duration AS complaint_duration,
        c.date AS complaint_date
      FROM tele_prescription p
      LEFT JOIN tele_allergies a ON p.id = a.prescription_id
      LEFT JOIN tele_diagnosis d ON p.id = d.prescription_id
      LEFT JOIN tele_medicines m ON p.id = m.prescription_id
      LEFT JOIN tele_advice adv ON p.id = adv.prescription_id
      LEFT JOIN tele_complaints c ON p.id = c.prescription_id
      WHERE p.template_id IS NOT NULL
      ORDER BY p.created_at DESC
    `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    const groupedResults = results.reduce((acc, row) => {
      const prescriptionId = row.prescription_id;
      if (!acc[prescriptionId]) {
        acc[prescriptionId] = {
          id: row.prescription_id,
          template_id: row.template_id,
          template_name: row.template_name,
          template_description: row.template_description,
          created_at: row.created_at,
          updated_at: row.updated_at,
          allergies: {
            medicines: row.allergy_medicines,
            food: row.allergy_food,
            others: row.allergy_others,
          },
          diagnosis: {
            diagnosis_no: row.diagnosis_no,
            diagnosis: row.diagnosis,
            duration: row.diagnosis_duration,
            date: row.diagnosis_date,
          },
          medicines: {
            medicine_no: row.medicine_no,
            name: row.medicine_name,
            type: row.medicine_type,
            dosage: row.dosage,
            frequency: row.frequency,
            duration: row.medicine_duration,
            when_to_take: row.when_to_take,
            from_date: row.from_date,
            to_date: row.to_date,
          },
          advice: {
            advice_text: row.advice_text,
            date: row.advice_date,
          },
          complaints: {
            complaint_no: row.complaint_no,
            complaint: row.complaint,
            severity: row.severity,
            duration: row.complaint_duration,
            date: row.complaint_date,
          },
        };
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(groupedResults),
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
    });
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
  uploadAdvices,
  getEnglishAdvices,
  getAdviceTranslations,
  addAdvice,
  getPrescriptions,
  getPrescriptionById,
  getAllTemplates,
  uploadPrescription,
};
