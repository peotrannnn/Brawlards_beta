import * as THREE from 'three'

const LIGHTSTICK_OFF_CONFIG = {
  PHYSICS_MASS: 0.5,
  PHYSICS_LINEAR_DAMPING: 0.3,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.06,
  HITBOX_LENGTH: 0.5,
  MESH_RADIUS: 0.06,
  MESH_LENGTH: 0.5,
  MESH_SEGMENTS: 32,
  STICK_COLOR: '#8fd88f',
  STICK_OPACITY: 0.56
}

const lightStickOffPhysicsDef = {
  type: 'dynamic',
  mass: LIGHTSTICK_OFF_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: LIGHTSTICK_OFF_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: LIGHTSTICK_OFF_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'cylinder',
      radius: LIGHTSTICK_OFF_CONFIG.HITBOX_RADIUS,
      length: LIGHTSTICK_OFF_CONFIG.HITBOX_LENGTH,
      offset: [0, 0, 0]
    }
  ],
  material: 'item'
}

function createLightStickOff() {
  const root = new THREE.Group()
  root.name = 'Light Stick Off'

  const stickMaterial = new THREE.MeshPhysicalMaterial({
    color: LIGHTSTICK_OFF_CONFIG.STICK_COLOR,
    emissive: '#000000',
    emissiveIntensity: 0,
    roughness: 0.45,
    metalness: 0.08,
    transparent: true,
    opacity: LIGHTSTICK_OFF_CONFIG.STICK_OPACITY
  })

  const stickGeometry = new THREE.CylinderGeometry(
    LIGHTSTICK_OFF_CONFIG.MESH_RADIUS,
    LIGHTSTICK_OFF_CONFIG.MESH_RADIUS,
    LIGHTSTICK_OFF_CONFIG.MESH_LENGTH,
    LIGHTSTICK_OFF_CONFIG.MESH_SEGMENTS
  )

  const stickMesh = new THREE.Mesh(stickGeometry, stickMaterial)
  stickMesh.castShadow = true
  stickMesh.receiveShadow = true
  stickMesh.name = 'StickMesh'
  root.add(stickMesh)

  root.userData.physics = lightStickOffPhysicsDef

  root.userData.update = function(delta) {
    // Intentionally empty: off version has no glow/light animation.
  }

  return root
}

export function getLightStickOffAsset() {
  return {
    name: 'Light Stick Off',
    description: 'Hàng không nóng, cần hâm để thành hàng nóng!',
    factory: () => createLightStickOff(),
    physics: lightStickOffPhysicsDef
  }
}
