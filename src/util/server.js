const logger = require('./logger.js')
const http = require('http')
const fs = require('fs')
const path = require('path')

module.exports = class Server {
  static start () {
    const publicDir = process.env.SERVER_PUBLIC_DIR ? process.env.SERVER_PUBLIC_DIR : 'res'
    const port = process.env.port ? process.env.port : 8080

    const mediaTypes = {
      zip: 'application/zip',
      jpg: 'image/jpeg',
      html: 'text/html'
    }

    const server = http.createServer((request, response) => {
      logger.info(`${request.method} ${request.url}`)

      const requestFile = request.url.endsWith('/') ? `${request.url}index.html` : request.url
      const filepath = path.join(publicDir, requestFile)
      fs.readFile(filepath, function (err, data) {
        if (err) {
          logger.error(`server: ${err.message}`)
          response.statusCode = 404
          return response.end('File not found or invalid request.')
        }

        let mediaType = 'text/html'
        const ext = path.extname(filepath)
        if (ext.length > 0 && ext.slice(1) in mediaTypes) {
          mediaType = mediaTypes[ext.slice(1)]
        }

        response.setHeader('Content-Type', mediaType)
        response.end(data)
      })
    })

    server.on('clientError', function onClientError (err, socket) {
      logger.info(`clientError: ${err.message}`)
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    })

    server.listen(port, '127.0.0.1', function () {
      logger.info(`server: started, publicDir=${publicDir}, port=${port}`)
    })
    return server
  }
}
