const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Middleware setup
app.use(cors({
  origin: env.clientOrigin === '*' ? true : [env.clientOrigin, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(requestLogger);
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'eduwrap-backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', routes);

// 404 Handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    status: 404,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
