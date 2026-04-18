import * as THREE from 'three'
import { createSmokeEffect } from "../effects/particles/particle1.js"
import { createSparkEffect } from "../effects/particles/particle2.js"
import { createDustEffect } from "../effects/particles/particle3.js"
import { createWaterSplashEffect } from "../effects/particles/particle4.js"
import { createBlackSmokePuffEffect } from "../effects/particles/particle5.js"
import { createGhostSmokeEffect } from "../effects/particles/particle6.js"
import { createSweatEffect } from "../effects/particles/particle8.js"
import { createBlastingEffect } from "../effects/particles/particle9.js"
import { createWhiteMistFallEffect } from "../effects/particles/particle10.js"
import { createReverseCurrentFlowEffect } from "../effects/particles/particle11.js"
import { createPipeWaterDripEffect } from "../effects/particles/particle12.js"
import { createShockwaveSmokeEffect } from "../effects/particles/particle13.js"
import { createVeinEffect } from "../effects/particles/particle14.js"
import { createUnderwaterBubbleTrailEffect } from "../effects/particles/particle15.js"
import { createItemArrowEffect } from "../effects/particles/particle16.js"

const MAX_TRANSIENT_EFFECTS = 260

export class ParticleManager {
  constructor(scene) {
    this.scene = scene
    this.effects = []
    this.veinEffects = new Map()
    this.itemArrowEffects = new Map()
    this.groundObjects = [] // Để raycast cho các hiệu ứng như vũng nước
  }

  spawn(type, position, options = {}) {
    if (this.effects.length >= MAX_TRANSIENT_EFFECTS) {
      return null
    }

    if (type === 'smoke') {
      const effect = createSmokeEffect(this.scene, position)
      this.effects.push(effect)
      return effect
    } else if (type === 'spark') {
      const effect = createSparkEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'dust') {
      const effect = createDustEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'waterSplash') {
      // Truyền groundObjects vào cho hiệu ứng để raycast
      const effect = createWaterSplashEffect(this.scene, position, { ...options, groundObjects: this.groundObjects })
      this.effects.push(effect)
      return effect
    } else if (type === 'blackSmoke') {
      const effect = createBlackSmokePuffEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'ghostSmoke') {
      const effect = createGhostSmokeEffect(this.scene, position, { ...options, groundObjects: this.groundObjects })
      this.effects.push(effect)
      return effect
    } else if (type === 'whiteMistFall') {
      const effect = createWhiteMistFallEffect(this.scene, position, { ...options, groundObjects: this.groundObjects })
      this.effects.push(effect)
      return effect
    } else if (type === 'sweat') {
      const effect = createSweatEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'blasting') {
      const effect = createBlastingEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'reverseCurrentFlow') {
      const effect = createReverseCurrentFlowEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'pipeWaterDrip') {
      const effect = createPipeWaterDripEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'particle13') {
      const effect = createShockwaveSmokeEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    } else if (type === 'underwaterBubbleTrail') {
      const effect = createUnderwaterBubbleTrailEffect(this.scene, position, options)
      this.effects.push(effect)
      return effect
    }

    return null
  }

  update(delta) {
    this.effects = this.effects.filter(e => {
      e.update(delta)
      return !e.finished
    })

    this.veinEffects.forEach((effect, owner) => {
      effect.update(delta)
      if (effect.finished || !owner || !owner.parent) {
        if (typeof effect.dispose === 'function') effect.dispose()
        this.veinEffects.delete(owner)
      }
    })

    this.itemArrowEffects.forEach((effect, owner) => {
      effect.update(delta)
      if (effect.finished || !owner || !owner.parent) {
        if (typeof effect.dispose === 'function') effect.dispose()
        this.itemArrowEffects.delete(owner)
      }
    })
  }

  setVeinState(owner, active, options = {}) {
    if (!owner) return

    const existing = this.veinEffects.get(owner)
    if (!active) {
      if (existing) {
        existing.dispose()
        this.veinEffects.delete(owner)
      }
      return
    }

    if (!existing) {
      const effect = createVeinEffect(this.scene, owner, options)
      this.veinEffects.set(owner, effect)
    }
  }

  clearVeinForOwner(owner) {
    if (!owner) return
    const existing = this.veinEffects.get(owner)
    if (!existing) return
    existing.dispose()
    this.veinEffects.delete(owner)
  }

  clearAllVeins() {
    this.veinEffects.forEach(effect => effect.dispose())
    this.veinEffects.clear()
  }

  setItemArrowState(owner, active, options = {}) {
    if (!owner) return

    const existing = this.itemArrowEffects.get(owner)
    if (!active) {
      if (existing) {
        existing.dispose()
        this.itemArrowEffects.delete(owner)
      }
      return
    }

    if (!existing) {
      const effect = createItemArrowEffect(this.scene, owner, options)
      this.itemArrowEffects.set(owner, effect)
      return
    }

    if (typeof existing.setOptions === 'function') {
      existing.setOptions(options)
    }
  }

  clearItemArrowForOwner(owner) {
    if (!owner) return
    const existing = this.itemArrowEffects.get(owner)
    if (!existing) return
    existing.dispose()
    this.itemArrowEffects.delete(owner)
  }

  clearAllItemArrows() {
    this.itemArrowEffects.forEach(effect => effect.dispose())
    this.itemArrowEffects.clear()
  }

  clearTransientEffects() {
    this.effects.forEach(effect => {
      if (typeof effect.dispose === 'function') {
        effect.dispose()
      }
    })
    this.effects = []
  }

  /**
   * Set các object mà particle có thể va chạm (sàn, bàn, etc.)
   * @param {THREE.Object3D[]} objects 
   */
  setGroundObjects(objects) {
    this.groundObjects = objects;
  }
}
