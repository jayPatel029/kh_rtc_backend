const cron = require('node-cron');
const { sequelize } = require("../config/database");
const { QueryTypes } = require("sequelize");

cron.schedule('55 23 * * *', async () => {
    await updatePastAppointments();
});

cron.schedule('0 6 * * *', async () => {
    await updateDoctorVacationStatus();
});



const updatePastAppointments = async (req, res) => {
  console.log("updating past appointments as 'MISSED'");
  try {
    await sequelize.query(
      `
      UPDATE tele_appointments 
      SET status = 'MISSED' 
      WHERE appointment_date < CURDATE() AND status NOT IN ('COMPLETED', 'MISSED');
    `,
      {
        type: QueryTypes.UPDATE,
      }
    );

    console.log("done!!");
  } catch (err) {
    console.error("Error updating past tele_appointments:", err);
  }
};

const updateDoctorVacationStatus = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await sequelize.query(
      `
      UPDATE tele_doctor 
      SET onVacation = 0,
          vacation_from = NULL,
          vacation_to = NULL,
          updated_at = NOW()
      WHERE onVacation = 1 
      AND vacation_to = :today
      `,
      {
        replacements: { today },
        type: QueryTypes.UPDATE
      }
    );

    console.log(`Updated vacation status for doctors ending vacation on ${today}`);
    return result;
  } catch (error) {
    console.error('Error updating doctor vacation status:', error);
    throw error;
  }
};

module.exports = {
  updateDoctorVacationStatus,
  updatePastAppointments,
};