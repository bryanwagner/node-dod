/**
 * Model encapsulating OHLC (Open, High, Low, Close) values used in financial markets such as Stock Markets and Cryptocurrency exchanges.
 * This model demonstrates the Array-of-Structs memory arrangement: https://en.wikipedia.org/wiki/AoS_and_SoA
 * Note that in typical Object-Oriented Design, the fields would likely have more encapsulation,
 * but to demonstrate performance differences with Data-Oriented Design and Struct-of-Arrays,
 * we keep the model flat so it has the least indirection and best chance to compete.
 * Several calculations range across a window of n-periods.
 */
module.exports = class Ohlc {
  constructor ({ date, open, high, low, close, volume } = {}) {
    this.date = date
    this.open = open
    this.high = high
    this.low = low
    this.close = close
    this.volume = volume

    this.hl2 = 0.0 // High-Low Midpoint
    this.hl2Average = 0.0
    this.hl2StdevUpper = 0.0 // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.hl2StdevLower = 0.0

    this.hlc3 = 0.0 // Typical Price: https://en.wikipedia.org/wiki/Typical_price
    this.hlc3Average = 0.0
    this.hlc3StdevUpper = 0.0 // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.hlc3StdevLower = 0.0

    this.ohlc4 = 0.0 // Average of OHLC values
    this.ohlc4Average = 0.0
    this.ohlc4StdevUpper = 0.0 // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.ohlc4StdevLower = 0.0

    this.rsi = 0.0 // Relative Strength Index: https://en.wikipedia.org/wiki/Relative_strength_index
    this.stochastic = 0.0 // Fast Stochastic: https://en.wikipedia.org/wiki/Stochastic_oscillator
    this.mfi = 0.0 // Money Flow Index: https://en.wikipedia.org/wiki/Money_flow_index
  }

  /**
   * Calculate each Ohlc value in the given array.
   * @param ohlcs array of Ohlc values to calculate
   * @param window the number of periods for window-based calculations
   * @returns object containing the calculated medians
   */
  static calculateAll (ohlcs, window) {
    for (let startIndex = -(window - 1), targetIndex = 0, length = ohlcs.length; targetIndex < length; ++startIndex, ++targetIndex) {
      const clampedStartIndex = Math.max(0, startIndex)
      ohlcs[targetIndex].calculatehl2()
      Ohlc.calculatehl2Bands(ohlcs, clampedStartIndex, targetIndex)
      ohlcs[targetIndex].calculateHlc3()
      Ohlc.calculateHlc3Bands(ohlcs, clampedStartIndex, targetIndex)
      ohlcs[targetIndex].calculateohlc4()
      Ohlc.calculateohlc4Bands(ohlcs, clampedStartIndex, targetIndex)
      Ohlc.calculateRsis(ohlcs, clampedStartIndex, targetIndex)
      Ohlc.calculateStochastics(ohlcs, clampedStartIndex, targetIndex)
      Ohlc.calculateMfis(ohlcs, clampedStartIndex, targetIndex)
    }
    return {
      close: Ohlc.medianClose(ohlcs),
      volume: Ohlc.medianVolume(ohlcs),
      hlc3: Ohlc.medianHlc3(ohlcs),
      rsi: Ohlc.medianRsi(ohlcs),
      stochastic: Ohlc.medianStochastic(ohlcs),
      mfi: Ohlc.medianMfi(ohlcs)
    }
  }

  calculatehl2 () {
    this.hl2 = (this.high + this.low) / 2.0
  }

  calculateHlc3 () {
    this.hlc3 = (this.high + this.low + this.close) / 3.0
  }

  calculateohlc4 () {
    this.ohlc4 = (this.open + this.high + this.low + this.close) / 4.0
  }

  static calculatehl2Bands (ohlcs, startIndex, targetIndex) {
    // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
    let average = 0.0
    let averageSq = 0.0
    let count = 0
    for (let i = startIndex; i <= targetIndex; ++i) {
      const value = ohlcs[i].hl2
      const delta = value - average
      average += delta / ++count
      averageSq += delta * (value - average)
    }
    const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
    const stdev = Math.sqrt(variance)
    const ohlc = ohlcs[targetIndex]
    ohlc.hl2Average = average
    ohlc.hl2StdevUpper = average + 2.0 * stdev
    ohlc.hl2StdevLower = average - 2.0 * stdev
  }

  static calculateHlc3Bands (ohlcs, startIndex, targetIndex) {
    // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
    let average = 0.0
    let averageSq = 0.0
    let count = 0
    for (let i = startIndex; i <= targetIndex; ++i) {
      const value = ohlcs[i].hlc3
      const delta = value - average
      average += delta / ++count
      averageSq += delta * (value - average)
    }
    const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
    const stdev = Math.sqrt(variance)
    const ohlc = ohlcs[targetIndex]
    ohlc.hlc3Average = average
    ohlc.hlc3StdevUpper = average + 2.0 * stdev
    ohlc.hlc3StdevLower = average - 2.0 * stdev
  }

  static calculateohlc4Bands (ohlcs, startIndex, targetIndex) {
    // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
    let average = 0.0
    let averageSq = 0.0
    let count = 0
    for (let i = startIndex; i <= targetIndex; ++i) {
      const value = ohlcs[i].ohlc4
      const delta = value - average
      average += delta / ++count
      averageSq += delta * (value - average)
    }
    const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
    const stdev = Math.sqrt(variance)
    const ohlc = ohlcs[targetIndex]
    ohlc.ohlc4Average = average
    ohlc.ohlc4StdevUpper = average + 2.0 * stdev
    ohlc.ohlc4StdevLower = average - 2.0 * stdev
  }

  static calculateRsis (ohlcs, startIndex, targetIndex) {
    const periods = targetIndex - startIndex + 1
    let upEma = 0.0; let downEma = 0.0
    for (let i = startIndex + 1; i <= targetIndex; ++i) {
      const delta = ohlcs[i].close - ohlcs[i - 1].close
      let up = 0.0; let down = 0.0
      if (delta > 1e-5) {
        up = delta
      } else if (delta < 1e-5) {
        down = -delta
      }
      upEma = (upEma * (periods - 1) + up) / periods
      downEma = (downEma * (periods - 1) + down) / periods
    }
    const rs = downEma === 0.0 ? 0.0 : (upEma / downEma)
    ohlcs[targetIndex].rsi = 100.0 - (100.0 / (1.0 + rs))
  }

  static calculateStochastics (ohlcs, startIndex, targetIndex) {
    let high = ohlcs[targetIndex].high
    let low = ohlcs[targetIndex].low
    for (let i = startIndex; i < targetIndex; ++i) {
      high = Math.max(high, ohlcs[i].high)
      low = Math.min(low, ohlcs[i].low)
    }
    ohlcs[targetIndex].stochastic = high === low ? 0.0 : (100.0 * ((ohlcs[targetIndex].close - low) / (high - low)))
  }

  static calculateMfis (ohlcs, startIndex, targetIndex) {
    let positive = 0.0; let negative = 0.0
    for (let i = startIndex + 1; i <= targetIndex; ++i) {
      const currentMoneyFlow = ohlcs[i].hlc3 * ohlcs[i].volume
      const prevMoneyFlow = ohlcs[i - 1].hlc3 * ohlcs[i - 1].volume
      const delta = currentMoneyFlow - prevMoneyFlow
      if (delta > 1e-5) {
        positive += currentMoneyFlow
      } else if (delta < 1e-5) {
        negative += currentMoneyFlow
      }
    }
    const moneyFlow = negative === 0.0 ? 0.0 : (positive / negative)
    ohlcs[targetIndex].mfi = 100.0 - (100.0 / (1.0 + moneyFlow))
  }

  static medianClose (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.close - b.close)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].close
  }

  static medianVolume (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.volume - b.volume)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].volume
  }

  static medianHlc3 (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.hlc3 - b.hlc3)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].hlc3
  }

  static medianRsi (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.rsi - b.rsi)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].rsi
  }

  static medianStochastic (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.stochastic - b.stochastic)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].stochastic
  }

  static medianMfi (ohlcs) {
    const shallowCopy = Array.from(ohlcs)
    shallowCopy.sort((a, b) => a.mfi - b.mfi)
    return shallowCopy[Math.trunc(shallowCopy.length / 2)].mfi
  }
}
