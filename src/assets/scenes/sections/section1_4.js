import * as THREE from 'three'

export function createSection4(rootGroup) {
  // ======================================================
  // SECTION 4: PHÒNG TRỐNG BÊN CẠNH SECTION 2
  // Không có texture, chỉ là căn phòng đơn giản
  // ======================================================

  const SECTION4_BASE_Y = 35
  const SECTION4_BASE_X = 32

  const ROOM_CONFIG = {
    width: 8,
    depth: 180,
    height: 12
  }

  const CEIL_THICK = 0.5
  const W = ROOM_CONFIG.width
  const D = ROOM_CONFIG.depth
  const H = ROOM_CONFIG.height

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: '#cccccc',
    roughness: 0.8,
    metalness: 0.0
  })

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: '#e8e8e8',
    roughness: 0.85,
    metalness: 0.0
  })

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.7,
    metalness: 0.0
  })

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.5, D),
    floorMaterial
  )
  floor.position.set(SECTION4_BASE_X, SECTION4_BASE_Y, 0)
  floor.receiveShadow = true
  floor.name = 'Section4 Floor'
  rootGroup.add(floor)

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(W, CEIL_THICK, D),
    ceilingMaterial
  )
  ceiling.position.set(SECTION4_BASE_X, SECTION4_BASE_Y + H, 0)
  ceiling.receiveShadow = true
  ceiling.name = 'Section4 Ceiling'
  rootGroup.add(ceiling)

  const wallCenterY = SECTION4_BASE_Y + H / 2

  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.5),
    wallMaterial
  )
  wallFront.position.set(SECTION4_BASE_X, wallCenterY, D / 2)
  wallFront.castShadow = true
  wallFront.receiveShadow = true
  wallFront.name = 'Section4 Wall Front'
  rootGroup.add(wallFront)

  const wallBack = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.5),
    wallMaterial
  )
  wallBack.position.set(SECTION4_BASE_X, wallCenterY, -D / 2)
  wallBack.castShadow = true
  wallBack.receiveShadow = true
  wallBack.name = 'Section4 Wall Back'
  rootGroup.add(wallBack)

  const wallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, H, D),
    wallMaterial
  )
  wallLeft.position.set(SECTION4_BASE_X - W / 2, wallCenterY, 0)
  wallLeft.castShadow = true
  wallLeft.receiveShadow = true
  wallLeft.name = 'Section4 Wall Left'
  rootGroup.add(wallLeft)

  const wallRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, H, D),
    wallMaterial
  )
  wallRight.position.set(SECTION4_BASE_X + W / 2, wallCenterY, 0)
  wallRight.castShadow = true
  wallRight.receiveShadow = true
  wallRight.name = 'Section4 Wall Right'
  rootGroup.add(wallRight)

  if (rootGroup.userData.physics) {
    rootGroup.userData.physics.shapes.push(
      { type: 'box', size: [W, 0.5, D], offset: [SECTION4_BASE_X, SECTION4_BASE_Y, 0] },
      { type: 'box', size: [W, CEIL_THICK, D], offset: [SECTION4_BASE_X, SECTION4_BASE_Y + H, 0] },
      { type: 'box', size: [W, H, 0.5], offset: [SECTION4_BASE_X, SECTION4_BASE_Y + H / 2, D / 2] },
      { type: 'box', size: [W, H, 0.5], offset: [SECTION4_BASE_X, SECTION4_BASE_Y + H / 2, -D / 2] },
      { type: 'box', size: [0.5, H, D], offset: [SECTION4_BASE_X - W / 2, SECTION4_BASE_Y + H / 2, 0] },
      { type: 'box', size: [0.5, H, D], offset: [SECTION4_BASE_X + W / 2, SECTION4_BASE_Y + H / 2, 0] }
    )
  }

  // ======================================================
  // KẾT THÚC SECTION 4
  // ======================================================
}