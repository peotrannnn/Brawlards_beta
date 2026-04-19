import * as THREE from 'three'

const CARTON_BOX_CONFIG = {
  // Outer shell dimensions
  OUTER_SIZE_X: 2.8,
  OUTER_SIZE_Y: 1.9,
  OUTER_SIZE_Z: 2.35,
  WALL_THICKNESS: 0.08,
  // Trigger zone (for proximity detection)
  TRIGGER_SIZE_X: 4.4,
  TRIGGER_SIZE_Y: 2.6,
  TRIGGER_SIZE_Z: 4.1,
  // Visual properties
  BOX_COLOR: '#8f6a43',
  BOX_COLOR_DARK: '#705131',
  FLAP_COLOR: '#b18457',
  FLAP_EDGE_COLOR: '#d0ab7a'
}

const CARTON_BOX_LAYOUT = {
  bottomOuterY: -CARTON_BOX_CONFIG.OUTER_SIZE_Y * 0.5,
  topOuterY: CARTON_BOX_CONFIG.OUTER_SIZE_Y * 0.5,
  backWallZ: -CARTON_BOX_CONFIG.OUTER_SIZE_Z * 0.5,
  leftWallX: -CARTON_BOX_CONFIG.OUTER_SIZE_X * 0.5,
  rightWallX: CARTON_BOX_CONFIG.OUTER_SIZE_X * 0.5,
  topSizeX: CARTON_BOX_CONFIG.OUTER_SIZE_X,
  topSizeZ: CARTON_BOX_CONFIG.OUTER_SIZE_Z
}

const CARTON_BOX_SURFACES = [
  {
    role: 'floorWall',
    meshName: 'Carton Floor Bottom',
    material: 'dark',
    size: [
      CARTON_BOX_CONFIG.OUTER_SIZE_X,
      CARTON_BOX_CONFIG.WALL_THICKNESS,
      CARTON_BOX_CONFIG.OUTER_SIZE_Z
    ],
    offset: [0, CARTON_BOX_LAYOUT.bottomOuterY, 0]
  },
  {
    role: 'ceilingWall',
    meshName: 'Carton Floor Top',
    material: 'base',
    size: [
      CARTON_BOX_LAYOUT.topSizeX,
      CARTON_BOX_CONFIG.WALL_THICKNESS,
      CARTON_BOX_LAYOUT.topSizeZ
    ],
    offset: [0, CARTON_BOX_LAYOUT.topOuterY, 0]
  },
  {
    role: 'blocking',
    meshName: 'Carton Back Wall',
    material: 'base',
    size: [
      CARTON_BOX_CONFIG.OUTER_SIZE_X,
      CARTON_BOX_CONFIG.OUTER_SIZE_Y,
      CARTON_BOX_CONFIG.WALL_THICKNESS
    ],
    offset: [0, 0, CARTON_BOX_LAYOUT.backWallZ]
  },
  {
    role: 'leftWall',
    meshName: 'Carton Left Wall',
    material: 'base',
    size: [
      CARTON_BOX_CONFIG.WALL_THICKNESS,
      CARTON_BOX_CONFIG.OUTER_SIZE_Y,
      CARTON_BOX_CONFIG.OUTER_SIZE_Z
    ],
    offset: [CARTON_BOX_LAYOUT.leftWallX, 0, 0]
  },
  {
    role: 'rightWall',
    meshName: 'Carton Right Wall',
    material: 'base',
    size: [
      CARTON_BOX_CONFIG.WALL_THICKNESS,
      CARTON_BOX_CONFIG.OUTER_SIZE_Y,
      CARTON_BOX_CONFIG.OUTER_SIZE_Z
    ],
    offset: [CARTON_BOX_LAYOUT.rightWallX, 0, 0]
  }
]

function createCartonBoxPhysicsDef() {
  return {
    type: 'static',
    material: 'table',
    shapes: [
      ...CARTON_BOX_SURFACES.map((surface) => ({
        type: 'box',
        role: surface.role,
        size: [...surface.size],
        offset: [...surface.offset]
      })),
      {
        type: 'box',
        role: 'cartonTrigger',
        isTrigger: true,
        debugColor: '#ffffff',
        size: [
          CARTON_BOX_CONFIG.TRIGGER_SIZE_X,
          CARTON_BOX_CONFIG.TRIGGER_SIZE_Y,
          CARTON_BOX_CONFIG.TRIGGER_SIZE_Z
        ],
        offset: [0, 0, 0]
      }
    ]
  }
}

const cartonBoxPhysicsDef = createCartonBoxPhysicsDef()

function createCardboardTexture(baseColor = '#8f6a43') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y += 8) {
    const alpha = 0.035 + ((y % 16 === 0) ? 0.02 : 0)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(0, y, canvas.width, 2)
  }

  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const shade = Math.random() > 0.5 ? 0 : 255
    const alpha = 0.06 + Math.random() * 0.08
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.8, 1.8)
  texture.needsUpdate = true
  return texture
}

function createCartonBoxMesh() {
  const root = new THREE.Group()
  root.name = 'Carton Box Mesh'

  const baseTexture = createCardboardTexture(CARTON_BOX_CONFIG.BOX_COLOR)
  const darkTexture = createCardboardTexture(CARTON_BOX_CONFIG.BOX_COLOR_DARK)
  const flapTexture = createCardboardTexture(CARTON_BOX_CONFIG.FLAP_COLOR)

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: CARTON_BOX_CONFIG.BOX_COLOR,
    map: baseTexture,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide
  })
  const wallMaterialDark = new THREE.MeshStandardMaterial({
    color: CARTON_BOX_CONFIG.BOX_COLOR_DARK,
    map: darkTexture,
    roughness: 0.98,
    metalness: 0.0,
    side: THREE.DoubleSide
  })
  const flapMaterial = new THREE.MeshStandardMaterial({
    color: CARTON_BOX_CONFIG.FLAP_COLOR,
    map: flapTexture,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide
  })

  const w = CARTON_BOX_CONFIG.OUTER_SIZE_X
  const h = CARTON_BOX_CONFIG.OUTER_SIZE_Y
  const d = CARTON_BOX_CONFIG.OUTER_SIZE_Z
  const t = CARTON_BOX_CONFIG.WALL_THICKNESS

  // Structural shell meshes are created from the exact same source as hitboxes.
  CARTON_BOX_SURFACES.forEach((surface) => {
    const material = surface.material === 'dark' ? wallMaterialDark : wallMaterial
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(surface.size[0], surface.size[1], surface.size[2]),
      material
    )
    mesh.position.set(surface.offset[0] || 0, surface.offset[1] || 0, surface.offset[2] || 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = surface.meshName
    root.add(mesh)
  })

  // Two front flaps with vertical hinges, sized to cover almost full front face.
  const openingWidth = w - (t * 0.8)
  const openingHeight = h - (t * 0.35)
  const flapWidth = (openingWidth * 0.5) + (t * 0.03)
  const flapHeight = openingHeight
  const flapGeometry = new THREE.PlaneGeometry(flapWidth, flapHeight)

  const leftFlapPivot = new THREE.Group()
  leftFlapPivot.name = 'LeftFlapPivot'
  leftFlapPivot.position.set(-openingWidth * 0.5, 0, d * 0.5 - t * 0.5)
  const leftFlap = new THREE.Mesh(flapGeometry, flapMaterial)
  leftFlap.name = 'Left Flap'
  leftFlap.position.set(flapWidth * 0.5, 0, 0)
  leftFlap.castShadow = true
  leftFlap.receiveShadow = true
  leftFlapPivot.add(leftFlap)
  root.add(leftFlapPivot)

  const rightFlapPivot = new THREE.Group()
  rightFlapPivot.name = 'RightFlapPivot'
  rightFlapPivot.position.set(openingWidth * 0.5, 0, d * 0.5 - t * 0.5)
  const rightFlap = new THREE.Mesh(flapGeometry, flapMaterial)
  rightFlap.name = 'Right Flap'
  rightFlap.position.set(-flapWidth * 0.5, 0, 0)
  rightFlap.castShadow = true
  rightFlap.receiveShadow = true
  rightFlapPivot.add(rightFlap)
  root.add(rightFlapPivot)

  // Flap top edges for nicer silhouette
  const edgeMat = new THREE.MeshStandardMaterial({
    color: CARTON_BOX_CONFIG.FLAP_EDGE_COLOR,
    roughness: 0.9,
    metalness: 0.0
  })
  const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(flapWidth, t * 0.45, t * 0.45), edgeMat)
  leftEdge.position.set(flapWidth * 0.5, flapHeight * 0.5, 0)
  leftFlapPivot.add(leftEdge)

  const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(flapWidth, t * 0.45, t * 0.45), edgeMat)
  rightEdge.position.set(-flapWidth * 0.5, flapHeight * 0.5, 0)
  rightFlapPivot.add(rightEdge)

  return root
}

function createCartonBox() {
  const root = new THREE.Group()
  root.name = 'Carton Box'
  root.userData.physics = cartonBoxPhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  const mesh = createCartonBoxMesh()
  root.add(mesh)

  return root
}

export function getCartonBoxAsset() {
  return {
    name: 'Carton Box',
    description: 'Dummy container!',
    factory: createCartonBox,
    physics: cartonBoxPhysicsDef
  }
}
