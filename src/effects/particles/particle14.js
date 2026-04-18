import * as THREE from 'three'

const VEIN_CONFIG = {
  offsetY: 0.6,
  centerPullY: -0.12,
  sideOffset: 0.25,
  lifetime: Infinity,
  pulseSpeed: 6.0,
  flickerSpeed: 16.0,
  baseScale: 0.38,
  swingAmplitude: 0.055,
  colorHueA: 0.0,
  colorHueB: 0.05,
  saturation: 0.95,
  lightnessA: 0.5,
  lightnessB: 0.62,
  opacityMin: 0.30,
  opacityMax: 0.80
}

function createVeinTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  ctx.font = "900 180px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('💢', size / 2, size / 2 + 10)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

// Persistent billboard vein effect (anger marker) attached to an owner object.
export function createVeinEffect(scene, owner, options = {}) {
  const offsetY = options.offsetY ?? VEIN_CONFIG.offsetY
  const centerPullY = options.centerPullY ?? VEIN_CONFIG.centerPullY
  const sideOffset = options.sideOffset ?? VEIN_CONFIG.sideOffset
  const group = new THREE.Group()
  scene.add(group)

  const texture = createVeinTexture()

  const matA = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: VEIN_CONFIG.opacityMax,
    depthWrite: false
  })

  const matB = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: VEIN_CONFIG.opacityMax * 0.9,
    depthWrite: false
  })

  const spriteA = new THREE.Sprite(matA)
  spriteA.scale.setScalar(VEIN_CONFIG.baseScale)
  group.add(spriteA)

  const spriteB = new THREE.Sprite(matB)
  spriteB.scale.setScalar(VEIN_CONFIG.baseScale * 0.8)
  group.add(spriteB)

  const tmpWorld = new THREE.Vector3()
  let age = Math.random() * 100
  let finished = false

  function dispose() {
    if (finished) return
    finished = true
    scene.remove(group)
    matA.dispose()
    matB.dispose()
    if (texture) texture.dispose()
  }

  function update(delta) {
    if (finished) return
    if (!owner || !owner.parent) {
      dispose()
      return
    }

    age += delta

    owner.getWorldPosition(tmpWorld)
    group.position.set(tmpWorld.x, tmpWorld.y + offsetY + centerPullY, tmpWorld.z)

    const pulse = 0.9 + 0.16 * Math.sin(age * VEIN_CONFIG.pulseSpeed)
    const flicker = 0.5 + 0.5 * Math.sin(age * VEIN_CONFIG.flickerSpeed)

    const hue = THREE.MathUtils.lerp(VEIN_CONFIG.colorHueA, VEIN_CONFIG.colorHueB, flicker)
    const lightness = THREE.MathUtils.lerp(VEIN_CONFIG.lightnessA, VEIN_CONFIG.lightnessB, flicker)
    const opacity = THREE.MathUtils.lerp(VEIN_CONFIG.opacityMin, VEIN_CONFIG.opacityMax, flicker)

    matA.color.setHSL(hue, VEIN_CONFIG.saturation, lightness)
    matB.color.setHSL(hue + 0.015, VEIN_CONFIG.saturation, lightness * 0.95)
    matA.opacity = opacity
    matB.opacity = opacity * 0.86

    const swing = Math.sin(age * 7.0) * VEIN_CONFIG.swingAmplitude
    const anchoredSide = sideOffset

    spriteA.position.set(anchoredSide + swing, 0.0, 0)
    spriteA.scale.setScalar(VEIN_CONFIG.baseScale * pulse)

    spriteB.position.set(anchoredSide - swing * 0.45, 0.06, 0)
    spriteB.scale.setScalar(VEIN_CONFIG.baseScale * 0.8 * (1.05 - (pulse - 0.9)))
  }

  return {
    group,
    update,
    dispose,
    get finished() {
      return finished
    }
  }
}
