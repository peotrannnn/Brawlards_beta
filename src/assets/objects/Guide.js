import * as THREE from 'three'
import { CollisionManager } from '../../utils/collisionManager.js'

const GUIDE_CONFIG = {
  PHYSICS_MASS: 0.01,
  PHYSICS_LINEAR_DAMPING: 0,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.3,
  BODY_RADIUS: 0.4,
  BODY_HEIGHT: 0.5,
  BODY_Z_SCALE: 0.6,
  BODY_SEGMENTS: 64,
  MESH_LIFT: 0.5,
  BODY_COLOR: '#000000',
  FACE_COLOR: '#FFFFFF',
  LIGHT_STICK_COLOR: '#FFFFFF',
  LIGHT_STICK_EMISSIVE: '#00FF00',
  LIGHT_STICK_EMISSIVE_INTENSITY: 2,
  LIGHT_STICK_OPACITY: 0.8,
  EAR_RADIUS: 0.08,
  EAR_HEIGHT: 0.12,
  EAR_X_OFFSET: 0.16,
  EAR_Z_OFFSET: 0.1,
  LEG_HEIGHT: 0.35,
  LEG_RADIUS: 0.025,
  LEG_SEGMENTS: 16,
  LEG_X_OFFSET: 0.18,
  LIGHT_STICK_LENGTH: 0.5,
  LIGHT_STICK_RADIUS: 0.06,
  LIGHT_STICK_SEGMENTS: 32,
  LIGHT_STICK_POSITION_Y_FACTOR: 0.6,
  POINT_LIGHT_COLOR: '#00FF00',
  POINT_LIGHT_INTENSITY: 2,
  POINT_LIGHT_DISTANCE: 5,
  TRIGGER_SMALL_RADIUS: 1.5,
  TRIGGER_LARGE_RADIUS: 10,
}

const guidePhysicsDef = {
  type: 'dynamic',
  mass: GUIDE_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: GUIDE_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: GUIDE_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'sphere',
      radius: GUIDE_CONFIG.HITBOX_RADIUS,
      offset: [0, 0, 0]
    }
  ],
  material: 'player'
}

function createBodyGeometry() {
  const points = []
  const flatY = 0
  const bodyTop = GUIDE_CONFIG.BODY_HEIGHT
  const roundHeight = 0.08
  const radius = GUIDE_CONFIG.BODY_RADIUS

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

  const geometry = new THREE.LatheGeometry(points, GUIDE_CONFIG.BODY_SEGMENTS)
  geometry.scale(1, 1, GUIDE_CONFIG.BODY_Z_SCALE)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  
  return geometry
}

/**
 * Create cat ears
 */
function createEars(bodyCenterY, meshLift, limbMaterial) {
  const earGeometry = new THREE.ConeGeometry(
    GUIDE_CONFIG.EAR_RADIUS, 
    GUIDE_CONFIG.EAR_HEIGHT, 
    3
  )
  const earMaterial = limbMaterial

  const leftEar = new THREE.Mesh(earGeometry, earMaterial)
  const rightEar = new THREE.Mesh(earGeometry, earMaterial)

  leftEar.rotation.x = Math.PI / 3
  rightEar.rotation.x = Math.PI / 3

  const earY = GUIDE_CONFIG.BODY_HEIGHT + GUIDE_CONFIG.BODY_RADIUS - bodyCenterY + meshLift

  leftEar.position.set(-GUIDE_CONFIG.EAR_X_OFFSET, earY, GUIDE_CONFIG.EAR_Z_OFFSET)
  rightEar.position.set(GUIDE_CONFIG.EAR_X_OFFSET, earY, GUIDE_CONFIG.EAR_Z_OFFSET)

  return { leftEar, rightEar }
}

/**
 * Create a leg
 */
function createLeg(offsetX, bodyCenterY, meshLift, limbMaterial) {
  const pivot = new THREE.Group()
  const legGeo = new THREE.CylinderGeometry(
    GUIDE_CONFIG.LEG_RADIUS, 
    GUIDE_CONFIG.LEG_RADIUS, 
    GUIDE_CONFIG.LEG_HEIGHT, 
    GUIDE_CONFIG.LEG_SEGMENTS
  )
  
  const leg = new THREE.Mesh(legGeo, limbMaterial)
  leg.position.y = -GUIDE_CONFIG.LEG_HEIGHT / 2
  pivot.add(leg)

  pivot.position.set(offsetX, -bodyCenterY + meshLift, 0)
  pivot.userData.isLeg = true
  return pivot
}

/**
 * Create face canvas
 */
function createFaceCanvas() {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext("2d")

  const drawFace = (mood = 'sad') => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // White eyes
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.arc(90, 120, 12, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(166, 120, 12, 0, Math.PI * 2)
    ctx.fill()

    // Mouth by mood
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.beginPath()

    if (mood === 'happy') {
      ctx.arc(128, 155, 24, 0.25 * Math.PI, 0.75 * Math.PI)
    } else {
      ctx.arc(128, 184, 24, 1.25 * Math.PI, 1.75 * Math.PI)
    }

    ctx.stroke()
  }

  drawFace('sad')

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  return {
    texture,
    setMood: (mood) => {
      drawFace(mood)
      texture.needsUpdate = true
    }
  }
}

// ==================== MAIN FACTORY ====================

function createGuide() {
  const root = new THREE.Group()
  root.name = "Guide"

  // Materials
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: GUIDE_CONFIG.BODY_COLOR,
    roughness: 0.8,
    metalness: 0.001,
    clearcoat: 0,
    clearcoatRoughness: 0.1
  })

  const limbMaterial = bodyMaterial.clone()

  // ----- Body -----
  const bodyGeometry = createBodyGeometry()
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
  
  const bbox = bodyGeometry.boundingBox
  const bodyCenterY = (bbox.max.y + bbox.min.y) / 2
  bodyMesh.position.y = -bodyCenterY + GUIDE_CONFIG.MESH_LIFT
  root.add(bodyMesh)

  // ----- Face (via shader injection) -----
  const face = createFaceCanvas()
  const faceTexture = face.texture

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
  const { leftEar, rightEar } = createEars(bodyCenterY, GUIDE_CONFIG.MESH_LIFT, limbMaterial)
  root.add(leftEar)
  root.add(rightEar)

  // ----- Legs -----
  root.add(createLeg(-GUIDE_CONFIG.LEG_X_OFFSET, bodyCenterY, GUIDE_CONFIG.MESH_LIFT, limbMaterial))
  root.add(createLeg(GUIDE_CONFIG.LEG_X_OFFSET, bodyCenterY, GUIDE_CONFIG.MESH_LIFT, limbMaterial))

  // ----- Light Stick Anchor (no default stick mesh) -----
  const stickY = GUIDE_CONFIG.BODY_HEIGHT * GUIDE_CONFIG.LIGHT_STICK_POSITION_Y_FACTOR - bodyCenterY + GUIDE_CONFIG.MESH_LIFT
  const stickZ = (GUIDE_CONFIG.BODY_RADIUS * GUIDE_CONFIG.BODY_Z_SCALE - 0.05) + (GUIDE_CONFIG.LIGHT_STICK_LENGTH / 2)
  const lightStickAnchor = new THREE.Object3D()
  lightStickAnchor.name = 'GuideLightStickAnchor'
  lightStickAnchor.rotation.x = Math.PI / 2
  lightStickAnchor.position.set(0, stickY, stickZ)
  root.add(lightStickAnchor)

  // ----- Physics -----
  root.userData.physics = guidePhysicsDef
  root.userData.mainColor = new THREE.Color(GUIDE_CONFIG.BODY_COLOR)
  root.userData.lightStickAnchorName = 'GuideLightStickAnchor'
  root.userData.setMood = (mood) => face.setMood(mood)

  // ----- Update Logic -----
  root.userData.update = function(delta) {
    // Keep character upright
    root.rotation.x = 0
    root.rotation.z = 0
  }

  // Add trigger zones (used by GuideAI for follow/protection behavior)
  CollisionManager.addCharacterTriggerZones(root, {
    smallRadius: GUIDE_CONFIG.TRIGGER_SMALL_RADIUS,
    largeRadius: GUIDE_CONFIG.TRIGGER_LARGE_RADIUS,
  })
  
  return root
}

// ==================== EXPORT ====================

export function getGuideAsset() {
  return {
    name: "Guide",
    description: "The most loyal one, even after death.",
    factory: () => createGuide(),
    physics: guidePhysicsDef
  }
}