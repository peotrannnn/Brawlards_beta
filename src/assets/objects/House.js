import * as THREE from 'three'
import { getElevatorDoorAsset } from './ElevatorDoor.js'
import { getLightStickAsset } from '../items/lightStick.js'

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

const FUN_HOUSE_CONFIG = {
  width: HOUSE_CONFIG.size,
  height: HOUSE_CONFIG.wallHeight + HOUSE_CONFIG.roofHeight,
  depth: HOUSE_CONFIG.size * 0.92,
  stripeWhite: '#ffffff',
  stripeBlue: '#1e63ff',
  stripeCount: 8,
  elevatorScale: HOUSE_CONFIG.doorHeight / 5.0,
  elevatorGold: {
    frameColor: '#d6b54a',
    frameEmissive: '#bc9d54',
    doorColor: '#b88a21',
    doorEmissive: '#c4944c'
  },
  powerBox: {
    width: 0.92,
    height: 0.58,
    depth: 0.22,
    wallThickness: 0.05,
    doorThickness: 0.028,
    offsetX: -1.55,
    centerY: 0.78,
    insetZ: 0.095,
    doorOpenAngle: Math.PI * 0.78,
    triggerForward: 0.42,
    triggerCenterYOffset: -0.24,
    triggerSize: [1.28, 1.58, 1.2],
    boxColor: '#0a0b0f',
    boxEmissive: '#0e1218',
    doorFrameColor: '#171b22',
    glassColor: '#d7f1ff',
    glassEmissive: '#4d8fb6',
    indicatorOff: '#612121',
    indicatorOn: '#79ff7a',
    installedStickScale: 0.64
  }
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
let cachedFunHouseStripeTexture = null
let cachedFunHouseMaterial = null

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

function setInstalledLightStickVisible(lightStick, visible) {
  if (!lightStick) return

  lightStick.visible = visible
  lightStick.traverse((child) => {
    if (!child?.isPointLight) return
    child.visible = false
    child.intensity = 0
  })
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

function createFunHouseStripeTexture() {
  if (cachedFunHouseStripeTexture) return cachedFunHouseStripeTexture

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const stripeHeight = canvas.height / FUN_HOUSE_CONFIG.stripeCount

  for (let index = 0; index < FUN_HOUSE_CONFIG.stripeCount; index++) {
    ctx.fillStyle = index % 2 === 0 ? FUN_HOUSE_CONFIG.stripeWhite : FUN_HOUSE_CONFIG.stripeBlue
    ctx.fillRect(0, index * stripeHeight, canvas.width, stripeHeight)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  cachedFunHouseStripeTexture = texture
  return texture
}

function getFunHouseMaterial() {
  if (cachedFunHouseMaterial) return cachedFunHouseMaterial
  cachedFunHouseMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: createFunHouseStripeTexture(),
    roughness: 0.82,
    metalness: 0.02
  })
  return cachedFunHouseMaterial
}

function addHouseWindows(root, openingMaterial, frontZ, portalEffectEnabled = true) {
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
}

function createFunHouseMesh(options = {}) {
  const root = new THREE.Group()
  root.name = 'Fun House Mesh'

  const bodyMaterial = getFunHouseMaterial()
  const openingMaterial = getNormalOpeningMaterial()
  const powerBoxBodyMaterial = new THREE.MeshStandardMaterial({
    color: FUN_HOUSE_CONFIG.powerBox.boxColor,
    emissive: FUN_HOUSE_CONFIG.powerBox.boxEmissive,
    emissiveIntensity: 0.08,
    roughness: 0.72,
    metalness: 0.35
  })
  const powerBoxDoorFrameMaterial = new THREE.MeshStandardMaterial({
    color: FUN_HOUSE_CONFIG.powerBox.doorFrameColor,
    roughness: 0.42,
    metalness: 0.76
  })
  const powerBoxGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: FUN_HOUSE_CONFIG.powerBox.glassColor,
    emissive: FUN_HOUSE_CONFIG.powerBox.glassEmissive,
    emissiveIntensity: 0.08,
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.42,
    transmission: 0.08
  })
  const powerBoxIndicatorMaterial = new THREE.MeshStandardMaterial({
    color: FUN_HOUSE_CONFIG.powerBox.indicatorOff,
    emissive: FUN_HOUSE_CONFIG.powerBox.indicatorOff,
    emissiveIntensity: 0.24,
    roughness: 0.35,
    metalness: 0.2
  })

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(FUN_HOUSE_CONFIG.width, FUN_HOUSE_CONFIG.height, FUN_HOUSE_CONFIG.depth),
    bodyMaterial
  )
  body.position.y = FUN_HOUSE_CONFIG.height * 0.5
  body.castShadow = true
  body.receiveShadow = true
  body.name = 'Fun House Body'
  root.add(body)

  const frontZ = (FUN_HOUSE_CONFIG.depth * 0.5) + 0.001
  addHouseWindows(root, openingMaterial, frontZ, options.portalEffect !== false)

  const elevator = getElevatorDoorAsset().factory()
  elevator.name = 'Fun House Elevator'
  elevator.rotation.y = Math.PI / 2
  elevator.scale.setScalar(FUN_HOUSE_CONFIG.elevatorScale)
  elevator.userData.animationConfig = {
    duration: 2.6,
    maxGlowIntensity: 5,
    maxEnvironmentLightIntensity: 120,
    environmentLightDistance: 8
  }
  elevator.traverse((child) => {
    if (!child?.isMesh || !child.material) return
    if (child.userData?.isGlowPlane || child.userData?.isDisplayBg || child.userData?.isDisplayPanel) return

    const material = child.material.clone()
    const isDoorPanel = !!child.userData?.isDoorPanel
    material.color = new THREE.Color(
      isDoorPanel ? FUN_HOUSE_CONFIG.elevatorGold.doorColor : FUN_HOUSE_CONFIG.elevatorGold.frameColor
    )
    material.emissive = new THREE.Color(
      isDoorPanel ? FUN_HOUSE_CONFIG.elevatorGold.doorEmissive : FUN_HOUSE_CONFIG.elevatorGold.frameEmissive
    )
    material.emissiveIntensity = isDoorPanel ? 0.2 : 0.12
    material.metalness = isDoorPanel ? 0.92 : 1.0
    material.roughness = isDoorPanel ? 0.28 : 0.22
    child.material = material
  })
  elevator.position.set(0, HOUSE_CONFIG.doorHeight * 0.5, frontZ)
  root.add(elevator)

  const powerBox = new THREE.Group()
  powerBox.name = 'Fun House Power Box'
  powerBox.position.set(
    FUN_HOUSE_CONFIG.powerBox.offsetX,
    FUN_HOUSE_CONFIG.powerBox.centerY,
    frontZ - FUN_HOUSE_CONFIG.powerBox.insetZ
  )
  const powerBoxIndicatorLocalPosition = new THREE.Vector3(
    FUN_HOUSE_CONFIG.powerBox.width * 0.35,
    FUN_HOUSE_CONFIG.powerBox.height * 0.33,
    FUN_HOUSE_CONFIG.powerBox.depth * 0.52
  )
  const installedStickLocalPosition = new THREE.Vector3(
    powerBoxIndicatorLocalPosition.x,
    powerBoxIndicatorLocalPosition.y,
    -FUN_HOUSE_CONFIG.powerBox.depth * 0.18
  )
  const lightStickTriggerSize = [0.74, 0.72, 0.92]
  const lightStickTriggerOffset = [
    installedStickLocalPosition.x,
    installedStickLocalPosition.y,
    FUN_HOUSE_CONFIG.powerBox.depth * 0.56
  ]
  const playerTriggerSize = FUN_HOUSE_CONFIG.powerBox.triggerSize.map((size) => size * 3)
  powerBox.userData.physics = {
    type: 'static',
    material: 'table',
    shapes: [
      {
        type: 'box',
        role: 'funHouseLightStickTrigger',
        isTrigger: true,
        debugColor: '#ffffff',
        size: [...lightStickTriggerSize],
        offset: [...lightStickTriggerOffset]
      },
      {
        type: 'box',
        role: 'funHousePlayerTrigger',
        isTrigger: true,
        debugColor: '#7ec8ff',
        size: [...playerTriggerSize],
        offset: [
          0,
          FUN_HOUSE_CONFIG.powerBox.triggerCenterYOffset,
          FUN_HOUSE_CONFIG.powerBox.triggerForward
        ]
      }
    ]
  }

  const powerBoxBody = new THREE.Mesh(
    new THREE.BoxGeometry(
      FUN_HOUSE_CONFIG.powerBox.width,
      FUN_HOUSE_CONFIG.powerBox.height,
      FUN_HOUSE_CONFIG.powerBox.depth
    ),
    powerBoxBodyMaterial
  )
  powerBoxBody.castShadow = true
  powerBoxBody.receiveShadow = true
  powerBoxBody.name = 'Fun House Power Box Body'
  powerBox.add(powerBoxBody)

  const powerBoxInner = new THREE.Mesh(
    new THREE.BoxGeometry(
      FUN_HOUSE_CONFIG.powerBox.width - (FUN_HOUSE_CONFIG.powerBox.wallThickness * 1.2),
      FUN_HOUSE_CONFIG.powerBox.height - (FUN_HOUSE_CONFIG.powerBox.wallThickness * 1.2),
      FUN_HOUSE_CONFIG.powerBox.depth * 0.42
    ),
    new THREE.MeshStandardMaterial({
      color: '#030405',
      emissive: '#071115',
      emissiveIntensity: 0.15,
      roughness: 0.9,
      metalness: 0.05
    })
  )
  powerBoxInner.position.z = -(FUN_HOUSE_CONFIG.powerBox.depth * 0.12)
  powerBoxInner.receiveShadow = true
  powerBoxInner.name = 'Fun House Power Box Interior'
  powerBox.add(powerBoxInner)

  const powerBoxDoorPivot = new THREE.Group()
  powerBoxDoorPivot.name = 'Fun House Power Box Door Pivot'
  powerBoxDoorPivot.position.set(
    -FUN_HOUSE_CONFIG.powerBox.width * 0.5,
    0,
    FUN_HOUSE_CONFIG.powerBox.depth * 0.5 + FUN_HOUSE_CONFIG.powerBox.doorThickness * 0.5
  )
  powerBox.add(powerBoxDoorPivot)

  const powerBoxDoorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(
      FUN_HOUSE_CONFIG.powerBox.width,
      FUN_HOUSE_CONFIG.powerBox.height,
      FUN_HOUSE_CONFIG.powerBox.doorThickness
    ),
    powerBoxDoorFrameMaterial
  )
  powerBoxDoorFrame.position.x = FUN_HOUSE_CONFIG.powerBox.width * 0.5
  powerBoxDoorFrame.castShadow = true
  powerBoxDoorFrame.receiveShadow = true
  powerBoxDoorFrame.name = 'Fun House Power Box Door Frame'
  powerBoxDoorPivot.add(powerBoxDoorFrame)

  const powerBoxGlass = new THREE.Mesh(
    new THREE.BoxGeometry(
      FUN_HOUSE_CONFIG.powerBox.width - (FUN_HOUSE_CONFIG.powerBox.wallThickness * 1.35),
      FUN_HOUSE_CONFIG.powerBox.height - (FUN_HOUSE_CONFIG.powerBox.wallThickness * 1.35),
      FUN_HOUSE_CONFIG.powerBox.doorThickness * 0.72
    ),
    powerBoxGlassMaterial
  )
  powerBoxGlass.position.set(
    FUN_HOUSE_CONFIG.powerBox.width * 0.5,
    0,
    FUN_HOUSE_CONFIG.powerBox.doorThickness * 0.18
  )
  powerBoxGlass.castShadow = true
  powerBoxGlass.receiveShadow = true
  powerBoxGlass.name = 'Fun House Power Box Glass Door'
  powerBoxDoorPivot.add(powerBoxGlass)

  const powerBoxIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 16, 16),
    powerBoxIndicatorMaterial
  )
  powerBoxIndicator.position.copy(powerBoxIndicatorLocalPosition)
  powerBoxIndicator.castShadow = true
  powerBoxIndicator.name = 'Fun House Power Box Indicator'
  powerBox.add(powerBoxIndicator)

  const installedStickAnchor = new THREE.Group()
  installedStickAnchor.name = 'Fun House Power Box Light Stick Anchor'
  installedStickAnchor.position.copy(installedStickLocalPosition)
  installedStickAnchor.rotation.x = -Math.PI * 0.5
  powerBox.add(installedStickAnchor)

  const tempInstalledStickTarget = new THREE.Vector3()
  const tempInstalledStickQuaternion = new THREE.Quaternion()
  const tempInstalledStickScale = new THREE.Vector3(1, 1, 1)

  const installedLightStick = getLightStickAsset().factory()
  installedLightStick.name = 'Fun House Installed Light Stick'
  installedLightStick.scale.setScalar(FUN_HOUSE_CONFIG.powerBox.installedStickScale)
  delete installedLightStick.userData.physics
  installedLightStick.traverse((child) => {
    if (child?.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
    if (child?.isPointLight) {
      child.distance = Math.max(2.5, child.distance * 0.75)
    }
  })
  setInstalledLightStickVisible(installedLightStick, false)
  installedStickAnchor.add(installedLightStick)

  root.add(powerBox)

  const funHouseState = {
    doorOpenAmount: 0,
    isLightStickInstalled: false,
    hasStateOverride: false
  }

  const setPowerBoxDoorOpenAmount = (amount) => {
    const clamped = THREE.MathUtils.clamp(amount, 0, 1)
    funHouseState.doorOpenAmount = clamped
    powerBoxDoorPivot.rotation.y = -FUN_HOUSE_CONFIG.powerBox.doorOpenAngle * clamped
  }

  const setFunHouseStateOverride = (enabled) => {
    funHouseState.hasStateOverride = !!enabled
    powerBoxBodyMaterial.emissiveIntensity = enabled ? 0.28 : 0.08
    powerBoxGlassMaterial.emissiveIntensity = enabled ? 0.22 : 0.08
    powerBoxIndicatorMaterial.color.set(enabled ? FUN_HOUSE_CONFIG.powerBox.indicatorOn : FUN_HOUSE_CONFIG.powerBox.indicatorOff)
    powerBoxIndicatorMaterial.emissive.set(enabled ? FUN_HOUSE_CONFIG.powerBox.indicatorOn : FUN_HOUSE_CONFIG.powerBox.indicatorOff)
    powerBoxIndicatorMaterial.emissiveIntensity = enabled ? 1.1 : 0.24

    if (enabled && elevator?.userData?.openDoor) {
      elevator.userData.openDoor()
    }
  }

  const completeLightStickInstallation = () => {
    if (funHouseState.isLightStickInstalled) return false
    funHouseState.isLightStickInstalled = true
    setInstalledLightStickVisible(installedLightStick, true)
    setFunHouseStateOverride(true)
    return true
  }

  const resetFunHouseState = () => {
    funHouseState.isLightStickInstalled = false
    funHouseState.hasStateOverride = false
    setInstalledLightStickVisible(installedLightStick, false)
    setPowerBoxDoorOpenAmount(0)
    setFunHouseStateOverride(false)

    const cachedParts = elevator.userData?.cachedParts || {}
    const doorPanel = cachedParts.doorPanel
    const glowPlane = cachedParts.glowPlane
    const environmentLight = cachedParts.environmentLight
    if (doorPanel) {
      doorPanel.scale.z = 1
      doorPanel.position.z = 0
      if (doorPanel.material) doorPanel.material.opacity = 1
    }
    if (glowPlane?.material) {
      glowPlane.material.emissiveIntensity = 0
    }
    if (environmentLight) {
      environmentLight.intensity = 0
    }
    if (elevator.userData?.animationState) {
      elevator.userData.animationState.isOpening = false
      elevator.userData.animationState.isOpen = false
      elevator.userData.animationState.openProgress = 0
      elevator.userData.animationState.openElapsed = 0
    }
  }

  root.userData.update = function updateFunHouse(delta = 1 / 60) {
    if (elevator?.userData?.updateAnimation) {
      elevator.userData.updateAnimation(delta)
    }
  }
  root.userData.funHouseApi = {
    setFunHousePowerBoxDoorOpenAmount: setPowerBoxDoorOpenAmount,
    getFunHousePowerBoxWorldTarget() {
      return {
        target: installedStickAnchor.getWorldPosition(tempInstalledStickTarget),
        targetQuaternion: installedStickAnchor.getWorldQuaternion(tempInstalledStickQuaternion),
        targetScale: installedLightStick.getWorldScale(tempInstalledStickScale)
      }
    },
    completeFunHouseLightStickInstallation: completeLightStickInstallation,
    setFunHouseStateOverride,
    resetFunHouseState,
    hasFunHouseStateOverride: () => funHouseState.hasStateOverride,
    isFunHouseLightStickInstalled: () => funHouseState.isLightStickInstalled
  }

  return root
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

  addHouseWindows(root, openingMaterial, frontZ, portalEffectEnabled)

  return root
}

function createHouse(options = {}) {
  const root = new THREE.Group()
  const variant = options.variant === 'fun' ? 'fun' : 'default'
  root.name = variant === 'fun' ? 'Fun House' : 'House'
  const useSimplePhysics = options.physicsMode === 'simple'
  const physicsSource = useSimplePhysics ? houseSimplePhysicsDef : housePhysicsDef
  root.userData.physics = clonePhysicsDef(physicsSource)
  root.userData.inspectorCenterMode = 'physics'
  root.userData.isFunHouse = variant === 'fun'

  const mesh = variant === 'fun' ? createFunHouseMesh(options) : createHouseMesh(options)
  alignMeshBaseToCollider(mesh, root.userData.physics)
  root.add(mesh)

  if (typeof mesh.userData?.update === 'function') {
    root.userData.update = mesh.userData.update
  }
  if (mesh.userData?.funHouseApi) {
    Object.assign(root.userData, mesh.userData.funHouseApi)
  }

  return root
}

export function getHouseAsset() {
  return {
    name: 'House',
    description: 'A hard-to-guess house.',
    factory: createHouse,
    physics: housePhysicsDef
  }
}

export function getFunHouseAsset() {
  return {
    name: 'Fun House',
    description: 'Really fun!',
    factory: (options = {}) => createHouse({ ...options, variant: 'fun' }),
    physics: housePhysicsDef
  }
}
