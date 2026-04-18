import * as THREE from 'three'

const DEFAULT_COUNT = 3
const DEFAULT_LIFETIME = 0.62

class UnderwaterBubbleTrailEffect {
  constructor(scene, position, options = {}) {
    this.scene = scene
    this.finished = false
    this.particles = []

    const speed = Math.max(0, options.speed ?? 0)
    const particleCount = options.count ?? DEFAULT_COUNT
    const baseLifetime = options.lifetime ?? DEFAULT_LIFETIME
    const color = options.color ?? 0xcceeff
    const spread = options.spread ?? 0.18

    const direction = new THREE.Vector3(
      options.direction?.x ?? options.direction?.[0] ?? 0,
      options.direction?.y ?? options.direction?.[1] ?? 0,
      options.direction?.z ?? options.direction?.[2] ?? 0
    )
    if (direction.lengthSq() > 0.0001) {
      direction.normalize()
    }

    const inheritedVelocity = new THREE.Vector3(
      options.inheritVelocity?.x ?? 0,
      options.inheritVelocity?.y ?? 0,
      options.inheritVelocity?.z ?? 0
    )

    for (let i = 0; i < particleCount; i++) {
      const radius = 0.012 + Math.random() * 0.022
      const geometry = new THREE.SphereGeometry(radius, 7, 7)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * (spread * 0.55),
        (Math.random() - 0.5) * spread
      ))
      this.scene.add(mesh)

      const backwardVelocity = direction.clone().multiplyScalar(-(0.24 + speed * 0.1))
      const randomDrift = new THREE.Vector3(
        (Math.random() - 0.5) * 0.46,
        0.3 + Math.random() * 0.62,
        (Math.random() - 0.5) * 0.46
      )

      this.particles.push({
        mesh,
        velocity: inheritedVelocity.clone().multiplyScalar(0.13).add(backwardVelocity).add(randomDrift),
        age: 0,
        lifetime: baseLifetime * (0.72 + Math.random() * 0.48)
      })
    }
  }

  update(delta) {
    if (this.finished) return

    let aliveCount = 0

    for (const particle of this.particles) {
      particle.age += delta
      if (particle.age >= particle.lifetime) {
        if (particle.mesh.parent) this.scene.remove(particle.mesh)
        particle.mesh.geometry.dispose()
        particle.mesh.material.dispose()
        continue
      }

      aliveCount++

      particle.velocity.y += 2.15 * delta
      particle.velocity.multiplyScalar(Math.max(0, 1 - delta * 1.1))
      particle.mesh.position.addScaledVector(particle.velocity, delta)

      const t = particle.age / particle.lifetime
      particle.mesh.material.opacity = Math.max(0, (1 - t) * 0.56)
      particle.mesh.scale.setScalar(0.86 + t * 0.95)
    }

    if (aliveCount === 0) {
      this.finished = true
    }
  }
}

export function createUnderwaterBubbleTrailEffect(scene, position, options = {}) {
  return new UnderwaterBubbleTrailEffect(scene, position, options)
}
