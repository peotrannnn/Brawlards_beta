import * as THREE from 'three'
import { CollisionManager } from '../../utils/collisionManager.js'

const DUMMY_CONFIG = {
  PHYSICS_MASS: 100,
  PHYSICS_LINEAR_DAMPING: 0.5,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.3,
  BODY_RADIUS: 0.4,
  BODY_HEIGHT: 0.5,
  BODY_Z_SCALE: 0.6,
  BODY_SEGMENTS: 64,
  MESH_LIFT: 0.5,
  BODY_COLOR: '#FFD700',
  BOOT_COLOR: '#111111',
  SYMBOL_EMISSIVE_COLOR: '#FFD700',
  SYMBOL_EMISSIVE_INTENSITY: 2.0,
  SYMBOL_BLINK_CYCLE: 1.5,
  EAR_RADIUS: 0.08,
  EAR_HEIGHT: 0.12,
  EAR_X_OFFSET: 0.16,
  EAR_Z_OFFSET: 0.1,
  LEG_HEIGHT: 0.35,
  LEG_RADIUS: 0.025,
  LEG_SEGMENTS: 16,
  LEG_X_OFFSET: 0.18,
  SYMBOL_RADIUS: 0.15,
  SYMBOL_SEGMENTS: 32,
  SYMBOL_Z_OFFSET: 0.01,
}

const dummyPhysicsDef = {
  type: 'dynamic',
  mass: DUMMY_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: DUMMY_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: DUMMY_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'sphere',
      radius: DUMMY_CONFIG.HITBOX_RADIUS,
      offset: [0, 0, 0]
    }
  ],
  material: 'player'
}

function createSymbolTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const cx = 128
  const cy = 128
  const r = 120

  // Yellow background
  // Yellow background
  ctx.fillStyle = '#FFD700'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Black border
  ctx.lineWidth = 10
  ctx.strokeStyle = '#000000'
  ctx.stroke()

  // Black quadrants
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, r, 0, Math.PI / 2)
  ctx.lineTo(cx, cy)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 1.5)
  ctx.lineTo(cx, cy)
  ctx.fill()

  return new THREE.CanvasTexture(canvas)
}

/**
 * Create emissive texture for symbol
 */
function createEmissiveTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const cx = 128
  const cy = 128
  const r = 120

  // Black background (no emission)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 256, 256)
  
  // White for emissive areas
  ctx.fillStyle = '#FFFFFF'

  // First yellow quadrant
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, r, Math.PI / 2, Math.PI)
  ctx.lineTo(cx, cy)
  ctx.fill()

  // Second yellow quadrant
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, r, Math.PI * 1.5, Math.PI * 2)
  ctx.lineTo(cx, cy)
  ctx.fill()

  return new THREE.CanvasTexture(canvas)
}

/**
 * Create leg with two segments (yellow upper, black lower)
 */
function createLeg(offsetX, bodyCenterY, meshLift, limbMaterial, bootMaterial) {
  const pivot = new THREE.Group()
  const halfHeight = DUMMY_CONFIG.LEG_HEIGHT / 2
  const legSegmentGeo = new THREE.CylinderGeometry(
    DUMMY_CONFIG.LEG_RADIUS, 
    DUMMY_CONFIG.LEG_RADIUS, 
    halfHeight, 
    DUMMY_CONFIG.LEG_SEGMENTS
  )
  
  // Upper leg (Yellow)
  const upperLeg = new THREE.Mesh(legSegmentGeo, limbMaterial)
  upperLeg.position.y = -halfHeight / 2
  pivot.add(upperLeg)

  // Lower leg (Black)
  const lowerLeg = new THREE.Mesh(legSegmentGeo, bootMaterial)
  lowerLeg.position.y = -halfHeight * 1.5
  pivot.add(lowerLeg)

  pivot.position.set(offsetX, -bodyCenterY + meshLift, 0)
  pivot.userData.isLeg = true
  return pivot
}

/**
 * Create cat ears
 */
function createEars(bodyCenterY, meshLift, limbMaterial) {
  const earGeometry = new THREE.ConeGeometry(
    DUMMY_CONFIG.EAR_RADIUS, 
    DUMMY_CONFIG.EAR_HEIGHT, 
    3
  )
  const earMaterial = limbMaterial

  const leftEar = new THREE.Mesh(earGeometry, earMaterial)
  const rightEar = new THREE.Mesh(earGeometry, earMaterial)

  leftEar.rotation.x = Math.PI / 3
  rightEar.rotation.x = Math.PI / 3

  const earY = DUMMY_CONFIG.BODY_HEIGHT + DUMMY_CONFIG.BODY_RADIUS - bodyCenterY + meshLift

  leftEar.position.set(-DUMMY_CONFIG.EAR_X_OFFSET, earY, DUMMY_CONFIG.EAR_Z_OFFSET)
  rightEar.position.set(DUMMY_CONFIG.EAR_X_OFFSET, earY, DUMMY_CONFIG.EAR_Z_OFFSET)

  return { leftEar, rightEar }
}

/**
 * Create body geometry using lathe
 */
function createBodyGeometry() {
  const points = []
  const flatY = 0
  const bodyTop = DUMMY_CONFIG.BODY_HEIGHT
  const roundHeight = 0.08
  const radius = DUMMY_CONFIG.BODY_RADIUS

  // Bottom center
  points.push(new THREE.Vector2(0, flatY))
  points.push(new THREE.Vector2(radius * 0.7, flatY))

  // Curved transition
  const curveSegments = 12
  for (let i = 0; i <= curveSegments; i++) {
    const t = i / curveSegments
    const angle = t * Math.PI / 2
    const x = radius * 0.7 + Math.sin(angle) * (radius * 0.3)
    const y = flatY + (1 - Math.cos(angle)) * roundHeight
    points.push(new THREE.Vector2(x, y))
  }

  // Straight part
  points.push(new THREE.Vector2(radius, bodyTop))

  // Top sphere
  const sphereSegments = 16
  for (let i = 0; i <= sphereSegments; i++) {
    const t = i / sphereSegments
    const angle = t * Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = bodyTop + Math.sin(angle) * radius
    points.push(new THREE.Vector2(x, y))
  }

  const geometry = new THREE.LatheGeometry(points, DUMMY_CONFIG.BODY_SEGMENTS)
  geometry.scale(1, 1, DUMMY_CONFIG.BODY_Z_SCALE)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  
  return geometry
}

// ==================== MAIN FACTORY ====================

function createDummy() {
  const root = new THREE.Group()
  root.name = "Dummy"

  // Materials
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: DUMMY_CONFIG.BODY_COLOR,
    roughness: 0.6,
    metalness: 0.1,
    clearcoat: 0,
    clearcoatRoughness: 0.1
  })

  const limbMaterial = bodyMaterial.clone()
  
  const bootMaterial = new THREE.MeshPhysicalMaterial({
    color: DUMMY_CONFIG.BOOT_COLOR,
    roughness: 0.8
  })

  // ----- Body -----
  const bodyGeometry = createBodyGeometry()
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
  
  const bbox = bodyGeometry.boundingBox
  const bodyCenterY = (bbox.max.y + bbox.min.y) / 2
  bodyMesh.position.y = -bodyCenterY + DUMMY_CONFIG.MESH_LIFT
  root.add(bodyMesh)

  // ----- Ears -----
  const { leftEar, rightEar } = createEars(bodyCenterY, DUMMY_CONFIG.MESH_LIFT, limbMaterial)
  root.add(leftEar)
  root.add(rightEar)

  // ----- Legs -----
  root.add(createLeg(-DUMMY_CONFIG.LEG_X_OFFSET, bodyCenterY, DUMMY_CONFIG.MESH_LIFT, limbMaterial, bootMaterial))
  root.add(createLeg(DUMMY_CONFIG.LEG_X_OFFSET, bodyCenterY, DUMMY_CONFIG.MESH_LIFT, limbMaterial, bootMaterial))

  // ----- Symbol (Crash Test Dummy logo) -----
  const symbolMaterial = new THREE.MeshStandardMaterial({
    map: createSymbolTexture(),
    emissiveMap: createEmissiveTexture(),
    emissive: DUMMY_CONFIG.SYMBOL_EMISSIVE_COLOR,
    emissiveIntensity: 1,
    transparent: true,
  })

  const symbolGeo = new THREE.CircleGeometry(DUMMY_CONFIG.SYMBOL_RADIUS, DUMMY_CONFIG.SYMBOL_SEGMENTS)
  const symbolMesh = new THREE.Mesh(symbolGeo, symbolMaterial)
  symbolMesh.position.set(
    0, 
    DUMMY_CONFIG.BODY_HEIGHT * 0.5 - bodyCenterY + DUMMY_CONFIG.MESH_LIFT, 
    DUMMY_CONFIG.BODY_RADIUS * DUMMY_CONFIG.BODY_Z_SCALE + DUMMY_CONFIG.SYMBOL_Z_OFFSET
  )
  symbolMesh.renderOrder = 1
  root.add(symbolMesh)

  // ----- Face (via shader injection) -----
  const faceCanvas = document.createElement("canvas")
  faceCanvas.width = 256
  faceCanvas.height = 256
  const faceCtx = faceCanvas.getContext("2d")

  // Draw face: two eyes and a mouth
  faceCtx.fillStyle = "#000000"
  faceCtx.beginPath()
  faceCtx.arc(90, 120, 12, 0, Math.PI * 2)
  faceCtx.fill()

  faceCtx.beginPath()
  faceCtx.arc(166, 120, 12, 0, Math.PI * 2)
  faceCtx.fill()

  faceCtx.strokeStyle = "#000000"
  faceCtx.lineWidth = 6
  faceCtx.lineCap = "round"
  faceCtx.beginPath()
  faceCtx.arc(128, 155, 24, 0.25 * Math.PI, 0.75 * Math.PI)
  faceCtx.stroke()

  const faceTexture = new THREE.CanvasTexture(faceCanvas)

  // Inject face shader
  bodyMesh.material.onBeforeCompile = (shader) => {
    shader.uniforms.faceTexture = { value: faceTexture }
    shader.vertexShader = '#define USE_UV\n' + shader.vertexShader
    shader.fragmentShader = '#define USE_UV\nuniform sampler2D faceTexture;\n' + shader.fragmentShader
    
    const faceLogic = `
      float faceUvX = mod(vUv.x + 0.5, 1.0);
      vec2 faceUvMin = vec2(0.41, 0.43); 
      vec2 faceUvMax = vec2(0.59, 0.77);
      if (faceUvX > faceUvMin.x && faceUvX < faceUvMax.x && vUv.y > faceUvMin.y && vUv.y < faceUvMax.y) {
          vec2 faceUv = vec2((faceUvX - faceUvMin.x) / (faceUvMax.x - faceUvMin.x), (vUv.y - faceUvMin.y) / (faceUvMax.y - faceUvMin.y));
          vec4 faceColor = texture2D(faceTexture, faceUv);
          gl_FragColor = vec4(mix(gl_FragColor.rgb, faceColor.rgb, faceColor.a), gl_FragColor.a);
      }
    `
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', faceLogic + '\n#include <dithering_fragment>')
  }

  // ----- Physics -----
  root.userData.physics = dummyPhysicsDef
  root.userData.mainColor = new THREE.Color(DUMMY_CONFIG.BODY_COLOR)

  // Animation timer for blinking
  let symbolBlinkTimer = 0

  // ----- Update Logic -----
  root.userData.update = function(delta, particleManager) {
    root.rotation.x = 0
    root.rotation.z = 0

    symbolBlinkTimer += delta
    const blinkCycle = DUMMY_CONFIG.SYMBOL_BLINK_CYCLE
    const blinkPhase = (symbolBlinkTimer / blinkCycle) * Math.PI * 2
    const intensity = (Math.sin(blinkPhase) + 1) * 0.5
    
    symbolMaterial.emissiveIntensity = intensity * DUMMY_CONFIG.SYMBOL_EMISSIVE_INTENSITY
  }

  // Add trigger zones
  CollisionManager.addCharacterTriggerZones(root)
  
  return root
}

// ==================== EXPORT ====================

export function getDummyAsset() {
  return {
    name: "Dummy",
    description: "Khá nặng!",
    factory: () => createDummy(),
    physics: dummyPhysicsDef
  }
}