import * as THREE from 'three'

const DEFAULT_COUNT = 4
const DEFAULT_LIFETIME = 0.95
const GRAVITY = -11.5
const SPLASH_GRAVITY = -9.2

class PipeWaterDripEffect {
  constructor(scene, position, options = {}) {
    this.scene = scene
    this.finished = false
    this.particles = []
    this.splashParticles = []

    const count = options.count ?? DEFAULT_COUNT
    const targetY = options.targetY ?? (position.y - 1.0)
    const color = options.color ?? 0x7ec8ff
    this.color = color

    for (let i = 0; i < count; i++) {
      const radius = 0.017 + Math.random() * 0.016
      const geometry = new THREE.SphereGeometry(radius, 6, 6)
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.2
      ))

      this.scene.add(mesh)

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.22,
          -2.6 - Math.random() * 1.8,
          (Math.random() - 0.5) * 0.22
        ),
        targetY,
        age: 0,
        lifetime: (options.lifetime ?? DEFAULT_LIFETIME) * (0.82 + Math.random() * 0.45)
      })
    }
  }

  _spawnImpactSplash(hitPosition) {
    const splashCount = 5 + Math.floor(Math.random() * 3)

    for (let i = 0; i < splashCount; i++) {
      const radius = 0.013 + Math.random() * 0.014
      const geometry = new THREE.SphereGeometry(radius, 5, 5)
      const material = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.56,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(hitPosition).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.09,
        0.01 + Math.random() * 0.02,
        (Math.random() - 0.5) * 0.09
      ))

      this.scene.add(mesh)

      const lateral = 1.0 + Math.random() * 1.2
      const angle = Math.random() * Math.PI * 2
      const velocity = new THREE.Vector3(
        Math.cos(angle) * lateral,
        0.55 + Math.random() * 1.0,
        Math.sin(angle) * lateral
      )

      this.splashParticles.push({
        mesh,
        velocity,
        age: 0,
        lifetime: 0.2 + Math.random() * 0.16
      })
    }
  }

  update(delta) {
    if (this.finished) return

    let aliveDrips = 0
    let aliveSplashes = 0

    for (const p of this.particles) {
      p.age += delta
      if (p.age >= p.lifetime) {
        if (p.mesh.parent) this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        continue
      }

      p.velocity.y += GRAVITY * delta
      p.mesh.position.addScaledVector(p.velocity, delta)

      if (p.mesh.position.y <= p.targetY) {
        this._spawnImpactSplash(new THREE.Vector3(p.mesh.position.x, p.targetY, p.mesh.position.z))
        p.age = p.lifetime
        if (p.mesh.parent) this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        continue
      }

      aliveDrips++
      const t = p.age / p.lifetime
      p.mesh.material.opacity = Math.max(0, (1 - t) * 0.7)
      p.mesh.scale.set(1, 1.2 + t * 1.8, 1)
    }

    for (const s of this.splashParticles) {
      s.age += delta
      if (s.age >= s.lifetime) {
        if (s.mesh.parent) this.scene.remove(s.mesh)
        s.mesh.geometry.dispose()
        s.mesh.material.dispose()
        continue
      }

      aliveSplashes++
      s.velocity.y += SPLASH_GRAVITY * delta
      s.mesh.position.addScaledVector(s.velocity, delta)
      const t = s.age / s.lifetime
      s.mesh.material.opacity = Math.max(0, (1 - t) * 0.55)
      s.mesh.scale.setScalar(0.85 + t * 0.9)
    }

    if (aliveDrips === 0 && aliveSplashes === 0) {
      this.finished = true
    }
  }
}

export function createPipeWaterDripEffect(scene, position, options = {}) {
  return new PipeWaterDripEffect(scene, position, options)
}
