const schedule = require('node-schedule');
const db = require('../config/database');
const { convertTo24HourDate } = require('./dateUtils');

const checkAppointments = () => {
  const today = new Date().toISOString().split('T')[0];

  db.query('SELECT * FROM appointments WHERE appointment_date = ?', [today], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return;
    }

    // Convert appointment times to comparable format and sort appointments
    const appointments = results.map((appointment) => ({
      ...appointment,
      appointment_date_time: convertTo24HourDate(appointment.appointment_date, appointment.appointment_time),
    })).sort((a, b) => a.appointment_date_time - b.appointment_date_time);
    
    const testDate = new Date('2024-08-05T13:55:00.000Z'); 
    const currentPlus5 = testDate.getTime() + 5 * 60 * 1000;

    // Check for missed appointments and reassign tokens
    appointments.forEach((appointment, index) => {
      if (
        new Date(appointment.appointment_date_time).getTime() === currentPlus5 &&
        appointment.status === 'BOOKED'
      ) {
        // Find the first eligible appointment after the missed one
        const nextEligibleAppointment = appointments.find((apt, idx) =>
          idx > index && apt.status === 'ARRIVED'
        );

        if (nextEligibleAppointment) {
          reassignToken(appointment, nextEligibleAppointment);
        }
      }
    });
  });
};

const reassignToken = (missedAppointment, eligibleAppointment) => {
  // Update the missed appointment's status
  db.query(
    'UPDATE appointments SET status = ? WHERE appointment_id = ?',
    ['MISSED', missedAppointment.appointment_id],
    (err) => {
      if (err) {
        console.error('Error updating missed appointment:', err);
        return;
      }

      // Reassign appointment time for the eligible appointment
      db.query(
        'UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?',
        [missedAppointment.appointment_time, eligibleAppointment.appointment_id],
        (err) => {
          if (err) {
            console.error('Error updating appointment time:', err);
          } else {
            console.log(`Appointment time reassigned to appointment ID ${eligibleAppointment.appointment_id}`);
          }
        }
      );
    }
  );
};

const checkAndReassignAppointments = () => {
  const today = new Date().toISOString().split('T')[0];

  db.query('SELECT * FROM appointments WHERE appointment_date = ? AND status= ?', [today,"ARRIVED"], (err, results) => {
    if (err) {
      console.error('Error fetching appointments:', err);
      return;
    }

    // Convert appointment times to comparable format and sort appointments
    const appointments = results.map((appointment) => ({
      ...appointment,
      appointment_date_time: convertTo24HourDate(appointment.appointment_date, appointment.appointment_time),
    })).sort((a, b) => a.appointment_date_time - b.appointment_date_time);
    
    const allTimeSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
      "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
    ];

    // Check each time slot
    allTimeSlots.forEach(slot => {
      const slotTime = convertTo24HourDate(new Date(), slot);
      const currentDATE = new Date('2024-08-05T14:55:00.000Z'); 
      const currentTime = currentDATE.getTime();
      const slotTimeMinus5Mins = slotTime.getTime() - 5 * 60 * 1000;

      if (currentTime == slotTimeMinus5Mins && currentTime < slotTime.getTime()) {
        // Check if there is any appointment for this slot
        const slotAppointment = appointments.find(appointment => appointment.appointment_time === slot);
        
        if (!slotAppointment) {
          // Find the next earliest appointment to reassign
          const nextAppointment = appointments.find(appointment => new Date(appointment.appointment_date_time).getTime());

          if (nextAppointment) {
            console.log(`Reassigning time slot ${slot} to appointment ID ${nextAppointment.appointment_id}`);
            updateMissedAppointment(slot, nextAppointment);
          }
        }
      }
    });
  });
};

const updateMissedAppointment = (missedAppointmentTime, eligibleAppointment) => {
  // Update the eligible appointment's time to the missed appointment's time
  db.query(
    'UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?',
    [missedAppointmentTime, eligibleAppointment.appointment_id],
    (err) => {
      if (err) {
        console.error('Error updating appointment time:', err);
        return;
      }

      console.log(`Appointment time reassigned to appointment ID ${eligibleAppointment.appointment_id}`);
    }
  );
};

const initializeScheduler = () => {
  // Schedule job to run every 30 seconds
  const rule = new schedule.RecurrenceRule();
  rule.second = new schedule.Range(0, 59, 30);
  schedule.scheduleJob(rule, checkAppointments);

  // Schedule job to run every minute
  const rule1 = new schedule.RecurrenceRule();
  rule1.minute = new schedule.Range(0, 59);
  schedule.scheduleJob(rule1, checkAndReassignAppointments);
};

module.exports = {
  initializeScheduler,
  checkAppointments,
  checkAndReassignAppointments,
  reassignToken,
  updateMissedAppointment
}; 