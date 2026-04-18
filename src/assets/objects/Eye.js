import * as THREE from 'three'

const EYE_CONFIG = {
  radius: 7.2,
  triggerRadius: 9.8,
  triggerHeight: 5.4,
  color: '#ffffff',
  opacity: 0.98,
  alphaTest: 0.08,
  lightColor: '#fff4d6',
  lightIntensity: 860,
  lightDistance: 88,
  lightAngle: 1.52,
  lightPenumbra: 0.72,
  lightDecay: 1.35
}

const eyePhysicsDef = {
  type: 'dynamic',
  mass: 0.01,
  fixedRotation: true,
  linearDamping: 0.98,
  angularDamping: 0.98,
  shapes: [
    {
      type: 'sphere',
      radius: 0.4,
      offset: [0, 0, 0]
    }
  ],
  material: 'item'
}

const eyeTriggerPhysicsDef = {
  type: 'static',
  material: 'table',
  shapes: [
    {
      type: 'cylinder',
      role: 'eyeTrigger',
      isTrigger: true,
      debugColor: '#ffffff',
      radiusTop: EYE_CONFIG.triggerRadius,
      radiusBottom: EYE_CONFIG.triggerRadius,
      height: EYE_CONFIG.triggerHeight,
      offset: [0, 0, 0]
    }
  ]
}

const textureLoader = new THREE.TextureLoader()
let cachedEyeTexture = null
const eyeAspectTargets = new Set()

function refreshAllEyeAspectTargets(texture) {
  eyeAspectTargets.forEach((mesh) => {
    applyTextureAspectToMesh(mesh, texture)
  })
}

function getEyeTexture() {
  if (cachedEyeTexture) return cachedEyeTexture

  const eyeUrl = new URL('../../pictures/eye.png', import.meta.url).href
  cachedEyeTexture = textureLoader.load(
    eyeUrl,
    (texture) => {
      refreshAllEyeAspectTargets(texture)
    }
  )
  cachedEyeTexture.colorSpace = THREE.SRGBColorSpace
  cachedEyeTexture.wrapS = THREE.ClampToEdgeWrapping
  cachedEyeTexture.wrapT = THREE.ClampToEdgeWrapping
  cachedEyeTexture.needsUpdate = true
  return cachedEyeTexture
}

function applyTextureAspectToMesh(mesh, texture) {
  if (!mesh || !texture) return
  const image = texture.image
  if (!image || !image.width || !image.height) return

  const aspect = image.width / image.height
  mesh.scale.set(aspect, 1, 1)
}

export function createEyeSun(options = {}) {
  const {
    lightColor = EYE_CONFIG.lightColor,
    lightIntensity = EYE_CONFIG.lightIntensity,
    lightDistance = EYE_CONFIG.lightDistance,
    lightAngle = EYE_CONFIG.lightAngle,
    lightPenumbra = EYE_CONFIG.lightPenumbra,
    lightDecay = EYE_CONFIG.lightDecay,
    targetOffset = new THREE.Vector3(0, -18, 0),
    scale = 1
  } = options

  const root = new THREE.Group()
  root.name = 'Section3 Eye Sun'
  root.userData.ignoreRaycast = true // Allow camera to pass through

  const eyeTexture = getEyeTexture()
  const diameter = EYE_CONFIG.radius * 2
  const eyeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(diameter, diameter),
    new THREE.MeshBasicMaterial({
      map: eyeTexture,
      color: EYE_CONFIG.color,
      transparent: true,
      opacity: EYE_CONFIG.opacity,
      alphaTest: EYE_CONFIG.alphaTest,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  )
  eyeMesh.name = 'Section3 Eye Mesh'
  eyeMesh.material.toneMapped = false
  eyeMesh.rotation.x = Math.PI / 2
  root.add(eyeMesh)

  const triggerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      EYE_CONFIG.triggerRadius,
      EYE_CONFIG.triggerRadius,
      EYE_CONFIG.triggerHeight,
      24,
      1,
      false
    ),
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false
    })
  )
  triggerMesh.name = 'Section3 Eye Trigger'
  triggerMesh.visible = false
  triggerMesh.userData.isTriggerBox = true
  triggerMesh.userData.physics = eyeTriggerPhysicsDef
  root.add(triggerMesh)

  eyeAspectTargets.add(eyeMesh)
  applyTextureAspectToMesh(eyeMesh, eyeTexture)

  root.userData.dispose = function disposeEyeSun() {
    eyeAspectTargets.delete(eyeMesh)
  }

  const target = new THREE.Object3D()
  target.name = 'Section3 Eye Light Target'
  target.position.copy(targetOffset)
  root.add(target)

  const light = new THREE.SpotLight(
    lightColor,
    lightIntensity,
    lightDistance,
    lightAngle,
    lightPenumbra,
    lightDecay
  )
  light.name = 'Section3 Eye Light'
  light.castShadow = false
  light.target = target
  root.add(light)

  root.scale.setScalar(scale)

  const lookTarget = new THREE.Vector3()
  const eyeWorldPos = new THREE.Vector3()

  root.userData.physics = eyePhysicsDef
  root.userData.triggerMesh = triggerMesh
  root.userData.mainLight = light
  root.userData.update = function update() {}
  root.userData.updateLookAt = function updateLookAt(targetPosition) {
    if (!targetPosition) return
    lookTarget.copy(targetPosition)
    eyeMesh.getWorldPosition(eyeWorldPos)
    if (eyeWorldPos.distanceToSquared(lookTarget) < 0.0001) return
    eyeMesh.lookAt(lookTarget)
  }

  return root
}

export function getEyeAsset() {
  return {
    name: 'Eye',
    description: 'Mắt.',
    factory: () => createEyeSun({ lightIntensity: 0, scale: 1 }),
    physics: eyePhysicsDef,
    excludeFromSimulationSpawn: true,
    isSpecialEntity: true
  }
}
