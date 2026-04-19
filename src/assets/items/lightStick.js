import * as THREE from 'three'

const LIGHTSTICK_CONFIG = {
  PHYSICS_MASS: 0.5,
  PHYSICS_LINEAR_DAMPING: 0.3,
  PHYSICS_ANGULAR_DAMPING: 0.5,
  HITBOX_RADIUS: 0.06,
  HITBOX_LENGTH: 0.5,
  MESH_RADIUS: 0.06,
  MESH_LENGTH: 0.5,
  MESH_SEGMENTS: 32,
  STICK_COLOR: '#FFFFFF',
  STICK_EMISSIVE: '#00FF00',
  STICK_EMISSIVE_INTENSITY: 2,
  STICK_OPACITY: 0.8,
  POINT_LIGHT_COLOR: '#00FF00',
  POINT_LIGHT_INTENSITY: 2,
  POINT_LIGHT_DISTANCE: 5
}

const lightStickPhysicsDef = {
  type: 'dynamic',
  mass: LIGHTSTICK_CONFIG.PHYSICS_MASS,
  fixedRotation: false,
  linearDamping: LIGHTSTICK_CONFIG.PHYSICS_LINEAR_DAMPING,
  angularDamping: LIGHTSTICK_CONFIG.PHYSICS_ANGULAR_DAMPING,
  shapes: [
    {
      type: 'cylinder',
      radius: LIGHTSTICK_CONFIG.HITBOX_RADIUS,
      length: LIGHTSTICK_CONFIG.HITBOX_LENGTH,
      offset: [0, 0, 0]
    }
  ],
  material: 'item'
}

function createLightStick() {
  const root = new THREE.Group()
  root.name = "Light Stick"

  // Material
  const stickMaterial = new THREE.MeshPhysicalMaterial({
    color: LIGHTSTICK_CONFIG.STICK_COLOR,
    emissive: LIGHTSTICK_CONFIG.STICK_EMISSIVE,
    emissiveIntensity: LIGHTSTICK_CONFIG.STICK_EMISSIVE_INTENSITY,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: LIGHTSTICK_CONFIG.STICK_OPACITY
  })

  // Mesh - Cylinder
  const stickGeometry = new THREE.CylinderGeometry(
    LIGHTSTICK_CONFIG.MESH_RADIUS,
    LIGHTSTICK_CONFIG.MESH_RADIUS,
    LIGHTSTICK_CONFIG.MESH_LENGTH,
    LIGHTSTICK_CONFIG.MESH_SEGMENTS
  )

  const stickMesh = new THREE.Mesh(stickGeometry, stickMaterial)
  stickMesh.castShadow = true
  stickMesh.receiveShadow = true
  stickMesh.name = "StickMesh"
  root.add(stickMesh)

  // Point Light
  const stickLight = new THREE.PointLight(
    LIGHTSTICK_CONFIG.POINT_LIGHT_COLOR,
    LIGHTSTICK_CONFIG.POINT_LIGHT_INTENSITY,
    LIGHTSTICK_CONFIG.POINT_LIGHT_DISTANCE
  )
  stickLight.castShadow = false
  stickLight.name = "StickPointLight"
  root.add(stickLight)

  // Physics
  root.userData.physics = lightStickPhysicsDef
  
  // Update logic
  root.userData.update = function(delta) {
    // Optional: Add any dynamic behavior here
  }

  return root
}

// ==================== EXPORT ====================

export function getLightStickAsset() {
  return {
    name: "Light Stick",
    description: "Light, freely given, with enough power to override even locked doors.",
    factory: () => createLightStick(),
    physics: lightStickPhysicsDef
  }
}
