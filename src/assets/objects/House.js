import * as THREE from 'three'

const HOUSE_CONFIG = {
  size: 8,
  wallHeight: 4.2,
  wallThickness: 0.28,
  roofHeight: 2.1,
  roofOverhang: 0.75,
  roofThickness: 0.3,
  doorWidth: 1.35,
  doorHeight: 2.25,
  doorDepth: 0.08,
  windowWidth: 1.2,
  windowHeight: 1,
  windowDepth: 0.08,
  windowGapFromCenter: 2,
  windowBottomY: 1.35,
  wallColor: '#f9f9f9',
  roofColor: '#b12727',
  roofColorDark: '#7f1919',
  openingColor: '#050505',
  fenceColor: '#f4f4f4'
}

const goreTextureLoader = new THREE.TextureLoader()
let cachedGoreTexture = null
let cachedRoofTileTexture = null
let cachedPortalMaterialData = null
let cachedWallPlasterAlbedo = null
let cachedWallPlasterRelief = null
let cachedTrimAlbedo = null
let cachedTrimRelief = null
let cachedDoorWoodAlbedo = null
let cachedDoorWoodRelief = null
// Material caches for low-cost houses (Section 3)
let cachedLowCostWallMaterial = null
let cachedLowCostRoofMaterial = null
let cachedLowCostOpeningMaterial = null
let cachedLowCostDoorMaterial = null
let cachedLowCostEdgeTrimMaterial = null
let cachedLowCostGableMaterial = null
let cachedLowCostRidgeMaterial = null
let cachedLowCostWindowMaterial = null

// Material caches for normal houses
let cachedNormalWallMaterial = null
let cachedNormalRoofMaterial = null
let cachedNormalOpeningMaterial = null
let cachedNormalDoorMaterial = null
let cachedNormalEdgeTrimMaterial = null
let cachedNormalGableMaterial = null
let cachedNormalRidgeMaterial = null

function setupTiledTexture(texture, repeatX, repeatY, isColorTexture = false) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  if (isColorTexture) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createWallPlasterAlbedoTexture() {
  if (cachedWallPlasterAlbedo) return cachedWallPlasterAlbedo

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#f2f2ef'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const shade = 220 + Math.floor(Math.random() * 26)
    const alpha = 0.03 + Math.random() * 0.06
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 2}, ${alpha})`
    ctx.fillRect(x, y, 2, 2)
  }

  for (let i = 0; i < 260; i++) {
    const y = Math.random() * canvas.height
    const alpha = 0.02 + Math.random() * 0.04
    ctx.fillStyle = `rgba(120, 120, 110, ${alpha})`
    ctx.fillRect(0, y, canvas.width, 1)
  }

  cachedWallPlasterAlbedo = setupTiledTexture(new THREE.CanvasTexture(canvas), 2.0, 1.8, true)
  return cachedWallPlasterAlbedo
}

function createWallPlasterReliefTexture() {
  if (cachedWallPlasterRelief) return cachedWallPlasterRelief

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const v = 90 + Math.floor(Math.random() * 110)
    const alpha = 0.05 + Math.random() * 0.14
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${alpha})`
    ctx.fillRect(x, y, 2, 2)
  }

  cachedWallPlasterRelief = setupTiledTexture(new THREE.CanvasTexture(canvas), 2.0, 1.8)
  return cachedWallPlasterRelief
}

function createTrimAlbedoTexture() {
  if (cachedTrimAlbedo) return cachedTrimAlbedo

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  g.addColorStop(0, '#bebebe')
  g.addColorStop(1, '#9f9f9f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 1700; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const v = 120 + Math.floor(Math.random() * 110)
    const a = 0.06 + Math.random() * 0.12
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${a})`
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  cachedTrimAlbedo = setupTiledTexture(new THREE.CanvasTexture(canvas), 1.3, 2.1, true)
  return cachedTrimAlbedo
}

function createTrimReliefTexture() {
  if (cachedTrimRelief) return cachedTrimRelief

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#7c7c7c'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const v = 90 + Math.floor(Math.random() * 100)
    const a = 0.07 + Math.random() * 0.14
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${a})`
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  cachedTrimRelief = setupTiledTexture(new THREE.CanvasTexture(canvas), 1.3, 2.1)
  return cachedTrimRelief
}

function createDoorWoodAlbedoTexture() {
  if (cachedDoorWoodAlbedo) return cachedDoorWoodAlbedo

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, canvas.width, 0)
  g.addColorStop(0, '#3a2718')
  g.addColorStop(0.5, '#533621')
  g.addColorStop(1, '#2d1e13')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 130; i++) {
    const y = Math.random() * canvas.height
    const alpha = 0.05 + Math.random() * 0.12
    const tone = 55 + Math.floor(Math.random() * 45)
    ctx.fillStyle = `rgba(${tone}, ${tone - 8}, ${tone - 14}, ${alpha})`
    ctx.fillRect(0, y, canvas.width, 2)
  }

  cachedDoorWoodAlbedo = setupTiledTexture(new THREE.CanvasTexture(canvas), 1.0, 1.0, true)
  return cachedDoorWoodAlbedo
}

function createDoorWoodReliefTexture() {
  if (cachedDoorWoodRelief) return cachedDoorWoodRelief

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#757575'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 150; i++) {
    const y = Math.random() * canvas.height
    const value = 100 + Math.floor(Math.random() * 90)
    const alpha = 0.08 + Math.random() * 0.18
    ctx.fillStyle = `rgba(${value}, ${value}, ${value}, ${alpha})`
    ctx.fillRect(0, y, canvas.width, 2)
  }

  cachedDoorWoodRelief = setupTiledTexture(new THREE.CanvasTexture(canvas), 1.0, 1.0)
  return cachedDoorWoodRelief
}

function getGoreTexture() {
  if (cachedGoreTexture) return cachedGoreTexture

  const texturePath = new URL('../../pictures/gore.png', import.meta.url).href
  cachedGoreTexture = goreTextureLoader.load(texturePath)
  cachedGoreTexture.colorSpace = THREE.SRGBColorSpace
  cachedGoreTexture.wrapS = THREE.RepeatWrapping
  cachedGoreTexture.wrapT = THREE.RepeatWrapping
  cachedGoreTexture.minFilter = THREE.LinearMipmapLinearFilter
  cachedGoreTexture.magFilter = THREE.LinearFilter
  cachedGoreTexture.anisotropy = 8
  return cachedGoreTexture
}

function createRoofTileTexture(base = '#b12727', dark = '#7f1919') {
  if (cachedRoofTileTexture) return cachedRoofTileTexture

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = base
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const rowHeight = 26
  const tileW = 40
  for (let y = 0; y < canvas.height; y += rowHeight) {
    const rowOffset = (Math.floor(y / rowHeight) % 2) * (tileW * 0.5)
    for (let x = -tileW; x < canvas.width + tileW; x += tileW) {
      ctx.fillStyle = dark
      ctx.fillRect(x + rowOffset, y, tileW - 2, 2)
      ctx.fillRect(x + rowOffset, y + rowHeight - 3, tileW - 2, 2)

      const gradient = ctx.createLinearGradient(0, y, 0, y + rowHeight)
      gradient.addColorStop(0, 'rgba(255,255,255,0.12)')
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.02)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.16)')
      ctx.fillStyle = gradient
      ctx.fillRect(x + rowOffset, y + 2, tileW - 2, rowHeight - 5)
    }
  }

  for (let i = 0; i < 1200; i++) {
    const px = Math.random() * canvas.width
    const py = Math.random() * canvas.height
    const alpha = 0.03 + Math.random() * 0.06
    const shade = Math.random() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`
    ctx.fillRect(px, py, 1.5, 1.5)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.2, 1.7)
  texture.needsUpdate = true
  cachedRoofTileTexture = texture
  return texture
}

function createWindowPortalMaterial() {
  if (cachedPortalMaterialData) return cachedPortalMaterialData

  const uniforms = {
    uTexture: { value: getGoreTexture() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));

        // Subtle drift to mimic end-portal-like screen-space movement.
        vec2 warpedUv = screenUv * vec2(1.35, 1.2);
        warpedUv += vec2(
          sin((screenUv.y + uTime * 0.08) * 9.0) * 0.012,
          cos((screenUv.x + uTime * 0.06) * 11.0) * 0.009
        );

        vec3 gore = texture2D(uTexture, fract(warpedUv)).rgb;
        vec3 tint = mix(vec3(0.02, 0.02, 0.02), gore, 0.9);
        vec3 frameDarken = mix(vec3(0.78), vec3(1.0), smoothstep(0.12, 0.45, length(vUv - 0.5)));

        gl_FragColor = vec4(tint * frameDarken, 1.0);
      }
    `
  })

  cachedPortalMaterialData = { material, uniforms }
  return cachedPortalMaterialData
}

function getHouseMainColliderHeight() {
  return HOUSE_CONFIG.wallHeight + HOUSE_CONFIG.roofHeight + (HOUSE_CONFIG.roofThickness * 1.2)
}

const housePhysicsDef = {
  type: 'static',
  material: 'table',
  shapes: [
    {
      type: 'box',
      role: 'houseMain',
      size: [
        HOUSE_CONFIG.size,
        getHouseMainColliderHeight(),
        HOUSE_CONFIG.size
      ],
      offset: [0, getHouseMainColliderHeight() * 0.5, 0]
    }
  ]
}

const houseSimplePhysicsDef = {
  type: 'static',
  material: 'table',
  shapes: [
    {
      type: 'box',
      role: 'houseMain',
      size: [
        HOUSE_CONFIG.size,
        getHouseMainColliderHeight(),
        HOUSE_CONFIG.size
      ],
      offset: [0, getHouseMainColliderHeight() * 0.5, 0]
    }
  ]
}

function clonePhysicsDef(source) {
  return {
    ...source,
    shapes: (source.shapes || []).map((shape) => ({
      ...shape,
      size: Array.isArray(shape.size) ? [...shape.size] : shape.size,
      offset: Array.isArray(shape.offset) ? [...shape.offset] : shape.offset,
      rotation: Array.isArray(shape.rotation) ? [...shape.rotation] : shape.rotation
    }))
  }
}

function getMainColliderBaseY(physicsDef) {
  const shapes = physicsDef?.shapes || []
  const mainBox = shapes.find((shape) => shape?.role === 'houseMain' && shape?.type === 'box')
    || shapes.find((shape) => shape?.type === 'box')

  if (!mainBox || !Array.isArray(mainBox.size) || !Array.isArray(mainBox.offset)) {
    return 0
  }

  const halfHeight = (mainBox.size[1] || 0) * 0.5
  const offsetY = mainBox.offset[1] || 0
  return offsetY - halfHeight
}

function alignMeshBaseToCollider(mesh, physicsDef) {
  mesh.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(mesh)
  if (!Number.isFinite(bounds.min.y)) return

  const colliderBaseY = getMainColliderBaseY(physicsDef)
  mesh.position.y += colliderBaseY - bounds.min.y
}

function getLowCostWallMaterial() {
  if (cachedLowCostWallMaterial) return cachedLowCostWallMaterial
  cachedLowCostWallMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.wallColor,
    map: createWallPlasterAlbedoTexture(),
    roughnessMap: createWallPlasterReliefTexture(),
    bumpMap: createWallPlasterReliefTexture(),
    bumpScale: 0.015,
    roughness: 0.94,
    metalness: 0.01
  })
  return cachedLowCostWallMaterial
}

function getNormalWallMaterial() {
  if (cachedNormalWallMaterial) return cachedNormalWallMaterial
  cachedNormalWallMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.wallColor,
    map: createWallPlasterAlbedoTexture(),
    roughnessMap: createWallPlasterReliefTexture(),
    bumpMap: createWallPlasterReliefTexture(),
    bumpScale: 0.028,
    roughness: 0.94,
    metalness: 0.01
  })
  return cachedNormalWallMaterial
}

function getLowCostRoofMaterial() {
  if (cachedLowCostRoofMaterial) return cachedLowCostRoofMaterial
  cachedLowCostRoofMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.roofColor,
    map: createRoofTileTexture(HOUSE_CONFIG.roofColor, HOUSE_CONFIG.roofColorDark),
    roughness: 0.84,
    metalness: 0.03
  })
  return cachedLowCostRoofMaterial
}

function getNormalRoofMaterial() {
  if (cachedNormalRoofMaterial) return cachedNormalRoofMaterial
  cachedNormalRoofMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.roofColor,
    map: createRoofTileTexture(HOUSE_CONFIG.roofColor, HOUSE_CONFIG.roofColorDark),
    roughness: 0.84,
    metalness: 0.03
  })
  return cachedNormalRoofMaterial
}

function getLowCostOpeningMaterial() {
  if (cachedLowCostOpeningMaterial) return cachedLowCostOpeningMaterial
  cachedLowCostOpeningMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.openingColor,
    roughness: 0.6,
    metalness: 0.02
  })
  return cachedLowCostOpeningMaterial
}

function getNormalOpeningMaterial() {
  if (cachedNormalOpeningMaterial) return cachedNormalOpeningMaterial
  cachedNormalOpeningMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.openingColor,
    roughness: 0.6,
    metalness: 0.02
  })
  return cachedNormalOpeningMaterial
}

function getLowCostDoorMaterial() {
  if (cachedLowCostDoorMaterial) return cachedLowCostDoorMaterial
  cachedLowCostDoorMaterial = new THREE.MeshStandardMaterial({
    color: '#2e2117',
    map: createDoorWoodAlbedoTexture(),
    roughnessMap: createDoorWoodReliefTexture(),
    bumpMap: createDoorWoodReliefTexture(),
    bumpScale: 0.02,
    roughness: 0.82,
    metalness: 0.03
  })
  return cachedLowCostDoorMaterial
}

function getNormalDoorMaterial() {
  if (cachedNormalDoorMaterial) return cachedNormalDoorMaterial
  cachedNormalDoorMaterial = new THREE.MeshStandardMaterial({
    color: '#2e2117',
    map: createDoorWoodAlbedoTexture(),
    roughnessMap: createDoorWoodReliefTexture(),
    bumpMap: createDoorWoodReliefTexture(),
    bumpScale: 0.035,
    roughness: 0.82,
    metalness: 0.03
  })
  return cachedNormalDoorMaterial
}

function getLowCostEdgeTrimMaterial() {
  if (cachedLowCostEdgeTrimMaterial) return cachedLowCostEdgeTrimMaterial
  cachedLowCostEdgeTrimMaterial = new THREE.MeshStandardMaterial({
    color: '#b6b6b6',
    map: createTrimAlbedoTexture(),
    roughnessMap: createTrimReliefTexture(),
    bumpMap: createTrimReliefTexture(),
    bumpScale: 0.01,
    roughness: 0.78,
    metalness: 0.08
  })
  return cachedLowCostEdgeTrimMaterial
}

function getNormalEdgeTrimMaterial() {
  if (cachedNormalEdgeTrimMaterial) return cachedNormalEdgeTrimMaterial
  cachedNormalEdgeTrimMaterial = new THREE.MeshStandardMaterial({
    color: '#b6b6b6',
    map: createTrimAlbedoTexture(),
    roughnessMap: createTrimReliefTexture(),
    bumpMap: createTrimReliefTexture(),
    bumpScale: 0.02,
    roughness: 0.78,
    metalness: 0.08
  })
  return cachedNormalEdgeTrimMaterial
}

function getLowCostGableMaterial() {
  if (cachedLowCostGableMaterial) return cachedLowCostGableMaterial
  cachedLowCostGableMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.wallColor,
    map: createWallPlasterAlbedoTexture(),
    roughnessMap: createWallPlasterReliefTexture(),
    bumpMap: createWallPlasterReliefTexture(),
    bumpScale: 0.015,
    roughness: 0.94,
    metalness: 0.01
  })
  return cachedLowCostGableMaterial
}

function getNormalGableMaterial() {
  if (cachedNormalGableMaterial) return cachedNormalGableMaterial
  cachedNormalGableMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.wallColor,
    map: createWallPlasterAlbedoTexture(),
    roughnessMap: createWallPlasterReliefTexture(),
    bumpMap: createWallPlasterReliefTexture(),
    bumpScale: 0.028,
    roughness: 0.94,
    metalness: 0.01
  })
  return cachedNormalGableMaterial
}

function getLowCostRidgeMaterial() {
  if (cachedLowCostRidgeMaterial) return cachedLowCostRidgeMaterial
  cachedLowCostRidgeMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.roofColorDark,
    roughness: 0.86,
    metalness: 0.03
  })
  return cachedLowCostRidgeMaterial
}

function getNormalRidgeMaterial() {
  if (cachedNormalRidgeMaterial) return cachedNormalRidgeMaterial
  cachedNormalRidgeMaterial = new THREE.MeshStandardMaterial({
    color: HOUSE_CONFIG.roofColorDark,
    roughness: 0.86,
    metalness: 0.03
  })
  return cachedNormalRidgeMaterial
}

function getLowCostWindowMaterial() {
  if (cachedLowCostWindowMaterial) return cachedLowCostWindowMaterial
  cachedLowCostWindowMaterial = new THREE.MeshBasicMaterial({ color: '#0e0e0e' })
  return cachedLowCostWindowMaterial
}

function createHouseMesh(options = {}) {
  const root = new THREE.Group()
  root.name = 'House Mesh'
  const lowCost = !!options.lowCost
  const portalEffectEnabled = options.portalEffect !== false

  const s = HOUSE_CONFIG.size
  const h = HOUSE_CONFIG.wallHeight
  const t = HOUSE_CONFIG.wallThickness
  const edgeTrimSize = t + 0.00001
  const edgeTrimHeight = h + 0.15
  const edgeTrimOutset = 0.00001

  // Use cached materials to reduce duplication across 60 houses
  const wallMaterial = lowCost ? getLowCostWallMaterial() : getNormalWallMaterial()
  const roofMaterial = lowCost ? getLowCostRoofMaterial() : getNormalRoofMaterial()
  const openingMaterial = lowCost ? getLowCostOpeningMaterial() : getNormalOpeningMaterial()
  const doorMaterial = lowCost ? getLowCostDoorMaterial() : getNormalDoorMaterial()
  const edgeTrimMaterial = lowCost ? getLowCostEdgeTrimMaterial() : getNormalEdgeTrimMaterial()

  const wallParts = [
    { name: 'House Back Wall', size: [s, h, t], pos: [0, h * 0.5, -s * 0.5 + t * 0.5] },
    { name: 'House Left Wall', size: [t, h, s], pos: [-s * 0.5 + t * 0.5, h * 0.5, 0] },
    { name: 'House Right Wall', size: [t, h, s], pos: [s * 0.5 - t * 0.5, h * 0.5, 0] },
    { name: 'House Front Wall', size: [s, h, t], pos: [0, h * 0.5, s * 0.5 - t * 0.5] }
  ]

  wallParts.forEach((part) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]), wallMaterial)
    mesh.position.set(part.pos[0], part.pos[1], part.pos[2])
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = part.name
    root.add(mesh)
  })

  const edgeCenter = (s * 0.5) + edgeTrimOutset
  const edgeCorners = [
    { name: 'House Edge Front Left', x: -edgeCenter, z: edgeCenter },
    { name: 'House Edge Front Right', x: edgeCenter, z: edgeCenter },
    { name: 'House Edge Back Left', x: -edgeCenter, z: -edgeCenter },
    { name: 'House Edge Back Right', x: edgeCenter, z: -edgeCenter }
  ]

  edgeCorners.forEach((edge) => {
    const edgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(edgeTrimSize, edgeTrimHeight, edgeTrimSize),
      edgeTrimMaterial
    )
    edgeMesh.position.set(edge.x, edgeTrimHeight * 0.5, edge.z)
    edgeMesh.castShadow = true
    edgeMesh.receiveShadow = true
    edgeMesh.name = edge.name
    root.add(edgeMesh)
  })

  const roofSpanX = s + HOUSE_CONFIG.roofOverhang * 2
  const roofLengthZ = s + HOUSE_CONFIG.roofOverhang * 2
  const roofSideOverhang = HOUSE_CONFIG.roofOverhang

  // Match roof slope to gable triangle edges so the roof hugs them cleanly.
  const gableHalfBase = s * 0.5
  const gableTopY = h + HOUSE_CONFIG.roofHeight
  const roofPitch = Math.atan2(HOUSE_CONFIG.roofHeight, gableHalfBase)
  const roofPanelRun = gableHalfBase + roofSideOverhang
  const roofPanelLength = Math.hypot(roofPanelRun, HOUSE_CONFIG.roofHeight)
  const roofCenterY = h + (HOUSE_CONFIG.roofHeight * 0.5)

  const roofLeft = new THREE.Mesh(
    new THREE.BoxGeometry(roofPanelLength, HOUSE_CONFIG.roofThickness, roofLengthZ),
    roofMaterial
  )
  roofLeft.position.set(-roofPanelRun * 0.5, roofCenterY, 0)
  roofLeft.rotation.z = roofPitch
  roofLeft.castShadow = true
  roofLeft.receiveShadow = true
  roofLeft.name = 'House Roof Left'
  root.add(roofLeft)

  const roofRight = new THREE.Mesh(
    new THREE.BoxGeometry(roofPanelLength, HOUSE_CONFIG.roofThickness, roofLengthZ),
    roofMaterial
  )
  roofRight.position.set(roofPanelRun * 0.5, roofCenterY, 0)
  roofRight.rotation.z = -roofPitch
  roofRight.castShadow = true
  roofRight.receiveShadow = true
  roofRight.name = 'House Roof Right'
  root.add(roofRight)

  // Seal triangular gable gaps between rectangular wall block and pitched roof.
  // Gable base should match the house body width, not roof overhang span.
  const gableThickness = HOUSE_CONFIG.wallThickness * 1.05
  const gableMaterial = lowCost ? getLowCostGableMaterial() : getNormalGableMaterial()

  const gableShape = new THREE.Shape()
  gableShape.moveTo(-gableHalfBase, h)
  gableShape.lineTo(gableHalfBase, h)
  gableShape.lineTo(0, gableTopY)
  gableShape.closePath()

  const gableGeometry = new THREE.ExtrudeGeometry(gableShape, {
    depth: gableThickness,
    bevelEnabled: false,
    steps: 1
  })
  // Center extrusion depth around local z=0 for symmetric placement on wall center.
  gableGeometry.translate(0, 0, -gableThickness * 0.5)
  gableGeometry.computeVertexNormals()

  const frontGable = new THREE.Mesh(gableGeometry, gableMaterial)
  frontGable.position.set(0, 0, s * 0.5 - (t * 0.5))
  frontGable.castShadow = true
  frontGable.receiveShadow = true
  frontGable.name = 'House Front Gable Fill'
  root.add(frontGable)

  const backGable = new THREE.Mesh(gableGeometry, gableMaterial)
  backGable.position.set(0, 0, -s * 0.5 + (t * 0.5))
  backGable.castShadow = true
  backGable.receiveShadow = true
  backGable.name = 'House Back Gable Fill'
  root.add(backGable)

  const ridgeRadius = HOUSE_CONFIG.roofThickness * 0.95
  const ridgeLength = roofLengthZ * 1.06
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(ridgeRadius, ridgeRadius, ridgeLength, 20),
    lowCost ? getLowCostRidgeMaterial() : getNormalRidgeMaterial()
  )
  ridge.rotation.x = Math.PI * 0.5
  ridge.position.set(0, gableTopY + (HOUSE_CONFIG.roofThickness * 0.22), 0)
  ridge.castShadow = true
  ridge.receiveShadow = true
  ridge.name = 'House Roof Ridge'
  root.add(ridge)

  const frontZ = s * 0.5 + 0.001

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(HOUSE_CONFIG.doorWidth, HOUSE_CONFIG.doorHeight, HOUSE_CONFIG.doorDepth),
    doorMaterial
  )
  door.position.set(0, HOUSE_CONFIG.doorHeight * 0.5, frontZ)
  door.castShadow = true
  door.receiveShadow = true
  door.name = 'House Main Door'
  root.add(door)

  const portalWindows = []
  const lowCostWindowMaterial = getLowCostWindowMaterial()
  ;[-1, 1].forEach((side, index) => {
    const centerX = side * HOUSE_CONFIG.windowGapFromCenter

    const windowBase = new THREE.Mesh(
      new THREE.BoxGeometry(HOUSE_CONFIG.windowWidth, HOUSE_CONFIG.windowHeight, HOUSE_CONFIG.windowDepth),
      openingMaterial
    )
    windowBase.position.set(centerX, HOUSE_CONFIG.windowBottomY + HOUSE_CONFIG.windowHeight * 0.5, frontZ)
    windowBase.castShadow = true
    windowBase.receiveShadow = true
    windowBase.name = index === 0 ? 'House Window Left' : 'House Window Right'
    root.add(windowBase)

    let portalMaterial = lowCostWindowMaterial
    let portalUniforms = null
    if (portalEffectEnabled) {
      const portalData = createWindowPortalMaterial()
      portalMaterial = portalData.material
      portalUniforms = portalData.uniforms
    }

    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(HOUSE_CONFIG.windowWidth * 0.78, HOUSE_CONFIG.windowHeight * 0.78),
      portalMaterial
    )
    portal.position.set(centerX, HOUSE_CONFIG.windowBottomY + HOUSE_CONFIG.windowHeight * 0.5, frontZ + 0.05)
    portal.name = index === 0 ? 'House Window Left Portal' : 'House Window Right Portal'
    root.add(portal)

    if (portalUniforms) portalWindows.push({ mesh: portal, uniforms: portalUniforms })
  })

  if (portalWindows.length > 0) {
    const resolutionTmp = new THREE.Vector2()
    root.userData.update = function updateHousePortal(deltaSeconds, timeSeconds) {
      const tNow = typeof timeSeconds === 'number' ? timeSeconds : (performance.now() * 0.001)
      portalWindows.forEach((entry) => {
        if (entry && entry.uniforms) entry.uniforms.uTime.value = tNow
      })
    }

    portalWindows.forEach((entry) => {
      entry.mesh.onBeforeRender = (renderer) => {
        const pixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1
        renderer.getSize(resolutionTmp)
        entry.uniforms.uResolution.value.set(
          Math.max(1, resolutionTmp.x * pixelRatio),
          Math.max(1, resolutionTmp.y * pixelRatio)
        )
        entry.uniforms.uTime.value = performance.now() * 0.001
      }
    })
  }

  return root
}

function createHouse(options = {}) {
  const root = new THREE.Group()
  root.name = 'House'
  const useSimplePhysics = options.physicsMode === 'simple'
  root.userData.physics = clonePhysicsDef(useSimplePhysics ? houseSimplePhysicsDef : housePhysicsDef)
  root.userData.inspectorCenterMode = 'physics'

  const mesh = createHouseMesh(options)
  alignMeshBaseToCollider(mesh, root.userData.physics)
  root.add(mesh)

  if (typeof mesh.userData?.update === 'function') {
    root.userData.update = mesh.userData.update
  }

  return root
}

export function getHouseAsset() {
  return {
    name: 'House',
    description: 'Căn nhà an toàn!',
    factory: createHouse,
    physics: housePhysicsDef
  }
}
