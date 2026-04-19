import * as THREE from 'three'
import { CollisionManager } from '../../utils/collisionManager.js'

const textureLoader = new THREE.TextureLoader()

const COMPUNE_CONFIG = {
  PHYSICS_MASS: 80,
  PHYSICS_LINEAR_DAMPING: 0.5,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.3,
  BODY_WIDTH: 0.5,
  BODY_HEIGHT: 0.4,
  BODY_DEPTH: 0.4,
  BODY_COLOR: '#dedede',
  BASE_WIDTH: 0.6,
  BASE_HEIGHT: 0.08,
  BASE_DEPTH: 0.45,
  BASE_COLOR: '#818181',
  SCREEN_WIDTH: 0.35,
  SCREEN_HEIGHT: 0.25,
  SCREEN_Z_OFFSET: 0.01,
  SCREEN_BLUE: '#5700e3',
  SCREEN_EMISSIVE_COLOR: '#0066FF',
  SCREEN_EMISSIVE_INTENSITY_NORMAL: 2.0,
  SCREEN_EMISSIVE_INTENSITY_DISCONNECTED: 0,
  MESH_LIFT: 0.25,
  // Back extension (box phía sau)
  BACK_EXTENSION_WIDTH: 0.4,
  BACK_EXTENSION_HEIGHT: 0.3,
  BACK_EXTENSION_DEPTH: 0.18,
}

const compunePhysicsDef = {
  type: 'dynamic',
  mass: COMPUNE_CONFIG.PHYSICS_MASS,
  fixedRotation: true,
  linearDamping: COMPUNE_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: COMPUNE_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'sphere',
      radius: COMPUNE_CONFIG.HITBOX_RADIUS,
      offset: [0, 0, 0]
    }
  ],
  material: 'player'
}

function createScreenTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  
  // Blue background (glow effect)
  ctx.fillStyle = '#0044AA'
  ctx.fillRect(0, 0, 256, 256)
  
  const gradient = ctx.createRadialGradient(128, 128, 40, 128, 128, 180)
  gradient.addColorStop(0, '#0088FF')
  gradient.addColorStop(1, '#001166')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  
  // Eyes (larger and brighter)
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(85, 100, 22, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.beginPath()
  ctx.arc(171, 100, 22, 0, Math.PI * 2)
  ctx.fill()
  
  // Mouth (thicker and more visible)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 14
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(85, 170)
  ctx.lineTo(171, 170)
  ctx.stroke()
  
  return new THREE.CanvasTexture(canvas)
}

/**
 * Tạo texture sọc ngang cho back extension
 */
function createBackExtensionTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  
  // Base color (giống body - #dedede)
  ctx.fillStyle = COMPUNE_CONFIG.BODY_COLOR
  ctx.fillRect(0, 0, 128, 96)
  
  // Vẽ các nét sọc ngang (màu tối hơn một chút)
  ctx.strokeStyle = '#a0a0a0'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  
  // Vẽ 4 nét sọc ngang
  for (let i = 0; i < 4; i++) {
    const y = 15 + i * 20
    ctx.beginPath()
    ctx.moveTo(10, y)
    ctx.lineTo(118, y)
    ctx.stroke()
  }
  
  return new THREE.CanvasTexture(canvas)
}

function loadNoSignalTexture() {
  return textureLoader.load(`${import.meta.env.BASE_URL}pictures/no_signal.png`)
}

function createCompune() {
  const root = new THREE.Group()
  root.name = "Compune"

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: COMPUNE_CONFIG.BODY_COLOR,
    roughness: 0.7,
    metalness: 0.15,
  })

  const baseMaterial = new THREE.MeshPhysicalMaterial({
    color: COMPUNE_CONFIG.BASE_COLOR,
    roughness: 0.8,
    metalness: 0.05,
  })
  const bodyGeometry = new THREE.BoxGeometry(
    COMPUNE_CONFIG.BODY_WIDTH,
    COMPUNE_CONFIG.BODY_HEIGHT,
    COMPUNE_CONFIG.BODY_DEPTH
  )
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
  bodyMesh.position.y = COMPUNE_CONFIG.MESH_LIFT
  root.add(bodyMesh)

  // ----- Base/Stand -----
  const baseGeometry = new THREE.BoxGeometry(
    COMPUNE_CONFIG.BASE_WIDTH,
    COMPUNE_CONFIG.BASE_HEIGHT,
    COMPUNE_CONFIG.BASE_DEPTH
  )
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial)
  baseMesh.position.y = COMPUNE_CONFIG.MESH_LIFT - COMPUNE_CONFIG.BODY_HEIGHT / 2 - COMPUNE_CONFIG.BASE_HEIGHT / 2
  root.add(baseMesh)

  // ----- Back Extension Box -----
  const backExtensionMaterial = new THREE.MeshPhysicalMaterial({
    color: COMPUNE_CONFIG.BODY_COLOR,
    roughness: 0.7,
    metalness: 0.15,
    map: createBackExtensionTexture(),
  })
  const backExtensionGeometry = new THREE.BoxGeometry(
    COMPUNE_CONFIG.BACK_EXTENSION_WIDTH,
    COMPUNE_CONFIG.BACK_EXTENSION_HEIGHT,
    COMPUNE_CONFIG.BACK_EXTENSION_DEPTH
  )
  const backExtensionMesh = new THREE.Mesh(backExtensionGeometry, backExtensionMaterial)
  // Vị trí: phía sau body, căn giữa theo Y
  backExtensionMesh.position.set(
    0,
    COMPUNE_CONFIG.MESH_LIFT,
    -(COMPUNE_CONFIG.BODY_DEPTH / 2 + COMPUNE_CONFIG.BACK_EXTENSION_DEPTH / 2)
  )
  root.add(backExtensionMesh)

  const screenMaterial = new THREE.MeshStandardMaterial({
    map: createScreenTexture(),
    emissive: COMPUNE_CONFIG.SCREEN_EMISSIVE_COLOR,
    emissiveIntensity: COMPUNE_CONFIG.SCREEN_EMISSIVE_INTENSITY_NORMAL,
    roughness: 0.2,
    metalness: 0.0,
  })

  const screenGeometry = new THREE.PlaneGeometry(
    COMPUNE_CONFIG.SCREEN_WIDTH,
    COMPUNE_CONFIG.SCREEN_HEIGHT
  )
  
  const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial)
  screenMesh.position.set(
    0,
    COMPUNE_CONFIG.MESH_LIFT,
    COMPUNE_CONFIG.BODY_DEPTH / 2 + COMPUNE_CONFIG.SCREEN_Z_OFFSET
  )
  screenMesh.renderOrder = 1
  root.add(screenMesh)

  root.userData.physics = compunePhysicsDef
  root.userData.mainColor = new THREE.Color(COMPUNE_CONFIG.BODY_COLOR)
  
  // Store screen mesh and textures for CompuneAI to switch displays
  root.userData.screenMesh = screenMesh
  root.userData.screenMaterial = screenMaterial
  root.userData.defaultScreenTexture = createScreenTexture()
  root.userData.noSignalTexture = loadNoSignalTexture()

  root.userData.update = function(delta, particleManager) {
    root.rotation.x = 0
    root.rotation.z = 0
  }

  CollisionManager.addCharacterTriggerZones(root)
  
  return root
}

export function getCompuneAsset() {
  return {
    name: "Compune",
    description: "Trust me bro. Like you’ve got any other choice.",
    factory: () => createCompune(),
    physics: compunePhysicsDef
  }
}
