const cron = require('node-cron');
const { updatePastAppointments } = require('../controllers/appointmentController');

// 11.55pm mins hrs
cron.schedule('09 11 * * *', async () => {
    await updatePastAppointments();
});