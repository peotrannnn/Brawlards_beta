import * as THREE from 'three'

const DESTROY_PARTICLE_CONFIG = {
  emoji: '🔻',
  scale: 0.42,
  yOffset: 0.6,
  bobAmplitude: 0.05,
  bobSpeed: 3.0,
  opacity: 1.0,
  blinkMinOpacity: 0.18,
  blinkMaxOpacity: 1.0,
  blinkSpeed: 6.0,
  blinkHardness: 2.1,
  pulseScaleStrength: 0.18
}

function createDestroyTexture(emoji) {
  const size = 192
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  // Draw "Destroy!" text above emoji
  const textSize = Math.floor(size * 0.2)
  ctx.font = `bold ${textSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  // Text shadow for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillText('Destroy!', size * 0.5 + 1, size * 0.22 + 1)
  // Text main - white
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.fillText('Destroy!', size * 0.5, size * 0.22)
  ctx.strokeText('Destroy!', size * 0.5, size * 0.22)
  // Draw emoji below text
  ctx.font = '120px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(emoji, size * 0.5, size * 0.35)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createDestroyParticleEffect(scene, owner, options = {}) {
  const config = {
    emoji: options.emoji ?? DESTROY_PARTICLE_CONFIG.emoji,
    scale: options.scale ?? DESTROY_PARTICLE_CONFIG.scale,
    yOffset: options.yOffset ?? DESTROY_PARTICLE_CONFIG.yOffset,
    bobAmplitude: options.bobAmplitude ?? DESTROY_PARTICLE_CONFIG.bobAmplitude,
    bobSpeed: options.bobSpeed ?? DESTROY_PARTICLE_CONFIG.bobSpeed,
    opacity: options.opacity ?? DESTROY_PARTICLE_CONFIG.opacity,
    blinkMinOpacity: options.blinkMinOpacity ?? DESTROY_PARTICLE_CONFIG.blinkMinOpacity,
    blinkMaxOpacity: options.blinkMaxOpacity ?? DESTROY_PARTICLE_CONFIG.blinkMaxOpacity,
    blinkSpeed: options.blinkSpeed ?? DESTROY_PARTICLE_CONFIG.blinkSpeed,
    blinkHardness: options.blinkHardness ?? DESTROY_PARTICLE_CONFIG.blinkHardness,
    pulseScaleStrength: options.pulseScaleStrength ?? DESTROY_PARTICLE_CONFIG.pulseScaleStrength
  }

  let texture = createDestroyTexture(config.emoji)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
    depthTest: false
  })

  const sprite = new THREE.Sprite(material)
  sprite.renderOrder = 10
  sprite.scale.set(config.scale, config.scale, config.scale)
  scene.add(sprite)

  const tmpWorld = new THREE.Vector3()
  let age = Math.random() * 100
  let finished = false

  function setOptions(next = {}) {
    const requestedEmoji = typeof next.emoji === 'string' ? next.emoji : DESTROY_PARTICLE_CONFIG.emoji
    if (requestedEmoji !== config.emoji) {
      config.emoji = requestedEmoji
      const nextTexture = createDestroyTexture(config.emoji)
      const prevTexture = material.map
      material.map = nextTexture
      material.needsUpdate = true
      texture = nextTexture
      if (prevTexture) prevTexture.dispose()
    }

    if (typeof next.scale === 'number') config.scale = next.scale
    if (typeof next.yOffset === 'number') config.yOffset = next.yOffset
    if (typeof next.bobAmplitude === 'number') config.bobAmplitude = next.bobAmplitude
    if (typeof next.bobSpeed === 'number') config.bobSpeed = next.bobSpeed
    if (typeof next.opacity === 'number') config.opacity = next.opacity
    if (typeof next.blinkMinOpacity === 'number') config.blinkMinOpacity = next.blinkMinOpacity
    if (typeof next.blinkMaxOpacity === 'number') config.blinkMaxOpacity = next.blinkMaxOpacity
    if (typeof next.blinkSpeed === 'number') config.blinkSpeed = next.blinkSpeed
    if (typeof next.blinkHardness === 'number') config.blinkHardness = next.blinkHardness
    if (typeof next.pulseScaleStrength === 'number') config.pulseScaleStrength = next.pulseScaleStrength
    sprite.scale.set(config.scale, config.scale, config.scale)
    material.opacity = config.opacity
  }

  function dispose() {
    if (finished) return
    finished = true
    scene.remove(sprite)
    material.dispose()
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

    const bob = Math.sin(age * config.bobSpeed) * config.bobAmplitude
    const baseBlink = (Math.sin(age * config.blinkSpeed) + 1) * 0.5
    const shapedBlink = Math.pow(baseBlink, config.blinkHardness)
    const blinkOpacity = THREE.MathUtils.lerp(config.blinkMinOpacity, config.blinkMaxOpacity, shapedBlink)
    material.opacity = config.opacity * blinkOpacity

    const scalePulse = 1 + (Math.sin(age * (config.blinkSpeed * 0.5)) * config.pulseScaleStrength)
    sprite.scale.setScalar(config.scale * scalePulse)
    sprite.position.set(tmpWorld.x, tmpWorld.y + config.yOffset + bob, tmpWorld.z)
  }

  return {
    update,
    dispose,
    setOptions,
    get finished() {
      return finished
    },
    get sprite() {
      return sprite
    }
  }
}
