require('dotenv').config()
const logger = require('./src/util/logger.js')
const TimeUtils = require('./src/util/time_utils.js')
const FileUtils = require('./src/util/file_utils.js')
const OhlcUtils = require('./src/util/ohlc_utils.js')
const ChartUtils = require('./src/util/chart_utils.js')
const Ohlc = require('./src/ohlc.js')
const Server = require('./src/util/server.js')
const fs = require('fs')

process.on('uncaughtException', err => logger.error(`uncaughtException: ${err.message}`))
process.on('unhandledRejection', err => logger.error(`unhandledRejection: ${err.message}`))

/**
 * Performs an Object-Oriented Design vs. Data-Oriented Design benchmark
 * for the problem of calculating financial algorithms on cryptocurrency time-series data.
 * Timings are written to log.
 * When finished, writes sample data for charts and runs an http-server.
 */
;(async () => {
  const stats = {}

  logger.info(`main: CSV_FILENAME=${process.env.CSV_FILENAME}`)
  const lineCount = await TimeUtils.runAsync(
    stats, 'lineCountSeconds', 'main: FileUtils.lineCount',
    () => FileUtils.lineCount(process.env.CSV_FILENAME))
  logger.info(`main: lineCount=${lineCount}`)

  { // benchmark Array-of-Structs
    stats.ohlcs = {}
    const ohlcs = await TimeUtils.runAsync(
      stats.ohlcs, 'parseOhlcsFromCsvSeconds', 'main: OhlcUtils.parseOhlcsFromCsv',
      () => OhlcUtils.parseOhlcsFromCsv(process.env.CSV_FILENAME, lineCount))
    logger.info(`main: ohlcs.length=${ohlcs.length}`)

    const medians = TimeUtils.run(
      stats.ohlcs, 'calculateAllSeconds', 'main: Ohlc.calculateAll',
      () => Ohlc.calculateAll(ohlcs, +process.env.CALC_WINDOW))
    logger.info(`main: ohlc, medians=${JSON.stringify(medians)}`)

    TimeUtils.run(
      stats.ohlcs, 'writeOhlcsSamplesSeconds', 'main: ChartUtils.writeOhlcsSamples',
      () => ChartUtils.writeOhlcsSamples(
        ohlcs, process.env.CSV_FILENAME,
        +process.env.CHART_SAMPLES, +process.env.CHART_TAIL))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlcs-medians.json`, JSON.stringify({
      title: `${process.env.CSV_FILENAME} - OHLCs - Medians`,
      medians: medians
    }))
  }

  { // benchmark Struct-of-Arrays
    stats.ohlcSystem = {}
    const ohlcSystem = await TimeUtils.runAsync(
      stats.ohlcSystem, 'parseOhlcsFromCsvSeconds', 'main: parseOhlcSystemFromCsv',
      () => OhlcUtils.parseOhlcSystemFromCsv(process.env.CSV_FILENAME, lineCount))
    logger.info(`main: ohlcSystem.length=${ohlcSystem.length}`)

    const medians = TimeUtils.run(
      stats.ohlcSystem, 'calculateAllSeconds', 'main: ohlcSystem.calculateAll',
      () => ohlcSystem.calculateAll(+process.env.CALC_WINDOW))
    logger.info(`main: ohlcSystem, medians=${JSON.stringify(medians)}`)

    TimeUtils.run(
      stats.ohlcSystem, 'writeOhlcsSamplesSeconds', 'main: ChartUtils.writeOhlcSystemSamples',
      () => ChartUtils.writeOhlcSystemSamples(
        ohlcSystem, process.env.CSV_FILENAME,
        +process.env.CHART_SAMPLES, +process.env.CHART_TAIL))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlc-system-medians.json`, JSON.stringify({
      title: `${process.env.CSV_FILENAME} - OHLC System - Medians`,
      medians: medians
    }))
  }

  fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/stats.json`, JSON.stringify(stats))
  Server.start()
})()
