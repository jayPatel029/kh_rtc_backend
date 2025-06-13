const { QueryTypes } = require("sequelize");
const { sequelize, pool } = require("../config/database");
const e = require("express");

const rearrangeBookingTimes = async (emergencyAppointmentId) => {
  try {
    console.log(
      "Rearranging booking times for emergency appointment:",
      emergencyAppointmentId
    );

    // 1. Get today's appointments
    const fetchAppointmentsQuery = `
      SELECT * FROM tele_appointments 
      WHERE appointment_date = CURDATE() AND status IN ("ARRIVED", "BOOKED")
    `;

    const results = await sequelize.query(fetchAppointmentsQuery, {
      type: QueryTypes.SELECT,
    });
    console.log("Today's appointments fetched:", results.length);

    // const doctor_id = await sequelize.query(`Select doctor_id from tele_appointments where id = ?`, {
    //   replacements: [emergencyAppointmentId],
    //   type: QueryTypes.SELECT,
    // });
    // const allTimeSlots = generateTimeSlots(doctor_id); // Use dynamic slots
    // console.log(" All possible time slots:", allTimeSlots);

    const doctorData = await sequelize.query(
      `SELECT doctor_id FROM tele_appointments WHERE id = :id`,
      {
        replacements: { id: emergencyAppointmentId },
        type: QueryTypes.SELECT,
      }
    );

    if (!doctorData || doctorData.length === 0) {
      throw new Error("Doctor ID not found for emergency appointment.");
    }

    const doctorId = doctorData[0].doctor_id;
    console.log("Doctor ID:", doctorId);

    // Generate time slots (await the result!)
    const allTimeSlots = await generateTimeSlots(doctorId);
    console.log(" All possible time slots:", allTimeSlots);

    const bookedTimes = results.map((r) => r.appointment_time);
    const availableSlots = allTimeSlots.filter(
      (slot) => !bookedTimes.includes(slot)
    );
    console.log("Available slots:", availableSlots);

    if (availableSlots.length === 0) {
      console.warn("No available time slots for emergency appointment.");
      return;
    }

    // 2. Assign emergency appointment to first available slot
    const emergencyTime = availableSlots[0];
    console.log("Assigning emergency appointment to:", emergencyTime);

    await sequelize.query(
      `UPDATE tele_appointments SET appointment_time = :time WHERE id = :id`,
      {
        replacements: { time: emergencyTime, id: emergencyAppointmentId },
        type: QueryTypes.UPDATE,
      }
    );
    console.log("Emergency appointment updated.");

    // 3. Rearrange non-emergency appointments
    const nonEmergencyAppointments = results.filter(
      (app) => app.isEmergency !== 1
    );
    let slotIndex = 1;

    for (const appointment of nonEmergencyAppointments) {
      if (slotIndex >= availableSlots.length) break;

      const newTime = availableSlots[slotIndex];
      console.log(`Reassigning appointment_id ${appointment.id} to ${newTime}`);

      await sequelize.query(
        `UPDATE tele_appointments SET appointment_time = :time WHERE id = :id`,
        {
          replacements: { time: newTime, id: appointment.id },
          type: QueryTypes.UPDATE,
        }
      );

      slotIndex++;
    }

    console.log("All appointments rearranged.");
  } catch (error) {
    console.error("Error in rearrangeBookingTimes:", error);
    throw error;
  }
};

// const generateTimeSlots = async (doctor_id) => {
//   try {
//     console.log("generating time slots:", doctor_id);

//     const result = await sequelize.query(
//       `SELECT opd_timing, slot_duration FROM tele_doctor WHERE id = ?`,
//       {
//         replacements: [doctor_id],
//         type: sequelize.QueryTypes.SELECT,
//       }
//     );

//     console.log("result: ", result);

//     if (!result || result.length === 0) {
//       throw new Error("Doctor not found or missing schedule info!!");
//     }

//     const { opd_timing, slot_duration } = result[0];

//     if (!opd_timing || !slot_duration) {
//       throw new Error("Missing timing or slot duration");
//     }

//     // Parse the JSON opd_timing
//     const opdSchedule = JSON.parse(opd_timing);

//     // Get today's weekday
//     const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
//     const today = weekdays[new Date().getDay()];

//     // Get today's timing
//     const todayTiming = opdSchedule[today];

//     if (!todayTiming) {
//       console.log("Doctor doesn't work on", today);
//       return [];
//     }

//     const [startTime, endTime] = todayTiming.replace(/\s+/g, "").split("-");
//     const timeSlot = parseInt(slot_duration, 10);

//     const [startHour, startMin] = startTime.split(":").map(Number);
//     const [endHour, endMin] = endTime.split(":").map(Number);

//     const slots = [];

//     let current = new Date();
//     current.setHours(startHour, startMin, 0, 0);

//     const end = new Date();
//     end.setHours(endHour, endMin, 0, 0);

//     const format = (date) => date.toTimeString().slice(0, 5);

//     while (current < end) {
//       const slotStart = new Date(current);
//       const slotEnd = new Date(current.getTime() + timeSlot * 60000);

//       if (slotEnd > end) break;

//       slots.push(format(slotStart)); // Push only the start time
//       current = slotEnd;
//     }

//     console.log("time slots for", today, ":", slots);
//     return slots;
//   } catch (err) {
//     console.error("Error generating time slots!!:", err);
//     throw err;
//   }
// };

const generateTimeSlots = async (doctor_id, date = null) => {
  try {
    // Step 1: Get doctor's timing info
    const result = await sequelize.query(
      `SELECT opd_timing, slot_duration FROM tele_doctor WHERE id = ?`,
      {
        replacements: [doctor_id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!result || result.length === 0) {
      throw new Error("Doctor not found or missing schedule info!!");
    }

    const { opd_timing, slot_duration } = result[0];

    if (!opd_timing || !slot_duration) {
      throw new Error("Missing timing or slot duration");
    }

    const opdSchedule = JSON.parse(opd_timing);
    const weekdays = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const targetDate = date ? new Date(date) : new Date();
    const weekdayName = weekdays[targetDate.getDay()];
    const todayTiming = opdSchedule[weekdayName];

    if (!todayTiming) {
      console.log(`Doctor doesn't work on ${weekdayName}`);
      return [];
    }

    const [startTime, endTime] = todayTiming.replace(/\s+/g, "").split("-");
    const timeSlot = parseInt(slot_duration, 10);

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const slots = [];
    const current = new Date(targetDate);
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date(targetDate);
    end.setHours(endHour, endMin, 0, 0);

    const format = (date) => date.toTimeString().slice(0, 5);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + timeSlot * 60000);

      if (slotEnd > end) break;

      slots.push(format(slotStart)); // Push only the start time
      current.setTime(slotEnd.getTime()); // advance to next slot
    }

    // Step 2: Get already booked slots for that date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await sequelize.query(
      `SELECT appointment_time FROM tele_appointments 
       WHERE doctor_id = ? AND appointment_date BETWEEN ? AND ?`,
      {
        replacements: [doctor_id, startOfDay, endOfDay],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const bookedSlots = appointments.map((appt) => {
      const [hh, mm] = appt.appointment_time.split(":");
      return `${hh}:${mm}`;
    });

    // Step 3: Remove past slots only if targetDate is today
    let filteredSlots = slots;
    const isToday = new Date().toDateString() === targetDate.toDateString();
    if (isToday) {
      const now = new Date();
      const nowTime = now.getHours() * 60 + now.getMinutes();

      filteredSlots = slots.filter((slot) => {
        const [hh, mm] = slot.split(":").map(Number);
        const slotTime = hh * 60 + mm;
        return slotTime > nowTime;
      });
    }

    // Step 4: Remove booked slots
    const availableSlots = filteredSlots.filter((slot) => !bookedSlots.includes(slot));

    console.log("Available time slots for", weekdayName, ":", availableSlots);
    return availableSlots;
  } catch (err) {
    console.error("Error generating time slots!!:", err);
    throw err;
  }
};


const rearrangeForNoShow = async (noShowAppointmentId) => {
  try {
    console.log(
      "Rearranging due to no-show for appointment:",
      noShowAppointmentId
    );

    // Fetch no-show appointment details
    const [noShowAppt] = await sequelize.query(
      `SELECT appointment_date, appointment_time FROM tele_appointments WHERE id = ?`,
      { replacements: [noShowAppointmentId], type: QueryTypes.SELECT }
    );

    if (!noShowAppt) {
      console.warn("No-show appointment not found.");
      return;
    }

    const { appointment_date, appointment_time } = noShowAppt;

    // Fetch all appointments on that date ordered by time
    const allAppointments = await sequelize.query(
      `SELECT * FROM tele_appointments WHERE appointment_date = ? AND status IN ('BOOKED', 'ARRIVED') ORDER BY appointment_time ASC`,
      { replacements: [appointment_date], type: QueryTypes.SELECT }
    );

    // Find the position of the no-show appointment in sorted list
    const noShowIndex = allAppointments.findIndex(
      (appt) => appt.id === noShowAppointmentId
    );

    if (noShowIndex === -1) {
      console.warn("No-show appointment not found in today's list.");
      return;
    }

    // The "next" appointment to move up
    const nextAppt = allAppointments[noShowIndex + 1];

    if (!nextAppt) {
      console.log("No next appointment to move up.");
      return;
    }

    // Move next patient to no-show patient's slot
    await sequelize.query(
      `UPDATE tele_appointments SET appointment_time = ? WHERE id = ?`,
      { replacements: [appointment_time, nextAppt.id], type: QueryTypes.UPDATE }
    );
    console.log(`Moved appointment ${nextAppt.id} to slot ${appointment_time}`);

    // Now, shift all subsequent appointments one slot ahead (to keep chain intact)
    for (let i = noShowIndex + 2; i < allAppointments.length; i++) {
      const currentAppt = allAppointments[i];
      const prevAppt = allAppointments[i - 1];

      await sequelize.query(
        `UPDATE tele_appointments SET appointment_time = ? WHERE id = ?`,
        {
          replacements: [prevAppt.appointment_time, currentAppt.id],
          type: QueryTypes.UPDATE,
        }
      );

      console.log(
        `Shifted appointment ${currentAppt.id} to slot ${prevAppt.appointment_time}`
      );
    }

    // Optional: Mark no-show appointment slot as free or cancelled (depending on your logic)
    await sequelize.query(
      `UPDATE tele_appointments SET status = 'MISSED' WHERE id = ?`,
      { replacements: [noShowAppointmentId], type: QueryTypes.UPDATE }
    );
    console.log(`Marked no-show appointment ${noShowAppointmentId} as missed.`);
  } catch (error) {
    console.error("Error rearranging for no-show:", error);
    throw error;
  }
};


module.exports = {
  rearrangeBookingTimes,
  generateTimeSlots,
};
