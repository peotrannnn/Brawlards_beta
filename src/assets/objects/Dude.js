import * as THREE from 'three'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import { CollisionManager } from '../../utils/collisionManager.js'

const DUDE_CONFIG = {
  PHYSICS_MASS: 0.01,
  PHYSICS_LINEAR_DAMPING: 0,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.3,
  BODY_RADIUS: 0.4,
  BODY_HEIGHT: 0.5,
  BODY_Z_SCALE: 0.6,
  BODY_SEGMENTS: 32,
  MESH_LIFT: 0.5,
  BODY_COLOR: '#FFFFFF',
  BODY_OPACITY: 0.85,
  VISION_RANGE: 40.0,
  BLINK_CLOSE_SPEED: 3,
  BLINK_OPEN_SPEED: 2.5,
  PARTICLE_SPAWN_INTERVAL: 0.3,
}

const dudePhysicsDef = {
  type: 'dynamic',
  mass: DUDE_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: DUDE_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: DUDE_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'sphere',
      radius: DUDE_CONFIG.HITBOX_RADIUS,
      offset: [0, 0, 0]
    }
  ],
  material: 'player'
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function createFaceTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  function drawEyes(openRatio) {
    ctx.clearRect(0, 0, 256, 256)

    const eyeY = 170
    const eyeX_L = 58
    const eyeX_R = 198
    const eyeW = 35
    const eyeH = 85

    const easedRatio = smoothstep(Math.pow(openRatio, 0.5))
    const currentEyeH = eyeH * easedRatio

    ctx.fillStyle = '#FF0000'

    ctx.beginPath()
    ctx.ellipse(eyeX_L, eyeY, eyeW, currentEyeH, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(eyeX_R, eyeY, eyeW, currentEyeH, 0, 0, Math.PI * 2)
    ctx.fill()

    if (easedRatio > 0.3) {
      ctx.fillStyle = '#000000'
      const pupilW = eyeW * 0.85
      const pupilH = currentEyeH * 0.9

      ctx.beginPath()
      ctx.ellipse(eyeX_L, eyeY, pupilW, pupilH, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.ellipse(eyeX_R, eyeY, pupilW, pupilH, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return { canvas, drawEyes }
}

function createBodyGeometry() {
  const points = []
  const flatY = 0
  const bodyTop = DUDE_CONFIG.BODY_HEIGHT
  const roundHeight = 0.08
  const radius = DUDE_CONFIG.BODY_RADIUS

  points.push(new THREE.Vector2(0, flatY))
  points.push(new THREE.Vector2(radius * 0.7, flatY))

  const curveSegments = 12
  for (let i = 0; i <= curveSegments; i++) {
    const t = i / curveSegments
    const angle = t * Math.PI / 2
    const x = radius * 0.7 + Math.sin(angle) * (radius * 0.3)
    const y = flatY + (1 - Math.cos(angle)) * roundHeight
    points.push(new THREE.Vector2(x, y))
  }

  points.push(new THREE.Vector2(radius, bodyTop))

  const sphereSegments = 16
  for (let i = 0; i <= sphereSegments; i++) {
    const t = i / sphereSegments
    const angle = t * Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = bodyTop + Math.sin(angle) * radius
    points.push(new THREE.Vector2(x, y))
  }

  const geometry = new THREE.LatheGeometry(points, DUDE_CONFIG.BODY_SEGMENTS)
  geometry.scale(1, 1, DUDE_CONFIG.BODY_Z_SCALE)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  return geometry
}

function createDude() {
  const root = new THREE.Group()
  root.name = 'Dude'

  const material = new THREE.MeshPhysicalMaterial({
    color: DUDE_CONFIG.BODY_COLOR,
    roughness: 0.8,
    metalness: 0.001,
    clearcoat: 0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: DUDE_CONFIG.BODY_OPACITY
  })

  const bodyGeometry = createBodyGeometry()
  const bodyMesh = new THREE.Mesh(bodyGeometry, material)

  const bbox = bodyGeometry.boundingBox
  const bodyCenterY = (bbox.max.y + bbox.min.y) / 2
  bodyMesh.position.y = -bodyCenterY + DUDE_CONFIG.MESH_LIFT
  root.add(bodyMesh)

  const faceTextureObj = createFaceTexture()
  faceTextureObj.drawEyes(1)

  const texture = new THREE.CanvasTexture(faceTextureObj.canvas)
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    depthWrite: false
  })

  const facePosition = new THREE.Vector3(
    0,
    DUDE_CONFIG.BODY_HEIGHT + 0.15 - bodyCenterY + DUDE_CONFIG.MESH_LIFT,
    DUDE_CONFIG.BODY_RADIUS * DUDE_CONFIG.BODY_Z_SCALE
  )
  const faceOrientation = new THREE.Euler()
  const faceSize = new THREE.Vector3(0.4, 0.4, 0.4)
  const faceGeometry = new DecalGeometry(bodyMesh, facePosition, faceOrientation, faceSize)
  const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial)
  root.add(faceMesh)

  let blinkTimer = 0
  let nextBlinkTime = Math.random() * 3 + 1
  let isBlinking = false
  let blinkState = 1
  let blinkSpeed = 0
  let particleTimer = 0

  root.userData.update = function(delta, particleManager) {
    particleTimer += delta
    if (particleTimer > DUDE_CONFIG.PARTICLE_SPAWN_INTERVAL) {
      if (particleManager) {
        const spawnPos = root.position.clone()
        spawnPos.y -= 0.35
        particleManager.spawn('whiteMistFall', spawnPos)
      }
      particleTimer = 0
    }

    blinkTimer += delta

    if (!isBlinking && blinkTimer > nextBlinkTime) {
      isBlinking = true
      blinkTimer = 0
      blinkSpeed = -DUDE_CONFIG.BLINK_CLOSE_SPEED
    } else if (isBlinking && blinkState <= 0) {
      blinkTimer = 2
      blinkSpeed = DUDE_CONFIG.BLINK_OPEN_SPEED
    } else if (isBlinking && blinkState >= 1) {
      isBlinking = false
      blinkTimer = 0
      nextBlinkTime = Math.random() * 4 + 2
      blinkSpeed = 0
    }

    if (blinkSpeed !== 0) {
      blinkState += blinkSpeed * delta
      blinkState = Math.max(0, Math.min(1, blinkState))
      faceTextureObj.drawEyes(blinkState)
      texture.needsUpdate = true
    }

    root.rotation.x = 0
    root.rotation.z = 0
  }

  root.userData.physics = dudePhysicsDef
  root.userData.mainColor = new THREE.Color(DUDE_CONFIG.BODY_COLOR)
  root.userData.visionRange = DUDE_CONFIG.VISION_RANGE

  CollisionManager.addCharacterTriggerZones(root, {
    smallRadius: 1.5,
    largeRadius: DUDE_CONFIG.VISION_RANGE
  })

  return root
}

export function getDudeAsset() {
  return {
    name: 'Dude',
    description: 'Cẩn thận xung quanh...',
    factory: () => createDude(),
    physics: dudePhysicsDef
  }
}