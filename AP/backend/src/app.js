const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Middleware setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(env.clientOrigin ? env.clientOrigin.split(',').map((o) => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin requests where origin is undefined
    if (!origin) return callback(null, true);
    if (
      env.clientOrigin === '*' ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
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

// Serve frontend static assets in production
const fs = require('fs');
const path = require('path');
const candidateDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../../../AP/frontend/dist'),
  path.join(process.cwd(), 'AP/frontend/dist'),
  path.join(process.cwd(), 'dist'),
];
const distPath = candidateDistPaths.find((p) => fs.existsSync(p));

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// Welcome / root status if not serving static frontend
app.get('/', (req, res, next) => {
  if (distPath && fs.existsSync(path.join(distPath, 'index.html'))) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  res.status(200).json({
    service: 'eduwrap-backend',
    status: 'online',
    version: '2.0.0',
    database: 'Neon PostgreSQL (Connected)',
    endpoints: {
      health: '/health',
      status: '/api/status',
    },
  });
});

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
