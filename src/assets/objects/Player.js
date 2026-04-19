import * as THREE from 'three'
import { CollisionManager } from '../../utils/collisionManager.js'
import { BALL8_AI_CONFIG } from '../objects/BallFactory.js'

const PLAYER_CONFIG = {
  PHYSICS_MASS: 0.01,
  PHYSICS_LINEAR_DAMPING: 0,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.3,
  BODY_RADIUS: 0.4,
  BODY_HEIGHT: 0.5,
  BODY_Z_SCALE: 0.6,
  BODY_SEGMENTS: 64,
  MESH_LIFT: 0.5,
  BODY_COLOR: '#DDDDDD',
  FACE_COLOR: '#000000',
  EAR_RADIUS: 0.06,
  EAR_SEGMENTS: 32,
  EAR_Z_SCALE: 0.6,
  EAR_X_OFFSET: 0.16,
  EAR_Y_OFFSET: -0.02,
  EAR_Z_OFFSET: 0.02,
  LEG_HEIGHT: 0.35,
  LEG_RADIUS: 0.025,
  LEG_SEGMENTS: 16,
  LEG_X_OFFSET: 0.18,
  CUE_LENGTH: 4,
  CUE_TIP_RADIUS: 0.015,
  CUE_BUTT_RADIUS: 0.06,
  CUE_SEGMENTS: 32,
  CUE_COLOR: '#D8A56A',
  CUE_POSITION_Y_FACTOR: 0.6,
  CUE_Z_OFFSET: -0.05,
  CUE_MIN_LENGTH: 0.25
}

const playerPhysicsDef = {
  type: 'dynamic',
  mass: PLAYER_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: PLAYER_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: PLAYER_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'sphere',
      radius: PLAYER_CONFIG.HITBOX_RADIUS,
      offset: [0, 0, 0]
    }
  ],
  material: 'player'
}

function createBodyGeometry() {
  const points = []
  const flatY = 0
  const bodyTop = PLAYER_CONFIG.BODY_HEIGHT
  const roundHeight = 0.08
  const radius = PLAYER_CONFIG.BODY_RADIUS

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

  const geometry = new THREE.LatheGeometry(points, PLAYER_CONFIG.BODY_SEGMENTS)
  geometry.scale(1, 1, PLAYER_CONFIG.BODY_Z_SCALE)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  
  return geometry
}

/**
 * Create face canvas
 */
function createFaceCanvas() {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")

  // Eyes
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.arc(90, 120, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(166, 120, 12, 0, Math.PI * 2)
  ctx.fill()

  // Mouth
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(128, 155, 24, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.stroke()

  return new THREE.CanvasTexture(canvas)
}

/**
 * Create ears
 */
function createEars(bodyCenterY, meshLift, limbMaterial) {
  const earGeometry = new THREE.SphereGeometry(
    PLAYER_CONFIG.EAR_RADIUS, 
    PLAYER_CONFIG.EAR_SEGMENTS, 
    PLAYER_CONFIG.EAR_SEGMENTS
  )

  const leftEar = new THREE.Mesh(earGeometry, limbMaterial)
  const rightEar = new THREE.Mesh(earGeometry, limbMaterial)

  leftEar.scale.set(1, 1, PLAYER_CONFIG.EAR_Z_SCALE)
  rightEar.scale.set(1, 1, PLAYER_CONFIG.EAR_Z_SCALE)

  const earY = PLAYER_CONFIG.BODY_HEIGHT + PLAYER_CONFIG.BODY_RADIUS + PLAYER_CONFIG.EAR_Y_OFFSET - bodyCenterY + meshLift

  leftEar.position.set(-PLAYER_CONFIG.EAR_X_OFFSET, earY, PLAYER_CONFIG.EAR_Z_OFFSET)
  rightEar.position.set(PLAYER_CONFIG.EAR_X_OFFSET, earY, PLAYER_CONFIG.EAR_Z_OFFSET)

  return { leftEar, rightEar }
}

/**
 * Create a leg
 */
function createLeg(offsetX, bodyCenterY, meshLift, limbMaterial) {
  const pivot = new THREE.Group()
  const legGeo = new THREE.CylinderGeometry(
    PLAYER_CONFIG.LEG_RADIUS, 
    PLAYER_CONFIG.LEG_RADIUS, 
    PLAYER_CONFIG.LEG_HEIGHT, 
    PLAYER_CONFIG.LEG_SEGMENTS
  )
  
  const leg = new THREE.Mesh(legGeo, limbMaterial)
  leg.position.y = -PLAYER_CONFIG.LEG_HEIGHT / 2
  pivot.add(leg)

  pivot.position.set(offsetX, -bodyCenterY + meshLift, 0)
  pivot.userData.isLeg = true
  return pivot
}

/**
 * Create cue
 */
function createCue(bodyCenterY, meshLift) {
  const cuePivot = new THREE.Group()
  cuePivot.name = "CuePivot"

  const cueGeometry = new THREE.CylinderGeometry(
    PLAYER_CONFIG.CUE_TIP_RADIUS,
    PLAYER_CONFIG.CUE_BUTT_RADIUS,
    PLAYER_CONFIG.CUE_LENGTH,
    PLAYER_CONFIG.CUE_SEGMENTS
  )
  
  const woodMaterial = new THREE.MeshPhysicalMaterial({
    color: PLAYER_CONFIG.CUE_COLOR,
    roughness: 0.6,
    metalness: 0.05
  })

  const cueBody = new THREE.Mesh(cueGeometry, woodMaterial)
  cueBody.name = "PlayerCue"
  cueBody.position.y = PLAYER_CONFIG.CUE_LENGTH / 2
  cuePivot.add(cueBody)

  cuePivot.userData = {
    originalLength: PLAYER_CONFIG.CUE_LENGTH,
    minLength: PLAYER_CONFIG.CUE_MIN_LENGTH,
    isCuePivot: true,
    isBeingRemoved: false
  }

  const cueY = PLAYER_CONFIG.BODY_HEIGHT * PLAYER_CONFIG.CUE_POSITION_Y_FACTOR - bodyCenterY + meshLift
  const cueZ = PLAYER_CONFIG.BODY_RADIUS * PLAYER_CONFIG.BODY_Z_SCALE + PLAYER_CONFIG.CUE_Z_OFFSET

  cuePivot.position.set(0, cueY, cueZ)
  cuePivot.rotation.x = Math.PI / 2
  
  return cuePivot
}

// ==================== MAIN FACTORY ====================

function createPlayer() {
  const root = new THREE.Group()
  root.name = "Player"

  // Materials
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: PLAYER_CONFIG.BODY_COLOR,
    roughness: 0.8,
    metalness: 0.001,
    clearcoat: 0,
    clearcoatRoughness: 0.1
  })

  const limbMaterial = bodyMaterial.clone()

  // ----- Body -----
  const bodyGeometry = createBodyGeometry()
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
  bodyMesh.name = 'PlayerBodyMesh'
  bodyMesh.userData.isPlayerBodyMain = true
  
  const bbox = bodyGeometry.boundingBox
  const bodyCenterY = (bbox.max.y + bbox.min.y) / 2
  bodyMesh.position.y = -bodyCenterY + PLAYER_CONFIG.MESH_LIFT
  root.add(bodyMesh)

  // ----- Face (via shader injection) -----
  const faceTexture = createFaceCanvas()

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

  // ----- Ears -----
  const { leftEar, rightEar } = createEars(bodyCenterY, PLAYER_CONFIG.MESH_LIFT, limbMaterial)
  root.add(leftEar)
  root.add(rightEar)

  // ----- Legs -----
  root.add(createLeg(-PLAYER_CONFIG.LEG_X_OFFSET, bodyCenterY, PLAYER_CONFIG.MESH_LIFT, limbMaterial))
  root.add(createLeg(PLAYER_CONFIG.LEG_X_OFFSET, bodyCenterY, PLAYER_CONFIG.MESH_LIFT, limbMaterial))

  // ----- Cue (dynamic creation) -----
  root.userData.createCue = function() {
    if (root.getObjectByName("CuePivot")) return
    const cuePivot = createCue(bodyCenterY, PLAYER_CONFIG.MESH_LIFT)
    root.add(cuePivot)
  }

  root.userData.removeCue = function() {
    const cuePivot = root.getObjectByName("CuePivot")
    if (cuePivot) {
      cuePivot.userData.isBeingRemoved = true
      root.remove(cuePivot)
    }
  }

  root.userData.cleanup = function() {
    root.userData.removeCue()
  }

  // ----- Physics -----
  root.userData.physics = playerPhysicsDef
  
  // ----- Trigger for Ball 8 collision detection -----
  // Use BALL8_AI_CONFIG.groupingMinDistance as inner trigger mesh radius (0.6)
  // Same threshold used for Ball 8 grouping behavior
  root.userData.triggerRadius = BALL8_AI_CONFIG.groupingMinDistance
  root.userData.mainColor = new THREE.Color(PLAYER_CONFIG.BODY_COLOR)

  // Add trigger zones
  CollisionManager.addCharacterTriggerZones(root)
  
  return root
}

// ==================== EXPORT ====================

export function getPlayerAsset() {
  return {
    name: "Player",
    description: "Sẽ có cue dài (cây CƠ dài), only when you take control... (Bro tui muốn chèn joke tiếng việt mà giờ phải dịch tiếng Anh.",
    factory: () => createPlayer(),
    physics: playerPhysicsDef
  }
}