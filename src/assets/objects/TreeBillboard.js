import * as THREE from 'three'

const TREE_CONFIG = {
  treeTypes: 9, // tree1.png to tree9.png
  // Keep billboard ratio aligned with 512x2048 source texture (1:4).
  baseWidth: 4.65,
  baseHeight: 18.6,
  billboardMode: 'y-locked' // Only rotate around Y axis
}

const treeTextureLoader = new THREE.TextureLoader()
let cachedTreeTextures = {}
const cachedTreeMaterialControllers = new Map()
let cachedTreeGeometry = null

function getTreeTexture(treeIndex) {
  const index = Math.max(1, Math.min(TREE_CONFIG.treeTypes, treeIndex))
  const key = `tree${index}`

  if (cachedTreeTextures[key]) return cachedTreeTextures[key]

  const textureUrl = new URL(`../../pictures/trees/tree${index}.png`, import.meta.url).href
  const texture = treeTextureLoader.load(textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.transparent = true
  texture.alphaTest = 0.1
  texture.anisotropy = 4
  cachedTreeTextures[key] = texture
  return texture
}

function getTreeGeometry() {
  if (cachedTreeGeometry) return cachedTreeGeometry

  cachedTreeGeometry = new THREE.PlaneGeometry(TREE_CONFIG.baseWidth, TREE_CONFIG.baseHeight)
  cachedTreeGeometry.translate(0, TREE_CONFIG.baseHeight / 2, 0)
  return cachedTreeGeometry
}

function getTreeMaterialController(treeIndex = 1) {
  const index = Math.max(1, Math.min(TREE_CONFIG.treeTypes, treeIndex))
  const key = `tree${index}`
  if (cachedTreeMaterialControllers.has(key)) {
    return cachedTreeMaterialControllers.get(key)
  }

  const material = new THREE.MeshLambertMaterial({
    map: getTreeTexture(index),
    color: '#ffffff',
    transparent: true,
    alphaTest: 0.1,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: true
  })

  const controller = {
    material,
    opacity: 1.0,
    brightness: 1.0
  }
  cachedTreeMaterialControllers.set(key, controller)
  return controller
}

export function setTreeMaterialControllerOpacity(controller, opacity) {
  if (!controller?.material) return
  const clampedOpacity = Math.max(0, Math.min(1, opacity))
  if (Math.abs((controller.opacity ?? 1) - clampedOpacity) < 0.0001) return

  controller.opacity = clampedOpacity
  controller.material.opacity = clampedOpacity
}

export function setTreeMaterialControllerBrightness(controller, brightness) {
  if (!controller?.material?.color) return
  const clampedBrightness = Math.max(0, brightness)
  if (Math.abs((controller.brightness ?? 1) - clampedBrightness) < 0.0001) return

  controller.brightness = clampedBrightness
  controller.material.color.setScalar(clampedBrightness)
}

function createTreeBillboardMesh(treeIndex = 1) {
  const controller = getTreeMaterialController(treeIndex)
  const mesh = new THREE.Mesh(getTreeGeometry(), controller.material)

  mesh.userData.isBillboard = true
  mesh.userData.billboardMode = TREE_CONFIG.billboardMode
  mesh.userData.treeIndex = treeIndex
  mesh.userData.baseOpacity = 1.0
  mesh.userData.treeMaterialController = controller

  return mesh
}

/**
 * Create a tree billboard that always faces camera (Y-locked billboarding)
 * Y-locked means: only rotates around Y axis, not X or Z
 */
export function createTreeBillboard(position = new THREE.Vector3(), treeIndex = 1) {
  const group = new THREE.Group()
  group.name = `Tree ${treeIndex}`
  group.position.copy(position)

  const mesh = createTreeBillboardMesh(treeIndex)
  group.add(mesh)

  group.userData.isBillboard = true
  group.userData.billboardMode = TREE_CONFIG.billboardMode
  group.userData.treeIndex = treeIndex
  group.userData.opacity = 1.0
  group.userData.brightness = 1.0
  group.userData.treeMaterialController = mesh.userData.treeMaterialController || null
  group.userData.ignoreRaycast = true // Don't raycast against trees

  return group
}

/**
 * Update tree billboards to face camera (Y-locked)
 * Call this in animation loop for all trees
 */
export function updateBillboards(camera, trees) {
  if (!camera || !Array.isArray(trees)) return

  const cameraPos = camera.position
  const tmpVec = new THREE.Vector3()
  const tmpQuat = new THREE.Quaternion()

  trees.forEach((tree) => {
    if (!tree || !tree.visible || !tree.userData?.isBillboard) return

    // Direction from tree to camera
    tmpVec.subVectors(cameraPos, tree.position)
    tmpVec.normalize()

    // For Y-locked: preserve Y axis rotation, only use XZ direction
    const angleY = Math.atan2(tmpVec.x, tmpVec.z)

    // Create rotation only around Y axis
    tree.rotation.order = 'YXZ'
    tree.rotation.y = angleY
    tree.rotation.x = 0
    tree.rotation.z = 0
  })
}

/**
 * Set opacity for a tree
 */
export function setTreeOpacity(tree, opacity) {
  if (!tree) return

  const clampedOpacity = Math.max(0, Math.min(1, opacity))
  tree.userData.opacity = clampedOpacity
  tree.visible = clampedOpacity > 0.001 && tree.userData?.section3LodVisible !== false

  const controller = tree.userData?.treeMaterialController
  if (controller) {
    setTreeMaterialControllerOpacity(controller, clampedOpacity)
    return
  }

  tree.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.opacity = clampedOpacity
      if (child.material.transparent === undefined) {
        child.material.transparent = true
      }
    }
  })
}

export function setTreeBrightness(tree, brightness) {
  if (!tree) return

  const clampedBrightness = Math.max(0, brightness)
  tree.userData.brightness = clampedBrightness

  const controller = tree.userData?.treeMaterialController
  if (controller) {
    setTreeMaterialControllerBrightness(controller, clampedBrightness)
    return
  }

  tree.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (!material?.color) return
      material.color.setScalar(clampedBrightness)
    })
  })
}

/**
 * Get opacity of a tree
 */
export function getTreeOpacity(tree) {
  return tree?.userData?.opacity ?? 1.0
}

export { TREE_CONFIG }
