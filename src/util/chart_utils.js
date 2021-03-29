const AlgUtils = require('./alg_utils.js')
const fs = require('fs')

module.exports = class ChartUtils {
  static writeOhlcsSamples (ohlcs, title, samples, tail = 0) {
    const sampleArray = AlgUtils.sampleArray(ohlcs, samples, tail)
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlcs-hl2.json`, JSON.stringify({
      title: `${title} - OHLCs - HL/2`,
      dates: sampleArray.map(ohlc => ohlc.date),
      closes: sampleArray.map(ohlc => ohlc.close),
      hl2s: sampleArray.map(ohlc => ohlc.hl2),
      hl2Averages: sampleArray.map(ohlc => ohlc.hl2Average),
      hl2StdevUppers: sampleArray.map(ohlc => ohlc.hl2StdevUpper),
      hl2StdevLowers: sampleArray.map(ohlc => ohlc.hl2StdevLower)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlcs-hlc3.json`, JSON.stringify({
      title: `${title} - OHLCs - HLC/3`,
      dates: sampleArray.map(ohlc => ohlc.date),
      closes: sampleArray.map(ohlc => ohlc.close),
      hlc3s: sampleArray.map(ohlc => ohlc.hlc3),
      hlc3Averages: sampleArray.map(ohlc => ohlc.hlc3Average),
      hlc3StdevUppers: sampleArray.map(ohlc => ohlc.hlc3StdevUpper),
      hlc3StdevLowers: sampleArray.map(ohlc => ohlc.hlc3StdevLower)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlcs-ohlc4.json`, JSON.stringify({
      title: `${title} - OHLCs - OHLC/4`,
      dates: sampleArray.map(ohlc => ohlc.date),
      closes: sampleArray.map(ohlc => ohlc.close),
      ohlc4s: sampleArray.map(ohlc => ohlc.ohlc4),
      ohlc4Averages: sampleArray.map(ohlc => ohlc.ohlc4Average),
      ohlc4StdevUppers: sampleArray.map(ohlc => ohlc.ohlc4StdevUpper),
      ohlc4StdevLowers: sampleArray.map(ohlc => ohlc.ohlc4StdevLower)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlcs-osc.json`, JSON.stringify({
      title: `${title} - OHLCs - Oscillators`,
      dates: sampleArray.map(ohlc => ohlc.date),
      rsis: sampleArray.map(ohlc => ohlc.rsi),
      stochastics: sampleArray.map(ohlc => ohlc.stochastic),
      mfis: sampleArray.map(ohlc => ohlc.mfi)
    }))
  }

  static writeOhlcSystemSamples (ohlcSystem, title, samples, tail = 0) {
    const dates = AlgUtils.sampleArray(ohlcSystem.dates, samples, tail)
    const closes = AlgUtils.sampleFloat64Array(ohlcSystem.closes, ohlcSystem.length, samples, tail)
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlc-system-hl2.json`, JSON.stringify({
      title: `${title} - OHLC System - HL/2`,
      dates: dates,
      closes: closes,
      hl2s: AlgUtils.sampleFloat64Array(ohlcSystem.hl2s, samples, tail),
      hl2Averages: AlgUtils.sampleFloat64Array(ohlcSystem.hl2Averages, ohlcSystem.length, samples, tail),
      hl2StdevUppers: AlgUtils.sampleFloat64Array(ohlcSystem.hl2StdevUppers, ohlcSystem.length, samples, tail),
      hl2StdevLowers: AlgUtils.sampleFloat64Array(ohlcSystem.hl2StdevLowers, ohlcSystem.length, samples, tail)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlc-system-hlc3.json`, JSON.stringify({
      title: `${title} - OHLC System - HLC/3`,
      dates: dates,
      closes: closes,
      hlc3s: AlgUtils.sampleFloat64Array(ohlcSystem.hlc3s, ohlcSystem.length, samples, tail),
      hlc3Averages: AlgUtils.sampleFloat64Array(ohlcSystem.hlc3Averages, ohlcSystem.length, samples, tail),
      hlc3StdevUppers: AlgUtils.sampleFloat64Array(ohlcSystem.hlc3StdevUppers, ohlcSystem.length, samples, tail),
      hlc3StdevLowers: AlgUtils.sampleFloat64Array(ohlcSystem.hlc3StdevLowers, ohlcSystem.length, samples, tail)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlc-system-ohlc4.json`, JSON.stringify({
      title: `${title} - OHLC System - OHLC/4`,
      dates: dates,
      closes: closes,
      ohlc4s: AlgUtils.sampleFloat64Array(ohlcSystem.ohlc4s, ohlcSystem.length, samples, tail),
      ohlc4Averages: AlgUtils.sampleFloat64Array(ohlcSystem.ohlc4Averages, ohlcSystem.length, samples, tail),
      ohlc4StdevUppers: AlgUtils.sampleFloat64Array(ohlcSystem.ohlc4StdevUppers, ohlcSystem.length, samples, tail),
      ohlc4StdevLowers: AlgUtils.sampleFloat64Array(ohlcSystem.ohlc4StdevLowers, ohlcSystem.length, samples, tail)
    }))
    fs.writeFileSync(`${process.env.SERVER_PUBLIC_DIR}/data/ohlc-system-osc.json`, JSON.stringify({
      title: `${title} - OHLC System - Oscillators`,
      dates: dates,
      rsis: AlgUtils.sampleFloat64Array(ohlcSystem.rsis, ohlcSystem.length, samples, tail),
      stochastics: AlgUtils.sampleFloat64Array(ohlcSystem.stochastics, ohlcSystem.length, samples, tail),
      mfis: AlgUtils.sampleFloat64Array(ohlcSystem.mfis, ohlcSystem.length, samples, tail)
    }))
  }
}
