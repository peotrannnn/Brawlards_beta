import * as THREE from 'three'

const SILVERCOIN_CONFIG = {
  PHYSICS_MASS: 0.18,
  PHYSICS_LINEAR_DAMPING: 0.34,
  PHYSICS_ANGULAR_DAMPING: 0.52,
  HITBOX_RADIUS: 0.18,
  HITBOX_LENGTH: 0.05,
  MESH_RADIUS: 0.18,
  MESH_LENGTH: 0.045,
  MESH_SEGMENTS: 48,
  EDGE_RING_RADIUS: 0.168,
  EDGE_RING_TUBE: 0.014,
  FACE_COLOR: '#d9e1ea',
  EDGE_COLOR: '#f3f8ff',
  EMISSIVE_COLOR: '#aab8c8',
  EMISSIVE_INTENSITY: 0.24,
  FACE_SYMBOL: 'P',
  SYMBOL_COLOR: '#5a6470',
  SYMBOL_RING_COLOR: '#eef5ff'
}

const silverCoinPhysicsDef = {
  type: 'dynamic',
  mass: SILVERCOIN_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: SILVERCOIN_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: SILVERCOIN_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'cylinder',
      radius: SILVERCOIN_CONFIG.HITBOX_RADIUS,
      length: SILVERCOIN_CONFIG.HITBOX_LENGTH,
      offset: [0, 0, 0]
    }
  ],
  material: 'item'
}

function createCoinFaceMaterial() {
  const faceTexture = createCoinFaceTexture()
  return new THREE.MeshPhysicalMaterial({
    color: SILVERCOIN_CONFIG.FACE_COLOR,
    map: faceTexture,
    emissive: SILVERCOIN_CONFIG.EMISSIVE_COLOR,
    emissiveIntensity: SILVERCOIN_CONFIG.EMISSIVE_INTENSITY,
    roughness: 0.18,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  })
}

function createCoinFaceTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const center = size * 0.5
  const outerRadius = size * 0.48
  const innerRadius = size * 0.39

  ctx.clearRect(0, 0, size, size)

  // Base radial gradient - enhanced contrast
  const faceGradient = ctx.createRadialGradient(
    center - size * 0.12,
    center - size * 0.15,
    size * 0.06,
    center,
    center,
    outerRadius
  )
  faceGradient.addColorStop(0, '#fafeff')
  faceGradient.addColorStop(0.4, '#e8f0f8')
  faceGradient.addColorStop(0.8, '#c0d0dd')
  faceGradient.addColorStop(1, '#9aa8b8')
  ctx.fillStyle = faceGradient
  ctx.fillRect(0, 0, size, size)

  // Outer ring - bold and bright
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.042
  ctx.beginPath()
  ctx.arc(center, center, outerRadius - size * 0.01, 0, Math.PI * 2)
  ctx.stroke()

  // Outer ring shadow
  ctx.strokeStyle = '#7080a0'
  ctx.lineWidth = size * 0.008
  ctx.beginPath()
  ctx.arc(center, center, outerRadius + size * 0.008, 0, Math.PI * 2)
  ctx.stroke()

  // Inner ring - bold
  ctx.strokeStyle = '#8899cc'
  ctx.lineWidth = size * 0.022
  ctx.beginPath()
  ctx.arc(center, center, innerRadius, 0, Math.PI * 2)
  ctx.stroke()

  // Inner ring highlight
  ctx.strokeStyle = '#f0f8ff'
  ctx.lineWidth = size * 0.006
  ctx.beginPath()
  ctx.arc(center, center, innerRadius - size * 0.02, 0, Math.PI * 2)
  ctx.stroke()

  // Symbol shadow/depth - dark outline
  ctx.fillStyle = '#2a3a50'
  ctx.font = `bold ${Math.floor(size * 0.38)}px "Georgia", "Times New Roman", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Draw shadow offset
  ctx.fillText(SILVERCOIN_CONFIG.FACE_SYMBOL, center + size * 0.01, center + size * 0.04 + size * 0.01)
  
  // Symbol main - bold and dark
  ctx.fillStyle = '#1a2540'
  ctx.fillText(SILVERCOIN_CONFIG.FACE_SYMBOL, center, center + size * 0.04)
  
  // Symbol highlight - subtle bright edge
  ctx.fillStyle = '#e8f0f8'
  ctx.font = `bold ${Math.floor(size * 0.36)}px "Georgia", "Times New Roman", serif`
  ctx.fillText(SILVERCOIN_CONFIG.FACE_SYMBOL, center - size * 0.006, center + size * 0.035)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function createCoinEdgeMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: SILVERCOIN_CONFIG.EDGE_COLOR,
    roughness: 0.12,
    metalness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  })
}

function createSilverCoin() {
  const root = new THREE.Group()
  root.name = 'Silver Coin'

  const coinGeometry = new THREE.CylinderGeometry(
    SILVERCOIN_CONFIG.MESH_RADIUS,
    SILVERCOIN_CONFIG.MESH_RADIUS,
    SILVERCOIN_CONFIG.MESH_LENGTH,
    SILVERCOIN_CONFIG.MESH_SEGMENTS
  )
  const sideMaterial = createCoinEdgeMaterial()
  const topMaterial = createCoinFaceMaterial()
  const bottomMaterial = createCoinFaceMaterial()
  const coinMesh = new THREE.Mesh(coinGeometry, [sideMaterial, topMaterial, bottomMaterial])
  coinMesh.castShadow = true
  coinMesh.receiveShadow = true
  coinMesh.name = 'Silver Coin Body'
  root.add(coinMesh)

  const rimGeometry = new THREE.TorusGeometry(
    SILVERCOIN_CONFIG.EDGE_RING_RADIUS,
    SILVERCOIN_CONFIG.EDGE_RING_TUBE,
    14,
    SILVERCOIN_CONFIG.MESH_SEGMENTS
  )
  const rimMaterial = createCoinEdgeMaterial()
  const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial)
  rimMesh.rotation.x = Math.PI / 2
  rimMesh.castShadow = true
  rimMesh.receiveShadow = true
  rimMesh.name = 'Silver Coin Rim'
  root.add(rimMesh)

  root.userData.physics = silverCoinPhysicsDef
  root.userData.update = function update() {}

  return root
}

export function getSilverCoinAsset() {
  return {
    name: 'Silver Coin',
    description: 'A type of currency used for vending machines.',
    factory: () => createSilverCoin(),
    physics: silverCoinPhysicsDef
  }
}