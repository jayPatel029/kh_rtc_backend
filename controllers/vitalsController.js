const { sequelize, pool } = require("../config/database");
const { QueryTypes } = require("sequelize");

// Get vitals by appointment ID
const getVitalsByAppointmentId = async (req, res) => {
  const { appointment_id } = req.params;

  try {
    const results = await sequelize.query(
      "SELECT * FROM tele_appointment_vitals WHERE appointment_id = :appointment_id",
      {
        replacements: { appointment_id },
        type: QueryTypes.SELECT,
      }
    );

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.json({});
    }
  } catch (err) {
    console.error("Error fetching vitals:", err);
    res.status(500).json({ error: "Error fetching data" });
  }
};

// Add or update vitals
const addOrUpdateVitals = async (req, res) => {
  // const { appointment_id } = req.params;
  const {
    appointment_id,
    height,
    heightUnit,
    weight,
    temperature,
    temperatureUnit,
    blood_pressure,
    bloodPressureUnit,
    blood_sugar,
    bloodSugarUnit,
    spO2,
    pulse_rate,
    otherName,
    otherValue,
    patient_id,
  } = req.body;

  try {
    const result = await sequelize.query(
      `Select patient_id from tele_appointments where id = :appointment_id`,
      { replacements: { appointment_id }, type: QueryTypes.SELECT }
    );
    console.log(result);
    if(!result) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const appointmentPatientId = result[0]?.patient_id;
    if (!appointmentPatientId) {
      return res.status(404).json({ error: "Patient not found for the appointment" });
    }
    
    await sequelize.query(
      `
      INSERT INTO tele_appointment_vitals 
      (appointment_id, patient_id, height, heightUnit, weight, temperature, temperatureUnit, blood_pressure, bloodPressureUnit, blood_sugar, bloodSugarUnit, spO2, pulse_rate, other, othervalue)
      VALUES (
        :appointment_id, :patient_id, :height, :heightUnit, :weight, :temperature, :temperatureUnit, 
        :blood_pressure, :bloodPressureUnit, :blood_sugar, :bloodSugarUnit, :spO2, 
        :pulse_rate, :otherName, :otherValue
      )
      ON DUPLICATE KEY UPDATE
      height = VALUES(height),
      heightUnit = VALUES(heightUnit),
      weight = VALUES(weight),
      temperature = VALUES(temperature),
      temperatureUnit = VALUES(temperatureUnit),
      blood_pressure = VALUES(blood_pressure),
      bloodPressureUnit = VALUES(bloodPressureUnit),
      blood_sugar = VALUES(blood_sugar),
      bloodSugarUnit = VALUES(bloodSugarUnit),
      spO2 = VALUES(spO2),
      pulse_rate = VALUES(pulse_rate),
      other = VALUES(other),
      othervalue = VALUES(othervalue),
      patient_id = VALUES(patient_id)
    `,
      {
        replacements: {
          appointment_id,
          patient_id: appointmentPatientId,
          height,
          heightUnit,
          weight,
          temperature,
          temperatureUnit,
          blood_pressure,
          bloodPressureUnit,
          blood_sugar,
          bloodSugarUnit,
          spO2,
          pulse_rate,
          otherName,
          otherValue,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.json({ message: "Vitals saved successfully" });
  } catch (err) {
    console.error("Error saving vitals data:", err);
    res.status(500).json({ error: "Error saving data" });
  }
};

module.exports = {
  getVitalsByAppointmentId,
  addOrUpdateVitals,
};
