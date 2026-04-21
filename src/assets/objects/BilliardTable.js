import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { CSG } from 'three-csg-ts'

const tableColors = {
  cloth: "#0c6b34",
  frame: "#5a3318",
  base: "#404040", // Metallic gray
  leg: "#8b6f47"  // Wood color
}

// dimension constants so other modules can query the table size
export const TABLE_WIDTH = 20
export const TABLE_DEPTH = 11

// ======================================================
// TEXTURE GENERATION FUNCTIONS
// ======================================================

function createWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Base wood color
  ctx.fillStyle = '#8b6f47'
  ctx.fillRect(0, 0, 256, 256)

  // Add wood grain using multiple layers of noise
  const imageData = ctx.getImageData(0, 0, 256, 256)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % 256
    const y = Math.floor(pixelIndex / 256)

    // Create wood grain pattern using sine wave
    const grain = Math.sin(x * 0.05) * Math.cos(y * 0.02)
    const noise = (Math.random() - 0.5) * 40

    const variation = Math.floor(grain * 30 + noise)

    data[i] = Math.max(0, Math.min(255, 139 + variation))     // R
    data[i + 1] = Math.max(0, Math.min(255, 111 + variation)) // G
    data[i + 2] = Math.max(0, Math.min(255, 71 + variation))  // B
    data[i + 3] = 255 // A
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 16
  return texture
}

function createFeltTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  // Base felt color (billiard green)
  ctx.fillStyle = '#0c6b34'
  ctx.fillRect(0, 0, 512, 512)

  // Create dense noise texture like floor carpet - pixel manipulation
  const imageData = ctx.getImageData(0, 0, 512, 512)
  const data = imageData.data
  
  for (let i = 0; i < data.length; i += 4) {
    // Create random noise deviation (-25 to +25) for subtle variation
    const noise = (Math.random() - 0.5) * 50
    
    // Add noise to RGB channels
    data[i] = Math.min(255, Math.max(0, data[i] + noise))     // R
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)) // G
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)) // B
    // Keep alpha channel
  }
  
  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 16
  return texture
}

function createMetallicTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Base metallic gray
  ctx.fillStyle = '#404040'
  ctx.fillRect(0, 0, 256, 256)

  // Add metallic reflection pattern
  const imageData = ctx.getImageData(0, 0, 256, 256)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % 256
    const y = Math.floor(pixelIndex / 256)

    // Create metallic shine effect
    const metalShine = Math.sin(x * 0.03) * Math.cos(y * 0.03) * 40
    const scratchNoise = (Math.random() - 0.5) * 20

    const variation = Math.floor(metalShine + scratchNoise)

    data[i] = Math.max(0, Math.min(255, 64 + variation))       // R
    data[i + 1] = Math.max(0, Math.min(255, 64 + variation))   // G
    data[i + 2] = Math.max(0, Math.min(255, 64 + variation))   // B
    data[i + 3] = 255 // A
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.anisotropy = 16
  return texture
}

function createBilliardTable() {

  const tableWidth = TABLE_WIDTH
  const tableDepth = TABLE_DEPTH

  const legHeight = 4
  const baseHeight = 0.3
  const clothThickness = 1.7

  const frameThickness = 1.0
  const railHeight = 2.2

  const pocketRadius = 0.75
  const pocketInset = 0.4

  const legTopRadius = 0.55
  const legBottomRadius = 0.35

  const bottomY = 0

  const root = new THREE.Group()
  root.name = "Billiard Table"
  // expose dimensions for external code (topY and base info filled later)
  root.userData.tableDimensions = {
    width: tableWidth,
    depth: tableDepth,
    topY: undefined,
    // baseY will be the vertical center of the black base box;
    // we also include halfHeight so callers can compute top/bottom
    baseY: undefined,
    baseHalfHeight: undefined,
    clothColor: tableColors.cloth // Lưu màu vải để tạo hiệu ứng bụi
  }

  // Create textures
  const woodTexture = createWoodTexture()
  const feltTexture = createFeltTexture()
  const metallicTexture = createMetallicTexture()

  // Configure felt texture wrapping and repeat
  feltTexture.wrapS = THREE.RepeatWrapping
  feltTexture.wrapT = THREE.RepeatWrapping
  feltTexture.repeat.set(4, 2) // Repeat for fine noise grain

  // Materials with textures
  const clothMaterial = new THREE.MeshStandardMaterial({
    color: tableColors.cloth,
    map: feltTexture,
    roughness: 1.0, // Keep felt as matte as possible
    metalness: 0.0,
    envMapIntensity: 0.0
  })

  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: tableColors.frame,
    map: woodTexture,
    roughness: 0.5, // Wood is moderately rough
    metalness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4
  })

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: tableColors.base,
    map: metallicTexture,
    roughness: 0.3, // Metallic is shiny
    metalness: 0.7  // More metallic
  })

  const legMaterial = new THREE.MeshStandardMaterial({
    color: tableColors.leg,
    map: woodTexture,
    roughness: 0.5, // Wood texture
    metalness: 0.2
  })

  const legY = bottomY + legHeight / 2

  const legPositions = [
    [ tableWidth / 2,  tableDepth / 2 ],
    [ -tableWidth / 2, tableDepth / 2 ],
    [ tableWidth / 2,  -tableDepth / 2 ],
    [ -tableWidth / 2, -tableDepth / 2 ]
  ]

  legPositions.forEach(([x, z]) => {

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(
        legTopRadius,
        legBottomRadius,
        legHeight,
        32
      ),
      legMaterial
    )

    leg.position.set(x, legY, z)
    leg.castShadow = true
    leg.receiveShadow = true

    root.add(leg)

  })

  const baseY = bottomY + legHeight + baseHeight / 2

  // record base information for external modules (used by destruction plane)
  if (!root.userData.tableDimensions) root.userData.tableDimensions = {}
  root.userData.tableDimensions.baseY = baseY
  root.userData.tableDimensions.baseHalfHeight = baseHeight / 2

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(
      tableWidth + frameThickness * 2,
      baseHeight,
      tableDepth + frameThickness * 2
    ),
    baseMaterial
  )

  base.position.y = baseY
  base.castShadow = true
  base.receiveShadow = true

  root.add(base)

  const clothY = baseY + baseHeight / 2 + clothThickness / 2

  // record the top-of-cloth height and update dimensions stored earlier
  if (!root.userData.tableDimensions) root.userData.tableDimensions = {}
  root.userData.tableDimensions.topY = clothY

  const cloth = new THREE.Mesh(
    new THREE.BoxGeometry(tableWidth, clothThickness, tableDepth),
    clothMaterial
  )

  // Scale UVs to match texture repeat for fine grain appearance
  const clothGeometry = cloth.geometry
  clothGeometry.attributes.uv.array.forEach((value, index) => {
    if (index % 2 === 0) {
      clothGeometry.attributes.uv.array[index] *= 4  // Scale U
    } else {
      clothGeometry.attributes.uv.array[index] *= 2  // Scale V
    }
  })
  clothGeometry.attributes.uv.needsUpdate = true

  cloth.position.y = clothY
  cloth.updateMatrix()

  // add kill-plane marker after clothY is defined
  const killPlaneMarker = new THREE.Object3D()
  killPlaneMarker.name = "KillPlane"
  const clothKillOffset = 0.1
  killPlaneMarker.position.set(0, clothY + clothKillOffset, 0)
  root.add(killPlaneMarker)

  let clothCSG = CSG.fromMesh(cloth)

  const pocketPositions = [
    [ tableWidth / 2 - pocketInset,  tableDepth / 2 - pocketInset ],
    [ -tableWidth / 2 + pocketInset, tableDepth / 2 - pocketInset ],
    [ tableWidth / 2 - pocketInset,  -tableDepth / 2 + pocketInset ],
    [ -tableWidth / 2 + pocketInset, -tableDepth / 2 + pocketInset ],
    [ 0,  tableDepth / 2 - pocketInset ],
    [ 0, -tableDepth / 2 + pocketInset ]
  ]

  pocketPositions.forEach(([x, z]) => {

    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(
        pocketRadius,
        pocketRadius,
        clothThickness * 3,
        32
      )
    )

    pocket.position.set(x, clothY, z)
    pocket.updateMatrix()

    clothCSG = clothCSG.subtract(CSG.fromMesh(pocket))

  })

  const finalCloth = CSG.toMesh(clothCSG, new THREE.Matrix4())
  finalCloth.material = clothMaterial
  finalCloth.geometry.computeVertexNormals()

  finalCloth.castShadow = true
  finalCloth.receiveShadow = true

  root.add(finalCloth)

  // ======================================================
// RAIL CONFIG
// ======================================================

const railBottomY = baseY + baseHeight / 2
const railY = railBottomY + railHeight / 2

// chia rail thành 2 lớp
const railWoodThickness = frameThickness
const railCushionThickness = frameThickness * 0.125

// material cho cushion
const cushionMaterial = new THREE.MeshStandardMaterial({
  color: tableColors.cloth,
  roughness: 0.8
})

// ======================================================
// HÀM TẠO RAIL BOX
// ======================================================


function createRail(x, z, w, d) {
  // Always assign a valid material
  const safeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7, metalness: 0.2 });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, railHeight, d),
    safeMaterial
  );
  mesh.position.set(x, railY, z);
  mesh.updateMatrix();
  return mesh;
}

// ======================================================
// TẠO WOOD RAIL (KHUNG GỖ BÊN NGOÀI)
// ======================================================

const woodRails = [

  // top
  createRail(
    0,
    tableDepth / 2 + railWoodThickness / 2,
    tableWidth + frameThickness * 2,
    railWoodThickness
  ),

  // bottom
  createRail(
    0,
    -tableDepth / 2 - railWoodThickness / 2,
    tableWidth + frameThickness * 2,
    railWoodThickness
  ),

  // left
  createRail(
    -tableWidth / 2 - railWoodThickness / 2,
    0,
    railWoodThickness,
    tableDepth
  ),

  // right
  createRail(
    tableWidth / 2 + railWoodThickness / 2,
    0,
    railWoodThickness,
    tableDepth
  )

]

// ======================================================
// TẠO CUSHION RAIL (PHẦN XANH)
// ======================================================

const cushionRails = [

  // top
  createRail(
    0,
    tableDepth / 2 - railCushionThickness / 2,
    tableWidth,
    railCushionThickness
  ),

  // bottom
  createRail(
    0,
    -tableDepth / 2 + railCushionThickness / 2,
    tableWidth,
    railCushionThickness
  ),

  // left
  createRail(
    -tableWidth / 2 + railCushionThickness / 2,
    0,
    railCushionThickness,
    tableDepth
  ),

  // right
  createRail(
    tableWidth / 2 - railCushionThickness / 2,
    0,
    railCushionThickness,
    tableDepth
  )

]

// ======================================================
// FUNCTION ÁP DỤNG CSG POCKET
// ======================================================

function buildRailMesh(railMesh, material) {

  let railCSG = CSG.fromMesh(railMesh)

  pocketPositions.forEach(([x, z]) => {

    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(
        pocketRadius,
        pocketRadius,
        railHeight * 3,
        32
      )
    )

    pocket.position.set(x, railY, z)
    pocket.updateMatrix()

    railCSG = railCSG.subtract(CSG.fromMesh(pocket))

  })

  const finalRail = CSG.toMesh(railCSG, new THREE.Matrix4())

  finalRail.material = material
  finalRail.geometry.computeVertexNormals()

  finalRail.castShadow = true
  finalRail.receiveShadow = true

  return finalRail

}

// ======================================================
// BUILD WOOD RAIL
// ======================================================

woodRails.forEach(rail => {

  const mesh = buildRailMesh(rail, frameMaterial)
  root.add(mesh)

})

// ======================================================
// BUILD CUSHION RAIL
// ======================================================

cushionRails.forEach(rail => {

  const mesh = buildRailMesh(rail, cushionMaterial)
  root.add(mesh)

})

// ======================================================
// TẠO HITBOX CHO PHẦN ĐẾ VÀ 4 CHÂN BÀN
// ======================================================

const hitboxShapes = []

// ======================================================
// HITBOX CHO 4 CHÂN BÀN (DẠNG HÌNH TRỤ)
// ======================================================

// Tạo hitbox cho mỗi chân bàn (dùng cylinder)
legPositions.forEach(([x, z]) => {
  hitboxShapes.push({
    type: "cylinder",
    radiusTop: legTopRadius,
    radiusBottom: legBottomRadius,
    height: legHeight,
    offset: [x, legY, z]
  })
})

// ======================================================
// HITBOX CHO PHẦN ĐẾ (DẠNG HỘP CHỮ NHẬT)
// ======================================================

// Hitbox cho phần đế chính
hitboxShapes.push({
  type: "box",
  size: [
    tableWidth + frameThickness * 2,  // Chiều dài (full size)
    baseHeight,                        // Chiều cao (full size)
    tableDepth + frameThickness * 2    // Chiều rộng (full size)
  ],
  offset: [
    0,    // Vị trí X (trung tâm)
    baseY, // Vị trí Y (giữa phần đế)
    0     // Vị trí Z (trung tâm)
  ]
})

// ======================================================
// TÍNH TOÁN KÍCH THƯỚC LIÊN QUAN ĐẾN LỖ BÀN
// ======================================================

// vị trí lỗ giữa cạnh dài
const sidePocketZ = tableDepth - pocketInset

// vị trí lỗ góc
const cornerPocketZ = tableDepth / 2 - pocketInset

// ======================================================
// HITBOX NỀN CHÍNH DẠNG CHỮ THẬP (+)
// ======================================================

// ------------------------------------------------------
// 1. BOX TRUNG TÂM (PHẦN DỌC THEO CHIỀU DÀI BÀN)
// ------------------------------------------------------

const centerBoxWidth = tableWidth
const centerBoxDepth = tableDepth - 2 * pocketRadius - pocketInset * 2
const centerBoxHeight = clothThickness
const liftUpConst = 3

hitboxShapes.push({
  type: "box",
  size: [
    centerBoxWidth,          // full size
    centerBoxHeight,         // full size
    centerBoxDepth           // full size
  ],
  offset: [
    0,
    clothY,
    0
  ]
})

// ------------------------------------------------------
// 2. CHIA ĐÔI THEO CHIỀU RỘNG BÀN
// ------------------------------------------------------

const halfWidth = centerBoxWidth / 2
const sideBoxWidth = halfWidth / 2 - pocketRadius

const newSideBoxWidth = sideBoxWidth - 0.2   // đây vẫn là bán kính (half-extents)

// box bên phải
hitboxShapes.push({
  type: "box",
  size: [
    newSideBoxWidth * 2,      // chuyển thành full size
    centerBoxHeight,          // full size
    tableDepth                // full size
  ],
  offset: [
    halfWidth / 2 - 0.2,
    clothY,
    0
  ]
})

// box bên trái
hitboxShapes.push({
  type: "box",
  size: [
    newSideBoxWidth * 2,      // full size
    centerBoxHeight,          // full size
    tableDepth                // full size
  ],
  offset: [
    -halfWidth / 2 + 0.2,
    clothY,
    0
  ]
})

// ======================================================
// TẠO HITBOX CHO RAIL (6 PHẦN)
// ======================================================

// Tính toán kích thước rail từ code render
const railWidth = frameThickness; // Độ dày của rail

// Chiều dài của rail dọc theo chiều dài bàn (trừ đi phần lỗ góc và lỗ giữa)
const longRailLength = tableWidth - 2 * pocketRadius - pocketInset * 2;
const longRailHalfLength = longRailLength / 2;

// Chiều dài của rail ngang (trừ đi phần lỗ góc)
const shortRailLength = tableDepth - 2 * pocketRadius - pocketInset * 2;
const shortRailHalfLength = shortRailLength / 2;

// Khoảng cách từ tâm đến các lỗ
const pocketRadiusWithInset = pocketRadius + pocketInset;

// ======================================================
// 1. RAIL DÀI PHÍA TRÊN (2 PHẦN: TRÁI VÀ PHẢI)
// ======================================================

// Rail dài phía trên - phần bên trái (từ lỗ góc trái đến lỗ giữa)
hitboxShapes.push({
  type: "box",
  size: [
      longRailHalfLength - pocketRadius, // Chiều dài từ lỗ góc đến lỗ giữa
    railHeight + liftUpConst,             // Chiều cao
    railWidth               // Độ dày
  ],
  offset: [
    (-longRailHalfLength / 2) - pocketRadius / 2, // Vị trí X (bên trái)
    railY + liftUpConst /2,
    tableDepth / 2 + frameThickness / 2 // Vị trí Z (phía trên)
    ],
    material: 'rail' // Gán material
});

// Rail dài phía trên - phần bên phải (từ lỗ giữa đến lỗ góc phải)
hitboxShapes.push({
  type: "box",
  size: [
    longRailHalfLength - pocketRadius,     // Chiều dài từ lỗ giữa đến lỗ góc
    railHeight + liftUpConst,             // Chiều cao
    railWidth               // Độ dày
  ],
  offset: [
    (longRailHalfLength / 2) + pocketRadius / 2,  // Vị trí X (bên phải)
    railY + liftUpConst / 2,
    tableDepth / 2 + frameThickness / 2 // Vị trí Z (phía trên)
  ],
  material: 'rail'
});

// ======================================================
// 2. RAIL DÀI PHÍA DƯỚI (2 PHẦN: TRÁI VÀ PHẢI)
// ======================================================

// Rail dài phía dưới - phần bên trái (từ lỗ góc trái đến lỗ giữa)
hitboxShapes.push({
  type: "box",
  size: [
    longRailHalfLength - pocketRadius,     // Chiều dài từ lỗ góc đến lỗ giữa
    railHeight + liftUpConst,             // Chiều cao
    railWidth               // Độ dày
  ],
  offset: [
    -(longRailHalfLength / 2) - pocketRadius / 2, // Vị trí X (bên trái)
    railY + liftUpConst / 2,
    -tableDepth / 2 - frameThickness / 2 // Vị trí Z (phía dưới)
  ],
  material: 'rail'
});

// Rail dài phía dưới - phần bên phải (từ lỗ giữa đến lỗ góc phải)
hitboxShapes.push({
  type: "box",
  size: [
    longRailHalfLength - pocketRadius,     // Chiều dài từ lỗ giữa đến lỗ góc
    railHeight + liftUpConst,             // Chiều cao
    railWidth               // Độ dày
  ],
  offset: [
    longRailHalfLength / 2 + pocketRadius / 2,  // Vị trí X (bên phải)
    railY + liftUpConst / 2,
    -tableDepth / 2 - frameThickness / 2 // Vị trí Z (phía dưới)
  ],
  material: 'rail'
});

// ======================================================
// 3. RAIL NGANG BÊN TRÁI (1 PHẦN)
// ======================================================

// Rail ngang bên trái (từ lỗ góc trên đến lỗ góc dưới)
hitboxShapes.push({
  type: "box",
  size: [
    railWidth,              // Độ dày
    railHeight + liftUpConst,             // Chiều cao
    shortRailLength         // Chiều dài từ lỗ góc trên đến lỗ góc dưới
  ],
  offset: [
    -tableWidth / 2 - frameThickness / 2, // Vị trí X (bên trái)
    railY + liftUpConst / 2,
    0 // Vị trí Z (trung tâm)
  ],
  material: 'rail'
});

// ======================================================
// 4. RAIL NGANG BÊN PHẢI (1 PHẦN)
// ======================================================

// Rail ngang bên phải (từ lỗ góc trên đến lỗ góc dưới)
hitboxShapes.push({
  type: "box",
  size: [
    railWidth,              // Độ dày
    railHeight + liftUpConst,             // Chiều cao
    shortRailLength         // Chiều dài từ lỗ góc trên đến lỗ góc dưới
  ],
  offset: [
    tableWidth / 2 + frameThickness / 2, // Vị trí X (bên phải)
    railY + liftUpConst / 2,
    0 // Vị trí Z (trung tâm)
  ],
  material: 'rail'
});

// ======================================================
// TỔNG HỢP CÁC HITBOX ĐÃ THÊM:
// ======================================================
// - 4 hitbox hình trụ cho 4 chân bàn
// - 1 hitbox hình hộp cho phần đế
// - Các hitbox cho mặt bàn và rail đã có từ trước
// ======================================================

  root.userData.physics = {
    type: 'static',
    material: 'table',
    shapes: hitboxShapes
  }
  // ======================================================
// KILL PLANE CONFIG
// ======================================================
// Balls dưới vị trí này sẽ tự động despawn sau vài giây
// Được xử lý bởi Scene1Manager._updateKillPlane()
root.userData.tableDimensions.killPlane = {
  y: clothY - 5,  // 5 units dưới mặt bàn
  width: tableWidth + 10,  // Rộng hơn để catch toàn bộ bi rơi
  depth: tableDepth + 10,
  despawnDelay: 3  // Seconds trước khi despawn
}
  return root
}


export function getBilliardTableAsset() {

  return {
    name: "Billiard Table",
    description: "Stay out of the hole… or find out for yourself.",
    factory: () => createBilliardTable()
  }

}