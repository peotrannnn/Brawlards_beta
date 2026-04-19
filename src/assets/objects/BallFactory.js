import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { CollisionManager } from '../../utils/collisionManager.js'

// ==================== BALL 8 AI CONFIG ====================
// This is the source of truth for Ball 8 behavior and trigger mesh sizes
// Ball 8 AI system (ball8Bot.js) imports and uses these values
export const BALL8_AI_CONFIG = {
  detectionRange: 40,        // outer trigger mesh radius + vision range
  groupingMinDistance: 0.6,  // VISUAL THRESHOLD - Ball 8s stop grouping approach at this distance (matches physics collision ~0.5)
  groupThreshold: 5,         // number of Ball 8s needed to trigger group chase (at least 5 total including self)
  baseMaxSpeed: 3.0,         // maximum movement speed (increased from 2.0)
  acceleration: 6,           // acceleration value
  fleeSpeedFactor: 1.5,      // speed multiplier when fleeing from player (1.5x normal speed)
  groupingSpeedFactor: 1.8,  // speed multiplier when chasing toward group (outside mesh)
  groupingMaxDistance: 4.0,  // [DEPRECATED - not used anymore, kept for reference only]
  fixedTimeStep: 1/60        // physics simulation timestep
}

// ======================
// COLOR DECLARATION
// ======================

const ballColors = {
  0: "#ffffff",   // cue ball

  1: "#f7d000",   // yellow
  2: "#0046ad",   // blue
  3: "#d40000",   // red
  4: "#6a0dad",   // purple
  5: "#ff6a00",   // orange
  6: "#00994c",   // green
  7: "#7a0019",   // maroon
  8: "#111111",   // black

  9: "#f7d000",
  10: "#0046ad",
  11: "#d40000",
  12: "#6a0dad",
  13: "#ff6a00",
  14: "#00994c",
  15: "#7a0019",

  bowling: "#2c2f7a"
}

function getBallPhysicsDef(number) {
  return {
    type: 'dynamic',
    mass: 0.5,
    shapes: [
      {
        type: 'sphere',
        radius: 0.25,
        offset: [0, 0, 0]
      }
    ],
    material: 'ball',
    linearDamping: 0.1,
    angularDamping: 0.8
  };
}

function getBowlingBallPhysicsDef() {
    return {
        type: 'dynamic',
        mass: 100,
        shapes: [
          {
            type: 'sphere',
            radius: 0.6,
            offset: [0, 0, 0]
          }
        ],
        material: 'ball',
        linearDamping: 0.15,
        angularDamping: 0.15
    };
}

// ======================
// CREATE BILLIARD BALL
// ======================

function createBilliardBall(number, renderer) {

  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  const isCue = number === 0
  const isStripe = number >= 9
  const color = ballColors[number]

  ctx.fillStyle = isCue ? "#ffffff" : (isStripe ? "#ffffff" : color)
  ctx.fillRect(0, 0, size, size)

  if (isStripe && !isCue) {
    const stripeHeight = size * 0.45
    ctx.fillStyle = color
    ctx.fillRect(0, size / 2 - stripeHeight / 2, size, stripeHeight)
  }

  if (!isCue) {

    function drawNumber(u) {

      const x = size * u
      const y = size * 0.5

      ctx.save()
      ctx.translate(x, y)
      ctx.scale(0.5, 1)

      ctx.beginPath()
      ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.fill()

      ctx.strokeStyle = "#000000"
      ctx.lineWidth = size * 0.01
      ctx.stroke()

      ctx.fillStyle = "#000000"
      ctx.font = `bold ${size * 0.16}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(number.toString(), 0, 0)

      if (number === 6 || number === 9) {
        ctx.beginPath()
        ctx.moveTo(-size * 0.05, size * 0.08)
        ctx.lineTo(size * 0.05, size * 0.08)
        ctx.lineWidth = size * 0.02
        ctx.stroke()
      }

      ctx.restore()
    }

    drawNumber(0.25)
    drawNumber(0.75)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  texture.needsUpdate = true

  const geometry = new THREE.SphereGeometry(0.25, 64, 64)

  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.1,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const root = new THREE.Group()
  root.name = number === 0 ? "Cue Ball" : `Ball ${number}`
  root.add(mesh)

  // Thêm màu chính vào userData để các hệ thống khác (như particle) có thể sử dụng
  root.userData.mainColor = new THREE.Color(color)

  // Thêm physics data
  root.userData.physics = getBallPhysicsDef(number);

  // Add visual trigger zones cho Ball 8 (debug visualization)
  if (number === 8) {
    // Uses config values - visual spheres match AI behavior
    const BALL8_SMALL_TRIGGER = BALL8_AI_CONFIG.groupingMinDistance;  // Inner sphere - grouping threshold
    const BALL8_LARGE_TRIGGER = BALL8_AI_CONFIG.detectionRange;      // Outer sphere - vision/detection range
    
    // Add trigger zones as visual indicators only (no physics collision)
    CollisionManager.addCharacterTriggerZones(root, {
      smallRadius: BALL8_SMALL_TRIGGER,
      largeRadius: BALL8_LARGE_TRIGGER
    });
    
    // Store trigger radii in userData for reference
    root.userData.triggerSmallRadius = BALL8_SMALL_TRIGGER;
    root.userData.triggerLargeRadius = BALL8_LARGE_TRIGGER;
  }

  return root
}

// ======================
// CREATE BOWLING BALL
// ======================

function createBowlingBall(renderer) {

  const size = 1024
  const scaleFix = 0.5
  const dotRadius = size * 0.04

  const topY = size * 0.42
  const bottomY = size * 0.64
  const topOffset = size * 0.035

  const positions = [
    { x: size * 0.5 - topOffset, y: topY },
    { x: size * 0.5 + topOffset, y: topY },
    { x: size * 0.5, y: bottomY }
  ]

  // color map
  const colorCanvas = document.createElement("canvas")
  colorCanvas.width = colorCanvas.height = size
  const ctx = colorCanvas.getContext("2d")

  ctx.fillStyle = ballColors.bowling
  ctx.fillRect(0, 0, size, size)

  const colorTexture = new THREE.CanvasTexture(colorCanvas)
  colorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

  // normal map
  const normalCanvas = document.createElement("canvas")
  normalCanvas.width = normalCanvas.height = size
  const nctx = normalCanvas.getContext("2d")

  const imageData = nctx.createImageData(size, size)
  const data = imageData.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {

      let nx = 0
      let ny = 0
      let nz = 1

      positions.forEach(p => {

        const dx = (x - p.x) / scaleFix
        const dy = (y - p.y)
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < dotRadius) {

          const depth = (dotRadius - dist) / dotRadius

          nx += dx * 0.1
          ny += dy * 0.1
          nz -= depth * 3
        }
      })

      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= length
      ny /= length
      nz /= length

      const index = (y * size + x) * 4

      data[index] = (nx * 0.5 + 0.5) * 255
      data[index + 1] = (ny * 0.5 + 0.5) * 255
      data[index + 2] = (nz * 0.5 + 0.5) * 255
      data[index + 3] = 255
    }
  }

  nctx.putImageData(imageData, 0, 0)

  const normalTexture = new THREE.CanvasTexture(normalCanvas)

  const geometry = new THREE.SphereGeometry(0.6, 64, 64)

  const material = new THREE.MeshPhysicalMaterial({
    map: colorTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(2.5, 2.5),
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const root = new THREE.Group()
  root.name = "Bowling Ball"
  root.add(mesh)

  // Thêm màu chính vào userData
  root.userData.mainColor = new THREE.Color(ballColors.bowling)

  // Thêm physics data
  root.userData.physics = getBowlingBallPhysicsDef();

  return root
}

// ======================
// EXPORT ASSETS
// ======================

export function getBallAssets(renderer) {

  const assets = []

  assets.push({
    name: "Cue Ball",
    description: "Mysterious cue ball???",
    factory: () => createBilliardBall(0, renderer),
    physics: getBallPhysicsDef(0)
  })

  for (let i = 1; i <= 15; i++) {
    let desc = ""
    if (i === 8) {
      desc = "I’m weak, but my gang is plenty!"
    } else if (i <= 7) {
      desc = `Solid ball number ${i}!`
    } else {
      desc = `Striped ball number ${i - 7}!`
    }
    
    assets.push({
      name: `Ball ${i}`,
      description: desc,
      factory: () => createBilliardBall(i, renderer),
      physics: getBallPhysicsDef(i)
    })
  }

  assets.push({
    name: "Bowling Ball",
    description: "Friend or foe, you’re dealing with trouble either way.",
    factory: () => createBowlingBall(renderer),
    physics: getBowlingBallPhysicsDef()
  })

  return assets
}