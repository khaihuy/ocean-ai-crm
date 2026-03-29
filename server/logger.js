const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, colorize, printf, json, errors } = format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(__dirname, '..', 'logs');
  logger.add(new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
  logger.add(new transports.File({ filename: path.join(logsDir, 'combined.log') }));
}

module.exports = logger;
