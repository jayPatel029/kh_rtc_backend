const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectToDatabase } = require('./config/database');
require('dotenv').config(); 
require('./cronjob/cron_funcitons')
const routes = require('./routes');
const { createAllTables } = require('./models/tables');
const { createGoogleMeetEvent } = require('./utils/calendarService');
const { google } = require('googleapis');
const open = require('open');

const app = express();
const port = 4000;
// Middleware
app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Mount all routes
app.use('/api', routes);

// app.post('/api/schedule-meeting', async (req, res) => {
//   try {
//     const { doctorEmail, patientEmail, start, end, timeZone, title, description } = req.body;

//     // Build eventData with attendees
//     const eventData = {
//       summary: title,
//       description,
//       start,
//       end,
//       timeZone,
//       attendees: [
//         { email: doctorEmail },
//         { email: patientEmail }
//       ]
//     };

//     const event = await createGoogleMeetEvent(eventData);

//     res.json({
//       message: 'Meeting scheduled successfully!',
//       meetLink: event.conferenceData.entryPoints[0].uri,
//       calendarEventLink: event.htmlLink
//     });
//   } catch (error) {
//     console.error('Error:', error.message);
//     res.status(500).json({ error: 'Failed to schedule meeting.' });
//   }
// });


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
const initializeApp = async () => {
  try {
    await connectToDatabase();
    await createAllTables();
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  initializeApp();
}

module.exports = app;
