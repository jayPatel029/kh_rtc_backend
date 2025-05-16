const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const setupMiddleware = (app) => {
  app.use(cors({
    origin: 'http://localhost:3000'
  }));
  app.use(express.json());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use('/uploads', express.static('uploads'));
};

module.exports = setupMiddleware; 