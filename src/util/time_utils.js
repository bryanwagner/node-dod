const logger = require('./logger.js')
const { performance } = require('perf_hooks')

module.exports = class TimeUtils {
  static run (stats, name, message, func) {
    const start = performance.now()
    const result = func()
    const seconds = (performance.now() - start) * 1e-3
    stats[name] = seconds
    logger.info(`${message}: seconds=${seconds}`)
    return result
  }

  static async runAsync (stats, name, message, asyncFunc) {
    const start = performance.now()
    const result = await asyncFunc()
    const seconds = (performance.now() - start) * 1e-3
    stats[name] = seconds
    logger.info(`${message}: seconds=${seconds}`)
    return result
  }
}
