const { sequelize, pool } = require('../config/database');
const { QueryTypes } = require('sequelize');
const { rearrangeBookingTimes } = require('../utils/appointmentUtils');

const updateAppointment = async (req, res) => {
  const {
    appointment_id,
    appointment_date,
    appointment_time,
    appointment_type,
    services,
    isEmergency = 0
  } = req.body;

  try {
    const [existing] = await sequelize.query(`
      SELECT doctor_id
      FROM tele_appointments
      WHERE id = :appointment_id
    `, {
      replacements: { appointment_id },
      type: QueryTypes.SELECT
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
    const serviceNamesCSV = parsedServices.map(s => s.serviceName).join(",");
    const unitPricesCSV = parsedServices.map(s => s.unitPrice).join(",");
    const discountsCSV = parsedServices.map(s => s.discount).join(",");

    await sequelize.query(`
      UPDATE tele_appointments
      SET
        appointment_date = :appointment_date,
        appointment_time = :appointment_time,
        appointment_type = :appointment_type,
        service = :service,
        unit_price = :unit_price,
        discount = :discount,
        isEmergency = :isEmergency
      WHERE id = :appointment_id
    `, {
      replacements: {
        appointment_date,
        appointment_time,
        appointment_type,
        service: serviceNamesCSV,
        unit_price: unitPricesCSV,
        discount: discountsCSV,
        isEmergency,
        appointment_id
      },
      type: QueryTypes.UPDATE
    });

    console.log("recalc token:", existing.doctor_id, appointment_date);
    await recalculateTokens(existing.doctor_id, appointment_date);

    res.status(200).json({ message: 'Appointment updated successfully' });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Error updating appointment.' });
  }
};

const deleteAppointment = async (req, res) => {
  const { appointment_id } = req.params;

  try {
    // Get doctor_id and date before deletion to recalculate tokens
    const [appointment] = await sequelize.query(`
      SELECT doctor_id, appointment_date
      FROM tele_appointments
      WHERE id = :appointment_id
    `, {
      replacements: { appointment_id },
      type: QueryTypes.SELECT
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await sequelize.query(`
      DELETE FROM tele_appointments
      WHERE id = :appointment_id
    `, {
      replacements: { appointment_id },
      type: QueryTypes.DELETE
    });

    await recalculateTokens(appointment.doctor_id, appointment.appointment_date);

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Error deleting appointment.' });
  }
};


const getTotalAppointments = async (req, res) => {
  const { doctor_id, date } = req.query;

  if (!doctor_id) {
    return res.status(400).json({ error: 'doctor_id is required' });
  }

  try {
    let query = 'SELECT COUNT(*) as count FROM tele_appointments WHERE doctor_id = :doctor_id';
    const replacements = { doctor_id };

    if (date) {
      query += ' AND DATE(appointment_date) = :date';
      replacements.date = date;
    }

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching total appointments:', err);
    res.status(500).json({ error: 'An error occurred while fetching total appointments.' });
  }
};

const getTodaysAppointmentsByDoctor = async (req, res) => {
  const { doctor_id } = req.query;

  if (!doctor_id) {
    return res.status(400).json({ error: 'doctor_id is required' });
  }

  try {
    const appointments = await sequelize.query(`
      SELECT 
        p.patient_code,
        p.name AS patient_name,
        p.age,
        p.gender,
        p.phone_no,
        a.appointment_type,
        a.appointment_time,
        a.payment_action,
        a.status AS appointment_status,
        a.appointment_date
      FROM tele_appointments a
      JOIN tele_patient p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = :doctor_id
        AND a.appointment_date = CURDATE()
      ORDER BY a.appointment_time ASC
    `, {
      replacements: { doctor_id },
      type: QueryTypes.SELECT
    });

    res.status(200).json({ todaysAppointments: appointments });
  } catch (err) {
    console.error('Error fetching today\'s appointments for doctor:', err);
    res.status(500).json({ error: 'Failed to fetch today\'s appointments.' });
  }
};


const fetchAllConsultations = async (req, res) => {
  const { doctor_id } = req.query;

  if (!doctor_id) {
    return res.status(400).json({ error: 'doctor_id is required' });
  }

  try {
    const appointments = await sequelize.query(`
      SELECT 
        a.id,
        a.token_id,
        p.patient_id,
        p.patient_code,
        p.name AS patient_name,
        p.age,
        p.gender,
        a.appointment_type,
        a.service,
        a.appointment_time
      FROM tele_appointments a
      JOIN tele_patient p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = :doctor_id
        AND a.appointment_date = CURDATE()
      ORDER BY a.appointment_time ASC
    `, {
      replacements: { doctor_id },
      type: QueryTypes.SELECT
    });

    // Fetch most recent past visit per patient
    const consultations = await Promise.all(appointments.map(async (appt, index) => {
      const [pastVisit] = await sequelize.query(`
        SELECT appointment_date
        FROM tele_appointments
        WHERE patient_id = :patient_id
          AND appointment_date < CURDATE()
        ORDER BY appointment_date DESC, appointment_time DESC
        LIMIT 1
      `, {
        replacements: { patient_id: appt.patient_id },
        type: QueryTypes.SELECT
      });

      return {
        queue: index + 1,
        patient_code: appt.patient_code,
        token_id: appt.token_id,
        patient_name: appt.patient_name,
        age: appt.age,
        gender: appt.gender,
        past_visit_date: pastVisit ? pastVisit.appointment_date : null,
        appointment_type: appt.appointment_type,
        service: appt.service
      };
    }));

    res.status(200).json({ consultations });
  } catch (err) {
    console.error('Error fetching consultations:', err);
    res.status(500).json({ error: 'Failed to fetch consultations.' });
  }
};



const markAsEmergency = async (req, res) => {
  const appointmentId = req.params.appointment_id;

  try {
    await sequelize.query(`
      UPDATE tele_appointments 
      SET 
        isemergency = 1,
        updated_at = NOW()
      WHERE appointment_id = :appointmentId
    `, {
      replacements: { appointmentId },
      type: QueryTypes.UPDATE
    });

    await rearrangeBookingTimes(appointmentId);
    res.json({ message: 'Appointment marked as emergency and times rearranged successfully' });
  } catch (err) {
    console.error('Error marking appointment as emergency:', err);
    res.status(500).json({ error: 'An error occurred while updating the appointment for emergency.' });
  }
};

const getPendingAppointments = async (req, res) => {
  const { date } = req.query;
  try {
    let query = "SELECT COUNT(*) as count FROM tele_appointments WHERE status IN ('ARRIVED','BOOKED')";
    let replacements = {};
    
    if (date) {
      query += ' AND DATE(appointment_date) = :date';
      replacements.date = date;
    }

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });
    
    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching pending appointments:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
};

const getCompletedAppointments = async (req, res) => {
  const { date } = req.query;
  try {
    let query = "SELECT COUNT(*) as count FROM tele_appointments WHERE status = 'COMPLETED'";
    let replacements = {};
    
    if (date) {
      query += ' AND DATE(appointment_date) = :date';
      replacements.date = date;
    }

    const results = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });
    
    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching completed appointments:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
};

const generateTokenId = async (doctor_id, appointment_date, appointment_time) => {
  const [appointments] = await sequelize.query(`
    SELECT COUNT(*) as count
    FROM tele_appointments
    WHERE doctor_id = :doctor_id
      AND appointment_date = :appointment_date
      AND appointment_time = :appointment_time
  `, {
    replacements: { doctor_id, appointment_date, appointment_time },
    type: QueryTypes.SELECT
  });

  // if multiple appointments inc count
  return `${appointment_time.replace(":", "")}-${appointments.count + 1}`;
};



const addAppointment = async (req, res) => {
  const {
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    appointment_type,
    services,
    isEmergency = 0
  } = req.body;

  //todo keep this slot intervels based on the docs slot_time and opd timinig
  // Validate time
  const validTimes = [
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  if (!validTimes.includes(appointment_time)) {
    return res.status(400).json({
      error: "Invalid time. Must be between 09:00 and 20:00 (HH:mm)."
    });
  }

  // Parse services
  const parsedServices = typeof services === 'string' ? JSON.parse(services) : services;
  const serviceNamesCSV = parsedServices.map(s => s.serviceName).join(",");
  const unitPricesCSV = parsedServices.map(s => s.unitPrice).join(",");
  const discountsCSV = parsedServices.map(s => s.discount).join(",");

  try {
    const token_id = await generateTokenId(doctor_id, appointment_date, appointment_time);

    const result = await sequelize.query(`
      INSERT INTO tele_appointments (
        patient_id, doctor_id, appointment_date, appointment_time,
        appointment_type, service, unit_price, discount,
        status, token_id, payment_action, isEmergency
      ) VALUES (
        :patient_id, :doctor_id, :appointment_date, :appointment_time,
        :appointment_type, :service, :unit_price, :discount,
        'BOOKED', :token_id, 'PENDING', :isEmergency
      )
    `, {
      replacements: {
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        appointment_type,
        service: serviceNamesCSV,
        unit_price: unitPricesCSV,
        discount: discountsCSV,
        token_id,
        isEmergency
      },
      type: QueryTypes.INSERT
    });

    res.status(201).json({
      message: 'Appointment added successfully',
      appointment_id: result[0],
      token_id
    });
  } catch (err) {
    console.error('Error adding appointment:', err);
    res.status(500).json({ error: 'Error while adding appointment.' });
  }
};


const recalculateTokens = async (doctor_id, appointment_date) => {
  const appointments = await sequelize.query(`
    SELECT id, appointment_time
    FROM tele_appointments
    WHERE doctor_id = :doctor_id AND appointment_date = :appointment_date
    ORDER BY appointment_time ASC, id ASC
  `, {
    replacements: { doctor_id, appointment_date },
    type: QueryTypes.SELECT
  });

  const timeMap = {};
  console.log("appts are", appointments);
  for (const appt of appointments) {
    const time = appt.appointment_time.slice(0, 5); // format HH:mm
    timeMap[time] = (timeMap[time] || 0) + 1;
    const token = `${time.replace(":", "")}-${timeMap[time]}`;

    await sequelize.query(`
      UPDATE tele_appointments
      SET token_id = :token
      WHERE id = :id
    `, {
      replacements: { token, id: appt.id },
      type: QueryTypes.UPDATE
    });
  }
};


const getBookedTimes = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const results = await sequelize.query(
      'SELECT appointment_time FROM tele_appointments WHERE appointment_date = :date',
      {
        replacements: { date },
        type: QueryTypes.SELECT
      }
    );

    const bookedTimes = results.map(result => result.appointment_time);
    res.json({ bookedTimes });
  } catch (err) {
    console.error('Error fetching booked times:', err);
    res.status(500).json({ error: err.message });
  }
};

const updateStatus = async (req, res) => {
  let { appointment_id, status, token_id } = req.body;

  try {
    const appointment = await sequelize.query(
      'SELECT * FROM tele_appointments WHERE appointment_id = :appointment_id AND payment_action = "Paid"',
      {
        replacements: { appointment_id },
        type: QueryTypes.SELECT
      }
    );

    if (token_id === "ARRIVED") {
      const maxToken = await sequelize.query(
        'SELECT MAX(token_id) as maxToken FROM tele_appointments WHERE appointment_date = :date',
        {
          replacements: { date: new Date().toISOString().split('T')[0] },
          type: QueryTypes.SELECT
        }
      );
      token_id = (maxToken[0].maxToken || 0) + 1;
    }

    await sequelize.query(
      'UPDATE tele_appointments SET status = :status, token_id = :token_id WHERE appointment_id = :appointment_id AND payment_action = "Paid"',
      {
        replacements: { status, token_id: token_id || null, appointment_id },
        type: QueryTypes.UPDATE
      }
    );

    res.status(200).json({ message: 'Status updated successfully.' });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'An error occurred while updating the status.' });
  }
};

const updatePaymentStatus = async (req, res) => {
  const { appointment_id, payment_action } = req.body;

  try {
    const appointment = await sequelize.query(
      'SELECT isemergency FROM tele_appointments WHERE appointment_id = :appointment_id',
      {
        replacements: { appointment_id },
        type: QueryTypes.SELECT
      }
    );

    if (appointment.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    await sequelize.query(
      'UPDATE tele_appointments SET payment_action = :payment_action WHERE appointment_id = :appointment_id',
      {
        replacements: { payment_action, appointment_id },
        type: QueryTypes.UPDATE
      }
    );

    if (appointment[0].isemergency === 1) {
      await rearrangeBookingTimes(appointment_id);
      return res.status(200).json({ message: 'Payment status updated and booking times rearranged successfully.' });
    }

    res.status(200).json({ message: 'Payment status updated successfully.' });
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: 'An error occurred while updating the payment status.' });
  }
};

const updatePastAppointments = async (req, res) => {
  console.log("updating past appointments as 'MISSED'");
  try {
    await sequelize.query(`
      UPDATE tele_appointments 
      SET status = 'MISSED' 
      WHERE appointment_date < CURDATE() AND status = 'BOOKED'
    `, {
      type: QueryTypes.UPDATE
    });

    console.log("done!!");
    // res.status(200).json({ message: 'Past appointments updated as MISSED.' });
  } catch (err) {
    console.error('Error updating past tele_appointments:', err);
    // res.status(500).json({ error: 'An error occurred while updating past appointments.' });
  }
};

const getPastAppointmentsByPatient = async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id is required' });
  }

  try {
    const appointments = await sequelize.query(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.service, a.status,
             d.doctor AS doctor_name
      FROM tele_appointments a
      JOIN tele_doctor d ON a.doctor_id = d.id
      WHERE a.patient_id = :patient_id
        AND a.appointment_date < CURDATE()
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, {
      replacements: { patient_id },
      type: QueryTypes.SELECT
    });

    res.status(200).json({ pastAppointments: appointments });
  } catch (err) {
    console.error('Error fetching past appointments for patient:', err);
    res.status(500).json({ error: 'Failed to fetch past patient appointments.' });
  }
};


const getPastAppointmentsByDoctor = async (req, res) => {
  const { doctor_id } = req.query;

  if (!doctor_id) {
    return res.status(400).json({ error: 'doctor_id is required' });
  }

  try {
    const appointments = await sequelize.query(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.service, a.status,
             p.name AS patient_name
      FROM tele_appointments a
      JOIN tele_patient p ON a.patient_id = p.patient_id
      WHERE a.doctor_id = :doctor_id
        AND a.appointment_date < CURDATE()
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, {
      replacements: { doctor_id },
      type: QueryTypes.SELECT
    });

    res.status(200).json({ pastAppointments: appointments });
  } catch (err) {
    console.error('Error fetching past appointments for doctor:', err);
    res.status(500).json({ error: 'Failed to fetch past doctor appointments.' });
  }
};



module.exports = {
  updateAppointment,
  getTotalAppointments,
  markAsEmergency,
  getPendingAppointments,
  getCompletedAppointments,
  addAppointment,
  getBookedTimes,
  updateStatus,
  updatePaymentStatus,
  updatePastAppointments,
  deleteAppointment,
  getPastAppointmentsByDoctor,
  getPastAppointmentsByPatient,
  getTodaysAppointmentsByDoctor,
  fetchAllConsultations
};
