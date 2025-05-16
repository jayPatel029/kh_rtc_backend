const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectToDatabase } = require('./config/database');
require('dotenv').config(); 
require('./cronjob/cron_funcitons')
const routes = require('./routes');
const { createAllTables } = require('./models/tables');

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
