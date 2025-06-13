const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectToDatabase, sequelize } = require('./config/database');
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
const morgan = require("morgan");
app.use(morgan("combined")); // logs requests
const helmet = require('helmet');
app.use(helmet());

// Mount all routes
app.use('/api', routes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.get('/health', async (req, res) => {
  try {
    let isDbConnected = false;
    try {
      await sequelize.authenticate();
      isDbConnected = true;
    } catch (dbError) {
      isDbConnected = false;
    }

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'connected' : 'disconnected',
        server: 'running'
      },
      metrics: {
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        }
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'error',
        server: 'running'
      }
    });
  }
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
