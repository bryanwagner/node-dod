module.exports = class AlgUtils {
  static reverseMinLength (array, maxLength) {
    for (let i = 0, j = Math.min(maxLength, array.length) - 1; i < j; ++i, --j) {
      const temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }
    return array
  }

  static sampleArray (array, samples, tail = 0) {
    let sampleArray
    if (array.length === 0 || samples === 0) {
      sampleArray = []
    } else if (array.length <= samples) {
      sampleArray = Array.from(array)
    } else {
      sampleArray = new Array(samples)
      const n = Math.trunc(array.length / samples)
      const startIndex = (array.length - 1) - n * (samples - 1) // always sample the last value
      for (let s = 0, i = startIndex; s < samples; ++s, i += n) {
        sampleArray[s] = array[i]
      }
    }
    if (sampleArray.length > tail) {
      sampleArray = sampleArray.slice(sampleArray.length - tail, sampleArray.length)
    }
    return sampleArray
  }

  static sampleFloat64Array (array, length, samples, tail = 0) {
    let sampleArray
    if (length === 0 || samples === 0) {
      sampleArray = Float64Array(0)
    } else if (length <= samples) {
      sampleArray = array.slice(0, length)
    } else {
      sampleArray = new Float64Array(samples)
      const n = Math.trunc(length / samples)
      const startIndex = (length - 1) - n * (samples - 1) // always sample the last value
      for (let s = 0, i = startIndex; s < samples; ++s, i += n) {
        sampleArray[s] = array[i]
      }
    }
    if (sampleArray.length > tail) {
      sampleArray = sampleArray.slice(sampleArray.length - tail, sampleArray.length)
    }
    return Array.from(sampleArray) // convert the Float64Array to a Number Array
  }
}
