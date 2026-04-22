import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AssetCache } from '../AssetCache.js'

const M4A1_CONFIG = {
  PHYSICS_MASS: 2.5,
  PHYSICS_LINEAR_DAMPING: 0.3,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  // Hitbox (physics collider)
    HITBOX_SIZE_X: 0.3, // Swapped with Z to match rotation
    HITBOX_SIZE_Y: 0.7, // Keep as is
    HITBOX_SIZE_Z: 2.5, // Swapped with X to match rotation
  HITBOX_OFFSET_Y: 0.0,
  // Visual mesh scale
  MESH_SCALE: 3.0,
  MESH_OPACITY: 1.0
}

const m4a1PhysicsDef = {
  type: 'dynamic',
  mass: M4A1_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: M4A1_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: M4A1_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'box',
      size: [
        M4A1_CONFIG.HITBOX_SIZE_X,
        M4A1_CONFIG.HITBOX_SIZE_Y,
        M4A1_CONFIG.HITBOX_SIZE_Z
      ],
      offset: [0, M4A1_CONFIG.HITBOX_OFFSET_Y, 0]
    }
  ],
  material: 'item'
}

function createTransparentMaterialVariant(material) {
  if (!material) return material
  const cloned = material.clone()
  cloned.transparent = true
  cloned.opacity = Math.min(cloned.opacity ?? 1, M4A1_CONFIG.MESH_OPACITY)
  return cloned
}

function createM4A1() {
  const root = new THREE.Group()
  root.name = 'M4A1 Assault Rifle'

  // Physics
  root.userData.physics = m4a1PhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  // Get model from cache (must be preloaded)
  const cachedGLTF = AssetCache.getModel('funny_item')
  if (!cachedGLTF) {
    console.error('M4A1 model not preloaded. Did you call preloadCoreAssets?')
    // Fallback: simple box
    const placeholderGeometry = new THREE.BoxGeometry(
      M4A1_CONFIG.HITBOX_SIZE_X,
      M4A1_CONFIG.HITBOX_SIZE_Y,
      M4A1_CONFIG.HITBOX_SIZE_Z
    )
    const placeholderMaterial = new THREE.MeshStandardMaterial({
      color: '#444',
      roughness: 0.6,
      metalness: 0.4
    })
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial)
    placeholder.castShadow = true
    placeholder.receiveShadow = true
    placeholder.name = 'M4A1 Placeholder'
    root.add(placeholder)
    return root
  }

  const model = cloneSkeleton(cachedGLTF.scene)
  model.scale.setScalar(M4A1_CONFIG.MESH_SCALE)


  // Rotate model so it faces forward (Y axis)
  model.rotation.y = Math.PI / 2;

  // Center model
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

  model.name = 'M4A1 Model'
  root.add(model)

  return root
}

// ==================== EXPORT ====================

export function getM4A1Asset() {
  return {
    name: 'Funny Item',
    description: 'Why is it even here???',
    factory: createM4A1,
    physics: m4a1PhysicsDef
  }
}
