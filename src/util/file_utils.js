const fs = require('fs')

module.exports = class FileUtils {
  static lineCount (filename) {
    return new Promise((resolve, reject) => {
      let lineCount = 0
      const readStream = fs.createReadStream(filename)
      readStream.on('readable', () => {
        let buffer
        while ((buffer = readStream.read()) != null) {
          let index = -1
          while ((index = buffer.indexOf(10, index + 1)) !== -1) {
            ++lineCount
          }
        }
      })
      readStream.on('end', () => {
        resolve(lineCount + 1) // add one for the final line (consider empty file to have one line)
      })
      readStream.on('error', reject)
    })
  }
}
