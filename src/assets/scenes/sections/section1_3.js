import * as THREE from 'three'

const SECTION3_GRASS_BASE_COLOR = new THREE.Color('#67b935')
const SECTION3_GRASS_SOIL_COLOR = new THREE.Color('#090542')
const SECTION3_GRASS_VIVID_COLOR = new THREE.Color('#89ff39')
const SECTION3_GRASS_DEEP_SOIL_COLOR = new THREE.Color('#13006a')
const SECTION3_GRASS_SETTINGS = {
  textureSize: 768,
  textureRepeat: 4096,
  bladeTextureSize: 128,
  patchCount: 4200,
  bladesPerPatchMin: 50,
  bladesPerPatchMax: 100,
  patchRadiusMin: 1.5,
  patchRadiusMax: 3,
  edgePadding: 2.8,
  hoverOffset: 0.035,
  jitter: 1.0,
  lodNearDistance: 10,
  lodCullDistance: 30,
  lodRefreshInterval: 0.5,
  lodRefreshMoveDistance: 1.5,
  nearScaleFactor: 0.3,
  minScaleFactor: 0.05,
  bladeWidthMin: 0.05,
  bladeWidthMax: 0.1,
  bladeHeightMin: 0.1,
  bladeHeightMax: 0.5,
  bladeMaxTiltX: 0.5,
  bladeMaxTiltZ: 0.5
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
  return texture
}

function createGrassBladeMaskTexture(size = SECTION3_GRASS_SETTINGS.bladeTextureSize) {
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
  return texture
}

function createSection3GrassLayer(rootGroup, centerX, centerY, centerZ, radius) {
  const bladeMaskTexture = createGrassBladeMaskTexture()
  const tuftGeometry = new THREE.PlaneGeometry(1, 1)
  tuftGeometry.translate(0, 0.5, 0)

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: SECTION3_GRASS_BASE_COLOR,
    alphaMap: bladeMaskTexture,
    alphaTest: 0.34,
    transparent: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    roughness: 0.96,
    metalness: 0.0,
    emissive: 0x000000,
    emissiveIntensity: 0.0
  })

  const tuftData = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const spreadRadius = radius - SECTION3_GRASS_SETTINGS.edgePadding
  for (let patchIndex = 0; patchIndex < SECTION3_GRASS_SETTINGS.patchCount; patchIndex++) {
    const normalizedIndex = (patchIndex + 0.5) / SECTION3_GRASS_SETTINGS.patchCount
    const angle = patchIndex * goldenAngle
    const distance = Math.sqrt(normalizedIndex) * spreadRadius
    const jitterStrength = (1 - normalizedIndex * 0.3) * SECTION3_GRASS_SETTINGS.jitter
    const patchX = centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * jitterStrength
    const patchZ = centerZ + Math.sin(angle) * distance + (Math.random() - 0.5) * jitterStrength
    const patchRadius = THREE.MathUtils.lerp(
      SECTION3_GRASS_SETTINGS.patchRadiusMin,
      SECTION3_GRASS_SETTINGS.patchRadiusMax,
      Math.random()
    )

    const bladesInPatch = Math.floor(
      THREE.MathUtils.lerp(
        SECTION3_GRASS_SETTINGS.bladesPerPatchMin,
        SECTION3_GRASS_SETTINGS.bladesPerPatchMax,
        Math.random()
      )
    )

    for (let bladeIndex = 0; bladeIndex < bladesInPatch; bladeIndex++) {
      const bladeAngle = Math.random() * Math.PI * 2
      const bladeDistance = Math.sqrt(Math.random()) * patchRadius
      const width = THREE.MathUtils.lerp(SECTION3_GRASS_SETTINGS.bladeWidthMin, SECTION3_GRASS_SETTINGS.bladeWidthMax, Math.random())
      const height = THREE.MathUtils.lerp(SECTION3_GRASS_SETTINGS.bladeHeightMin, SECTION3_GRASS_SETTINGS.bladeHeightMax, Math.random())
      const tiltX = (Math.random() - 0.5) * SECTION3_GRASS_SETTINGS.bladeMaxTiltX
      const tiltZ = (Math.random() - 0.5) * SECTION3_GRASS_SETTINGS.bladeMaxTiltZ
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
  grassMesh.receiveShadow = true
  grassMesh.frustumCulled = false
  grassMesh.count = 0
  rootGroup.add(grassMesh)

  const lodNearDistanceSq = SECTION3_GRASS_SETTINGS.lodNearDistance * SECTION3_GRASS_SETTINGS.lodNearDistance
  const lodCullDistanceSq = SECTION3_GRASS_SETTINGS.lodCullDistance * SECTION3_GRASS_SETTINGS.lodCullDistance
  const lodSpan = Math.max(0.0001, SECTION3_GRASS_SETTINGS.lodCullDistance - SECTION3_GRASS_SETTINGS.lodNearDistance)
  const dummy = new THREE.Object3D()
  const lastFocus = new THREE.Vector3(Infinity, Infinity, Infinity)
  let lodTimer = 0

  function applyGrassLod(focusPosition, force = false) {
    if (!focusPosition) return

    const movedEnough = lastFocus.distanceToSquared(focusPosition) >= (SECTION3_GRASS_SETTINGS.lodRefreshMoveDistance * SECTION3_GRASS_SETTINGS.lodRefreshMoveDistance)
    if (!force && !movedEnough && lodTimer < SECTION3_GRASS_SETTINGS.lodRefreshInterval) {
      return
    }

    let writeIndex = 0

    for (let i = 0; i < tuftData.length; i++) {
      const tuft = tuftData[i]
      const dx = tuft.x - focusPosition.x
      const dz = tuft.z - focusPosition.z
      const distSq = dx * dx + dz * dz

      if (distSq > lodCullDistanceSq) continue

      let scaleFactor = 1
      if (distSq > lodNearDistanceSq) {
        const distance = Math.sqrt(distSq)
        const t = THREE.MathUtils.clamp((distance - SECTION3_GRASS_SETTINGS.lodNearDistance) / lodSpan, 0, 1)
        scaleFactor = THREE.MathUtils.lerp(SECTION3_GRASS_SETTINGS.nearScaleFactor, SECTION3_GRASS_SETTINGS.minScaleFactor, t)
      } else {
        scaleFactor = SECTION3_GRASS_SETTINGS.nearScaleFactor
      }

      dummy.position.set(tuft.x, centerY + SECTION3_GRASS_SETTINGS.hoverOffset, tuft.z)
      dummy.rotation.set(tuft.tiltX, tuft.baseRotation, tuft.tiltZ)
      dummy.scale.set(tuft.width * scaleFactor, tuft.height * scaleFactor, 1)
      dummy.updateMatrix()
      grassMesh.setMatrixAt(writeIndex, dummy.matrix)
      writeIndex += 1
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

function applySection3StochasticTexture(material) {
  material.customProgramCacheKey = () => 'section3_stochastic_texture_v3'
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

float s3Fbm(vec2 p) {
  float v=0.0,a=0.55,f=1.0;
  for(int i=0;i<6;i++){ v+=s3VNoise(p*f)*a; f*=2.07; a*=0.50; }
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
  vec2 tiledUv = worldUv * 720.0;   // back to tile-space
  float mdA = s3Fbm(tiledUv * 0.09 + vec2(5.3,  1.9));
  float mdB = s3Fbm(tiledUv * 0.09 + vec2(-2.1,  4.6));
  vec2 microDistort = vec2(mdA - 0.5, mdB - 0.5) * 0.42;
  vec2 microUv = tiledUv + microDistort;   // distorted tile UV → sample from this

  vec4 sampledDiffuseColor = s3SampleStochastic(map, microUv);
  diffuseColor *= sampledDiffuseColor;

  // ---- STEP 3: MACRO distortion overlay (large gradient across whole platform) ----
  float mwA = s3Fbm(worldUv * 2.2 + vec2(1.7, -2.1));
  float mwB = s3Fbm(worldUv * 2.2 + vec2(-3.8, 2.9));
  float mwC = s3Fbm(worldUv * 2.2 + vec2(4.4, -4.7));
  // double domain-warp for strongly distorted shape
  vec2 warpedW = worldUv + vec2(mwA-0.5, mwB-0.5) * 0.65;
  float ww2A = s3Fbm(warpedW * 3.6 + vec2(2.3, 6.7));
  float ww2B = s3Fbm(warpedW * 3.6 + vec2(-5.1, 1.2));
  vec2 warpedW2 = warpedW + vec2(ww2A-0.5, ww2B-0.5) * 0.4;

  float macroLow  = s3Fbm(warpedW2 * 2.8 + vec2(5.3, 1.9));
  float macroMid  = s3Fbm(warpedW2 * 6.1 + vec2(-2.1, 4.6));
  float macroFine = s3Fbm(warpedW2 * 13.5 + vec2(3.8, -1.2) + vec2(mwC-0.5)*0.3);

  float macro = macroLow*0.50 + macroMid*0.32 + macroFine*0.18;
  macro = clamp((macro - 0.36) * 2.2, 0.0, 1.0);
  macro = macro*macro*(3.0-2.0*macro);

  vec3 grassTint = vec3(0.537, 1.0,  0.224);
  vec3 soilTint  = vec3(0.075, 0.0,  0.416);
  vec3 macroColor = mix(soilTint, grassTint, macro);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * macroColor, 0.34);

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

  const SECTION3_CENTER_X = 0
  const SECTION3_CENTER_Y = 140
  const SECTION3_CENTER_Z = 0
  const SECTION3_RADIUS = 96
  const SECTION3_THICKNESS = 1.2
  const SECTION3_SEGMENTS = 96
  const SECTION3_OVERHEAD_LIGHT_HEIGHT = 18
  const SECTION3_OVERHEAD_LIGHT_INTENSITY = 860
  const SECTION3_OVERHEAD_LIGHT_DISTANCE = 88
  const SECTION3_OVERHEAD_LIGHT_DECAY = 1.35
  const SECTION3_OVERHEAD_LIGHT_ANGLE = 1.52
  const SECTION3_OVERHEAD_LIGHT_PENUMBRA = 0.72

  const grassTexture = createGrassNoiseTexture()
  grassTexture.repeat.set(SECTION3_GRASS_SETTINGS.textureRepeat, SECTION3_GRASS_SETTINGS.textureRepeat)
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: mixGrassColor(0.82),
    map: grassTexture,
    roughness: 0.98,
    metalness: 0.0
  })
  applySection3StochasticTexture(platformMaterial)

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
    SECTION3_RADIUS
  )
  if (!rootGroup.userData) rootGroup.userData = {}
  rootGroup.userData.section3GrassLod = section3GrassLod

  const overheadTarget = new THREE.Object3D()
  overheadTarget.position.set(
    SECTION3_CENTER_X,
    SECTION3_CENTER_Y,
    SECTION3_CENTER_Z
  )
  rootGroup.add(overheadTarget)

  const overheadLight = new THREE.SpotLight(
    '#fff4d6',
    SECTION3_OVERHEAD_LIGHT_INTENSITY,
    SECTION3_OVERHEAD_LIGHT_DISTANCE,
    SECTION3_OVERHEAD_LIGHT_ANGLE,
    SECTION3_OVERHEAD_LIGHT_PENUMBRA,
    SECTION3_OVERHEAD_LIGHT_DECAY
  )
  overheadLight.position.set(
    SECTION3_CENTER_X,
    SECTION3_CENTER_Y + SECTION3_OVERHEAD_LIGHT_HEIGHT,
    SECTION3_CENTER_Z
  )
  overheadLight.target = overheadTarget
  overheadLight.castShadow = false
  overheadLight.name = 'Section3 Overhead Light'
  rootGroup.add(overheadLight)

  // Lighting descriptor — placed after overheadLight is initialized
  rootGroup.userData.sectionLighting = {
    mainLight: overheadLight,
    baseMainIntensity: SECTION3_OVERHEAD_LIGHT_INTENSITY,
    ambientIntensity: 1.2,
    fog: { near: 1, far: 400 }
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