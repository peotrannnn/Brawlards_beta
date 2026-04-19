import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AssetCache } from '../AssetCache.js'

const BABYOIL_CONFIG = {
  PHYSICS_MASS: 0.5,
  PHYSICS_LINEAR_DAMPING: 0.3,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  // Hitbox (physics collider)
  HITBOX_SIZE_X: 0.28,
  HITBOX_SIZE_Y: 0.95,
  HITBOX_SIZE_Z: 0.22,
  HITBOX_OFFSET_Y: -0.08,
  // Visual mesh scale — set manually, independent of hitbox
  MESH_SCALE: 5,
  MESH_OPACITY: 0.84,
  POINT_LIGHT_INTENSITY: 1,
  POINT_LIGHT_DISTANCE: 3
}

const babyOilPhysicsDef = {
  type: 'dynamic',
  mass: BABYOIL_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: BABYOIL_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: BABYOIL_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'box',
      size: [
        BABYOIL_CONFIG.HITBOX_SIZE_X,
        BABYOIL_CONFIG.HITBOX_SIZE_Y,
        BABYOIL_CONFIG.HITBOX_SIZE_Z
      ],
      offset: [0, BABYOIL_CONFIG.HITBOX_OFFSET_Y, 0]
    }
  ],
  material: 'item'
}

function createTransparentMaterialVariant(material) {
  if (!material) return material
  const cloned = material.clone()
  cloned.transparent = true
  cloned.opacity = Math.min(cloned.opacity ?? 1, BABYOIL_CONFIG.MESH_OPACITY)
  return cloned
}

function createBabyOil() {
  const root = new THREE.Group()
  root.name = "Baby Oil"

  // Physics (set immediately)
  root.userData.physics = babyOilPhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  // Update logic
  root.userData.update = function(delta) {
    // Optional: Add any dynamic behavior here
  }

  // Get model from cache (must be preloaded)
  const cachedGLTF = AssetCache.getModel('baby_oil')
  if (!cachedGLTF) {
    console.error('BabyOil model not preloaded. Did you call preloadCoreAssets?')
    // Fallback: create simple cylinder as placeholder
    const placeholderGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 32)
    const placeholderMaterial = new THREE.MeshStandardMaterial({
      color: '#FFD700',
      roughness: 0.6,
      metalness: 0.2
    })
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial)
    placeholder.castShadow = true
    placeholder.receiveShadow = true
    placeholder.name = "Baby Oil Placeholder"
    root.add(placeholder)
    return root
  }

  const model = cloneSkeleton(cachedGLTF.scene)

  model.scale.setScalar(BABYOIL_CONFIG.MESH_SCALE)

  // Center model so visual mesh stays aligned with physics body origin.
  model.updateMatrixWorld(true)
  const scaledBox = new THREE.Box3().setFromObject(model)
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
  model.position.sub(scaledCenter)

  // Set up mesh properties
  model.traverse((child) => {
    if (child.isMesh) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat => createTransparentMaterialVariant(mat))
      } else {
        child.material = createTransparentMaterialVariant(child.material)
      }
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  model.name = "Baby Oil Model"
  root.add(model)

  return root
}

// ==================== EXPORT ====================

export function getBabyOilAsset() {
  return {
    name: "Baby Oil",
    description: "Baby oil bottle! Used for lubrication!",
    factory: createBabyOil,
    physics: babyOilPhysicsDef
  }
}
