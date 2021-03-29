/**
 * System encapsulating OHLC (Open, High, Low, Close) values used in financial markets such as Stock Markets and Cryptocurrency exchanges.
 * This representation demonstrates Struct-of-Arrays memory arrangement: https://en.wikipedia.org/wiki/AoS_and_SoA
 * SoA is typically modelled as a "system" where operations process over independent arrays.
 * Here we use all independent arrays (allocated in a common arena), but sometimes data is interleaved due to processing interdependency
 * (one common example is vertices in 2 or 3 space are typically stored as (x,y) and (x,y,z) pairs, respectively).
 * Several calculations range across a window of n-periods.
 */
module.exports = class OhlcSystem {
  constructor (capacity) {
    this.length = 0

    // use a Memory Arena to maximize memory locality:
    // https://en.wikipedia.org/wiki/Region-based_memory_management
    // For more general problems, this becomes the limit for our batch size,
    // and we process our calculations in batches.
    const buffer = new ArrayBuffer(20 * capacity * Float64Array.BYTES_PER_ELEMENT)
    function mapTo (i) {
      return new Float64Array(buffer, i * capacity * Float64Array.BYTES_PER_ELEMENT, capacity)
    }
    this.opens = mapTo(0)
    this.highs = mapTo(1)
    this.lows = mapTo(2)
    this.closes = mapTo(3)
    this.volumes = mapTo(4)

    this.hl2s = mapTo(5) // High-Low Midpoint
    this.hl2Averages = mapTo(6)
    this.hl2StdevUppers = mapTo(7) // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.hl2StdevLowers = mapTo(8)

    this.hlc3s = mapTo(9) // Typical Price: https://en.wikipedia.org/wiki/Typical_price
    this.hlc3Averages = mapTo(10)
    this.hlc3StdevUppers = mapTo(11) // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.hlc3StdevLowers = mapTo(12)

    this.ohlc4s = mapTo(13) // Average of OHLC values
    this.ohlc4Averages = mapTo(14)
    this.ohlc4StdevUppers = mapTo(15) // Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
    this.ohlc4StdevLowers = mapTo(16)

    this.rsis = mapTo(17) // Relative Strength Index: https://en.wikipedia.org/wiki/Relative_strength_index
    this.stochastics = mapTo(18) // Fast Stochastic: https://en.wikipedia.org/wiki/Stochastic_oscillator
    this.mfis = mapTo(19) // Money Flow Index: https://en.wikipedia.org/wiki/Money_flow_index

    this.dates = new Array(capacity)
  }

  /**
   * Calculate each Ohlc system component.
   * @param window the number of periods for window-based calculations
   * @returns object containing the calculated medians
   */
  calculateAll (window) {
    this.calculatehl2s(window)
    this.calculatehl2Bands(window)
    this.calculateHlc3s(window)
    this.calculateHlc3Bands(window)
    this.calculateohlc4s(window)
    this.calculateohlc4Bands(window)
    this.calculateRsis(window)
    this.calculateStochastics(window)
    this.calculateMfis(window)
    return {
      close: this.medianClose(),
      volume: this.medianVolume(),
      hlc3: this.medianHlc3(),
      rsi: this.medianRsi(),
      stochastic: this.medianStochastic(),
      mfi: this.medianMfi()
    }
  }

  calculatehl2s () {
    const hl2s = this.hl2s
    const highs = this.highs
    const lows = this.lows
    for (let i = 0, length = this.length; i < length; ++i) {
      hl2s[i] = (highs[i] + lows[i]) / 2.0
    }
  }

  calculateHlc3s () {
    const hlc3s = this.hlc3s
    const highs = this.highs
    const lows = this.lows
    const closes = this.closes
    for (let i = 0, length = this.length; i < length; ++i) {
      hlc3s[i] = (highs[i] + lows[i] + closes[i]) / 3.0
    }
  }

  calculateohlc4s () {
    const ohlc4s = this.ohlc4s
    const opens = this.opens
    const highs = this.highs
    const lows = this.lows
    const closes = this.closes
    for (let i = 0, length = this.length; i < length; ++i) {
      ohlc4s[i] = (opens[i] + highs[i] + lows[i] + closes[i]) / 4.0
    }
  }

  calculatehl2Bands (window) {
    const hl2s = this.hl2s
    const hl2Averages = this.hl2Averages
    const hl2StdevUppers = this.hl2StdevUppers
    const hl2StdevLowers = this.hl2StdevLowers
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
      let average = 0.0
      let averageSq = 0.0
      let count = 0
      for (let i = Math.max(0, startIndex); i <= targetIndex; ++i) {
        const value = hl2s[i]
        const delta = value - average
        average += delta / ++count
        averageSq += delta * (value - average)
      }
      const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
      const stdev = Math.sqrt(variance)
      hl2Averages[targetIndex] = average
      hl2StdevUppers[targetIndex] = average + 2.0 * stdev
      hl2StdevLowers[targetIndex] = average - 2.0 * stdev
    }
  }

  calculateHlc3Bands (window) {
    const hlc3s = this.hlc3s
    const hlc3Averages = this.hlc3Averages
    const hlc3StdevUppers = this.hlc3StdevUppers
    const hlc3StdevLowers = this.hlc3StdevLowers
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
      let average = 0.0
      let averageSq = 0.0
      let count = 0
      for (let i = Math.max(0, startIndex); i <= targetIndex; ++i) {
        const value = hlc3s[i]
        const delta = value - average
        average += delta / ++count
        averageSq += delta * (value - average)
      }
      const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
      const stdev = Math.sqrt(variance)
      hlc3Averages[targetIndex] = average
      hlc3StdevUppers[targetIndex] = average + 2.0 * stdev
      hlc3StdevLowers[targetIndex] = average - 2.0 * stdev
    }
  }

  calculateohlc4Bands (window) {
    const ohlc4s = this.ohlc4s
    const ohlc4Averages = this.ohlc4Averages
    const ohlc4StdevUppers = this.ohlc4StdevUppers
    const ohlc4StdevLowers = this.ohlc4StdevLowers
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      // Welford's Online Algorithm (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
      let average = 0.0
      let averageSq = 0.0
      let count = 0
      for (let i = Math.max(0, startIndex); i <= targetIndex; ++i) {
        const value = ohlc4s[i]
        const delta = value - average
        average += delta / ++count
        averageSq += delta * (value - average)
      }
      const variance = count <= 1 ? 0.0 : (averageSq / (count - 1))
      const stdev = Math.sqrt(variance)
      ohlc4Averages[targetIndex] = average
      ohlc4StdevUppers[targetIndex] = average + 2.0 * stdev
      ohlc4StdevLowers[targetIndex] = average - 2.0 * stdev
    }
  }

  calculateRsis (window) {
    const closes = this.closes
    const rsis = this.rsis
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      const periods = targetIndex - startIndex + 1
      let upEma = 0.0; let downEma = 0.0
      for (let i = Math.max(0, startIndex) + 1; i <= targetIndex; ++i) {
        const delta = closes[i] - closes[i - 1]
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
      rsis[targetIndex] = 100.0 - (100.0 / (1.0 + rs))
    }
  }

  calculateStochastics (window) {
    const highs = this.highs
    const lows = this.lows
    const closes = this.closes
    const stochastics = this.stochastics
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      let high = highs[targetIndex]
      let low = lows[targetIndex]
      for (let i = Math.max(0, startIndex); i <= targetIndex; ++i) {
        high = Math.max(high, highs[i])
        low = Math.min(low, lows[i])
      }
      stochastics[targetIndex] = high === low ? 0.0 : (100.0 * ((closes[targetIndex] - low) / (high - low)))
    }
  }

  calculateMfis (window) {
    const hlc3s = this.hlc3s
    const volumes = this.volumes
    const mfis = this.mfis
    for (let startIndex = -(window - 1), targetIndex = 0, length = this.length; targetIndex < length; ++startIndex, ++targetIndex) {
      let positive = 0.0; let negative = 0.0
      for (let i = Math.max(0, startIndex) + 1; i <= targetIndex; ++i) {
        const currentMoneyFlow = hlc3s[i] * volumes[i]
        const prevMoneyFlow = hlc3s[i - 1] * volumes[i - 1]
        const delta = currentMoneyFlow - prevMoneyFlow
        if (delta > 1e-5) {
          positive += currentMoneyFlow
        } else if (delta < 1e-5) {
          negative += currentMoneyFlow
        }
      }
      const moneyFlow = negative === 0.0 ? 0.0 : (positive / negative)
      mfis[targetIndex] = 100.0 - (100.0 / (1.0 + moneyFlow))
    }
  }

  medianClose () {
    return this.median(this.closes)
  }

  medianVolume () {
    return this.median(this.volumes)
  }

  medianHlc3 () {
    return this.median(this.hlc3s)
  }

  medianRsi () {
    return this.median(this.rsis)
  }

  medianStochastic () {
    return this.median(this.stochastics)
  }

  medianMfi () {
    return this.median(this.mfis)
  }

  median (values) {
    const shallowCopy = values.slice(0, this.length)
    shallowCopy.sort((a, b) => a - b)
    return shallowCopy[Math.trunc(this.length / 2)]
  }
}
