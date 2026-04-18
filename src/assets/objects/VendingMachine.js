import * as THREE from 'three'
import { AssetCache } from '../AssetCache.js'

const VENDING_MACHINE_CONFIG = {
  HITBOX_SIZE_X: 8.5,
  HITBOX_SIZE_Y: 19.5,
  HITBOX_SIZE_Z: 6.75,
  TRIGGER_SIZE_X: 11.0,
  TRIGGER_SIZE_Y: 21.0,
  TRIGGER_SIZE_Z: 9.25,
  MODEL_OPACITY: 1.0,
  GLOW_COLOR: '#ff964a',
  GLOW_INTENSITY: 0.5,
  EMIT_LIGHT_INTENSITY: 30,
  EMIT_LIGHT_DISTANCE: 20,
  EMIT_LIGHT_DECAY: 2.25,
  EMIT_LIGHT_HEIGHT_OFFSET: 1.0
}

const vendingMachinePhysicsDef = {
  type: 'static',
  material: 'table',
  shapes: [
    {
      type: 'box',
      role: 'blocking',
      size: [
        VENDING_MACHINE_CONFIG.HITBOX_SIZE_X,
        VENDING_MACHINE_CONFIG.HITBOX_SIZE_Y,
        VENDING_MACHINE_CONFIG.HITBOX_SIZE_Z
      ],
      // Use center pivot so mesh center and hitbox center match exactly.
      offset: [0, 0, 0]
    },
    {
      type: 'box',
      role: 'coinTrigger',
      isTrigger: true,
      debugColor: '#ffffff',
      size: [
        VENDING_MACHINE_CONFIG.TRIGGER_SIZE_X,
        VENDING_MACHINE_CONFIG.TRIGGER_SIZE_Y,
        VENDING_MACHINE_CONFIG.TRIGGER_SIZE_Z
      ],
      offset: [0, 0, 0]
    }
  ]
}

function cloneVendingScene(gltf) {
  return gltf.scene.clone(true)
}

function prepareVendingMaterials(model) {
  model.traverse((child) => {
    if (!child.isMesh) return

    const applyToMaterial = (material) => {
      if (!material) return material
      const cloned = material.clone()

      const finalOpacity = Math.min(cloned.opacity ?? 1, VENDING_MACHINE_CONFIG.MODEL_OPACITY)
      cloned.opacity = finalOpacity
      cloned.transparent = finalOpacity < 0.999
      cloned.depthWrite = true
      cloned.depthTest = true
      cloned.side = THREE.FrontSide

      if ('metalness' in cloned) cloned.metalness = Math.max(cloned.metalness ?? 0, 0.35)
      if ('roughness' in cloned) cloned.roughness = Math.min(cloned.roughness ?? 1, 0.55)
      if ('emissive' in cloned) cloned.emissive = new THREE.Color(VENDING_MACHINE_CONFIG.GLOW_COLOR)
      if ('emissiveMap' in cloned && cloned.map) cloned.emissiveMap = cloned.map
      if ('emissiveIntensity' in cloned) cloned.emissiveIntensity = VENDING_MACHINE_CONFIG.GLOW_INTENSITY
      return cloned
    }

    if (Array.isArray(child.material)) {
      child.material = child.material.map(applyToMaterial)
    } else {
      child.material = applyToMaterial(child.material)
    }

    child.castShadow = true
    child.receiveShadow = true
  })
}

function createVendingPlaceholder() {
  const placeholder = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(
      VENDING_MACHINE_CONFIG.HITBOX_SIZE_X,
      VENDING_MACHINE_CONFIG.HITBOX_SIZE_Y,
      VENDING_MACHINE_CONFIG.HITBOX_SIZE_Z
    ),
    new THREE.MeshStandardMaterial({
      color: '#d85c26',
      roughness: 0.38,
      metalness: 0.42
    })
  )
  body.castShadow = true
  body.receiveShadow = true
  placeholder.add(body)

  return placeholder
}

function createVendingMachine() {
  const root = new THREE.Group()
  root.name = 'Vending Machine'
  root.userData.physics = vendingMachinePhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  // Get model from cache (must be preloaded)
  const cachedGLTF = AssetCache.getModel('vending_machine')
  if (!cachedGLTF) {
    console.error('Vending Machine model not preloaded. Did you call preloadCoreAssets?')
    root.add(createVendingPlaceholder())
    return root
  }

  const model = cloneVendingScene(cachedGLTF)

  // Fit the imported model inside the intended hitbox footprint
  // so oversized authoring units do not blow up the whole room.
  model.updateMatrixWorld(true)
  const rawBounds = new THREE.Box3().setFromObject(model)
  const rawSize = rawBounds.getSize(new THREE.Vector3())

  const safeRawX = Math.max(rawSize.x, 1e-4)
  const safeRawY = Math.max(rawSize.y, 1e-4)
  const safeRawZ = Math.max(rawSize.z, 1e-4)

  const targetX = VENDING_MACHINE_CONFIG.HITBOX_SIZE_X
  const targetY = VENDING_MACHINE_CONFIG.HITBOX_SIZE_Y
  const targetZ = VENDING_MACHINE_CONFIG.HITBOX_SIZE_Z

  // Scale each axis to match hitbox bounds 1:1.
  model.scale.set(
    Math.max(targetX / safeRawX, 1e-4),
    Math.max(targetY / safeRawY, 1e-4),
    Math.max(targetZ / safeRawZ, 1e-4)
  )
  prepareVendingMaterials(model)

  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())

  model.position.sub(center)

  model.name = 'Vending Machine Model'
  root.add(model)

  const emitLight = new THREE.PointLight(
    VENDING_MACHINE_CONFIG.GLOW_COLOR,
    VENDING_MACHINE_CONFIG.EMIT_LIGHT_INTENSITY,
    VENDING_MACHINE_CONFIG.EMIT_LIGHT_DISTANCE,
    VENDING_MACHINE_CONFIG.EMIT_LIGHT_DECAY
  )
  emitLight.position.set(0, VENDING_MACHINE_CONFIG.EMIT_LIGHT_HEIGHT_OFFSET, 0)
  emitLight.castShadow = false
  emitLight.userData.isVendingEmitLight = true
  root.add(emitLight)

  return root
}

export function getVendingMachineAsset() {
  return {
    name: 'Vending Machine',
    description: 'Máy bán hàng bí ẩn!',
    factory: () => createVendingMachine(),
    physics: vendingMachinePhysicsDef
  }
}