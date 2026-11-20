const { ApiError } = require('../utils/errors');
const env = require('../config/env');

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (err instanceof ApiError ? err.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error(`[Error 500] ${req.method} ${req.originalUrl}:`, err);
  }

  const responsePayload = {
    success: false,
    message,
    status: statusCode,
  };

  if (err.details) {
    responsePayload.details = err.details;
  }

  if (env.nodeEnv === 'development' && statusCode >= 500) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};
