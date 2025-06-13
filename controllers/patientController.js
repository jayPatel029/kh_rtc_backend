const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");
const upload = require("../middleware/upload");
const path = require("path");

// Get patient list
// const getPatientList = async (req, res) => {
//   try {
//     const results = await sequelize.query('SELECT * FROM tele_patient', {
//       type: QueryTypes.SELECT
//     });
//     res.json({ data: results });
//   } catch (err) {
//     console.error('Error fetching patient list:', err);
//     res.status(500).json({ error: 'Failed to fetch patient list' });
//   }
// };

const getPatientList = async (req, res) => {
  try {
    const { doctor_id, clinic_id } = req.query;

    // Case 1: No filters – fetch all patients
    if (!doctor_id && !clinic_id) {
      const allPatients = await sequelize.query("SELECT * FROM tele_patient", {
        type: QueryTypes.SELECT,
      });
      return res.json({ data: allPatients });
    }

    let query = `
      SELECT DISTINCT p.* 
      FROM tele_patient p
    `;

    const replacements = {};

    // Case 2: Filter by clinic only
    if (clinic_id && !doctor_id) {
      query += `
        INNER JOIN tele_patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE pc.clinic_id = :clinic_id
      `;
      replacements.clinic_id = clinic_id;
    }

    // Case 3: Filter by doctor only
    else if (doctor_id && !clinic_id) {
      query += `
        INNER JOIN tele_appointments a ON p.patient_id = a.patient_id
        WHERE a.doctor_id = :doctor_id
      `;
      replacements.doctor_id = doctor_id;
    }

    // Case 4: Filter by both doctor and clinic
    else if (doctor_id && clinic_id) {
      query += `
        INNER JOIN tele_appointments a ON p.patient_id = a.patient_id
        INNER JOIN tele_doctor d ON a.doctor_id = d.id
        INNER JOIN tele_patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE a.doctor_id = :doctor_id AND pc.clinic_id = :clinic_id
      `;
      replacements.doctor_id = doctor_id;
      replacements.clinic_id = clinic_id;
    }

    const patients = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.json({ data: patients });
  } catch (err) {
    console.error("Error fetching patient list:", err);
    res.status(500).json({ error: "Failed to fetch patient list" });
  }
};

// Get patients by date
const getPatientsByDate = async (req, res) => {
  const { doctor, date } = req.query;
  let query = "SELECT * FROM tele_appointments WHERE 1=1";
  const replacements = {};

  if (doctor) {
    query += " AND doctor = :doctor";
    replacements.doctor = doctor;
  }

  if (date) {
    query += " AND DATE(appointment_date) = :date";
    replacements.date = date;
  }

  try {
    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({ error: "No patients found" });
    }
    res.json({ data: results });
  } catch (err) {
    console.error("Error fetching patients:", err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching patients." });
  }
};

// Search patients
const searchPatients = async (req, res) => {
  const searchQuery = req.query.q;
  const queryParam = `%${searchQuery}%`;

  try {
    const results = await sequelize.query(
      `
      SELECT * FROM tele_appointments
      WHERE patient_name LIKE :queryParam OR patient_id LIKE :queryParam
    `,
      {
        replacements: { queryParam },
        type: QueryTypes.SELECT,
      }
    );
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Error executing query");
  }
};

// const addNewPatient = async (req, res) => {
//   const {
//     name,
//     age,
//     gender,
//     dob,
//     email,
//     number,
//     address,
//     city,
//     pincode,
//     language,
//     bloodgroup,
//     existing_id
//   } = req.body;

//   let profilePhoto = null;
//   if (req.file) {
//     profilePhoto = path.join('uploads', req.file.filename);
//   }

//   try {
//     // Step 1: Insert patient (without patient_code initially)
//     const [insertResult] = await sequelize.query(`
//       INSERT INTO tele_patient (
//         profile_photo, name, gender, age, dob, email, phone_no,
//         address, city, pincode, language, bloodgroup, existing_id
//       ) VALUES (
//         :profilePhoto, :name, :gender, :age, :dob, :email, :number,
//         :address, :city, :pincode, :language, :bloodgroup, :existing_id
//       )
//     `, {
//       replacements: {
//         profilePhoto: profilePhoto || null,
//         name: name || null,
//         gender: gender || null,
//         age: age || null,
//         dob: dob || null,
//         email: email || null,
//         number: number || null,
//         address: address || null,
//         city: city || null,
//         pincode: pincode || null,
//         language: language || null,
//         bloodgroup: bloodgroup || null,
//         existing_id: existing_id || null
//       },
//       type: QueryTypes.INSERT
//     });
//     console.log("INSERT id ", insertResult);
//     // Step 2: Get the last inserted patient_id
//     // const [[{ lastId }]] = await sequelize.query(`SELECT LAST_INSERT_ID() as lastId`);
//     // Step 3: Generate and update patient_code
//     const patientCode = `PAT${String(insertResult).padStart(5, '0')}`;
//     await sequelize.query(
//       `UPDATE tele_patient SET patient_code = :code WHERE patient_id = :id`,
//       {
//         replacements: {
//           code: patientCode,
//           id: insertResult
//         },
//         type: QueryTypes.UPDATE
//       }
//     );

//     res.status(200).json({
//       message: 'New patient added successfully',
//       data: {
//         patient_id: insertResult,
//         patient_code: patientCode
//       }
//     });
//   } catch (err) {
//     console.error('Error inserting new patient:', err);
//     res.status(500).json({ message: 'Error inserting new patient', error: err.message });
//   }
// };

// Get active patients

const addNewPatient = async (req, res) => {
  const {
    name,
    age,
    gender,
    dob,
    email,
    number,
    address,
    city,
    pincode,
    language,
    bloodgroup,
    existing_id,
    clinic_id,
  } = req.body;

  let profilePhoto = null;
  if (req.file) {
    profilePhoto = path.join("uploads", req.file.filename);
  }

  try {
    // chekc existing or not
    const existingPatient = await sequelize.query(
      `
    SELECT * FROM tele_patient
    WHERE 
      phone_no = :phone_no AND
      name = :name
  `,
      {
        replacements: {
          phone_no: number,
          dob,
          name,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (existingPatient.length > 0) {
      return res.status(409).json({
        message: "Patient already exists",
        data: existingPatient[0],
      });
    }
    const [insertResult] = await sequelize.query(
      `
      INSERT INTO tele_patient (
        profile_photo, name, gender, age, dob, email, phone_no,
        address, city, pincode, language, bloodgroup, existing_id
      ) VALUES (
        :profilePhoto, :name, :gender, :age, :dob, :email, :number,
        :address, :city, :pincode, :language, :bloodgroup, :existing_id
      )
    `,
      {
        replacements: {
          profilePhoto: profilePhoto || null,
          name: name || null,
          gender: gender || null,
          age: age || null,
          dob: dob || null,
          email: email || null,
          number: number || null,
          address: address || null,
          city: city || null,
          pincode: pincode || null,
          language: language || null,
          bloodgroup: bloodgroup || null,
          existing_id: existing_id || null,
        },
        type: QueryTypes.INSERT,
      }
    );

    const patientId = insertResult;
    const patientCode = `PAT${String(patientId).padStart(5, "0")}`;

    await sequelize.query(
      `UPDATE tele_patient SET patient_code = :code WHERE patient_id = :id`,
      {
        replacements: {
          code: patientCode,
          id: patientId,
        },
        type: QueryTypes.UPDATE,
      }
    );

    console.log("the cid: ", clinic_id);
    if (clinic_id) {
      await sequelize.query(
        `
        INSERT INTO tele_patient_clinic (patient_id, clinic_id)
        VALUES (:patientId, :clinicId)
        `,
        {
          replacements: {
            patientId,
            clinicId: clinic_id,
          },
          type: QueryTypes.INSERT,
        }
      );
    }

    res.status(200).json({
      message: "New patient added successfully",
      data: {
        patient_id: patientId,
        patient_code: patientCode,
      },
    });
  } catch (err) {
    console.error("Error inserting new patient:", err);
    res
      .status(500)
      .json({ message: "Error inserting new patient", error: err.message });
  }
};

const getActivePatients = async (req, res) => {
  try {
    const results = await sequelize.query(
      'SELECT * FROM tele_appointments WHERE status <> "COMPLETED"',
      { type: QueryTypes.SELECT }
    );
    res.json({ data: results });
  } catch (err) {
    console.error("Error fetching active patients:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getPatientList,
  getPatientsByDate,
  searchPatients,
  addNewPatient,
  getActivePatients,
};
