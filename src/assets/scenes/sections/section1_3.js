import * as THREE from 'three'
import { createEyeSun } from '../../objects/eye.js'
import { getHouseAsset } from '../../objects/House.js'
import { createTreeBillboard, updateBillboards, setTreeOpacity } from '../../objects/TreeBillboard.js'

// ======================================================
// SECTION 3 MASTER CONFIG - Dễ dàng chỉnh tất cả các tham số
// ======================================================

const SECTION3_MASTER_CONFIG = {
  // Platform geometry
  center: { x: 0, y: 140, z: 0 },
  radius: 96,
  thickness: 1.2,
  segments: 96,

  // Lighting
  overheadLightHeight: 26,
  overheadLightIntensity: 860,
  overheadLightDistance: 88,
  overheadLightDecay: 1.35,
  overheadLightAngle: 1.52,
  overheadLightPenumbra: 0.72,

  // Fog & atmosphere (NORMAL state)
  fog: { near: 30, far: 100 },
  background: '#41a5e7',
  ambientIntensity: 1.2,

  // ======================================================
  // COLOR TRANSITIONS - Chỉnh màu bắt đầu + kết thúc
  // ======================================================
  colors: {
    // Normal state (BEFORE eye transition)
    grassBaseNormal: '#67b935',
    grassVividNormal: '#89ff39',
    grassSoilNormal: '#3d1a05',
    grassDeepSoilNormal: '#240d02',
    fogNormal: '#cfedff',
    backgroundNormal: '#41a5e7',

    // Transition state (AFTER 60s transition completes)
    grassBaseTransitioned: '#ff3c3c',    // Crimson base
    grassVividTransitioned: '#ff8585',   // Bright crimson
    grassSoilTransitioned: '#110035',    // Dark crimson soil
    grassDeepSoilTransitioned: '#110034', // Very dark crimson
    fogTransitioned: '#4a3d6d',          // Purple-blue fog
    backgroundTransitioned: '#000000'    // Black sky
  }
}

// Colors (extracted from SECTION3_MASTER_CONFIG)
const SECTION3_GRASS_BASE_COLOR = new THREE.Color(SECTION3_MASTER_CONFIG.colors.grassBaseNormal)
const SECTION3_GRASS_SOIL_COLOR = new THREE.Color(SECTION3_MASTER_CONFIG.colors.grassSoilNormal)
const SECTION3_GRASS_VIVID_COLOR = new THREE.Color(SECTION3_MASTER_CONFIG.colors.grassVividNormal)
const SECTION3_GRASS_DEEP_SOIL_COLOR = new THREE.Color(SECTION3_MASTER_CONFIG.colors.grassDeepSoilNormal)

// Grass rendering
const SECTION3_GRASS_SETTINGS = {
  textureSize: 768,
  textureRepeat: 4096,
  bladeTextureSize: 128,
  patchCount: 2000,
  bladesPerPatchMin: 80,
  bladesPerPatchMax: 140,
  patchRadiusMin: 1.5,
  patchRadiusMax: 3,
  edgePadding: 2.8,
  hoverOffset: 0.035,
  jitter: 0.6,
  lodNearDistance: 7,
  lodCullDistance: 18,
  lodRefreshInterval: 0.2,
  lodRefreshMoveDistance: 0.8,
  nearScaleFactor: 0.3,
  minScaleFactor: 0.05,
  bladeWidthMin: 0.05,
  bladeWidthMax: 0.1,
  bladeHeightMin: 0.1,
  bladeHeightMax: 0.5,
  bladeMaxTiltX: 0.5,
  bladeMaxTiltZ: 0.5
}

const SECTION3_GRASS_LOW_QUALITY_OVERRIDES = {
  patchCount: 1700,
  textureSize: 512,
  bladeTextureSize: 96,
  bladesPerPatchMin: 16,
  bladesPerPatchMax: 34,
  lodNearDistance: 6,
  lodCullDistance: 14,
  lodRefreshInterval: 0.3,
  lodRefreshMoveDistance: 1.0,
  nearScaleFactor: 0.26,
  minScaleFactor: 0.03,
  bladeHeightMax: 0.4
}

// House placement
const SECTION3_HOUSE_SETTINGS = {
  count: 60,
  minRadius: 28,
  maxRadiusPadding: 8,
  minSpacing: 13,
  noiseScale: 0.055,
  noiseThreshold: 0.5,
  maxAttempts: 3200,
  seed: 119.37
}

const SECTION3_HOUSE_LOW_QUALITY_OVERRIDES = {
  count: 60
}

// Tree placement
const SECTION3_TREE_SETTINGS = {
  count: 300,
  minRadius: 15,
  maxRadiusPadding: 6,
  minSpacing: 5.5,
  noiseScale: 0.12,
  noiseThreshold: 0.45,
  maxAttempts: 20000,
  seed: 247.19
}

const SECTION3_TREE_LOW_QUALITY_OVERRIDES = {
  count: 300,
  minSpacing: 5.2,
  maxAttempts: 14000
}

const SECTION3_TREE_LOD_SETTINGS = {
  cullDistance: 200,
  refreshInterval: 0.2,
  refreshMoveDistance: 1.6,
  cellSize: 24
}

const SECTION3_TREE_LOD_LOW_QUALITY_OVERRIDES = {
  cullDistance: 200,
  refreshInterval: 0.3,
  refreshMoveDistance: 2.2,
  cellSize: 28
}

const cachedSection3GrassNoiseTextures = new Map()
const cachedSection3GrassBladeMaskTextures = new Map()

function isSection3HighQualityMode() {
  if (typeof window === 'undefined') return true

  const dpr = window.devicePixelRatio || 1
  const pixelLoad = window.innerWidth * window.innerHeight * dpr
  // Fullscreen/high-DPI screens should switch Section 3 to low-cost profile.
  return pixelLoad <= 2800000
}

function section3Fract(v) {
  return v - Math.floor(v)
}

function section3Hash2(x, y, seed = 0) {
  const n = x * 127.1 + y * 311.7 + seed * 74.7
  return section3Fract(Math.sin(n) * 43758.5453123)
}

function section3Smooth01(t) {
  return t * t * (3 - 2 * t)
}

function section3ValueNoise2D(x, y, seed = 0) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const tx = section3Smooth01(x - x0)
  const ty = section3Smooth01(y - y0)

  const n00 = section3Hash2(x0, y0, seed)
  const n10 = section3Hash2(x1, y0, seed)
  const n01 = section3Hash2(x0, y1, seed)
  const n11 = section3Hash2(x1, y1, seed)

  const nx0 = n00 + (n10 - n00) * tx
  const nx1 = n01 + (n11 - n01) * tx
  return nx0 + (nx1 - nx0) * ty
}

function section3Fbm2D(x, y, seed = 0, octaves = 4, lacunarity = 2.08, gain = 0.53) {
  let value = 0
  let amplitude = 0.58
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    value += section3ValueNoise2D(x * frequency, y * frequency, seed + i * 17.19) * amplitude
    frequency *= lacunarity
    amplitude *= gain
  }
  return value
}

function generateSection3HousePlacements(centerX, centerZ, platformRadius, settings = SECTION3_HOUSE_SETTINGS) {
  const placements = []
  const maxRadius = Math.max(settings.minRadius + 1, platformRadius - settings.maxRadiusPadding)
  const minSpacingSq = settings.minSpacing * settings.minSpacing

  for (let attempt = 0; attempt < settings.maxAttempts; attempt++) {
    if (placements.length >= settings.count) break

    const a = section3Hash2(attempt, 3.11, settings.seed) * Math.PI * 2
    const rMix = section3Hash2(attempt, 9.73, settings.seed + 11.5)
    const r = THREE.MathUtils.lerp(settings.minRadius, maxRadius, Math.sqrt(rMix))
    const x = centerX + Math.cos(a) * r
    const z = centerZ + Math.sin(a) * r

    const noise = section3Fbm2D(x * settings.noiseScale, z * settings.noiseScale, settings.seed + 29.4)
    if (noise < settings.noiseThreshold) continue

    let tooClose = false
    for (let i = 0; i < placements.length; i++) {
      const dx = placements[i].x - x
      const dz = placements[i].z - z
      if ((dx * dx + dz * dz) < minSpacingSq) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    const yawNoise = section3Fbm2D(x * 0.08 + 17.1, z * 0.08 - 8.6, settings.seed + 71.2)
    const yaw = yawNoise * Math.PI * 2

    placements.push({ x, z, yaw })
  }

  return placements
}

function generateSection3TreePlacements(centerX, centerZ, platformRadius, settings = SECTION3_TREE_SETTINGS) {
  const placements = []
  const maxRadius = Math.max(settings.minRadius + 1, platformRadius - settings.maxRadiusPadding)

  function canPlaceAt(x, z, minSpacingSq) {
    for (let i = 0; i < placements.length; i++) {
      const dx = placements[i].x - x
      const dz = placements[i].z - z
      if ((dx * dx + dz * dz) < minSpacingSq) {
        return false
      }
    }
    return true
  }

  function tryPlacementPass(passConfig) {
    const minSpacingSq = passConfig.minSpacing * passConfig.minSpacing
    const attemptCount = passConfig.attemptCount
    const angleSeed = passConfig.angleSeed
    const radiusSeed = passConfig.radiusSeed
    const treeSeed = passConfig.treeSeed
    const noiseSeed = passConfig.noiseSeed
    const noiseThreshold = passConfig.noiseThreshold

    for (let attempt = 0; attempt < attemptCount; attempt++) {
      if (placements.length >= settings.count) break

      const passAttempt = attempt + passConfig.attemptOffset
      const a = section3Hash2(passAttempt, angleSeed, settings.seed) * Math.PI * 2
      const rMix = section3Hash2(passAttempt, radiusSeed, settings.seed + 19.2)
      const r = THREE.MathUtils.lerp(settings.minRadius, maxRadius, Math.sqrt(rMix))
      const x = centerX + Math.cos(a) * r
      const z = centerZ + Math.sin(a) * r

      if (noiseThreshold > 0) {
        const noise = section3Fbm2D(x * settings.noiseScale, z * settings.noiseScale, noiseSeed)
        if (noise < noiseThreshold) continue
      }

      if (!canPlaceAt(x, z, minSpacingSq)) continue

      const treeIndexNoise = section3Hash2(x * 0.13, z * 0.13, treeSeed)
      const treeIndex = Math.floor(treeIndexNoise * 9) + 1
      placements.push({ x, z, treeIndex })
    }
  }

  const baseAttemptCount = Math.max(settings.maxAttempts, settings.count * 24)
  const fallbackPasses = [
    {
      attemptOffset: 0,
      attemptCount: baseAttemptCount,
      minSpacing: settings.minSpacing,
      noiseThreshold: settings.noiseThreshold,
      angleSeed: 7.23,
      radiusSeed: 11.94,
      noiseSeed: settings.seed + 37.6,
      treeSeed: settings.seed + 83.4
    },
    {
      attemptOffset: baseAttemptCount,
      attemptCount: Math.ceil(settings.count * 16),
      minSpacing: settings.minSpacing * 0.94,
      noiseThreshold: Math.max(0, settings.noiseThreshold - 0.05),
      angleSeed: 17.23,
      radiusSeed: 21.94,
      noiseSeed: settings.seed + 137.6,
      treeSeed: settings.seed + 183.4
    },
    {
      attemptOffset: baseAttemptCount + Math.ceil(settings.count * 16),
      attemptCount: Math.ceil(settings.count * 20),
      minSpacing: settings.minSpacing * 0.88,
      noiseThreshold: Math.max(0, settings.noiseThreshold - 0.12),
      angleSeed: 27.23,
      radiusSeed: 31.94,
      noiseSeed: settings.seed + 237.6,
      treeSeed: settings.seed + 283.4
    },
    {
      attemptOffset: baseAttemptCount + Math.ceil(settings.count * 36),
      attemptCount: Math.ceil(settings.count * 24),
      minSpacing: settings.minSpacing * 0.8,
      noiseThreshold: 0,
      angleSeed: 37.23,
      radiusSeed: 41.94,
      noiseSeed: settings.seed + 337.6,
      treeSeed: settings.seed + 383.4
    }
  ]

  for (let i = 0; i < fallbackPasses.length; i++) {
    if (placements.length >= settings.count) break
    tryPlacementPass(fallbackPasses[i])
  }

  return placements
}

function toRgbaString(color, alpha = 1) {
  return `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha})`
}

function mixGrassColor(t) {
  return SECTION3_GRASS_SOIL_COLOR.clone().lerp(SECTION3_GRASS_BASE_COLOR, THREE.MathUtils.clamp(t, 0, 1))
}

function mixGrassColorStyle(t, alpha = 1) {
  return toRgbaString(mixGrassColor(t), alpha)
}

function createGrassNoiseTexture(size = SECTION3_GRASS_SETTINGS.textureSize) {
  if (cachedSection3GrassNoiseTextures.has(size)) {
    return cachedSection3GrassNoiseTextures.get(size)
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  function fract(v) {
    return v - Math.floor(v)
  }

  function hash2(x, y, seed = 0) {
    const n = x * 127.1 + y * 311.7 + seed * 74.7
    return fract(Math.sin(n) * 43758.5453123)
  }

  function smooth01(t) {
    return t * t * (3 - 2 * t)
  }

  function valueNoise2D(x, y, seed = 0) {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = x0 + 1
    const y1 = y0 + 1
    const tx = smooth01(x - x0)
    const ty = smooth01(y - y0)

    const n00 = hash2(x0, y0, seed)
    const n10 = hash2(x1, y0, seed)
    const n01 = hash2(x0, y1, seed)
    const n11 = hash2(x1, y1, seed)
    const nx0 = n00 + (n10 - n00) * tx
    const nx1 = n01 + (n11 - n01) * tx
    return nx0 + (nx1 - nx0) * ty
  }

  function fractalNoise2D(x, y, seed = 0, octaves = 5, lacunarity = 2.08, gain = 0.52) {
    let value = 0
    let amplitude = 0.56
    let frequency = 1
    for (let i = 0; i < octaves; i++) {
      value += valueNoise2D(x * frequency, y * frequency, seed + i * 19.19) * amplitude
      frequency *= lacunarity
      amplitude *= gain
    }
    return value
  }

  function ridgedFractal2D(x, y, seed = 0, octaves = 5, lacunarity = 2.15, gain = 0.54) {
    let value = 0
    let amplitude = 0.6
    let frequency = 1
    for (let i = 0; i < octaves; i++) {
      const n = valueNoise2D(x * frequency, y * frequency, seed + i * 23.31)
      const ridged = 1 - Math.abs(n * 2 - 1)
      value += ridged * amplitude
      frequency *= lacunarity
      amplitude *= gain
    }
    return value
  }

  const imageData = ctx.createImageData(size, size)
  const pixels = imageData.data
  const center = size * 0.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4
      const nx = x / size
      const ny = y / size

      const warpA = fractalNoise2D(nx * 3.2 + 1.7, ny * 3.2 - 2.8, 13, 5, 2.08, 0.52)
      const warpB = fractalNoise2D(nx * 3.2 - 4.2, ny * 3.2 + 3.4, 29, 5, 2.08, 0.52)
      const wx = nx + (warpA - 0.5) * 0.42
      const wy = ny + (warpB - 0.5) * 0.42

      const diagonalBands = Math.sin((wx * 1.34 + wy * 0.92) * Math.PI * 16 + (warpA - 0.5) * 11)
      const px = x - center
      const py = y - center
      const radial = Math.sqrt(px * px + py * py) / size
      const angle = Math.atan2(py, px)
      const spiralBands = Math.sin(angle * 9 + radial * 95 + (warpB - 0.5) * 13)

      const camoLarge = fractalNoise2D(wx * 7.4, wy * 7.4, 41, 5, 2.02, 0.54)
      const camoDetail = fractalNoise2D(wx * 18.5, wy * 18.5, 67, 6, 2.16, 0.5)
      const hardNoise = valueNoise2D(wx * 72, wy * 72, 101)
      const microNoiseA = valueNoise2D(wx * 260, wy * 260, 131)
      const microNoiseB = valueNoise2D((wx + wy) * 340, (wy - wx) * 340, 149)
      const microFractal = fractalNoise2D(wx * 102, wy * 102, 173, 7, 2.28, 0.5)
      const microRidged = ridgedFractal2D(wx * 124, wy * 124, 191, 6, 2.22, 0.52)
      const tinyGrain = hash2(x * 2.11, y * 1.73, 211)
      const blockNoise2 = hash2(Math.floor(x / 2), Math.floor(y / 2), 227)
      const blockNoise3 = hash2(Math.floor(x / 3), Math.floor(y / 3), 239)
      const staticNoise = hash2(x * 13.17 + y * 7.31, y * 11.77 - x * 5.91, 257)

      let signal = 0
      signal += (diagonalBands * 0.46 + spiralBands * 0.41)
      signal += (camoLarge - 0.5) * 1.6
      signal += (camoDetail - 0.5) * 1.05
      signal += (hardNoise - 0.5) * 0.5

      const highContrast = THREE.MathUtils.clamp(0.5 + signal * 0.78, 0, 1)
      const stepped = THREE.MathUtils.clamp((Math.floor(highContrast * 5) + (hardNoise > 0.76 ? 1 : 0)) / 5, 0, 1)
      const zone = stepped > 0.5 ? 1 : 0
      const microBias = zone
        ? (microNoiseA - 0.5) * 0.24 + (microFractal - 0.5) * 0.22 + (microRidged - 0.5) * 0.14
        : -(microNoiseB - 0.5) * 0.26 - (microFractal - 0.5) * 0.2 - (microRidged - 0.5) * 0.16
      const shadeMix = THREE.MathUtils.clamp(0.04 + stepped * 0.96 + microBias, 0, 1)

      const color = mixGrassColor(shadeMix)
      const noisePunch = hardNoise > 0.86 ? 0.8 : (hardNoise < 0.08 ? 1.18 : 1)

      const microSpeck = (microNoiseA > 0.93 || microNoiseB < 0.06)
        ? (zone ? 1.14 : 0.78)
        : 1
      const fiber = Math.sin((x * 0.82 + y * 0.57) * 0.9 + (microNoiseB - 0.5) * 6.3)
      const fiberPunch = 1 + (zone ? 0.06 : -0.06) * fiber
      const fractalPunch = 1 + (zone ? 0.11 : -0.11) * ((microFractal - 0.5) + (microRidged - 0.5) * 0.8)
      const grainPunch = 1 + (tinyGrain - 0.5) * 0.12
      const blockPunch = 1 + (blockNoise2 - 0.5) * 0.1 + (blockNoise3 - 0.5) * 0.08
      const staticPulse = staticNoise > 0.985 ? 1.38 : (staticNoise < 0.015 ? 0.62 : 1)
      const finalPunch = noisePunch * microSpeck * fiberPunch * fractalPunch * grainPunch * blockPunch * staticPulse
      const vividTarget = zone ? SECTION3_GRASS_VIVID_COLOR : SECTION3_GRASS_DEEP_SOIL_COLOR
      const vividLerp = zone
        ? THREE.MathUtils.clamp(0.2 + microFractal * 0.22, 0, 0.48)
        : THREE.MathUtils.clamp(0.16 + microRidged * 0.24, 0, 0.5)
      color.lerp(vividTarget, vividLerp)

      const channelJitterR = (hash2(x, y, 271) - 0.5) * 0.16
      const channelJitterG = (hash2(x, y, 283) - 0.5) * 0.1
      const channelJitterB = (hash2(x, y, 307) - 0.5) * 0.18
      color.r = THREE.MathUtils.clamp(color.r + channelJitterR, 0, 1)
      color.g = THREE.MathUtils.clamp(color.g + channelJitterG, 0, 1)
      color.b = THREE.MathUtils.clamp(color.b + channelJitterB, 0, 1)

      pixels[index] = Math.min(255, Math.max(0, Math.round(color.r * 255 * finalPunch)))
      pixels[index + 1] = Math.min(255, Math.max(0, Math.round(color.g * 255 * finalPunch)))
      pixels[index + 2] = Math.min(255, Math.max(0, Math.round(color.b * 255 * finalPunch)))
      pixels[index + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Add slashes and arcs to make the camo pattern feel less procedural and more aggressive.
  ctx.globalCompositeOperation = 'source-over'

  for (let i = 0; i < 380; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const len = 8 + Math.random() * 28
    const angle = (Math.PI * 0.22) + (Math.random() - 0.5) * 1.1
    const width = 0.8 + Math.random() * 2.2
    const darkSlash = Math.random() > 0.45

    ctx.strokeStyle = darkSlash
      ? mixGrassColorStyle(0.02 + Math.random() * 0.12, 0.26 + Math.random() * 0.22)
      : mixGrassColorStyle(0.82 + Math.random() * 0.16, 0.2 + Math.random() * 0.2)
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }

  for (let i = 0; i < 180; i++) {
    const cx = Math.random() * size
    const cy = Math.random() * size
    const baseR = 6 + Math.random() * 24
    const turns = 1.5 + Math.random() * 2.8
    const spin = Math.random() > 0.5 ? 1 : -1
    const alpha = 0.09 + Math.random() * 0.16

    ctx.strokeStyle = mixGrassColorStyle(Math.random() > 0.6 ? 0.1 : 0.88, alpha)
    ctx.lineWidth = 0.9 + Math.random() * 1.7
    ctx.beginPath()
    for (let t = 0; t <= 1; t += 0.08) {
      const theta = t * Math.PI * 2 * turns * spin
      const r = baseR * (1 - t * 0.76)
      const sx = cx + Math.cos(theta) * r
      const sy = cy + Math.sin(theta) * r
      if (t === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    }
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  cachedSection3GrassNoiseTextures.set(size, texture)
  return texture
}

function createGrassBladeMaskTexture(size = SECTION3_GRASS_SETTINGS.bladeTextureSize) {
  if (cachedSection3GrassBladeMaskTextures.has(size)) {
    return cachedSection3GrassBladeMaskTextures.get(size)
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, size, size)
  ctx.lineCap = 'round'

  for (let i = 0; i < 200; i++) {
    const startX = size * (0.2 + Math.random() * 0.6)
    const startY = size * (0.84 + Math.random() * 0.1)
    const bladeHeight = size * (0.22 + Math.random() * 0.3)
    const lean = (Math.random() - 0.5) * size * 0.24
    const controlLean = lean * (0.4 + Math.random() * 0.45)
    const lineWidth = size * (0.01 + Math.random() * 0.02)

    const gradient = ctx.createLinearGradient(startX, startY, startX + lean, startY - bladeHeight)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.1, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.94)')
    gradient.addColorStop(1, 'rgba(255,255,255,1)')

    ctx.strokeStyle = gradient
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(
      startX + controlLean,
      startY - bladeHeight * (0.44 + Math.random() * 0.14),
      startX + lean,
      startY - bladeHeight
    )
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  cachedSection3GrassBladeMaskTextures.set(size, texture)
  return texture
}

function createSection3GrassLayer(rootGroup, centerX, centerY, centerZ, radius, settings = SECTION3_GRASS_SETTINGS) {
  const bladeMaskTexture = createGrassBladeMaskTexture(settings.bladeTextureSize)
  const tuftGeometry = new THREE.PlaneGeometry(1, 1)
  tuftGeometry.translate(0, 0.5, 0)

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: SECTION3_GRASS_BASE_COLOR,
    alphaMap: bladeMaskTexture,
    alphaTest: 0.34,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.0,
    emissive: 0x000000,
    emissiveIntensity: 0.0
  })

  const tuftData = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const spreadRadius = radius - settings.edgePadding
  for (let patchIndex = 0; patchIndex < settings.patchCount; patchIndex++) {
    const normalizedIndex = (patchIndex + 0.5) / settings.patchCount
    const angle = patchIndex * goldenAngle
    const distance = Math.sqrt(normalizedIndex) * spreadRadius
    const jitterStrength = (1 - normalizedIndex * 0.3) * settings.jitter
    const patchX = centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * jitterStrength
    const patchZ = centerZ + Math.sin(angle) * distance + (Math.random() - 0.5) * jitterStrength
    const patchRadius = THREE.MathUtils.lerp(
      settings.patchRadiusMin,
      settings.patchRadiusMax,
      Math.random()
    )

    const bladesInPatch = Math.floor(
      THREE.MathUtils.lerp(
        settings.bladesPerPatchMin,
        settings.bladesPerPatchMax,
        Math.random()
      )
    )

    for (let bladeIndex = 0; bladeIndex < bladesInPatch; bladeIndex++) {
      const bladeAngle = Math.random() * Math.PI * 2
      const bladeDistance = Math.sqrt(Math.random()) * patchRadius
      const width = THREE.MathUtils.lerp(settings.bladeWidthMin, settings.bladeWidthMax, Math.random())
      const height = THREE.MathUtils.lerp(settings.bladeHeightMin, settings.bladeHeightMax, Math.random())
      const tiltX = (Math.random() - 0.5) * settings.bladeMaxTiltX
      const tiltZ = (Math.random() - 0.5) * settings.bladeMaxTiltZ
      const baseRotation = Math.random() * Math.PI
      tuftData.push({
        x: patchX + Math.cos(bladeAngle) * bladeDistance,
        z: patchZ + Math.sin(bladeAngle) * bladeDistance,
        width,
        height,
        tiltX,
        tiltZ,
        baseRotation
      })
    }
  }

  const grassMesh = new THREE.InstancedMesh(tuftGeometry, grassMaterial, tuftData.length)
  grassMesh.name = 'Section3 Grass Patches'
  grassMesh.castShadow = false
  grassMesh.receiveShadow = false
  grassMesh.frustumCulled = false
  grassMesh.count = 0
  rootGroup.add(grassMesh)

  const lodNearDistanceSq = settings.lodNearDistance * settings.lodNearDistance
  const lodCullDistanceSq = settings.lodCullDistance * settings.lodCullDistance
  const lodSpan = Math.max(0.0001, settings.lodCullDistance - settings.lodNearDistance)
  const lodCellSize = Math.max(6, settings.lodCullDistance * 0.5)
  const lodCellRadius = Math.ceil(settings.lodCullDistance / lodCellSize)
  const lodBuckets = new Map()

  function getLodCellKey(cellX, cellZ) {
    return `${cellX},${cellZ}`
  }

  for (let i = 0; i < tuftData.length; i++) {
    const tuft = tuftData[i]
    const cellX = Math.floor(tuft.x / lodCellSize)
    const cellZ = Math.floor(tuft.z / lodCellSize)
    const key = getLodCellKey(cellX, cellZ)
    let bucket = lodBuckets.get(key)
    if (!bucket) {
      bucket = []
      lodBuckets.set(key, bucket)
    }
    bucket.push(i)
  }

  const dummy = new THREE.Object3D()
  const lastFocus = new THREE.Vector3(Infinity, Infinity, Infinity)
  let lodTimer = 0

  function applyGrassLod(focusPosition, force = false) {
    if (!focusPosition) return

    const movedEnough = lastFocus.distanceToSquared(focusPosition) >= (settings.lodRefreshMoveDistance * settings.lodRefreshMoveDistance)
    if (!force && !movedEnough && lodTimer < settings.lodRefreshInterval) {
      return
    }

    let writeIndex = 0
    const focusCellX = Math.floor(focusPosition.x / lodCellSize)
    const focusCellZ = Math.floor(focusPosition.z / lodCellSize)

    for (let cellZ = focusCellZ - lodCellRadius; cellZ <= focusCellZ + lodCellRadius; cellZ++) {
      for (let cellX = focusCellX - lodCellRadius; cellX <= focusCellX + lodCellRadius; cellX++) {
        const bucket = lodBuckets.get(getLodCellKey(cellX, cellZ))
        if (!bucket) continue

        for (let j = 0; j < bucket.length; j++) {
          const tuft = tuftData[bucket[j]]
          const dx = tuft.x - focusPosition.x
          const dz = tuft.z - focusPosition.z
          const distSq = dx * dx + dz * dz

          if (distSq > lodCullDistanceSq) continue

          let scaleFactor = settings.nearScaleFactor
          if (distSq > lodNearDistanceSq) {
            const distance = Math.sqrt(distSq)
            const t = THREE.MathUtils.clamp((distance - settings.lodNearDistance) / lodSpan, 0, 1)
            scaleFactor = THREE.MathUtils.lerp(settings.nearScaleFactor, settings.minScaleFactor, t)
          }

          dummy.position.set(tuft.x, centerY + settings.hoverOffset, tuft.z)
          dummy.rotation.set(tuft.tiltX, tuft.baseRotation, tuft.tiltZ)
          dummy.scale.set(tuft.width * scaleFactor, tuft.height * scaleFactor, 1)
          dummy.updateMatrix()
          grassMesh.setMatrixAt(writeIndex, dummy.matrix)
          writeIndex += 1
        }
      }
    }

    grassMesh.count = writeIndex
    grassMesh.visible = grassMesh.count > 0
    grassMesh.instanceMatrix.needsUpdate = true

    lastFocus.copy(focusPosition)
    lodTimer = 0
  }

  return {
    updateFromFocus(focusPosition, delta = 0) {
      lodTimer += delta
      applyGrassLod(focusPosition, false)
    },
    forceRefresh(focusPosition) {
      applyGrassLod(focusPosition, true)
    }
  }
}

function createSection3TreeLod(trees, settings = SECTION3_TREE_LOD_SETTINGS) {
  const cellSize = Math.max(8, settings.cellSize || (settings.cullDistance * 0.3))
  const cullDistance = Math.max(8, settings.cullDistance || 56)
  const cullDistanceSq = cullDistance * cullDistance
  const cellRadius = Math.ceil(cullDistance / cellSize)
  const buckets = new Map()
  const lastFocus = new THREE.Vector3(Infinity, Infinity, Infinity)
  const activeFlags = new Uint8Array(trees.length)
  const nextFlags = new Uint8Array(trees.length)
  let lodTimer = 0

  function getCellKey(cellX, cellZ) {
    return `${cellX},${cellZ}`
  }

  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i]
    const cellX = Math.floor(tree.position.x / cellSize)
    const cellZ = Math.floor(tree.position.z / cellSize)
    const key = getCellKey(cellX, cellZ)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = []
      buckets.set(key, bucket)
    }
    bucket.push(i)
    tree.userData.section3LodVisible = false
    tree.visible = false
  }

  function applyTreeLod(focusPosition, force = false) {
    if (!focusPosition) return

    const movedEnough = lastFocus.distanceToSquared(focusPosition) >= (settings.refreshMoveDistance * settings.refreshMoveDistance)
    if (!force && !movedEnough && lodTimer < settings.refreshInterval) {
      return
    }

    nextFlags.fill(0)
    const focusCellX = Math.floor(focusPosition.x / cellSize)
    const focusCellZ = Math.floor(focusPosition.z / cellSize)

    for (let cellZ = focusCellZ - cellRadius; cellZ <= focusCellZ + cellRadius; cellZ++) {
      for (let cellX = focusCellX - cellRadius; cellX <= focusCellX + cellRadius; cellX++) {
        const bucket = buckets.get(getCellKey(cellX, cellZ))
        if (!bucket) continue

        for (let i = 0; i < bucket.length; i++) {
          const treeIndex = bucket[i]
          const tree = trees[treeIndex]
          const dx = tree.position.x - focusPosition.x
          const dz = tree.position.z - focusPosition.z
          const distSq = dx * dx + dz * dz
          if (distSq <= cullDistanceSq) {
            nextFlags[treeIndex] = 1
          }
        }
      }
    }

    for (let i = 0; i < trees.length; i++) {
      if (activeFlags[i] === nextFlags[i]) continue

      activeFlags[i] = nextFlags[i]
      const tree = trees[i]
      const lodVisible = nextFlags[i] === 1
      tree.userData.section3LodVisible = lodVisible
      tree.visible = lodVisible && ((tree.userData.opacity ?? 1) > 0.001)
    }

    lastFocus.copy(focusPosition)
    lodTimer = 0
  }

  return {
    updateFromFocus(focusPosition, delta = 0) {
      lodTimer += delta
      applyTreeLod(focusPosition, false)
    },
    forceRefresh(focusPosition) {
      applyTreeLod(focusPosition, true)
    }
  }
}

function applySection3StochasticTexture(material) {
  material.customProgramCacheKey = () => 'section3_stochastic_texture_v4_optimized'
  material.onBeforeCompile = (shader) => {

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_pars_fragment>',
      `#include <map_pars_fragment>

// ---- shared helpers ----
float s3Hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
vec2 s3Hash2(vec2 p) {
  return vec2(s3Hash(p + vec2(19.17, 47.83)), s3Hash(p + vec2(91.69, 12.38)));
}
mat2 s3Rot(float a) { float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }

float s3VNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(s3Hash(i),            s3Hash(i+vec2(1,0)), u.x),
             mix(s3Hash(i+vec2(0,1)),  s3Hash(i+vec2(1,1)), u.x), u.y);
}

/* 🎯 Optimized: Reduced from 6 to 3 octaves */
float s3Fbm(vec2 p) {
  float v=0.0,a=0.67,f=1.0;
  for(int i=0;i<3;i++){ v+=s3VNoise(p*f)*a; f*=2.0; a*=0.5; }
  return v;
}

// ---- STEP 1: stochastic tile sample (random rotate + flip + jitter per cell) ----
vec4 s3SampleStochastic(sampler2D tex, vec2 uv) {
  vec2 g = uv * 0.06;
  vec2 cell = floor(g), f = fract(g);
  vec2 blend = smoothstep(vec2(0.15), vec2(0.85), f);
  vec4 accum = vec4(0.0); float total = 0.0;
  for(int iy=0;iy<=1;iy++) {
    for(int ix=0;ix<=1;ix++) {
      vec2 co  = vec2(float(ix),float(iy));
      vec2 id  = cell + co;
      float ang = s3Hash(id+vec2(17.31,3.11)) * 6.28318;
      vec2 jit  = (s3Hash2(id+vec2(23.7,71.9)) - 0.5) * 0.22;
      vec2 loc  = fract(g - id);
      if(s3Hash(id+vec2(47.9,59.2)) > 0.5) loc.x = 1.0 - loc.x;
      vec2 suv  = s3Rot(ang)*(loc-0.5)+0.5+jit;
      vec4 samp = texture2D(tex, suv);
      float w   = mix(1.0-blend.x,blend.x,co.x)*mix(1.0-blend.y,blend.y,co.y);
      accum += samp*w; total += w;
    }
  }
  return accum / max(total, 0.0001);
}`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP

  // normalized 0..1 across the whole platform
  vec2 worldUv = vMapUv / 720.0;

  // ---- STEP 2: MICRO distortion (small ripples inside each tile) ----
  vec2 tiledUv = worldUv * 720.0;
  float mdA = s3Fbm(tiledUv * 0.09 + vec2(5.3,  1.9));
  float mdB = s3Fbm(tiledUv * 0.09 + vec2(-2.1,  4.6));
  vec2 microDistort = vec2(mdA - 0.5, mdB - 0.5) * 0.35;
  vec2 microUv = tiledUv + microDistort;

  vec4 sampledDiffuseColor = s3SampleStochastic(map, microUv);
  diffuseColor *= sampledDiffuseColor;

  // ---- STEP 3: Simplified MACRO distortion (single warp) ----
  float mwA = s3Fbm(worldUv * 2.0 + vec2(1.7, -2.1));
  float mwB = s3Fbm(worldUv * 2.0 + vec2(-3.8, 2.9));
  vec2 warpedW = worldUv + vec2(mwA-0.5, mwB-0.5) * 0.5;

  /* 🎯 Optimized: Single macro instead of 3 separate FBM calls */
  float macro = s3Fbm(warpedW * 5.0 + vec2(5.3, 1.9));
  macro = clamp((macro - 0.36) * 2.0, 0.0, 1.0);

  vec3 grassTint = vec3(0.537, 1.0,  0.224);
  vec3 soilTint  = vec3(0.075, 0.0,  0.416);
  vec3 macroColor = mix(soilTint, grassTint, macro);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * macroColor, 0.3);

#endif`
    )
  }
  material.needsUpdate = true
}

export function createSection3(rootGroup) {
  // ======================================================
  // SECTION 3: MẶT PHẲNG TRÒN Ở PHÍA TRÊN SECTION 1 & 2
  // Nền tròn rất rộng với texture đất cỏ xanh
  // ======================================================

  // Extract config from master config
  const cfg = SECTION3_MASTER_CONFIG
  const SECTION3_CENTER_X = cfg.center.x
  const SECTION3_CENTER_Y = cfg.center.y
  const SECTION3_CENTER_Z = cfg.center.z
  const SECTION3_RADIUS = cfg.radius
  const SECTION3_THICKNESS = cfg.thickness
  const SECTION3_SEGMENTS = cfg.segments
  const SECTION3_OVERHEAD_LIGHT_HEIGHT = cfg.overheadLightHeight
  const SECTION3_EYE_HEIGHT = SECTION3_OVERHEAD_LIGHT_HEIGHT * 2
  const SECTION3_OVERHEAD_LIGHT_INTENSITY = cfg.overheadLightIntensity
  const SECTION3_OVERHEAD_LIGHT_DISTANCE = cfg.overheadLightDistance
  const SECTION3_OVERHEAD_LIGHT_DECAY = cfg.overheadLightDecay
  const SECTION3_OVERHEAD_LIGHT_ANGLE = cfg.overheadLightAngle
  const SECTION3_OVERHEAD_LIGHT_PENUMBRA = cfg.overheadLightPenumbra

  const useHighQuality = isSection3HighQualityMode()
  const grassSettings = useHighQuality
    ? SECTION3_GRASS_SETTINGS
    : { ...SECTION3_GRASS_SETTINGS, ...SECTION3_GRASS_LOW_QUALITY_OVERRIDES }
  const houseSettings = useHighQuality
    ? SECTION3_HOUSE_SETTINGS
    : { ...SECTION3_HOUSE_SETTINGS, ...SECTION3_HOUSE_LOW_QUALITY_OVERRIDES }
  const treeSettings = useHighQuality
    ? SECTION3_TREE_SETTINGS
    : { ...SECTION3_TREE_SETTINGS, ...SECTION3_TREE_LOW_QUALITY_OVERRIDES }
  const treeLodSettings = useHighQuality
    ? SECTION3_TREE_LOD_SETTINGS
    : { ...SECTION3_TREE_LOD_SETTINGS, ...SECTION3_TREE_LOD_LOW_QUALITY_OVERRIDES }

  const houseAsset = getHouseAsset()

  const grassTexture = createGrassNoiseTexture(grassSettings.textureSize)
  grassTexture.repeat.set(grassSettings.textureRepeat, grassSettings.textureRepeat)
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: mixGrassColor(0.82),
    map: grassTexture,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.0
  })
  if (useHighQuality) {
    applySection3StochasticTexture(platformMaterial)
  }

  const platform = new THREE.Mesh(
    new THREE.CircleGeometry(SECTION3_RADIUS, SECTION3_SEGMENTS),
    platformMaterial
  )
  platform.rotation.x = -Math.PI / 2
  platform.position.set(SECTION3_CENTER_X, SECTION3_CENTER_Y, SECTION3_CENTER_Z)
  platform.receiveShadow = true
  platform.castShadow = false
  platform.name = 'Section3 Platform'
  rootGroup.add(platform)

  const section3GrassLod = createSection3GrassLayer(
    rootGroup,
    SECTION3_CENTER_X,
    SECTION3_CENTER_Y,
    SECTION3_CENTER_Z,
    SECTION3_RADIUS,
    grassSettings
  )
  if (!rootGroup.userData) rootGroup.userData = {}
  rootGroup.userData.section3GrassLod = section3GrassLod

  const eyeSun = createEyeSun({
    lightColor: '#fff4d6',
    lightIntensity: 0,
    lightDistance: SECTION3_OVERHEAD_LIGHT_DISTANCE,
    lightAngle: SECTION3_OVERHEAD_LIGHT_ANGLE,
    lightPenumbra: SECTION3_OVERHEAD_LIGHT_PENUMBRA,
    lightDecay: SECTION3_OVERHEAD_LIGHT_DECAY,
    targetOffset: new THREE.Vector3(0, -SECTION3_EYE_HEIGHT, 0),
    scale: 0.92
  })
  eyeSun.position.set(
    SECTION3_CENTER_X,
    SECTION3_CENTER_Y + SECTION3_EYE_HEIGHT,
    SECTION3_CENTER_Z
  )
  if (eyeSun.userData?.mainLight) {
    eyeSun.userData.mainLight.intensity = 0
    eyeSun.userData.mainLight.visible = false
  }
  rootGroup.add(eyeSun)

  rootGroup.userData.section3EyeSun = eyeSun

  const housePlacements = generateSection3HousePlacements(
    SECTION3_CENTER_X,
    SECTION3_CENTER_Z,
    SECTION3_RADIUS,
    houseSettings
  )

  housePlacements.forEach((placement, index) => {
    const house = houseAsset.factory({
      lowCost: true,
      physicsMode: 'simple'
    })
    house.position.set(placement.x, SECTION3_CENTER_Y, placement.z)
    house.rotation.y = placement.yaw
    house.name = `Section3 House ${index + 1}`
    house.userData = house.userData || {}
    house.userData.isSection3House = true
    house.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false
      }
    })
    
    rootGroup.add(house)
  })

  // ======================================================
  // TREES - Billboard trees with Y-locked billboarding
  // ======================================================
  const treePlacements = generateSection3TreePlacements(
    SECTION3_CENTER_X,
    SECTION3_CENTER_Z,
    SECTION3_RADIUS,
    treeSettings
  )

  const trees = []
  const treeMaterialControllers = new Set()
  treePlacements.forEach((placement, index) => {
    const tree = createTreeBillboard(
      new THREE.Vector3(placement.x, SECTION3_CENTER_Y + 0.2, placement.z),
      placement.treeIndex
    )
    tree.name = `Section3 Tree ${index + 1}`
    tree.userData.isSection3Tree = true
    tree.userData.initialOpacity = 0 // Start invisible, fade in during transition
    setTreeOpacity(tree, 0)
    if (tree.userData?.treeMaterialController) {
      treeMaterialControllers.add(tree.userData.treeMaterialController)
    }
    rootGroup.add(tree)
    trees.push(tree)
  })

  if (!rootGroup.userData) rootGroup.userData = {}
  rootGroup.userData.section3Trees = trees
  rootGroup.userData.section3TreeCount = trees.length
  rootGroup.userData.section3TreeMaterialControllers = Array.from(treeMaterialControllers)
  rootGroup.userData.section3TreesVisible = false
  rootGroup.userData.section3TreeLod = createSection3TreeLod(trees, treeLodSettings)

  // Lighting descriptor — placed after overheadLight is initialized
  rootGroup.userData.sectionLighting = {
    mainLight: null,
    baseMainIntensity: 0,
    ambientIntensity: cfg.ambientIntensity,
    fog: cfg.fog,
    background: cfg.background,
    colors: cfg.colors
  }

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(SECTION3_RADIUS, SECTION3_RADIUS, SECTION3_THICKNESS, SECTION3_SEGMENTS, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#3a2a1b',
      roughness: 0.88,
      metalness: 0.04
    })
  )
  rim.position.set(SECTION3_CENTER_X, SECTION3_CENTER_Y - SECTION3_THICKNESS / 2, SECTION3_CENTER_Z)
  rim.castShadow = true
  rim.receiveShadow = true
  rim.name = 'Section3 Platform Rim'
  rootGroup.add(rim)

  const underside = new THREE.Mesh(
    new THREE.CircleGeometry(SECTION3_RADIUS, SECTION3_SEGMENTS),
    new THREE.MeshStandardMaterial({
      color: '#1f160e',
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    })
  )
  underside.rotation.x = Math.PI / 2
  underside.position.set(SECTION3_CENTER_X, SECTION3_CENTER_Y - SECTION3_THICKNESS, SECTION3_CENTER_Z)
  underside.receiveShadow = true
  underside.name = 'Section3 Platform Underside'
  rootGroup.add(underside)

  if (rootGroup.userData.physics) {
    rootGroup.userData.physics.shapes.push({
      type: 'cylinder',
      radiusTop: SECTION3_RADIUS,
      radiusBottom: SECTION3_RADIUS,
      height: SECTION3_THICKNESS,
      segments: 24,
      offset: [SECTION3_CENTER_X, SECTION3_CENTER_Y - SECTION3_THICKNESS / 2, SECTION3_CENTER_Z]
    })
  }

  // ======================================================
  // KẾT THÚC SECTION 3
  // ======================================================
}