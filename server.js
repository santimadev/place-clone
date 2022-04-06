const express = require('express')
const app = express()
const http = require('http')
const fs = require('fs')
const server = http.createServer(app)
const { Server } = require('socket.io')

const pixelsArray = JSON.parse(fs.readFileSync('pixels.json'))
let drawableArea = {
  width: 500,
  height: 500
}
let pixelSize = {
  width: 50,
  height: 50
}


const io = new Server(server, {
    cors: {
       origin:  '*'
    }
})

app.get('/', (req, res) => {
  res.send('Okis')
})

io.on('connection', socket => {
    socket.emit('pixels', pixelsArray)
    socket.on('pixel', (data) => {
        pixelsArray[data.pixel.x][data.pixel.y] = data.color
        fs.writeFile('pixels.json', JSON.stringify(pixelsArray), () => {
            io.emit('pixels', pixelsArray)
        })
    })
})

server.listen(3000, () => {
  console.log('listening on *:3000')
})
