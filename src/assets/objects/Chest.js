import * as THREE from 'three'

const CHEST_CONFIG = {
  // Outer room-like shell dimensions
  OUTER_SIZE_X: 2.8,
  OUTER_SIZE_Y: 1.9,
  OUTER_SIZE_Z: 2.45,
  WALL_THICKNESS: 0.18,
  // Trigger zone (for baby oil detection)
  TRIGGER_SIZE_X: 4.2,
  TRIGGER_SIZE_Y: 2.6,
  TRIGGER_SIZE_Z: 3.9,
  // Visual properties
  BODY_COLOR: '#6f3f1f',
  BODY_COLOR_DARK: '#503019',
  LID_COLOR: '#8a572f',
  METAL_COLOR: '#5e8897',
  LATCH_COLOR: '#718393',
  HINGE_RADIUS: 0.07,
  LID_THICKNESS: 0.16,
  DOOR_DEPTH: 0.16,
  LATCH_BLOCK_WIDTH: 0.22,
  LATCH_BLOCK_HEIGHT: 0.34,
  LATCH_BLOCK_DEPTH: 0.22,
  LATCH_DOOR_INSET: 0.16,
  LATCH_KEEPER_WIDTH: 0.12,
  LATCH_KEEPER_HEIGHT: 0.26,
  LATCH_KEEPER_DEPTH: 0.42,
  LATCH_KEEPER_INSET: 0.08,
  LATCH_BOLT_RADIUS: 0.036,
  LATCH_BOLT_LENGTH: 0.56,
  LATCH_RETRACT_DISTANCE: 0.26,
  HINGE_LENGTH: 0.4,
  HINGE_FRONT_OFFSET: 0.12
}

const CHEST_LAYOUT = {
  bottomOuterY: (-CHEST_CONFIG.OUTER_SIZE_Y * 0.5) + (CHEST_CONFIG.WALL_THICKNESS * 0.5),
  topOuterY: (CHEST_CONFIG.OUTER_SIZE_Y * 0.5) - (CHEST_CONFIG.WALL_THICKNESS * 0.5),
  backWallZ: (-CHEST_CONFIG.OUTER_SIZE_Z * 0.5) + (CHEST_CONFIG.WALL_THICKNESS * 0.5),
  leftWallX: (-CHEST_CONFIG.OUTER_SIZE_X * 0.5) + (CHEST_CONFIG.WALL_THICKNESS * 0.5),
  rightWallX: (CHEST_CONFIG.OUTER_SIZE_X * 0.5) - (CHEST_CONFIG.WALL_THICKNESS * 0.5)
}

const CHEST_SURFACES = [
  {
    role: 'floorWall',
    meshName: 'Chest Floor',
    material: 'base',
    size: [
      CHEST_CONFIG.OUTER_SIZE_X,
      CHEST_CONFIG.WALL_THICKNESS,
      CHEST_CONFIG.OUTER_SIZE_Z
    ],
    offset: [0, CHEST_LAYOUT.bottomOuterY, 0]
  },
  {
    role: 'ceilingWall',
    meshName: 'Chest Ceiling',
    material: 'base',
    size: [
      CHEST_CONFIG.OUTER_SIZE_X,
      CHEST_CONFIG.WALL_THICKNESS,
      CHEST_CONFIG.OUTER_SIZE_Z
    ],
    offset: [0, CHEST_LAYOUT.topOuterY, 0]
  },
  {
    role: 'blocking',
    meshName: 'Chest Back Wall',
    material: 'base',
    size: [
      CHEST_CONFIG.OUTER_SIZE_X,
      CHEST_CONFIG.OUTER_SIZE_Y,
      CHEST_CONFIG.WALL_THICKNESS
    ],
    offset: [0, 0, CHEST_LAYOUT.backWallZ]
  },
  {
    role: 'leftWall',
    meshName: 'Chest Left Wall',
    material: 'base',
    size: [
      CHEST_CONFIG.WALL_THICKNESS,
      CHEST_CONFIG.OUTER_SIZE_Y,
      CHEST_CONFIG.OUTER_SIZE_Z
    ],
    offset: [CHEST_LAYOUT.leftWallX, 0, 0]
  },
  {
    role: 'rightWall',
    meshName: 'Chest Right Wall',
    material: 'base',
    size: [
      CHEST_CONFIG.WALL_THICKNESS,
      CHEST_CONFIG.OUTER_SIZE_Y,
      CHEST_CONFIG.OUTER_SIZE_Z
    ],
    offset: [CHEST_LAYOUT.rightWallX, 0, 0]
  }
]

function createChestPhysicsDef() {
  return {
    type: 'static',
    material: 'table',
    shapes: [
      ...CHEST_SURFACES.map((surface) => ({
        type: 'box',
        role: surface.role,
        size: [...surface.size],
        offset: [...surface.offset]
      })),
      {
        type: 'box',
        role: 'chestTrigger',
        isTrigger: true,
        debugColor: '#ffffff',
        size: [
          CHEST_CONFIG.TRIGGER_SIZE_X,
          CHEST_CONFIG.TRIGGER_SIZE_Y,
          CHEST_CONFIG.TRIGGER_SIZE_Z
        ],
        offset: [0, 0, 0]
      }
    ]
  }
}

const chestPhysicsDef = createChestPhysicsDef()

function createWoodTexture(baseColor = '#6f3f1f') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y += 4) {
    const wave = Math.sin(y * 0.08) * 10
    const alpha = 0.05 + (Math.sin(y * 0.12) * 0.02)
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.02, alpha)})`
    ctx.fillRect(wave + 20, y, canvas.width - 40, 2)
  }

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const alpha = 0.04 + Math.random() * 0.07
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(x, y, 1.2, 1.2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.6, 1.6)
  texture.needsUpdate = true
  return texture
}

function createChestMesh() {
  const root = new THREE.Group()
  root.name = 'Chest Mesh'

  const bodyTexture = createWoodTexture(CHEST_CONFIG.BODY_COLOR)
  const darkTexture = createWoodTexture(CHEST_CONFIG.BODY_COLOR_DARK)
  const lidTexture = createWoodTexture(CHEST_CONFIG.LID_COLOR)

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: CHEST_CONFIG.BODY_COLOR,
    map: bodyTexture,
    roughness: 0.72,
    metalness: 0.1
  })
  const bodyMaterialDark = new THREE.MeshStandardMaterial({
    color: CHEST_CONFIG.BODY_COLOR_DARK,
    map: darkTexture,
    roughness: 0.86,
    metalness: 0.08
  })
  const latchMaterial = new THREE.MeshPhongMaterial({
    color: CHEST_CONFIG.LATCH_COLOR,
    specular: new THREE.Color('#ffffff'),
    shininess: 220,
    emissive: new THREE.Color('#5f6872'),
    emissiveIntensity: 0.22,
    reflectivity: 1
  })

  const w = CHEST_CONFIG.OUTER_SIZE_X
  const h = CHEST_CONFIG.OUTER_SIZE_Y
  const d = CHEST_CONFIG.OUTER_SIZE_Z
  const t = CHEST_CONFIG.WALL_THICKNESS

  function addWall(surface) {
    const material = surface.material === 'dark' ? bodyMaterialDark : bodyMaterial
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(surface.size[0], surface.size[1], surface.size[2]),
      material
    )
    mesh.position.set(surface.offset[0] || 0, surface.offset[1] || 0, surface.offset[2] || 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = surface.meshName
    root.add(mesh)
  }

  // Structural shell meshes are created from the exact same source as hitboxes.
  CHEST_SURFACES.forEach(addWall)

  const doorWidth = w - (t * 0.35)
  const doorHeight = h - (t * 0.25)
  const lidGeometry = new THREE.BoxGeometry(
    doorWidth,
    doorHeight,
    CHEST_CONFIG.DOOR_DEPTH
  )
  const lidMaterial = new THREE.MeshStandardMaterial({
    color: CHEST_CONFIG.LID_COLOR,
    map: lidTexture,
    roughness: 0.52,
    metalness: 0.14
  })

  const lidPivot = new THREE.Group()
  lidPivot.name = 'LidPivot'
  lidPivot.position.set(-w * 0.5 + (t * 0.72), 0, d * 0.5 - (t * 0.62))

  const lid = new THREE.Mesh(lidGeometry, lidMaterial)
  lid.castShadow = true
  lid.receiveShadow = true
  lid.name = 'Lid'
  lid.position.set((doorWidth * 0.5) - (t * 0.38), 0, 0)
  lidPivot.add(lid)

  const latchRightEdgeX = lid.position.x + (doorWidth * 0.5)
  const latchCenterY = -h * 0.04
  const latchCenterZ = (CHEST_CONFIG.DOOR_DEPTH * 0.5) + 0.05
  const latchDoorBlock = new THREE.Mesh(
    new THREE.BoxGeometry(
      CHEST_CONFIG.LATCH_BLOCK_WIDTH,
      CHEST_CONFIG.LATCH_BLOCK_HEIGHT,
      CHEST_CONFIG.LATCH_BLOCK_DEPTH
    ),
    latchMaterial
  )
  latchDoorBlock.castShadow = true
  latchDoorBlock.receiveShadow = true
  latchDoorBlock.name = 'ChestLatchDoorBlock'
  latchDoorBlock.position.set(
    latchRightEdgeX - CHEST_CONFIG.LATCH_DOOR_INSET,
    latchCenterY,
    latchCenterZ
  )
  lidPivot.add(latchDoorBlock)

  const latchBolt = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CHEST_CONFIG.LATCH_BOLT_RADIUS,
      CHEST_CONFIG.LATCH_BOLT_RADIUS,
      CHEST_CONFIG.LATCH_BOLT_LENGTH,
      18
    ),
    latchMaterial
  )
  latchBolt.castShadow = true
  latchBolt.receiveShadow = true
  latchBolt.name = 'ChestLatchBolt'
  latchBolt.rotation.z = Math.PI * 0.5
  latchBolt.position.set(
    latchRightEdgeX - (CHEST_CONFIG.LATCH_DOOR_INSET * 0.62),
    latchCenterY,
    latchCenterZ
  )
  latchBolt.userData.closedX = latchBolt.position.x
  latchBolt.userData.retractedX = latchBolt.position.x - CHEST_CONFIG.LATCH_RETRACT_DISTANCE
  lidPivot.add(latchBolt)
  root.add(lidPivot)

  const latchKeeperBlock = new THREE.Mesh(
    new THREE.BoxGeometry(
      CHEST_CONFIG.LATCH_KEEPER_WIDTH,
      CHEST_CONFIG.LATCH_KEEPER_HEIGHT,
      CHEST_CONFIG.LATCH_KEEPER_DEPTH
    ),
    latchMaterial
  )
  latchKeeperBlock.castShadow = true
  latchKeeperBlock.receiveShadow = true
  latchKeeperBlock.name = 'ChestLatchKeeperBlock'
  latchKeeperBlock.position.set(
    lidPivot.position.x + latchRightEdgeX + (CHEST_CONFIG.LATCH_KEEPER_WIDTH * 0.5),
    latchCenterY,
    lidPivot.position.z + latchCenterZ - CHEST_CONFIG.LATCH_KEEPER_INSET
  )
  root.add(latchKeeperBlock)

  const hingeMaterial = new THREE.MeshStandardMaterial({
    color: CHEST_CONFIG.METAL_COLOR,
    roughness: 0.34,
    metalness: 0.82
  })

  // Vertical side hinges aligned with door pivot
  const hingeLeftGeometry = new THREE.CylinderGeometry(
    CHEST_CONFIG.HINGE_RADIUS,
    CHEST_CONFIG.HINGE_RADIUS,
    CHEST_CONFIG.HINGE_LENGTH,
    18
  )

  const hingeLeft = new THREE.Mesh(hingeLeftGeometry, hingeMaterial)
  hingeLeft.castShadow = true
  hingeLeft.receiveShadow = true
  hingeLeft.position.set(
    -w * 0.5 + (t * 0.62),
    h * 0.28,
    d * 0.5 - (t * 0.62) + CHEST_CONFIG.HINGE_FRONT_OFFSET
  )
  root.add(hingeLeft)

  const hingeRight = new THREE.Mesh(hingeLeftGeometry, hingeMaterial)
  hingeRight.castShadow = true
  hingeRight.receiveShadow = true
  hingeRight.position.set(
    -w * 0.5 + (t * 0.62),
    -h * 0.28,
    d * 0.5 - (t * 0.62) + CHEST_CONFIG.HINGE_FRONT_OFFSET
  )
  root.add(hingeRight)

  return root
}

function createChest() {
  const root = new THREE.Group()
  root.name = 'Chest'
  root.userData.physics = chestPhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  const mesh = createChestMesh()
  root.add(mesh)

  return root
}

export function getChestAsset() {
  return {
    name: 'Chest',
    description: 'Hộp chứa Guide!',
    factory: createChest,
    physics: chestPhysicsDef
  }
}
