const logger = require('../logger');

// Centralized error handler middleware
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ';

  if (status >= 500) {
    logger.error(`${req.method} ${req.path} → ${status}`, {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      user: req.user?.id,
    });
  } else {
    logger.warn(`${req.method} ${req.path} → ${status}: ${message}`, {
      ip: req.ip,
      user: req.user?.id,
    });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// Wrap async route handlers to forward errors automatically
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 404 handler — must be registered after all routes
function notFound(req, res) {
  res.status(404).json({ error: `Route không tồn tại: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, asyncHandler, notFound };
