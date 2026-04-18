import * as THREE from 'three'

const ITEM_ARROW_CONFIG = {
  emoji: '🔻',
  scale: 0.42,
  yOffset: 0.22,
  bobAmplitude: 0.05,
  bobSpeed: 3.0,
  opacity: 1.0,
  blinkMinOpacity: 0.18,
  blinkMaxOpacity: 1.0,
  blinkSpeed: 6.0,
  blinkHardness: 2.1,
  pulseScaleStrength: 0.18
}

function createEmojiTexture(emoji) {
  const size = 192
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  
  // Draw "Pick me!" text above emoji
  const textSize = Math.floor(size * 0.2)
  ctx.font = `bold ${textSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  
  // Text shadow for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillText('Pick me!', size * 0.5 + 1, size * 0.22 + 1)
  
  // Text main - white
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1
  ctx.fillText('Pick me!', size * 0.5, size * 0.22)
  ctx.strokeText('Pick me!', size * 0.5, size * 0.22)
  
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

export function createItemArrowEffect(scene, owner, options = {}) {
  const config = {
    emoji: options.emoji ?? ITEM_ARROW_CONFIG.emoji,
    scale: options.scale ?? ITEM_ARROW_CONFIG.scale,
    yOffset: options.yOffset ?? ITEM_ARROW_CONFIG.yOffset,
    bobAmplitude: options.bobAmplitude ?? ITEM_ARROW_CONFIG.bobAmplitude,
    bobSpeed: options.bobSpeed ?? ITEM_ARROW_CONFIG.bobSpeed,
    opacity: options.opacity ?? ITEM_ARROW_CONFIG.opacity,
    blinkMinOpacity: options.blinkMinOpacity ?? ITEM_ARROW_CONFIG.blinkMinOpacity,
    blinkMaxOpacity: options.blinkMaxOpacity ?? ITEM_ARROW_CONFIG.blinkMaxOpacity,
    blinkSpeed: options.blinkSpeed ?? ITEM_ARROW_CONFIG.blinkSpeed,
    blinkHardness: options.blinkHardness ?? ITEM_ARROW_CONFIG.blinkHardness,
    pulseScaleStrength: options.pulseScaleStrength ?? ITEM_ARROW_CONFIG.pulseScaleStrength
  }

  let texture = createEmojiTexture(config.emoji)
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
    const requestedEmoji = typeof next.emoji === 'string' ? next.emoji : ITEM_ARROW_CONFIG.emoji
    if (requestedEmoji !== config.emoji) {
      config.emoji = requestedEmoji
      const nextTexture = createEmojiTexture(config.emoji)
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
    }
  }
}
