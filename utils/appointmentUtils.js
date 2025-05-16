const { QueryTypes } = require('sequelize');
const { sequelize, pool } = require('../config/database');
const e = require('express');

// const rearrangeBookingTimes = (emergencyAppointmentId) => {
//   return new Promise((resolve, reject) => {
//     const fetchAppointmentsQuery = `SELECT * FROM appointments WHERE appointment_date = CURDATE() AND status IN ("ARRIVED", "BOOKED")`;

//     db.query(fetchAppointmentsQuery, (err, results) => {
//       if (err) {
//         return reject('Error fetching appointments:', err);
//       }

//       const allTimeSlots = [
//         "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
//         "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
//       ];

//       // Sort the results manually by appointment_time using allTimeSlots array
//       results.sort((a, b) => {
//         return allTimeSlots.indexOf(a.appointment_time) - allTimeSlots.indexOf(b.appointment_time);
//       });

//       const emergencyAppointments = results.filter(appointment => appointment.isemergency === 1);
//       const nonEmergencyAppointments = results.filter(appointment => appointment.isemergency !== 1);

//       if (emergencyAppointments.length === 0) {
//         return resolve();
//       }

//       const currentTime = new Date(2024, 7, 19, 11, 30, 0);

//       const parseTime = (timeString) => {
//         const [time, modifier] = timeString.split(' ');
//         let [hours, minutes] = time.split(':');
//         hours = parseInt(hours, 10);
//         minutes = parseInt(minutes, 10);
    
//         if (modifier === 'PM' && hours !== 12) {
//           hours += 12;
//         } else if (modifier === 'AM' && hours === 12) {
//           hours = 0;
//         }
    
//         const now = new Date();
//         const appointmentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
//         return appointmentTime;
//       };

//       const upcomingAppointments = nonEmergencyAppointments.filter(appointment => {
//         const appointmentTime = parseTime(appointment.appointment_time);
//         return appointmentTime > currentTime;
//       });

//       let earliestArrivedAppointment = upcomingAppointments.find(appointment => 
//         appointment.status === 'ARRIVED' || appointment.status === 'BOOKED'
//       );

//       if (!earliestArrivedAppointment) {
//         return resolve();
//       }

//       const earliestTime = earliestArrivedAppointment.appointment_time;

//       const updateEmergencyAppointmentQuery = `UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?`;

//       db.query(updateEmergencyAppointmentQuery, [earliestTime, emergencyAppointmentId], async (err) => {
//         if (err) {
//           return reject('Error updating emergency appointment time:', err);
//         }

//         let timeSlotIndex = allTimeSlots.indexOf(earliestTime) + 1;

//         for (const appointment of nonEmergencyAppointments) {
//           if (appointment.isemergency === 1) continue;
//           const newTimeSlot = allTimeSlots[timeSlotIndex];
//           const updateNonEmergencyAppointmentQuery = `UPDATE appointments SET appointment_time = ? WHERE appointment_id = ?`;

//           try {
//             await new Promise((resolve, reject) => {
//               db.query(updateNonEmergencyAppointmentQuery, [newTimeSlot, appointment.appointment_id], (err) => {
//                 if (err) {
//                   return reject('Error updating non-emergency appointment time:', err);
//                 }
//                 timeSlotIndex++;
//                 resolve();
//               });
//             });
//           } catch (error) {
//             return reject(error);
//           }
//         }

//         resolve();
//       });
//     });
//   });
// };


const generateTimeSlots = async (doctor_id) => {
  try {
    console.log("generating time slots:", doctor_id);

    const result = await sequelize.query(
      `SELECT opd_timing, slot_duration FROM tele_doctor WHERE id = ?`,
      {
        replacements: [doctor_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    console.log("result: ", result);

    if (!result || result.length === 0) {
      throw new Error("Doctor not found or missing schedule info!!");
    }

    const { opd_timing, slot_duration } = result[0];

    if (!opd_timing || !slot_duration) {
      throw new Error("Missing timing or slot duration");
    }

    const [startTime, endTime] = opd_timing.replace(/\s+/g, '').split('-');
    const timeSlot = parseInt(slot_duration, 10);

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const slots = [];

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + timeSlot * 60000);

      if (slotEnd > end) break;

      const format = (date) => date.toTimeString().slice(0, 5);

      slots.push(`${format(slotStart)} - ${format(slotEnd)}`);
      current = slotEnd;
    }

    console.log("time slots:", slots);
    return slots;
  } catch (err) {
    console.error("Error generating time slots!!:", err);
    throw err;
  }
};

module.exports = {
  // rearrangeBookingTimes
  generateTimeSlots
};
