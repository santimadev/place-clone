const express = require('express')
const app = express()
const http = require('http')
const fs = require('fs')
const path = require('path')
const server = http.createServer(app)
const { Server } = require('socket.io')

const pixelsArray = JSON.parse(fs.readFileSync('pixels.json'))
let drawableArea = {
  width: 500,
  height: 500
}
let pixelSize = {
  width: 20,
  height: 20
}


const io = new Server(server, {
    cors: {
       origin:  '*'
    }
})

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
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

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000')
})
