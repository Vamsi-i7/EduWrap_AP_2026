function success(res, data, statusCode = 200, message = null) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined && data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function error(res, message, statusCode = 500, details = null) {
  const payload = {
    success: false,
    message: message || 'An error occurred',
  };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  error,
};
