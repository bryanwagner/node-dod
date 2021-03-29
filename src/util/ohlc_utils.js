const fs = require('fs')
const parse = require('csv-parse')
const { finished } = require('stream/promises')
const AlgUtils = require('./alg_utils.js')
const FileUtils = require('./file_utils.js')
const Ohlc = require('../ohlc.js')
const OhlcSystem = require('../ohlc_system.js')

module.exports = class OhlcUtils {
  static async parseOhlcsFromCsv (csvFilename, capacity = 0) {
    return process.env.USE_OPTIMIZED_CSV_PARSE === 'true'
      ? OhlcUtils.parseOhlcsFromCsvWithCustom(csvFilename, capacity)
      : OhlcUtils.parseOhlcsFromCsvWithLib(csvFilename, capacity)
  }

  static async parseOhlcsFromCsvWithLib (csvFilename, capacity = 0) {
    const ohlcs = new Array(capacity)
    const parser = fs
      .createReadStream(csvFilename)
      .pipe(OhlcUtils.parseAndCastCsvRowWithLib())
      .on('readable', () => {
        let data
        while ((data = parser.read()) !== null) {
          ohlcs.push(new Ohlc(data))
        }
      })
    await finished(parser)
    return ohlcs.filter(e => e).reverse()
  }

  static parseOhlcsFromCsvWithCustom (csvFilename, capacity = 0) {
    const ohlcs = new Array(capacity)
    const appendOhlcFunc = ohlc => {
      ohlcs.push(new Ohlc(ohlc))
    }
    const finishFunc = () => OhlcUtils.finishParseOhlcsFromCsv(ohlcs)
    return OhlcUtils.parseFromCsvWithCustom(csvFilename, appendOhlcFunc, finishFunc)
  }

  static async parseOhlcSystemFromCsv (csvFilename, capacity = 0) {
    const checkedCapacity = capacity === 0 ? await FileUtils.lineCount(csvFilename) : capacity
    return process.env.USE_OPTIMIZED_CSV_PARSE === 'true'
      ? OhlcUtils.parseOhlcSystemFromCsvWithCustom(csvFilename, checkedCapacity)
      : OhlcUtils.parseOhlcSystemFromCsvWithLib(csvFilename, checkedCapacity)
  }

  static async parseOhlcSystemFromCsvWithLib (csvFilename, capacity) {
    const ohlcSystem = new OhlcSystem(capacity)
    const parser = fs
      .createReadStream(csvFilename)
      .pipe(OhlcUtils.parseAndCastCsvRowWithLib())
      .on('readable', () => {
        let data
        while ((data = parser.read()) !== null) {
          const i = ohlcSystem.length
          ohlcSystem.opens[i] = data.open
          ohlcSystem.highs[i] = data.high
          ohlcSystem.lows[i] = data.low
          ohlcSystem.closes[i] = data.close
          ohlcSystem.volumes[i] = data.volume
          ohlcSystem.dates[i] = data.date
          ++ohlcSystem.length
        }
      })
    await finished(parser)
    return OhlcUtils.finishParseOhlcSystemFromCsv(ohlcSystem)
  }

  static parseOhlcSystemFromCsvWithCustom (csvFilename, capacity) {
    const ohlcSystem = new OhlcSystem(capacity)
    const appendOhlcFunc = ohlc => {
      const i = ohlcSystem.length
      ohlcSystem.opens[i] = ohlc.open
      ohlcSystem.highs[i] = ohlc.high
      ohlcSystem.lows[i] = ohlc.low
      ohlcSystem.closes[i] = ohlc.close
      ohlcSystem.volumes[i] = ohlc.volume
      ohlcSystem.dates[i] = ohlc.date
      ++ohlcSystem.length
    }
    const finishFunc = () => OhlcUtils.finishParseOhlcSystemFromCsv(ohlcSystem)
    return OhlcUtils.parseFromCsvWithCustom(csvFilename, appendOhlcFunc, finishFunc)
  }

  static parseFromCsvWithCustom (csvFilename, appendOhlcFunc, finishFunc) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(csvFilename)
      let lineCount = 0; let colIndex = 0
      const csvFromLine = +process.env.CSV_FROM_LINE - 1
      const colText = Buffer.allocUnsafe(+process.env.CSV_COL_BUFFER_SIZE)
      let colTextSize = 0
      const ohlc = { date: '', open: 0.0, high: 0.0, low: 0.0, close: 0.0, volume: 0.0 }
      readStream.on('readable', () => {
        let cursor = 0; let nextCursor = 0
        let buffer
        while ((buffer = readStream.read()) != null) {
          let delimIndex = -1; let lineIndex = -1

          const parseCol = (isLineEnd) => {
            if (lineCount >= csvFromLine) {
              if (isLineEnd && colIndex !== 7) {
                throw new Error(`CSV file is invalid: bad line ${lineCount}: colIndex=${colIndex}`)
              }
              buffer.copy(colText, colTextSize, cursor, nextCursor)
              const str = colText.toString('ascii', 0, colTextSize + (nextCursor - cursor)).trim()
              switch (colIndex++) {
                case 0: break
                case 1: ohlc.date = str.split(' ')[0]; break
                case 2: break
                case 3: ohlc.open = parseFloat(str); break
                case 4: ohlc.high = parseFloat(str); break
                case 5: ohlc.low = parseFloat(str); break
                case 6: ohlc.close = parseFloat(str); break
                case 7:
                  ohlc.volume = parseFloat(str)
                  appendOhlcFunc(ohlc)
                  colIndex = 0
                  break
              }
              colTextSize = 0
            }
            cursor = nextCursor + 1
          }

          // parse rows using `ohlc` as a row builder
          do {
            lineIndex = buffer.indexOf(10, lineIndex + 1)
            do {
              delimIndex = buffer.indexOf(44, delimIndex + 1) // `,` is value 44
              nextCursor = Math.max(0, Math.min(
                lineIndex === -1 ? delimIndex : lineIndex,
                delimIndex === -1 ? lineIndex : delimIndex
              ))

              if (nextCursor === lineIndex) {
                parseCol(true)
                ++lineCount
                lineIndex = buffer.indexOf(10, lineIndex + 1)
                nextCursor = Math.max(0, delimIndex)
              }

              if (nextCursor === delimIndex) {
                parseCol(false)
              }
            } while (delimIndex !== -1)

            nextCursor = Math.max(0, lineIndex)
            if (nextCursor === lineIndex) {
              parseCol(true)
              ++lineCount
            }
          } while (lineIndex !== -1)

          // capture the end of the buffer before wrapping to the next
          buffer.copy(colText, colTextSize, cursor, buffer.length)
          colTextSize = buffer.length - cursor
        }
      })
      readStream.on('end', () => {
        resolve(finishFunc())
      })
      readStream.on('error', reject)
    })
  }

  static parseAndCastCsvRowWithLib () {
    return parse({
      encoding: 'utf8',
      from_line: +process.env.CSV_FROM_LINE,
      delimiter: ',',
      trim: true,
      columns: [null, 'date', null, 'open', 'high', 'low', 'close', 'volume'],
      cast: (value, context) => {
        switch (context.index) {
          case 1: return value.split(' ')[0]
          case 3: case 4: case 5: case 6: case 7: return parseFloat(value)
          default: return value
        }
      }
    })
  }

  static finishParseOhlcsFromCsv (ohlcs) {
    return ohlcs.filter(e => e).reverse()
  }

  static finishParseOhlcSystemFromCsv (ohlcSystem) {
    AlgUtils.reverseMinLength(ohlcSystem.opens, ohlcSystem.length)
    AlgUtils.reverseMinLength(ohlcSystem.highs, ohlcSystem.length)
    AlgUtils.reverseMinLength(ohlcSystem.lows, ohlcSystem.length)
    AlgUtils.reverseMinLength(ohlcSystem.closes, ohlcSystem.length)
    AlgUtils.reverseMinLength(ohlcSystem.volumes, ohlcSystem.length)
    ohlcSystem.dates = ohlcSystem.dates.filter(e => e).reverse()
    return ohlcSystem
  }
}
