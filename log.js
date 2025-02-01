const {createLogger, format, transports} = require('winston');
const DailyRotateFile  = require('winston-daily-rotate-file');
const {combine, timestamp,printf,colorize} = format;

const logFormat = printf(({level,message,timestamp})=>{
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',

    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new transports.Console(),
        // DailyRotateFile transport for saving logs into daily files
        new DailyRotateFile({
            filename: './logs/combined-%DATE%.log', // Use a rotating filename pattern
            datePattern: 'YYYY-MM-DD', // Daily file rotation
            maxSize: '20m', // Max size for each log file before rotating
            maxFiles: '7d', // Keep logs for only the last 7 days
            zippedArchive: true, // Archive old logs to zip files
            level: 'info' // Minimum log level to be saved in this file
        })
    ],

    exceptionHandlers: [
       new DailyRotateFile({
            filename: './logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            zippedArchive: true,
            level: 'error'
        })
    ]
})

module.exports = logger;