const winston = require('winston');
const { format } = winston;

// Create a custom format that includes timestamp and request ID
const logFormat = format.printf(({ level, message, timestamp, requestId, ...meta }) => {
    const requestInfo = requestId ? `[${requestId}] ` : '';
    const metaInfo = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level.toUpperCase()}: ${requestInfo}${message}${metaInfo}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.errors({ stack: true }),
        format.splat(),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                logFormat
            )
        })
    ]
});

// Add request ID middleware
const addRequestId = (req, res, next) => {
    req.requestId = req.headers['x-request-id'] || Date.now().toString(36) + Math.random().toString(36).substr(2);
    next();
};

module.exports = { logger, addRequestId };