import * as THREE from 'three'
import { getElevatorDoorAsset } from "../../objects/ElevatorDoor.js"

export function createSection2(rootGroup) {
  // ======================================================
  // SECTION 2: HÀNH LANG PHÍA TRÊN SECTION 1
  // Tile gạch lát trắng bóng loáng, khe xám đậm
  // ======================================================

  const SECTION2_BASE_Y = 35  // Section 1 ceiling tại Y=20, gap 15 units (nâng cao hơn)

  const HALLWAY_CONFIG = {
    width: 8,    // Hẹp
    depth: 180,  // Dài
    height: 12   // Thấp hơn Section 1
  }

  const CEIL_THICK = 0.5
  const TILE_SIZE = 0.8  // Kích thước 1 viên gạch trong world units (nhỏ hơn)

  // --- Tạo tile texture: gạch trắng bóng, khe xám đậm ---
  function createTileTexture() {
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Nền gạch trắng sáng
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, size, size)

    // Khe grout xám đậm
    const groutWidth = Math.max(1, Math.round(size * 0.015))  // ~1.5% kích thước tile (mỏng hơn)
    ctx.fillStyle = '#555555'
    // Khe ngang
    ctx.fillRect(0, 0, size, groutWidth)
    ctx.fillRect(0, size - groutWidth, size, groutWidth)
    // Khe dọc
    ctx.fillRect(0, 0, groutWidth, size)
    ctx.fillRect(size - groutWidth, 0, groutWidth, size)

    // Highlight nhỏ để tạo độ sâu cho viên gạch
    const inner = groutWidth
    const grad = ctx.createLinearGradient(inner, inner, size - inner, size - inner)
    grad.addColorStop(0, 'rgba(255,255,255,0.25)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0)')
    grad.addColorStop(1, 'rgba(200,200,200,0.15)')
    ctx.fillStyle = grad
    ctx.fillRect(inner, inner, size - inner * 2, size - inner * 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }

  // --- Tạo material với UV repeat đúng theo kích thước mặt ---
  function createTileMaterial(surfaceWidth, surfaceHeight) {
    const tex = createTileTexture()
    tex.repeat.set(surfaceWidth / TILE_SIZE, surfaceHeight / TILE_SIZE)
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.018,   // Bóng hơn để ăn highlight từ đèn trần
      metalness: 0.22,
      envMapIntensity: 1.2,
      // Khe grout không bóng được handle qua texture (không cần roughnessMap riêng)
    })
  }

  // Nước tileable thật sự: pattern dùng sóng tuần hoàn theo u,v để khớp hoàn toàn ở các cạnh texture.
  function createWaterRippleTexture(size = 320, variant = 'base') {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(size, size)
    const data = img.data

    const freq = variant === 'detail'
      ? { a: 5, b: 3, c: 7, d: 4 }
      : variant === 'distort'
        ? { a: 3, b: 2, c: 4, d: 3 }
        : { a: 2, b: 2, c: 3, d: 2 }

    for (let y = 0; y < size; y++) {
      const v = y / size
      for (let x = 0; x < size; x++) {
        const u = x / size
        const wave1 = Math.sin((u * freq.a + v * freq.b) * Math.PI * 2)
        const wave2 = Math.cos((u * freq.c - v * freq.d) * Math.PI * 2)
        const wave3 = Math.sin((u * (freq.a + 1.5) + v * (freq.d + 0.5)) * Math.PI * 2)
        const ripple = variant === 'distort'
          ? 0.5 + wave1 * 0.34 + wave2 * 0.26 + wave3 * 0.16
          : 0.5 + wave1 * 0.24 + wave2 * 0.14 + wave3 * 0.07
        const n = THREE.MathUtils.clamp(ripple, 0, 1)

        let r, g, b
        if (variant === 'detail') {
          // Detail map sáng hơn để dùng cho emissive/spec highlights.
          const c = 132 + Math.floor(n * 98)
          r = c
          g = c + 10
          b = c + 20
        } else if (variant === 'distort') {
          // Distortion map grayscale để displacement/bump không bị rằn màu.
          const c = 92 + Math.floor(n * 74)
          r = c
          g = c
          b = c
        } else {
          // Base map xanh nước đậm.
          r = 44 + Math.floor(n * 34)
          g = 100 + Math.floor(n * 46)
          b = 126 + Math.floor(n * 54)
        }

        const i = (y * size + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }

    ctx.putImageData(img, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    return texture
  }

  const W = HALLWAY_CONFIG.width
  const D = HALLWAY_CONFIG.depth
  const H = HALLWAY_CONFIG.height

  // --- Sàn (W × D) ---
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.5, D),
    createTileMaterial(W, D)
  )
  floor.position.set(0, SECTION2_BASE_Y, 0)
  floor.receiveShadow = false
  floor.name = 'Section2 Floor'
  rootGroup.add(floor)

  // --- Lớp nước ngập thấp (không quá cao) ---
  const waterTexture = createWaterRippleTexture(320, 'base')
  const waterDetailTexture = createWaterRippleTexture(320, 'detail')
  const waterDistortionTexture = createWaterRippleTexture(320, 'distort')
  waterTexture.repeat.set(Math.max(1.2, W * 0.16), Math.max(4.4, D * 0.024))
  waterDetailTexture.repeat.set(Math.max(1.8, W * 0.24), Math.max(6.4, D * 0.036))
  waterDistortionTexture.repeat.set(Math.max(1.6, W * 0.2), Math.max(5.6, D * 0.032))

  waterTexture.center.set(0.5, 0.5)
  waterDetailTexture.center.set(0.5, 0.5)
  waterDistortionTexture.center.set(0.5, 0.5)

  const waterMaterial = new THREE.MeshPhongMaterial({
    color: '#5aa5c4',
    map: waterTexture,
    emissiveMap: waterDetailTexture,
    bumpMap: waterDistortionTexture,
    bumpScale: 1.5,
    transparent: true,
    opacity: 0.56,
    shininess: 300,
    specular: new THREE.Color('#f0fbff'),
    emissive: new THREE.Color('#163c4d'),
    emissiveIntensity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const waterSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.5, D - 0.5),
    waterMaterial
  )
  waterSurface.rotation.x = -Math.PI / 2
  waterSurface.position.set(0, SECTION2_BASE_Y + 0.34, 0)
  waterSurface.receiveShadow = false
  waterSurface.castShadow = false
  waterSurface.renderOrder = 2
  waterSurface.name = 'Section2 Water Surface'
  waterSurface.userData.isSection2WaterSurface = true
  waterSurface.userData.baseY = SECTION2_BASE_Y + 0.34
  const WATER_CEILING_CLEARANCE = 0.45
  waterSurface.userData.maxRise = Math.max(0.2, H - 0.34 - WATER_CEILING_CLEARANCE)
  waterSurface.userData.currentRise = 0
  waterSurface.userData.flowSpeed = { x: 0.025, y: -0.012 }
  waterSurface.userData.detailFlowSpeed = { x: -0.05, y: 0.04 }
  waterSurface.userData.distortionFlowSpeed = { x: 0.5, y: -0.3 }
  waterSurface.userData.waveTime = 0
  rootGroup.add(waterSurface)

  // --- Trần (W × D) ---
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(W, CEIL_THICK, D),
    createTileMaterial(W, D)
  )
  ceiling.position.set(0, SECTION2_BASE_Y + H, 0)
  ceiling.receiveShadow = false
  ceiling.name = 'Section2 Ceiling'
  rootGroup.add(ceiling)

  const wallCenterY = SECTION2_BASE_Y + H / 2

  // --- Tường đầu (+Z): W × H ---
  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.5),
    createTileMaterial(W, H)
  )
  wallFront.position.set(0, wallCenterY, D / 2)
  wallFront.castShadow = false
  wallFront.receiveShadow = false
  wallFront.name = 'Section2 Wall Front'
  rootGroup.add(wallFront)

  // --- Tường cuối (-Z): W × H ---
  const wallBack = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, 0.5),
    createTileMaterial(W, H)
  )
  wallBack.position.set(0, wallCenterY, -D / 2)
  wallBack.castShadow = false
  wallBack.receiveShadow = false
  wallBack.name = 'Section2 Wall Back'
  rootGroup.add(wallBack)

  // --- Tường trái (-X): D × H ---
  const wallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, H, D),
    createTileMaterial(D, H)
  )
  wallLeft.position.set(-W / 2, wallCenterY, 0)
  wallLeft.castShadow = false
  wallLeft.receiveShadow = false
  wallLeft.name = 'Section2 Wall Left'
  rootGroup.add(wallLeft)

  // --- Tường phải (+X): D × H ---
  const wallRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, H, D),
    createTileMaterial(D, H)
  )
  wallRight.position.set(W / 2, wallCenterY, 0)
  wallRight.castShadow = false
  wallRight.receiveShadow = false
  wallRight.name = 'Section2 Wall Right'
  rootGroup.add(wallRight)

  // ======================================================
  // ĐÈN TRẦN DẠNG DĨA (TRIGGER: game object vào vùng thì tắt 30s)
  // ======================================================
  const DISH_LIGHT_COUNT = 5
  const DISH_LIGHT_SPACING = D / DISH_LIGHT_COUNT
  const DISH_TRIGGER_RADIUS = 14
  const DISH_POINT_LIGHT_INTENSITY = 4.8
  const DISH_POINT_LIGHT_DISTANCE = 24
  const DISH_POINT_LIGHT_DECAY = 1.2
  const DISH_LIGHT_COLOR = '#ffe7bc'
  const dishLightMat = new THREE.MeshStandardMaterial({
    color: '#f4f4f4',
    emissive: DISH_LIGHT_COLOR,
    emissiveIntensity: 2.2,
    metalness: 0.05,
    roughness: 0.25
  })

  // ======================================================
  // VIỀN CẠNH PHÒNG SECTION 2 (12 cạnh) - XÁM ĐẬM
  // ======================================================
  const section2TrimColor = '#40464f'
  const section2TrimMaterial = new THREE.MeshStandardMaterial({
    color: section2TrimColor,
    roughness: 0.82,
    metalness: 0.05
  })

  function createSection2Trim(width, height, depth, x, y, z, name) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      section2TrimMaterial
    )
    mesh.position.set(x, y, z)
    mesh.castShadow = false
    mesh.receiveShadow = false
    mesh.name = name
    return mesh
  }

  const SECTION2_TRIM_W = 0.2
  const section2HalfTrim = SECTION2_TRIM_W / 2
  const section2TrimInset = 0.14
  const section2HalfW = W / 2
  const section2HalfD = D / 2
  const section2FloorTopY = SECTION2_BASE_Y + 0.25
  const section2CeilBottomY = SECTION2_BASE_Y + H - CEIL_THICK / 2
  const section2VerticalTrimH = Math.max(0.2, section2CeilBottomY - section2FloorTopY)
  const section2VerticalTrimY = section2FloorTopY + section2VerticalTrimH / 2

  // 4 viền dọc ở 4 góc
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    section2VerticalTrimH,
    SECTION2_TRIM_W,
    -section2HalfW + section2HalfTrim + section2TrimInset,
    section2VerticalTrimY,
    -section2HalfD + section2HalfTrim + section2TrimInset,
    'Section2 Trim Corner Front-Left'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    section2VerticalTrimH,
    SECTION2_TRIM_W,
    section2HalfW - section2HalfTrim - section2TrimInset,
    section2VerticalTrimY,
    -section2HalfD + section2HalfTrim + section2TrimInset,
    'Section2 Trim Corner Front-Right'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    section2VerticalTrimH,
    SECTION2_TRIM_W,
    -section2HalfW + section2HalfTrim + section2TrimInset,
    section2VerticalTrimY,
    section2HalfD - section2HalfTrim - section2TrimInset,
    'Section2 Trim Corner Back-Left'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    section2VerticalTrimH,
    SECTION2_TRIM_W,
    section2HalfW - section2HalfTrim - section2TrimInset,
    section2VerticalTrimY,
    section2HalfD - section2HalfTrim - section2TrimInset,
    'Section2 Trim Corner Back-Right'
  ))

  // 4 viền ngang ở chân tường
  rootGroup.add(createSection2Trim(
    W - SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    0,
    section2FloorTopY + section2HalfTrim,
    -section2HalfD + section2HalfTrim + section2TrimInset,
    'Section2 Trim Bottom Front'
  ))
  rootGroup.add(createSection2Trim(
    W - SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    0,
    section2FloorTopY + section2HalfTrim,
    section2HalfD - section2HalfTrim - section2TrimInset,
    'Section2 Trim Bottom Back'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    D - SECTION2_TRIM_W,
    -section2HalfW + section2HalfTrim + section2TrimInset,
    section2FloorTopY + section2HalfTrim,
    0,
    'Section2 Trim Bottom Left'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    D - SECTION2_TRIM_W,
    section2HalfW - section2HalfTrim - section2TrimInset,
    section2FloorTopY + section2HalfTrim,
    0,
    'Section2 Trim Bottom Right'
  ))

  // 4 viền ngang ở mép trần
  rootGroup.add(createSection2Trim(
    W - SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    0,
    section2CeilBottomY - section2HalfTrim,
    -section2HalfD + section2HalfTrim + section2TrimInset,
    'Section2 Trim Top Front'
  ))
  rootGroup.add(createSection2Trim(
    W - SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    0,
    section2CeilBottomY - section2HalfTrim,
    section2HalfD - section2HalfTrim - section2TrimInset,
    'Section2 Trim Top Back'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    D - SECTION2_TRIM_W,
    -section2HalfW + section2HalfTrim + section2TrimInset,
    section2CeilBottomY - section2HalfTrim,
    0,
    'Section2 Trim Top Left'
  ))
  rootGroup.add(createSection2Trim(
    SECTION2_TRIM_W,
    SECTION2_TRIM_W,
    D - SECTION2_TRIM_W,
    section2HalfW - section2HalfTrim - section2TrimInset,
    section2CeilBottomY - section2HalfTrim,
    0,
    'Section2 Trim Top Right'
  ))

  for (let i = 0; i < DISH_LIGHT_COUNT; i++) {
    const lightZ = -D / 2 + DISH_LIGHT_SPACING / 2 + i * DISH_LIGHT_SPACING
    const dishGroup = new THREE.Group()
    dishGroup.name = `Section2 Dish Light ${i + 1}`
    dishGroup.position.set(0, SECTION2_BASE_Y + H - 0.35, lightZ)
    dishGroup.userData.isSection2DishLight = true
    dishGroup.userData.lightColor = DISH_LIGHT_COLOR
    dishGroup.userData.basePointLightIntensity = DISH_POINT_LIGHT_INTENSITY
    dishGroup.userData.baseEmissiveIntensity = 2.2
    dishGroup.userData.triggerShape = {
      type: 'sphere',
      radius: DISH_TRIGGER_RADIUS,
      isTrigger: true
    }

    const dishMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.14, 24),
      dishLightMat.clone()
    )
    dishMesh.userData.isDishLightMesh = true
    dishMesh.castShadow = false
    dishMesh.receiveShadow = false
    dishGroup.add(dishMesh)

    const dishPointLight = new THREE.PointLight(
      DISH_LIGHT_COLOR,
      DISH_POINT_LIGHT_INTENSITY,
      DISH_POINT_LIGHT_DISTANCE,
      DISH_POINT_LIGHT_DECAY
    )
    dishPointLight.position.set(0, -0.22, 0)
    dishPointLight.castShadow = false
    dishPointLight.userData.isDishPointLight = true
    dishGroup.add(dishPointLight)

    rootGroup.add(dishGroup)
  }

  // ======================================================
  // ỐNG HẦM (TUNNEL PIPES) DỌC TƯỜNG BÊN TRÁI
  // ======================================================
  const TUNNEL_OUTER_R = 1.1
  const TUNNEL_INNER_R = 0.75
  const TUNNEL_LENGTH = 1.0
  const TUNNEL_SEAM_OVERLAP = 0.04
  const TUNNEL_INNER_INSET = 0.08
  const TUNNEL_BAND_THICKNESS = 0.07
  const TUNNEL_COUNT = 9
  const TUNNEL_SPACING = D / TUNNEL_COUNT

  function createPipeMetalTextures() {
    const w = 320
    const h = 128

    const makeCanvas = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      return c
    }

    const colorCanvas = makeCanvas()
    const roughCanvas = makeCanvas()
    const metalCanvas = makeCanvas()
    const bumpCanvas = makeCanvas()

    const colorCtx = colorCanvas.getContext('2d')
    const roughCtx = roughCanvas.getContext('2d')
    const metalCtx = metalCanvas.getContext('2d')
    const bumpCtx = bumpCanvas.getContext('2d')

    // Base brushed metal tone.
    colorCtx.fillStyle = '#c4c9cf'
    colorCtx.fillRect(0, 0, w, h)

    for (let y = 0; y < h; y++) {
      const alpha = 0.045 + Math.random() * 0.06
      colorCtx.fillStyle = `rgba(255,255,255,${alpha})`
      colorCtx.fillRect(0, y, w, 1)
    }

    for (let i = 0; i < 420; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const len = 8 + Math.random() * 36
      const a = 0.05 + Math.random() * 0.12
      colorCtx.fillStyle = `rgba(35,40,48,${a})`
      colorCtx.fillRect(x, y, len, 1)
    }

    roughCtx.fillStyle = '#7d7d7d'
    roughCtx.fillRect(0, 0, w, h)
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const g = Math.floor(98 + Math.random() * 78)
      roughCtx.fillStyle = `rgb(${g},${g},${g})`
      roughCtx.fillRect(x, y, 1, 1)
    }

    metalCtx.fillStyle = '#b8b8b8'
    metalCtx.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 7) {
      const g = 166 + Math.floor(Math.random() * 24)
      metalCtx.fillStyle = `rgb(${g},${g},${g})`
      metalCtx.fillRect(0, y, w, 1)
    }

    bumpCtx.fillStyle = '#808080'
    bumpCtx.fillRect(0, 0, w, h)
    for (let i = 0; i < 540; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const v = Math.random() > 0.5 ? 144 : 112
      bumpCtx.fillStyle = `rgb(${v},${v},${v})`
      bumpCtx.fillRect(x, y, 6 + Math.random() * 24, 1)
    }

    const mkTex = (canvas) => {
      const t = new THREE.CanvasTexture(canvas)
      t.wrapS = THREE.RepeatWrapping
      t.wrapT = THREE.RepeatWrapping
      t.repeat.set(2.2, 1)
      t.needsUpdate = true
      return t
    }

    return {
      color: mkTex(colorCanvas),
      roughness: mkTex(roughCanvas),
      metalness: mkTex(metalCanvas),
      bump: mkTex(bumpCanvas)
    }
  }

  function createInnerPipeTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.1, size * 0.5, size * 0.5, size * 0.5)
    grad.addColorStop(0, '#4d5a67')
    grad.addColorStop(0.65, '#25303a')
    grad.addColorStop(1, '#0e141a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 1900; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const a = Math.random() * 0.09
      ctx.fillStyle = `rgba(220,230,240,${a})`
      ctx.fillRect(x, y, 1, 1)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2.0, 2.0)
    return tex
  }

  function createRustEdgeTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, size, size)

    const center = size * 0.5
    const ringR = size * 0.38
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2
      const r = ringR + (Math.random() - 0.5) * (size * 0.1)
      const x = center + Math.cos(a) * r
      const y = center + Math.sin(a) * r
      const s = 2 + Math.random() * 9
      const alpha = 0.2 + Math.random() * 0.65
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    return tex
  }

  const pipeMetalTextures = createPipeMetalTextures()
  const innerPipeTexture = createInnerPipeTexture()
  const rustEdgeTexture = createRustEdgeTexture()

  // Kim loại bạc bóng loáng
  const tunnelOuterMat = new THREE.MeshStandardMaterial({
    color: '#c7cdd3',
    map: pipeMetalTextures.color,
    roughness: 0.42,
    roughnessMap: pipeMetalTextures.roughness,
    metalness: 0.58,
    metalnessMap: pipeMetalTextures.metalness,
    bumpMap: pipeMetalTextures.bump,
    bumpScale: 0.06,
    emissive: '#131921',
    emissiveIntensity: 0.05,
    side: THREE.DoubleSide
  })
  const tunnelInnerMat = new THREE.MeshStandardMaterial({
    color: '#31414f',
    map: innerPipeTexture,
    roughness: 0.58,
    metalness: 0.15,
    emissive: '#0a0f14',
    emissiveIntensity: 0.05,
    side: THREE.DoubleSide
  })
  const tunnelBandMat = new THREE.MeshStandardMaterial({
    color: '#aeb5bc',
    roughness: 0.5,
    metalness: 0.42,
    map: pipeMetalTextures.color,
    side: THREE.DoubleSide
  })
  const tunnelRustEdgeMat = new THREE.MeshStandardMaterial({
    color: '#8f4f2a',
    map: rustEdgeTexture,
    alphaMap: rustEdgeTexture,
    transparent: true,
    opacity: 0.62,
    roughness: 0.88,
    metalness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  })

  for (let i = 0; i < TUNNEL_COUNT; i++) {
    const tunnelZ = -D / 2 + TUNNEL_SPACING / 2 + i * TUNNEL_SPACING

    const group = new THREE.Group()
    group.name = `Section2 Tunnel ${i + 1}`
    group.position.set(-W / 2 + TUNNEL_LENGTH / 2, SECTION2_BASE_Y + H / 2, tunnelZ)
    group.rotation.z = Math.PI / 2
    group.userData.isSection2PipeTunnel = true
    group.userData.pipeIndex = i + 1
    group.userData.pipeTriggerShape = {
      type: 'sphere',
      radius: 14,
      isTrigger: true
    }

    // Vỏ ngoài ống
    const outerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(TUNNEL_OUTER_R, TUNNEL_OUTER_R, TUNNEL_LENGTH, 16, 1, true),
      tunnelOuterMat
    )
    group.add(outerMesh)

    // Gờ kẹp quanh thân ống giúp nhìn cơ khí hơn.
    const bandGeo = new THREE.CylinderGeometry(
      TUNNEL_OUTER_R + TUNNEL_BAND_THICKNESS,
      TUNNEL_OUTER_R + TUNNEL_BAND_THICKNESS,
      0.08,
      16,
      1,
      false
    )
    const band1 = new THREE.Mesh(bandGeo, tunnelBandMat)
    const band2 = new THREE.Mesh(bandGeo, tunnelBandMat)
    band1.position.y = -TUNNEL_LENGTH * 0.24
    band2.position.y = TUNNEL_LENGTH * 0.24
    group.add(band1)
    group.add(band2)

    // Ruột ống sáng cùng tông kim loại để không bị cảm giác đen thui.
    const innerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        TUNNEL_INNER_R + 0.01,
        TUNNEL_INNER_R + 0.01,
        Math.max(0.2, TUNNEL_LENGTH - TUNNEL_INNER_INSET),
        16,
        1,
        false
      ),
      tunnelInnerMat
    )
    group.add(innerMesh)

    // Viền miệng ống
    const rimMesh = new THREE.Mesh(
      new THREE.RingGeometry(TUNNEL_INNER_R - 0.015, TUNNEL_OUTER_R, 16),
      tunnelOuterMat
    )
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.y = -TUNNEL_LENGTH / 2
    group.add(rimMesh)

    const rimMeshBack = new THREE.Mesh(
      new THREE.RingGeometry(TUNNEL_INNER_R - 0.015, TUNNEL_OUTER_R, 16),
      tunnelOuterMat
    )
    rimMeshBack.rotation.x = -Math.PI / 2
    rimMeshBack.position.y = TUNNEL_LENGTH / 2
    group.add(rimMeshBack)

    // Decal rỉ nhẹ ở mép ống (trước/sau) để tạo cảm giác cũ, bám viền.
    const rustRingGeo = new THREE.RingGeometry(TUNNEL_INNER_R + 0.03, TUNNEL_OUTER_R - 0.02, 20)
    const rustFront = new THREE.Mesh(rustRingGeo, tunnelRustEdgeMat)
    rustFront.rotation.x = Math.PI / 2
    rustFront.position.y = (-TUNNEL_LENGTH / 2) + 0.0015
    group.add(rustFront)

    const rustBack = new THREE.Mesh(rustRingGeo, tunnelRustEdgeMat)
    rustBack.rotation.x = -Math.PI / 2
    rustBack.position.y = (TUNNEL_LENGTH / 2) - 0.0015
    group.add(rustBack)

    group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false
        child.receiveShadow = false
      }
    })

    rootGroup.add(group)
  }

  // ======================================================
  // THANG MÁY CUỐI HÀNH LANG - DÙNG CHUNG ELEVATORDOOR.JS
  // ======================================================
  const returnElevatorAsset = getElevatorDoorAsset()
  const returnElevator = returnElevatorAsset.factory()
  returnElevator.name = 'Section2 Return Elevator'

  const ELEVATOR_H = 5.0
  const ELEVATOR_D = 0.2
  const ELEVATOR_WALL_OFFSET = 0.35
  const elevatorY = SECTION2_BASE_Y + ELEVATOR_H / 2
  const elevatorZ = D / 2 - ELEVATOR_D / 2 - ELEVATOR_WALL_OFFSET

  // Đặt cửa lên tường cuối hành lang (+Z)
  returnElevator.position.set(0, elevatorY, elevatorZ)
  returnElevator.rotation.y = -Math.PI / 2

  returnElevator.userData.isReturnElevator = true
  returnElevator.userData.openTriggerShape = {
    type: 'sphere',
    radius: 8.0,
    isTrigger: true
  }
  returnElevator.userData.teleportTriggerShape = {
    type: 'sphere',
    radius: 2.4,
    isTrigger: true
  }
  returnElevator.userData.animationConfig = {
    duration: 1.5,
    maxGlowIntensity: 5,
    maxEnvironmentLightIntensity: 0,
    slideAxis: 'z',
    slideHalfWidth: 3.8 / 2
  }
  returnElevator.userData.animationState = {
    openProgress: 0,
    isOpen: false
  }

  returnElevator.traverse(child => {
    if (child.isMesh) {
      child.castShadow = false
      child.receiveShadow = false
    }
  })
  rootGroup.add(returnElevator)

  // Physics Section 2
  if (rootGroup.userData.physics) {
    rootGroup.userData.physics.shapes.push(
      { type: 'box', size: [W, 0.5, D], offset: [0, SECTION2_BASE_Y, 0] },
      { type: 'box', size: [W, CEIL_THICK, D], offset: [0, SECTION2_BASE_Y + H, 0] },
      { type: 'box', size: [W, H, 0.5], offset: [0, SECTION2_BASE_Y + H / 2, D / 2] },
      { type: 'box', size: [W, H, 0.5], offset: [0, SECTION2_BASE_Y + H / 2, -D / 2] },
      { type: 'box', size: [0.5, H, D], offset: [-W / 2, SECTION2_BASE_Y + H / 2, 0] },
      { type: 'box', size: [0.5, H, D], offset: [W / 2, SECTION2_BASE_Y + H / 2, 0] }
    )
  }

  // ======================================================
  // KẾT THÚC SECTION 2
  // ======================================================

  // Lighting descriptor — per-section ambient/fog, no main spot light in section 2
  if (!rootGroup.userData) rootGroup.userData = {}
  rootGroup.userData.sectionLighting = {
    mainLight: null,
    ambientIntensity: 0.35,
    fog: { near: 1, far: 80 }
  }
}

export function applySection2UnderwaterFog(fog, underwaterBlend) {
  if (!fog || underwaterBlend <= 0.001) return

  const coldColor = new THREE.Color('#05202e')
  const deepColdColor = new THREE.Color('#020f18')
  
  const coldBlend = THREE.MathUtils.clamp(underwaterBlend * 1.0, 0, 1)
  const deepBlend = THREE.MathUtils.clamp(underwaterBlend * 0.8, 0, 0.8)
  
  fog.color.lerp(coldColor, coldBlend)
  fog.color.lerp(deepColdColor, deepBlend)

  const baseFar = fog.far
  const targetNear = Math.max(0.06, 0.14)
  const targetFar = 5
  
  fog.near = THREE.MathUtils.lerp(fog.near, targetNear, underwaterBlend * 0.85)
  fog.far = THREE.MathUtils.lerp(baseFar, targetFar, underwaterBlend * 0.9)
}
