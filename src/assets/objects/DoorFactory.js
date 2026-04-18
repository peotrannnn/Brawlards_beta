import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * DoorFactory - Creates simple door objects
 * 
 * Three door types:
 * - Door 0: Normal exit door - "Cửa!" (Door!)
 * - Door 1: Portal entrance - "Tiền môn" (Front gate)
 * - Door 2: Portal exit - "Hậu... cửa sau" (Back... rear door)
 */

const DOOR_CONFIG = {
  // Dimensions
  WIDTH: 1.5,
  HEIGHT: 2.0,
  DEPTH: 0.4,
  
  // Trigger zone for interaction detection
  TRIGGER_DEPTH: 1.0,
  
  // Materials
  FRAME_COLOR: 0x666666,            // Gray frame
  FRAME_SIZE: 0.1,
  
  // Door type markers (stripe on top)
  MARKER_COLOR_1: 0x00BFFF,         // Cyan/Blue for door 1
  MARKER_COLOR_2: 0xFF8C00,         // Dark orange for door 2
}

/**
 * Create door frame and panel
 */
function createDoor(doorType = 0) {
  const group = new THREE.Group()
  group.name = `Door_${doorType}`
  
  // NO CENTER OFFSET - door bottom at y=0, top at y=2.0
  // Positioning handled at scene level
  
  // Frame material - gray
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: DOOR_CONFIG.FRAME_COLOR,
    metalness: 0.2,
    roughness: 0.8,
  })
  
  // ===== FRAME ONLY =====
  // Top beam (at y=2.0)
  const topBeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      DOOR_CONFIG.WIDTH + 2 * DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.DEPTH
    ),
    frameMaterial
  )
  topBeam.position.y = DOOR_CONFIG.HEIGHT - DOOR_CONFIG.FRAME_SIZE / 2
  topBeam.castShadow = true
  topBeam.receiveShadow = true
  topBeam.geometry.computeBoundingBox()
  group.add(topBeam)
  
  // Add door type marker on top (stripe)
  if (doorType === 1 || doorType === 2) {
    const markerColor = doorType === 1 ? DOOR_CONFIG.MARKER_COLOR_1 : DOOR_CONFIG.MARKER_COLOR_2
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: markerColor,
      metalness: 0.3,
      roughness: 0.6,
      emissive: markerColor,
      emissiveIntensity: 0.1,
    })
    
    const markerGeometry = new THREE.BoxGeometry(
      DOOR_CONFIG.WIDTH,
      0.08,
      DOOR_CONFIG.DEPTH
    )
    markerGeometry.computeBoundingBox()
    const markerStripe = new THREE.Mesh(markerGeometry, markerMaterial)
    markerStripe.position.y = DOOR_CONFIG.HEIGHT + 0.04
    markerStripe.position.z = 0
    markerStripe.castShadow = true
    markerStripe.receiveShadow = true
    group.add(markerStripe)
  }
  
  // Bottom beam (at y=0)
  const bottomBeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      DOOR_CONFIG.WIDTH + 2 * DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.DEPTH
    ),
    frameMaterial
  )
  bottomBeam.position.y = DOOR_CONFIG.FRAME_SIZE / 2
  bottomBeam.castShadow = true
  bottomBeam.receiveShadow = true
  bottomBeam.geometry.computeBoundingBox()
  group.add(bottomBeam)
  
  // Left beam
  const leftBeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.HEIGHT,
      DOOR_CONFIG.DEPTH
    ),
    frameMaterial
  )
  leftBeam.position.x = -DOOR_CONFIG.WIDTH / 2 - DOOR_CONFIG.FRAME_SIZE / 2
  leftBeam.position.y = DOOR_CONFIG.HEIGHT / 2
  leftBeam.castShadow = true
  leftBeam.receiveShadow = true
  leftBeam.geometry.computeBoundingBox()
  group.add(leftBeam)
  
  // Right beam
  const rightBeam = new THREE.Mesh(
    new THREE.BoxGeometry(
      DOOR_CONFIG.FRAME_SIZE,
      DOOR_CONFIG.HEIGHT,
      DOOR_CONFIG.DEPTH
    ),
    frameMaterial
  )
  rightBeam.position.x = DOOR_CONFIG.WIDTH / 2 + DOOR_CONFIG.FRAME_SIZE / 2
  rightBeam.position.y = DOOR_CONFIG.HEIGHT / 2
  rightBeam.castShadow = true
  rightBeam.receiveShadow = true
  rightBeam.geometry.computeBoundingBox()
  group.add(rightBeam)
  
  // Store door type
  group.userData = {
    doorType: doorType,
    triggerZoneName: `DoorTrigger_${doorType}`,
  }
  
  return group
}

/**
 * Create trigger zone for door interaction
 */
function createTriggerZone(doorType) {
  const triggerGeometry = new THREE.BoxGeometry(
    DOOR_CONFIG.WIDTH * 1.3,
    DOOR_CONFIG.HEIGHT * 1.3,
    DOOR_CONFIG.TRIGGER_DEPTH
  )
  
  const triggerMesh = new THREE.Mesh(
    triggerGeometry,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  )
  triggerMesh.userData.isTriggerBox = true
  triggerMesh.userData.triggerType = 'door'
  triggerMesh.userData.doorType = doorType
  triggerMesh.name = `DoorTrigger_${doorType}`
  triggerMesh.position.y = DOOR_CONFIG.HEIGHT / 2
  triggerMesh.position.z = -(DOOR_CONFIG.DEPTH / 2 + DOOR_CONFIG.TRIGGER_DEPTH / 2)
  
  return triggerMesh
}

/**
 * Generate hitbox shapes for door frame beams intelligently
 * Creates 4 box shapes (top, bottom, left, right beams) matching visible meshes
 * Door coordinate system: bottom at y=0, top at y=HEIGHT
 */
function generateDoorFrameHitboxes() {
  const frameSize = DOOR_CONFIG.FRAME_SIZE
  const width = DOOR_CONFIG.WIDTH
  const height = DOOR_CONFIG.HEIGHT
  const depth = DOOR_CONFIG.DEPTH
  
  return [
    // Top beam - at y = HEIGHT - frameSize/2
    {
      type: 'box',
      size: [width + 2 * frameSize, frameSize, depth],
      offset: [0, height - frameSize / 2, 0],
      material: 'default'
    },
    // Bottom beam - at y = frameSize/2
    {
      type: 'box',
      size: [width + 2 * frameSize, frameSize, depth],
      offset: [0, frameSize / 2, 0],
      material: 'default'
    },
    // Left beam - vertical
    {
      type: 'box',
      size: [frameSize, height, depth],
      offset: [-width / 2 - frameSize / 2, height / 2, 0],
      material: 'default'
    },
    // Right beam - vertical
    {
      type: 'box',
      size: [frameSize, height, depth],
      offset: [width / 2 + frameSize / 2, height / 2, 0],
      material: 'default'
    }
  ]
}

/**
 * Factory for Door 0 (Normal exit)
 */
function createDoor0() {
  const mesh = createDoor(0)
  const triggerZone = createTriggerZone(0)
  mesh.add(triggerZone)
  
  // Generate hitbox shapes for frame beams intelligently
  const hitboxShapes = generateDoorFrameHitboxes()
  
  const doorPhysicsDef = {
    type: 'static',
    mass: 0,
    shapes: hitboxShapes
  }
  
  return {
    name: 'Door 0',
    description: 'Cửa!',
    mesh: mesh,
    physics: doorPhysicsDef,
  }
}

/**
 * Factory for Door 1 (Portal entrance)
 */
function createDoor1() {
  const mesh = createDoor(1)
  const triggerZone = createTriggerZone(1)
  mesh.add(triggerZone)
  
  // Generate hitbox shapes for frame beams intelligently
  const hitboxShapes = generateDoorFrameHitboxes()
  
  const doorPhysicsDef = {
    type: 'static',
    mass: 0,
    shapes: hitboxShapes
  }
  
  return {
    name: 'Door 1',
    description: 'Tiền môn!',
    mesh: mesh,
    physics: doorPhysicsDef,
  }
}

/**
 * Factory for Door 2 (Portal exit)
 */
function createDoor2() {
  const mesh = createDoor(2)
  const triggerZone = createTriggerZone(2)
  mesh.add(triggerZone)
  
  // Generate hitbox shapes for frame beams intelligently
  const hitboxShapes = generateDoorFrameHitboxes()
  
  const doorPhysicsDef = {
    type: 'static',
    mass: 0,
    shapes: hitboxShapes
  }
  
  return {
    name: 'Door 2',
    description: 'Hậu... cửa sau!',
    mesh: mesh,
    physics: doorPhysicsDef,
  }
}

/**
 * Get asset definition for Door 0
 */
export function getDoor0Asset() {
  const def = createDoor0()
  return {
    name: def.name,
    description: def.description,
    factory: () => def.mesh,
    physics: def.physics
  }
}

/**
 * Get asset definition for Door 1
 */
export function getDoor1Asset() {
  const def = createDoor1()
  return {
    name: def.name,
    description: def.description,
    factory: () => def.mesh,
    physics: def.physics
  }
}

/**
 * Get asset definition for Door 2
 */
export function getDoor2Asset() {
  const def = createDoor2()
  return {
    name: def.name,
    description: def.description,
    factory: () => def.mesh,
    physics: def.physics
  }
}
