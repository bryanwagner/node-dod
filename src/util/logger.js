const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf } = format

const serviceName = 'node-dod'
const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

const logger = createLogger({
  level: 'info',
  format: combine(
    label({ label: serviceName }),
    timestamp(),
    customFormat
  ),
  defaultMeta: { service: serviceName },
  transports: [
    new transports.File({
      filename: `logs/${serviceName}.log`,
      format: customFormat,
      timestamp: true,
      handleExceptions: true
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: customFormat,
    timestamp: true,
    handleExceptions: true
  }))
}

module.exports = logger
