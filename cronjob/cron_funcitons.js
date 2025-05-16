const cron = require('node-cron');
const { updatePastAppointments } = require('../controllers/appointmentController');

// 11.55pm mins hrs
cron.schedule('58 13 * * *', async () => {
    await updatePastAppointments();
});