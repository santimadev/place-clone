const zoomSensitivity = 0.1
const dragThreshold = 10
const scaleLimits = {
  max: 5,
  min: 0.5
}

socket = io('https://communityplace.herokuapp.com')


let tileButton = null


let colorsPanel = null
let confirmationColorButton = null

const colors = [
  '245.35631430809084, 245.05211791874228, 183.0293301593736',
  '39.01622738727421, 2.0270110415514697, 50.321979351156294',
  '95.90804880293439, 7.894466494873616, 92.42813219995087',
  '213.08902588267694, 68.24953017631081, 166.41469112185342',
  '222.3044640400771, 24.3250901658998, 215.6860061507616',
  '12.697453327616067, 66.59369413130253, 206.22540699485677',
  '157.79550309689617, 198.54392404569901, 107.73665879434648',
  '154.24598031585055, 55.765739357113, 204.40308161909675',
  '166.13031883735385, 138.80150184235654, 128.51575158961907',
  '153.6192683972938, 229.54173056016106, 64.75926352162826'
]


let selectedPixel = null

let hoveredPixel = null

let canvas

let drawableArea = {
  width: 500,
  height: 500
}

let pixelSize = {
  width: 50,
  height: 50
}

let transform = {
  x: 0,
  y: 0,
  lastX: 0,
  lastY: 0,
  prev: {}
}

// Color to use for drawed pixel
let selectedColor = null

let dragging = false
let drawMode = false
let currentScale = 1
let pixelsArray = []

socket.on('pixels', values => {
  pixelsArray = values
})


function centerDrawableArea () {
  currentScale = 1
  transform.x = (width / 2 - drawableArea.width / 2) * currentScale
  transform.y = (height / 2 - drawableArea.height / 2) * currentScale
  transform.prev.x = transform.x
  transform.prev.y = transform.y
}

function buildColorsPanel() {
  // Define colorsPanel
  // colorsPanel = createDiv()
  colorsPanel = select('.colors-panel')
  confirmationColorButton = select('.confirmation')
  let template = ''
  for (let color of colors) {
    template += `<div data-color='${color}' class='color-box' style='background-color: rgb(${color})'></div>`
  }
  colorsPanel.html(template)
  const colorBoxes = selectAll('.color-box')
  colorBoxes.forEach(box => box.mouseClicked((e) => {
    selectedColor = e.target.getAttribute('data-color')
    confirmationColorButton.style('opacity', 1)
    confirmationColorButton.style('transform', 'translateY(0)')
  }))
  confirmationColorButton.mouseClicked(() => {
    const rgb = selectedColor.split(',')
    pixelsArray[selectedPixel.x][selectedPixel.y] = rgb
    // send socket event
    socket.emit('pixel', { pixel: selectedPixel, color: rgb })
    resetUI()
  })
}

function resetUI() {
  confirmationColorButton.style('opacity', 0)
  colorsPanel.style('opacity', 0)
  confirmationColorButton.style('transform', 'translateY(150%)')
  drawMode = false
  selectedColor = null
  selectedPixel = null
}

function generateRandomColor () {
  return `${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)}`
}


function setup () {
  canvas = createCanvas(windowWidth, windowHeight)
  canvas.mousePressed(canvasMousePressed)
  canvas.mouseClicked(canvasMouseClicked)
  canvas.mouseMoved(canvasMouseMoved)
  canvas.mouseOut(canvasMouseOut)

  // for (let i = 0; i < 10; i++) {
  //   const color = generateRandomColor()
  //   colors.push(color)
  // }


  canvas.canvas.addEventListener(
    'wheel',
    e => {
      e.preventDefault()
    },
    { passive: false }
  )
  // Center canvas
  centerDrawableArea()
  buildColorsPanel()

  // Fill pixel array
  for (let x = 0; x < drawableArea.width / pixelSize.width; x++) {
    pixelsArray[x] = []
    for (let y = 0; y < drawableArea.height / pixelSize.height; y++) {
      pixelsArray[x][y] = [255, 255, 0]
    }
  }

  // Center origin button
  button = createButton('CENTER CANVAS')
  button.position(5, 5)
  button.mousePressed(centerDrawableArea)
  tileButton = createButton('CHOOSE TILE')
  tileButton.position(button.width + 10, 5)
  tileButton.mousePressed(() => {
    cursor('pointer')
    // Toggle boolean value
    drawMode = !drawMode
    // Clear selected pixel and center drawableArea
    if (!drawMode) {
      resetUI()
    }
  })
}

function canvasMouseOut() {
  hoveredPixel = null
}

function draw () {
  background(255)
  fill(0)
  noStroke()
  push()

  translate(transform.x, transform.y)
  scale(currentScale)

  for (let x = 0; x < drawableArea.width; x += pixelSize.width) {
    for (let y = 0; y < drawableArea.height; y += pixelSize.height) {
      const pixelCoordX = x / pixelSize.width
      const pixelCoordY = y / pixelSize.height
      if (
        selectedPixel && selectedPixel.x === x / pixelSize.width &&
        selectedPixel.y === y / pixelSize.height
      ) {
        stroke(0)
        if (selectedColor) {
          fill(...selectedColor.split(','))
        } else {
          stroke(0)
        }
      } else if (hoveredPixel && hoveredPixel.x === x / pixelSize.width && hoveredPixel.y === y / pixelSize.height) {
        noStroke()
        fill(...pixelsArray[pixelCoordX][pixelCoordY], 100)
      } else {
        noStroke()
        fill(...pixelsArray[pixelCoordX][pixelCoordY])
      }

      rect(x, y, pixelSize.width, pixelSize.height)
    }
  }
  pop()
}

function windowResized () {
  resizeCanvas(windowWidth, windowHeight)
  centerDrawableArea()
}

function canvasMouseMoved () {
  if (!drawMode) {
    cursor('grab')
  }
  // Get intersection if one
  if (cursorInBounds(mouseX, mouseY)) {
    hoveredPixel = getPixelCoords(mouseX, mouseY)
    return
  }
  hoveredPixel = null
}

function mouseWheel (event) {
  if (event.delta > 0) {
    scaleFactor = 1 + zoomSensitivity
  } else {
    scaleFactor = 1 - zoomSensitivity
  }
  if (currentScale * scaleFactor < 0.1) {
    return
  }
  const nextScale = currentScale * scaleFactor
  if (nextScale < scaleLimits.min || nextScale > scaleLimits.max) {
    return
  }
  currentScale = nextScale
  transform.x = mouseX - mouseX * scaleFactor + transform.x * scaleFactor
  transform.y = mouseY - mouseY * scaleFactor + transform.y * scaleFactor

  // Prevent scrolling
  return false
}

function canvasMousePressed () {
  if (!cursorInBounds(mouseX, mouseY)) {
    transform.startX = mouseX / currentScale
    transform.startY = mouseY / currentScale
  }
}

function inBounds (point, { x1, y1, x2, y2 }) {
  return point.x > x1 && point.y > y1 && point.x < x2 && point.y < y2
}

function getPixelCoords (x, y) {
  const coordX = Math.ceil((x - transform.x) / (pixelSize.width * currentScale))
  const coordY = Math.ceil(
    (y - transform.y) / (pixelSize.height * currentScale)
  )
  return {
    x: coordX - 1,
    y: coordY - 1
  }
}

function smoothScale (to) {
  if (currentScale < to) {
    currentScale += 0.05
    window.requestAnimationFrame(() => {
      smoothScale(to)
    })
  }
}

function smoothTranslation (to) {
  if (currentScale === 2) {
    // if (c
    const dx = transform.x - to.x
    const dy = transform.y - to.y
    // const p
    if (dx < 0) {
      transform.x -= 1
    } else {
      transform.x -= 1
    }
    if (dy < 0) {
      transform.y += 1
    } else {
      transform.y -= 1
    }
    if (transform.x !== to.x && transform.y !== to.y) {
      requestAnimationFrame(() => {
        smoothTranslation(to)
      })
    }
  }
}

function getBounds () {
  const bounds = {
    x1: transform.x,
    y1: transform.y,
    x2: transform.x + drawableArea.width * currentScale,
    y2: transform.y + drawableArea.height * currentScale
  }
  return bounds
}

function cursorInBounds (x, y) {
  const bounds = getBounds()
  return inBounds({ x, y }, bounds)
}

function focusTile (x, y) {
  if (cursorInBounds(x, y)) {
    selectedPixel = getPixelCoords(x, y)
    colorsPanel.style('opacity', 1)
    colorsPanel.class('colors-panel choose')
    smoothScale()
    const positionX =
      width / 2 - selectedPixel.x * pixelSize.width * currentScale
    const positionY =
      height / 2 - selectedPixel.y * pixelSize.height * currentScale
    transform.x = positionX
    transform.y = positionY
  }
}

function canvasMouseClicked () {
  if (drawMode) {
    focusTile(mouseX, mouseY)
  }
}

function mouseDragged () {
  if (!drawMode) {
    cursor('grabbing')
    transform.prev = {
      x: transform.x,
      y: transform.y
    }
    transform.x += mouseX - pmouseX
    transform.y += mouseY - pmouseY
  }
}

function mouseReleased () {
  if (!drawMode) {
    cursor('grab')
  }
}

window.addEventListener('gesturestart', e => e.preventDefault())
window.addEventListener('gesturechange', e => e.preventDefault())
window.addEventListener('gestureend', e => e.preventDefault())
