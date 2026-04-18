import * as THREE from 'three'
import { getBilliardTableAsset } from "../../objects/BilliardTable.js"
import { getElevatorDoorAsset } from "../../objects/ElevatorDoor.js"
import { getVendingMachineAsset } from "../../objects/VendingMachine.js"
import { getCartonBoxAsset } from "../../objects/CartonBox.js"
import { getChestAsset } from "../../objects/Chest.js"
import { setupSceneLighting } from "../../../lights/createLights.js"

const ROOM_CONFIG = {
  tileSize: 2,
  tilesX: 30,
  tilesZ: 24,
  height: 20,
  get width() { return this.tilesX * this.tileSize },
  get depth() { return this.tilesZ * this.tileSize }
}

const COLORS = {
  wall: "#d4cd96",
  floor: "#7a756a",
  ceiling: "#eeeeee",
  ceilingLine: "#cccccc",
  ceilingEmissive: "#626262",
  tubeLight: "#ffffff",
  tubeHolder: "#a7644f",
  tubePointLight: "#ffffff",
  placeholder: "#884422"
}

const MATERIAL_PROPS = {
  wall: { roughness: 0.9, metalness: 0.0 },
  floor: { roughness: 1.0, metalness: 0.0 },
  ceiling: { roughness: 0.7 },
  tubeLight: { roughness: 0.1, emissiveIntensity: 15.0 },
  tubeHolder: { roughness: 0.5, metalness: 0.8 }
}

const LIGHT_FIXTURE_CONFIG = {
  tubeLength: 8,
  tubeRadius: 0.15,
  holderSize: 0.3,
  pointLightIntensity: 7.0,
  pointLightDistance: 25
}

const DEFAULT_ENV_LIGHTING = {
  fog: {
    type: "linear",
    color: "#27272a",
    near: 1,
    far: 200
  },
  shadows: {
    enabled: true,
    mapSize: 1024,
    bias: -0.0001,
    cameraSize: 30
  },
  ambientLight: {
    color: "#ffdea9",
    intensity: 0.3
  },
  directionalLight: {
    color: "#ffffff",
    intensity: 0,
    position: [0, 30, 0],
    castShadow: false
  },
  pointLights: [],
  spotLights: [],
  helpers: false
}

const WINDOW_CONFIG = {
  width: 14,
  height: 9,
  elevation: 11,
  glassColor: "#88ccff",
  frameColor: "#3e2723"
}

export function createSection1(rootGroup, lightingOverrides = {}) {
  // ======================================================
  // SECTION 1: PHÒNG CHÍNH VÀ TẤT CẢ CÁC ĐỒ VẬT
  // ======================================================

  const root = rootGroup
  const CEILING_THICKNESS = 0.5

  function createCeilingGridTexture() {
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    ctx.fillStyle = COLORS.ceiling
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = COLORS.ceilingLine
    ctx.lineWidth = 4

    const baseDivisions = 8
    const spacingMultiplier = 10
    const divisions = Math.max(2, Math.floor(baseDivisions / spacingMultiplier))
    const cellWidth = size / divisions
    const cellHeight = size / divisions

    for (let i = 0; i <= divisions; i++) {
      const y = i * cellHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }

    for (let j = 0; j <= divisions; j++) {
      const x = j * cellWidth
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(divisions, divisions)

    return texture
  }

  // ======================================================
  // HÀM TẠO TEXTURE GIẤY DÁN TƯỜNG (BACKROOMS STYLE)
  // Vàng ố, sọc dọc mờ, có nhiễu hạt
  // ======================================================
  function createWallpaperTexture() {
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // 1. Nền vàng ố
    ctx.fillStyle = COLORS.wall
    ctx.fillRect(0, 0, size, size)

    // 2. Vẽ sọc dọc mờ (Pattern đặc trưng)
    ctx.fillStyle = "rgba(0, 0, 0, 0.03)" // Màu đen rất mờ
    const stripeWidth = 40
    for (let x = 0; x < size; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, size)
    }

    // 3. Vẽ hoa văn ký tự (o, x, ^) lặp lại
    ctx.font = "bold 24px monospace" // Font đơn giản, đậm nhẹ
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)" // Đậm hơn tí (0.06 -> 0.12)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const symbols = ['o', 'x', '^']
    const gridSize = 64 // Khoảng cách giữa các ký tự

    for (let y = 0; y < size; y += gridSize) {
      for (let x = 0; x < size; x += gridSize) {
        // Chọn ký tự theo quy luật hàng dọc (mảng dọc) để tạo sọc đứng
        const index = Math.floor(x / gridSize) % symbols.length
        
        ctx.fillText(symbols[index], x + gridSize / 2, y + gridSize / 2)
      }
    }

    // 4. Thêm nhiễu hạt (Noise) để tạo cảm giác cũ kỹ
    // Vẽ ngẫu nhiên các điểm nhỏ
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const opacity = Math.random() * 0.1
      // Random giữa vết ố tối và vết xước sáng
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${opacity})` : `rgba(255,255,255,${opacity})`
      ctx.fillRect(x, y, 2, 2)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 2) // Lặp lại texture trên tường
    return texture
  }

  // ======================================================
  // HÀM TẠO TEXTURE THẢM (CARPET NOISE)
  // Xám ấm, nhiễu hạt dày đặc
  // ======================================================
  function createCarpetTexture() {
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // 1. Nền xám ấm
    ctx.fillStyle = COLORS.floor
    ctx.fillRect(0, 0, size, size)

    // 2. Tạo noise mật độ cao (Pixel manipulation)
    const imageData = ctx.getImageData(0, 0, size, size)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      // Tạo độ lệch ngẫu nhiên (-20 đến +20)
      const noise = (Math.random() - 0.5) * 30
      
      // Cộng noise vào RGB hiện tại
      data[i] = Math.min(255, Math.max(0, data[i] + noise))     // R
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)) // G
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)) // B
      // Alpha giữ nguyên
    }
    
    ctx.putImageData(imageData, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(ROOM_CONFIG.width / 4, ROOM_CONFIG.depth / 4) // Lặp lại nhiều lần để hạt nhỏ mịn
    return texture
  }

  // Materials
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    ...MATERIAL_PROPS.wall,
    map: createWallpaperTexture() // Áp dụng texture giấy dán tường
  })

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    ...MATERIAL_PROPS.floor,
    map: createCarpetTexture() // Áp dụng texture thảm
  })

  // Ceiling material với texture đường kẻ
  const ceilingTexture = createCeilingGridTexture()
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.ceiling,
    emissive: COLORS.ceilingEmissive,
    ...MATERIAL_PROPS.ceiling,
    map: ceilingTexture
  })

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_CONFIG.width, 0.5, ROOM_CONFIG.depth),
    floorMaterial
  )
  floor.position.set(0, 0, 0)
  floor.receiveShadow = true
  floor.castShadow = false
  floor.name = "Floor"
  root.add(floor)

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_CONFIG.width, CEILING_THICKNESS, ROOM_CONFIG.depth),
    ceilingMaterial
  )
  ceiling.position.set(0, ROOM_CONFIG.height, 0)
  ceiling.receiveShadow = true
  ceiling.castShadow = false
  ceiling.name = "Ceiling"
  root.add(ceiling)

  // ======================================================
  // TẠO ĐÈN LED ỐNG TRỤ TRÊN TRẦN
  // ======================================================
  
  function createTubeLight(x, z) {
    const lightGroup = new THREE.Group()

    // Tính toán vị trí Y để đui đèn nằm sát mặt dưới của trần nhà
    const ceilingBottomY = ROOM_CONFIG.height - (CEILING_THICKNESS / 2)
    const lightY = ceilingBottomY - (LIGHT_FIXTURE_CONFIG.holderSize / 2)
    lightGroup.position.set(x, lightY, z)

    // Kích thước đèn
    const { tubeLength, tubeRadius, holderSize } = LIGHT_FIXTURE_CONFIG

    // Material cho ống đèn (phát sáng)
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.tubeLight,
      emissive: COLORS.tubeLight,
      emissiveIntensity: MATERIAL_PROPS.tubeLight.emissiveIntensity,
      roughness: MATERIAL_PROPS.tubeLight.roughness
    })

    // Material cho đui đèn (kim loại tối màu)
    const holderMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.tubeHolder,
      ...MATERIAL_PROPS.tubeHolder
    })

    // Ống đèn 1
    const tube1 = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 8), // Tối ưu: Giảm segment xuống 8
      tubeMaterial
    )
    tube1.rotation.z = Math.PI / 2 // Xoay ngang
    tube1.position.z = -0.25 // Dịch sang một bên
    lightGroup.add(tube1)

    // Ống đèn 2
    const tube2 = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 8), // Tối ưu: Giảm segment xuống 8
      tubeMaterial
    )
    tube2.rotation.z = Math.PI / 2 // Xoay ngang
    tube2.position.z = 0.25 // Dịch sang bên kia
    lightGroup.add(tube2)

    // 2 Đui đèn (hình hộp)
    // Kéo dài chân đèn ra gấp 2.5 lần theo trục Z để chứa 2 ống
    const holderGeo = new THREE.BoxGeometry(holderSize, holderSize, 0.8) // Làm ngắn đế đèn lại (Z axis)
    
    const leftHolder = new THREE.Mesh(holderGeo, holderMaterial)
    leftHolder.position.x = -tubeLength / 2
    lightGroup.add(leftHolder)

    const rightHolder = new THREE.Mesh(holderGeo, holderMaterial)
    rightHolder.position.x = tubeLength / 2
    lightGroup.add(rightHolder)

    // Ánh sáng môi trường nhẹ từ đèn
    const light = new THREE.PointLight(
      COLORS.tubePointLight, 
      LIGHT_FIXTURE_CONFIG.pointLightIntensity, 
      LIGHT_FIXTURE_CONFIG.pointLightDistance
    )
    light.position.y = -1 // Đặt thấp hơn đèn một chút
    light.castShadow = false // Tắt shadow để tối ưu
    lightGroup.add(light)

    // Lưu thông tin để flicker
    lightGroup.userData = {
      isLightFixture: true,
      lightSource: light
    }

    return lightGroup
  }

  // Tạo 4 đèn ở 4 góc trần (đối xứng qua tâm)
  const lightOffsetX = ROOM_CONFIG.width / 4
  const lightOffsetZ = ROOM_CONFIG.depth / 4

  root.add(createTubeLight(-lightOffsetX, -lightOffsetZ))
  root.add(createTubeLight(lightOffsetX, -lightOffsetZ))
  
  // Đèn thứ 3 sẽ nhấp nháy
  const flickeringLight = createTubeLight(-lightOffsetX, lightOffsetZ)
  flickeringLight.userData.isFlickering = true
  root.add(flickeringLight)
  root.add(createTubeLight(lightOffsetX, lightOffsetZ))

  // Walls
  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_CONFIG.width, ROOM_CONFIG.height, 0.5),
    wallMaterial
  )
  wallFront.position.set(0, ROOM_CONFIG.height / 2, ROOM_CONFIG.depth / 2)
  wallFront.receiveShadow = true
  wallFront.castShadow = true
  wallFront.name = "Wall Front"
  root.add(wallFront)

  // Tường phía sau (-Z)
  const wallBack = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_CONFIG.width, ROOM_CONFIG.height, 0.5),
    wallMaterial
  )
  wallBack.position.set(0, ROOM_CONFIG.height / 2, -ROOM_CONFIG.depth / 2)
  wallBack.receiveShadow = true
  wallBack.castShadow = true
  wallBack.name = "Wall Back"
  root.add(wallBack)

  // ======================================================
  // TƯỜNG BÊN TRÁI (-X) VỚI CỬA SỔ
  // ======================================================
  const wallLeftGroup = new THREE.Group()
  wallLeftGroup.name = "Wall Left Group"
  
  const wWidth = WINDOW_CONFIG.width
  const wHeight = WINDOW_CONFIG.height
  const wElev = WINDOW_CONFIG.elevation
  const wallX = -ROOM_CONFIG.width / 2
  const wallThick = 0.5
  
  // Tính toán kích thước các phần tường xung quanh cửa sổ
  const bottomH = wElev - wHeight / 2
  const topH = ROOM_CONFIG.height - (wElev + wHeight / 2)
  const sideZ = (ROOM_CONFIG.depth - wWidth) / 2

  // ======================================================
  // FIX TEXTURE: Hàm tự động chỉnh tỷ lệ texture theo kích thước tường
  // Giúp hoa văn không bị co giãn khi tường nhỏ/to khác nhau
  // ======================================================
  function getAdaptiveWallMaterial(width, height, uOffset = 0) {
    const mat = wallMaterial.clone()
    const tex = wallMaterial.map.clone()
    // Tính toán tỷ lệ dựa trên tường chuẩn (Width 60 -> Repeat 4, Height 20 -> Repeat 2)
    // Lưu ý: Tường bên trái chạy dọc theo chiều sâu (Depth), nên dùng depth để tính mật độ
    const densityX = 4 / ROOM_CONFIG.depth
    const densityY = 2 / ROOM_CONFIG.height
    
    tex.repeat.set(width * densityX, height * densityY)
    tex.offset.set(uOffset * densityX, 0) // Chỉnh độ lệch để khớp hoa văn
    mat.map = tex
    return mat
  }

  // 1. Phần tường dưới cửa sổ
  const wallLeftBottom = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, bottomH, ROOM_CONFIG.depth),
    getAdaptiveWallMaterial(ROOM_CONFIG.depth, bottomH, 0) // Full chiều dài, không offset
  )
  wallLeftBottom.position.set(wallX, bottomH / 2, 0)
  wallLeftBottom.castShadow = true
  wallLeftBottom.receiveShadow = true
  wallLeftGroup.add(wallLeftBottom)

  // 2. Phần tường trên cửa sổ
  const wallLeftTop = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, topH, ROOM_CONFIG.depth),
    getAdaptiveWallMaterial(ROOM_CONFIG.depth, topH, 0) // Full chiều dài, không offset
  )
  wallLeftTop.position.set(wallX, ROOM_CONFIG.height - topH / 2, 0)
  wallLeftTop.castShadow = true
  wallLeftTop.receiveShadow = true
  wallLeftGroup.add(wallLeftTop)

  // 3. Phần tường bên trái cửa sổ (theo trục Z) - Phía "trước"
  const wallLeftSide1 = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wHeight, sideZ),
    getAdaptiveWallMaterial(sideZ, wHeight, 0) // Bắt đầu từ đầu tường, offset 0
  )
  wallLeftSide1.position.set(wallX, wElev, ROOM_CONFIG.depth / 2 - sideZ / 2)
  wallLeftSide1.castShadow = true
  wallLeftSide1.receiveShadow = true
  wallLeftGroup.add(wallLeftSide1)

  // 4. Phần tường bên phải cửa sổ (theo trục Z) - Phía "sau"
  const wallLeftSide2 = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, wHeight, sideZ),
    getAdaptiveWallMaterial(sideZ, wHeight, sideZ + wWidth) // Offset = đoạn tường trước + cửa sổ
  )
  wallLeftSide2.position.set(wallX, wElev, -ROOM_CONFIG.depth / 2 + sideZ / 2)
  wallLeftSide2.castShadow = true
  wallLeftSide2.receiveShadow = true
  wallLeftGroup.add(wallLeftSide2)

  // 5. Khung cửa sổ & Kính
  const frameSize = 0.6 // Độ to bản của khung gỗ
  const frameDepth = 0.7 // Độ dày của khung (nhô ra khỏi tường một chút, tường dày 0.5)
  
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: WINDOW_CONFIG.frameColor,
    roughness: 0.8
  })

  // --- Khung bao ngoài (4 thanh) ---
  // Thanh trên
  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, frameSize, wWidth),
    frameMaterial
  )
  frameTop.position.set(wallX, wElev + wHeight/2 - frameSize/2, 0)
  frameTop.castShadow = true
  frameTop.receiveShadow = true
  wallLeftGroup.add(frameTop)

  // Thanh dưới
  const frameBottom = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, frameSize, wWidth),
    frameMaterial
  )
  frameBottom.position.set(wallX, wElev - wHeight/2 + frameSize/2, 0)
  frameBottom.castShadow = true
  frameBottom.receiveShadow = true
  wallLeftGroup.add(frameBottom)

  // Thanh bên 1 (Z dương)
  const frameSide1 = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, wHeight - 2*frameSize, frameSize),
    frameMaterial
  )
  frameSide1.position.set(wallX, wElev, wWidth/2 - frameSize/2)
  frameSide1.castShadow = true
  frameSide1.receiveShadow = true
  wallLeftGroup.add(frameSide1)

  // Thanh bên 2 (Z âm)
  const frameSide2 = new THREE.Mesh(
    new THREE.BoxGeometry(frameDepth, wHeight - 2*frameSize, frameSize),
    frameMaterial
  )
  frameSide2.position.set(wallX, wElev, -wWidth/2 + frameSize/2)
  frameSide2.castShadow = true
  frameSide2.receiveShadow = true
  wallLeftGroup.add(frameSide2)

  // --- Song cửa (Viền trong) ---
  // Thanh dọc ở giữa
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(frameDepth * 0.8, wHeight - 2*frameSize, 0.3), frameMaterial)
  mullionV.position.set(wallX, wElev, 0)
  wallLeftGroup.add(mullionV)

  // Kính
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, wHeight - frameSize, wWidth - frameSize),
    // Tối ưu: Dùng MeshStandardMaterial thay vì MeshPhysicalMaterial (transmission rất nặng)
    new THREE.MeshStandardMaterial({
      color: WINDOW_CONFIG.glassColor,
      transparent: true,
      opacity: 0.3,
      roughness: 0.2,
      metalness: 0.1
    })
  )
  glass.position.set(wallX, wElev, 0)
  glass.renderOrder = 1 // Ensure glass renders after the person
  glass.castShadow = false // Tối ưu: Kính không cần đổ bóng, giảm lag đáng kể
  wallLeftGroup.add(glass)

  root.add(wallLeftGroup)

  // ======================================================
  // NGƯỜI ĐỨNG NGOÀI CỬA SỔ (SHADOW CASTER)
  // ======================================================
  const texLoader = new THREE.TextureLoader()
  // Load ảnh từ đường dẫn chính xác
  const personTexture = texLoader.load(`${import.meta.env.BASE_URL}pictures/person.png`)

  const personHeight = 4  // To hơn
  const personWidth = 4 // Tùy chỉnh tỷ lệ theo ảnh của bạn

  const personMat = new THREE.MeshStandardMaterial({
    map: personTexture,
    transparent: true,
    alphaTest: 0.5,  // QUAN TRỌNG: Cắt shadow theo hình dáng người (bỏ phần trong suốt)
    side: THREE.FrontSide
  })

  const personMesh = new THREE.Mesh(new THREE.PlaneGeometry(personWidth, personHeight), personMat)
  
    // Đặt vị trí: Bên ngoài tường (wallX), đứng trên mép dưới cửa sổ hoặc lơ lửng
  personMesh.position.set(wallX - 2, wElev - 2, - 6.5) // Dịch lại gần cửa sổ hơn để dễ thấy
  personMesh.rotation.y = Math.PI / 2 // Xoay mặt về phía trong phòng
  personMesh.castShadow = true // Bắt buộc để đổ bóng
  personMesh.name = "Person" // Give it a name to find it later
  root.add(personMesh)
  
  let riseProgress = 0; // Track the rising progress
  // Store the initial Y position and set the initial position below
  const initialY = wElev - 2
  personMesh.position.y = initialY - 5 // Start position below
  let targetY = initialY - 5;

  personMesh.userData.triggerShape = {
      type: 'sphere',
      radius: 14,
      isTrigger: true,
  };

  // 6. Ánh sáng chiếu qua cửa sổ (God Ray Light)
  const sunLight = new THREE.SpotLight(0xffeebb, 4000) // Cường độ rất mạnh
  sunLight.position.set(wallX - 25, wElev + 8, 5) // Hạ thấp nguồn sáng xuống một chút
  sunLight.target.position.set(10, 0, 0) // Chiếu vào giữa phòng/bàn
  sunLight.angle = Math.PI / 7
  sunLight.penumbra = 0.1
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 512 // Tối ưu cực mạnh: Giảm xuống 512
  sunLight.shadow.mapSize.height = 512
  sunLight.shadow.bias = -0.00005 // Tinh chỉnh bias để bóng không bị tách rời vật thể
  sunLight.shadow.radius = 4 // Tăng độ nhòe để che đi độ phân giải thấp -> Bóng rất mềm và nghệ thuật
  
  sunLight.name = 'Section1 Sun Light'
  // Thêm target vào scene để spotlight hoạt động đúng
  root.add(sunLight)
  root.add(sunLight.target)

  // Lighting descriptor — read by Scene1Manager to isolate per-section lighting
  root.userData.sectionLighting = {
    mainLight: sunLight,
    baseMainIntensity: 4000,
    ambientIntensity: 0.2,
    fog: { near: 1, far: 200 }
  }

  // Tường bên phải (+X)
  const wallRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, ROOM_CONFIG.height, ROOM_CONFIG.depth),
    wallMaterial
  )
  wallRight.position.set(ROOM_CONFIG.width / 2, ROOM_CONFIG.height / 2, 0)
  wallRight.receiveShadow = true
  wallRight.castShadow = true
  wallRight.name = "Wall Right"
  root.add(wallRight)

  // Add billiard table
  try {
    const tableAsset = getBilliardTableAsset()
    const billiardTable = tableAsset.factory()
    
    billiardTable.position.set(0, 0, 0)
    
    root.add(billiardTable)
  } catch (error) {
    console.error('Failed to load billiard table:', error)
    
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(12, 2.5, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.placeholder })
    )
    placeholder.position.set(0, 1.75, 0)
    placeholder.castShadow = true
    placeholder.receiveShadow = true
    root.add(placeholder)
  }

  let vendingMachine = null
  const vendingMachineScale = 2 / 3

  // Add vending machine in the back-right corner, slightly inward and angled.
  try {
    const vendingMachineAsset = getVendingMachineAsset()
    vendingMachine = vendingMachineAsset.factory()

    vendingMachine.scale.setScalar(vendingMachineScale)
    vendingMachine.position.set(22.8, 9.75 * vendingMachineScale, -18.8)
    vendingMachine.rotation.y = -Math.PI / 4
    vendingMachine.name = 'Vending Machine'

    root.add(vendingMachine)
  } catch (error) {
    console.error('Failed to load vending machine:', error)
  }

  // Add doors
  // Doors removed - debug objects cleaned up

  // ======================================================
  // CARTON BOX (THÙNG CARTON)
  // ======================================================
  const billiardTableTarget = new THREE.Vector2(0, 0)
  const getFacingYawToTarget = (x, z, target) => Math.atan2(target.x - x, target.y - z)

  try {
    const cartonBoxAsset = getCartonBoxAsset()
    const cartonBox = cartonBoxAsset.factory()

    // Move carton beside vending machine and keep it facing billiard table.
    cartonBox.position.set(17.9, 1.25, -18.2)
    cartonBox.rotation.y = getFacingYawToTarget(
      cartonBox.position.x,
      cartonBox.position.z,
      billiardTableTarget
    )
    cartonBox.name = 'Carton Box'

    root.add(cartonBox)
  } catch (error) {
    console.error('Failed to load carton box:', error)
  }

  // ======================================================
  // CHEST (HỘP KHO BÁU)
  // ======================================================
  try {
    const chestAsset = getChestAsset()
    const chest = chestAsset.factory()

    // Place chest at another corner near the billiard table and face the table.
    chest.position.set(-8.2, 1.15, 7.6)
    chest.rotation.y = getFacingYawToTarget(
      chest.position.x,
      chest.position.z,
      billiardTableTarget
    )
    chest.name = 'Chest'

    root.add(chest)
  } catch (error) {
    console.error('Failed to load chest:', error)
  }
  try {
    const elevatorAsset = getElevatorDoorAsset()
    const elevatorDoor = elevatorAsset.factory()
    
    // Position: Tường bên phải (X=29.5), từ sàn (Y=2.5)
    elevatorDoor.position.set(29.5, 2.5, 0)
    elevatorDoor.name = "Elevator Door"
    
    // ✨ Ensure animation state is initialized
    if (!elevatorDoor.userData.animationState) {
      elevatorDoor.userData.animationState = {
        isOpening: false,
        isOpen: false,
        openProgress: 0,
        openStartTime: 0,
        glowIntensity: 0
      }
    }
    
    root.add(elevatorDoor)
    console.log('[Scene1] Elevator door created and added to scene')
  } catch (error) {
    console.error('[Scene1] Failed to load elevator door:', error)
  }

  // Tối ưu: Vì đã có SpotLight (sunLight) đổ bóng từ cửa sổ,
  // ta cần tắt bóng của DirectionalLight mặc định để tránh có 2 nguồn shadow gây lag.
  const baseLightingConfig = {
    ...DEFAULT_ENV_LIGHTING,
    directionalLight: {
      ...DEFAULT_ENV_LIGHTING.directionalLight,
      castShadow: false // Tắt shadow của đèn chính
    }
  };

  // Merge with overrides
  const lightingConfig = {
    ...baseLightingConfig,
    ...lightingOverrides,
    fog: { ...baseLightingConfig.fog, ...(lightingOverrides.fog || {}) },
    shadows: { ...baseLightingConfig.shadows, ...(lightingOverrides.shadows || {}) },
    ambientLight: { ...baseLightingConfig.ambientLight, ...(lightingOverrides.ambientLight || {}) },
    directionalLight: { ...baseLightingConfig.directionalLight, ...(lightingOverrides.directionalLight || {}) },
    pointLights: lightingOverrides.pointLights || baseLightingConfig.pointLights,
    spotLights: lightingOverrides.spotLights || baseLightingConfig.spotLights
  }

  // Lưu lightingConfig vào root để có thể truy cập sau này
  root.userData.lightingConfig = lightingConfig

  // Physics shapes for room
  root.userData.physics = {
    type: 'static',
    material: 'wall',
    shapes: [
      // Floor
      {
        type: 'box',
        size: [ROOM_CONFIG.width, 0.5, ROOM_CONFIG.depth],
        offset: [0, 0, 0]
      },
      // Ceiling
      {
        type: 'box',
        size: [ROOM_CONFIG.width, CEILING_THICKNESS, ROOM_CONFIG.depth],
        offset: [0, ROOM_CONFIG.height, 0]
      },
      // Front wall
      {
        type: 'box',
        size: [ROOM_CONFIG.width, ROOM_CONFIG.height, 0.5],
        offset: [0, ROOM_CONFIG.height/2, ROOM_CONFIG.depth/2]
      },
      // Back wall
      {
        type: 'box',
        size: [ROOM_CONFIG.width, ROOM_CONFIG.height, 0.5],
        offset: [0, ROOM_CONFIG.height/2, -ROOM_CONFIG.depth/2]
      },
      // Left wall (Split into 4 parts for window)
      // Bottom
      {
        type: 'box',
        size: [0.5, bottomH, ROOM_CONFIG.depth],
        offset: [wallX, bottomH / 2, 0]
      },
      // Top
      {
        type: 'box',
        size: [0.5, topH, ROOM_CONFIG.depth],
        offset: [wallX, ROOM_CONFIG.height - topH / 2, 0]
      },
      // Side 1 (Front Z)
      {
        type: 'box',
        size: [0.5, wHeight, sideZ],
        offset: [wallX, wElev, ROOM_CONFIG.depth / 2 - sideZ / 2]
      },
      // Side 2 (Back Z)
      {
        type: 'box',
        size: [0.5, wHeight, sideZ],
        offset: [wallX, wElev, -ROOM_CONFIG.depth / 2 + sideZ / 2]
      },
      // Right wall
      {
        type: 'box',
        size: [0.5, ROOM_CONFIG.height, ROOM_CONFIG.depth],
        offset: [ROOM_CONFIG.width/2, ROOM_CONFIG.height/2, 0]
      }
    ]
  }

  // Add table physics shapes
  const billiardTable = root.children.find(c => c.name === "Billiard Table")
  if (billiardTable && billiardTable.userData && billiardTable.userData.physics) {
    billiardTable.userData.physics.shapes.forEach(shape => {
      const newShape = { ...shape }
      newShape.material = 'table'
      if (newShape.offset) {
        newShape.offset = [
          newShape.offset[0] + billiardTable.position.x,
          newShape.offset[1] + billiardTable.position.y,
          newShape.offset[2] + billiardTable.position.z
        ]
      }
      root.userData.physics.shapes.push(newShape)
    })
  }

  // Store tile information
  root.userData.tileInfo = {
    size: ROOM_CONFIG.tileSize,
    countX: ROOM_CONFIG.tilesX,
    countZ: ROOM_CONFIG.tilesZ,
    totalArea: ROOM_CONFIG.width * ROOM_CONFIG.depth
  }
  
  console.log(`Room dimensions: ${ROOM_CONFIG.width} x ${ROOM_CONFIG.depth} = ${ROOM_CONFIG.width * ROOM_CONFIG.depth} units`)
  console.log(`Tiles: ${ROOM_CONFIG.tilesX * ROOM_CONFIG.tilesZ} tiles of ${ROOM_CONFIG.tileSize}x${ROOM_CONFIG.tileSize}`)

  // Lighting methods
  root.userData.applyLighting = function(scene, renderer) {
    if (!scene || !renderer) {
      console.warn('Scene and renderer required for lighting setup')
      return null
    }
    
    console.log('Applying lighting for scene1:', root.userData.lightingConfig)
    const lightingController = setupSceneLighting(scene, renderer, root.userData.lightingConfig)
    root.userData.lightingController = lightingController
    return lightingController
  }

  root.userData.updateLighting = function(newConfig) {
    if (!root.userData.lightingController) {
      console.warn('No lighting controller, call applyLighting first')
      return
    }
    
    root.userData.lightingConfig = {
      ...root.userData.lightingConfig,
      ...newConfig,
      fog: { ...root.userData.lightingConfig.fog, ...(newConfig.fog || {}) },
      shadows: { ...root.userData.lightingConfig.shadows, ...(newConfig.shadows || {}) },
      ambientLight: { ...root.userData.lightingConfig.ambientLight, ...(newConfig.ambientLight || {}) },
      directionalLight: { ...root.userData.lightingConfig.directionalLight, ...(newConfig.directionalLight || {}) }
    }
    
    console.log('Lighting config updated:', root.userData.lightingConfig)
  }

  // Note: Dynamic logic (flickering, person animation, water splash)
  // has been moved to Scene1Manager for better separation of concerns

  // ======================================================
  // TẠO VIỀN GIÁP MẠI CẠP PHÒNG (12 VIỀN)
  // Viền vàng sáng + texture giống sàn, tạo nhấn mạnh cạnh phòng
  // ======================================================
  
  // Material cho viền: vàng sáng hơn tường, texture sàn
  const trimColor = new THREE.Color(COLORS.floor).multiplyScalar(2.5) // Vàng sáng hơn 2.5x
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: trimColor,
    ...MATERIAL_PROPS.floor,
    map: createCarpetTexture(),
    roughness: 0.8,
    metalness: 0.0
  })

  // Helper function: tạo viền (box hẹp)
  function createTrim(width, height, depth, x, y, z, name) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      trimMaterial
    )
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = name
    return mesh
  }

  const TRIM_WIDTH = 0.3  // Độ rộng viền
  const trimHeight = ROOM_CONFIG.height - 0.5  // Chiều cao viền dọc (trừ sàn và trần)
  const halfTrim = TRIM_WIDTH / 2
  const halfWidth = ROOM_CONFIG.width / 2
  const halfDepth = ROOM_CONFIG.depth / 2
  const trimInset = 0.25

  // 4 VIỀN DỌC ở các góc (Wall-to-Wall corners) - ĐẨY VÀO TRONG PHÒNG
  root.add(createTrim(
    TRIM_WIDTH, trimHeight, TRIM_WIDTH,
    -halfWidth + halfTrim + trimInset, ROOM_CONFIG.height / 2, -halfDepth + halfTrim + trimInset,
    "Trim Corner Front-Left"
  ))
  root.add(createTrim(
    TRIM_WIDTH, trimHeight, TRIM_WIDTH,
    halfWidth - halfTrim - trimInset, ROOM_CONFIG.height / 2, -halfDepth + halfTrim + trimInset,
    "Trim Corner Front-Right"
  ))
  root.add(createTrim(
    TRIM_WIDTH, trimHeight, TRIM_WIDTH,
    -halfWidth + halfTrim + trimInset, ROOM_CONFIG.height / 2, halfDepth - halfTrim - trimInset,
    "Trim Corner Back-Left"
  ))
  root.add(createTrim(
    TRIM_WIDTH, trimHeight, TRIM_WIDTH,
    halfWidth - halfTrim - trimInset, ROOM_CONFIG.height / 2, halfDepth - halfTrim - trimInset,
    "Trim Corner Back-Right"
  ))

  // 4 VIỀN NGANG ở chân tường (Floor-to-Wall) - ĐẨY VÀO TRONG PHÒNG
  root.add(createTrim(
    ROOM_CONFIG.width - TRIM_WIDTH, TRIM_WIDTH, TRIM_WIDTH,
    0, halfTrim, -halfDepth + halfTrim + trimInset,
    "Trim Bottom Front"
  ))
  root.add(createTrim(
    ROOM_CONFIG.width - TRIM_WIDTH, TRIM_WIDTH, TRIM_WIDTH,
    0, halfTrim, halfDepth - halfTrim - trimInset,
    "Trim Bottom Back"
  ))
  root.add(createTrim(
    TRIM_WIDTH, TRIM_WIDTH, ROOM_CONFIG.depth - TRIM_WIDTH,
    -halfWidth + halfTrim + trimInset, halfTrim, 0,
    "Trim Bottom Left"
  ))
  root.add(createTrim(
    TRIM_WIDTH, TRIM_WIDTH, ROOM_CONFIG.depth - TRIM_WIDTH,
    halfWidth - halfTrim - trimInset, halfTrim, 0,
    "Trim Bottom Right"
  ))

  // 4 VIỀN NGANG ở trên cùng (Ceiling-to-Wall) - ĐẨY VÀO TRONG PHÒNG
  root.add(createTrim(
    ROOM_CONFIG.width - TRIM_WIDTH, TRIM_WIDTH, TRIM_WIDTH,
    0, ROOM_CONFIG.height - halfTrim, -halfDepth + halfTrim + trimInset,
    "Trim Top Front"
  ))
  root.add(createTrim(
    ROOM_CONFIG.width - TRIM_WIDTH, TRIM_WIDTH, TRIM_WIDTH,
    0, ROOM_CONFIG.height - halfTrim, halfDepth - halfTrim - trimInset,
    "Trim Top Back"
  ))
  root.add(createTrim(
    TRIM_WIDTH, TRIM_WIDTH, ROOM_CONFIG.depth - TRIM_WIDTH,
    -halfWidth + halfTrim + trimInset, ROOM_CONFIG.height - halfTrim, 0,
    "Trim Top Left"
  ))
  root.add(createTrim(
    TRIM_WIDTH, TRIM_WIDTH, ROOM_CONFIG.depth - TRIM_WIDTH,
    halfWidth - halfTrim - trimInset, ROOM_CONFIG.height - halfTrim, 0,
    "Trim Top Right"
  ))

  // ======================================================
  // KẾT THÚC SECTION 1
  // ======================================================
}
