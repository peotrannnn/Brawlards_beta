import * as THREE from 'three'

const DEFAULT_COUNT = 8
const DEFAULT_LIFETIME = 1.35

class ReverseCurrentFlowEffect {
  constructor(scene, position, options = {}) {
    this.scene = scene
    this.finished = false
    this.particles = []

    const direction = (options.direction || new THREE.Vector3(0, 0, -1)).clone().normalize()
    const spreadX = options.spreadX ?? 0.9
    const spreadY = options.spreadY ?? 0.22
    const spreadZ = options.spreadZ ?? 0.5
    const speedMin = options.speedMin ?? 4.4
    const speedMax = options.speedMax ?? 7.4
    const particleCount = options.count ?? DEFAULT_COUNT
    const baseLifetime = options.lifetime ?? DEFAULT_LIFETIME

    const material = new THREE.MeshBasicMaterial({
      color: options.color ?? 0x9fd6ff,
      transparent: true,
      opacity: 0.46,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    for (let i = 0; i < particleCount; i++) {
      const radius = 0.03 + Math.random() * 0.03
      const geometry = new THREE.SphereGeometry(radius, 6, 6)
      const mesh = new THREE.Mesh(geometry, material.clone())
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * spreadX,
        (Math.random() - 0.5) * spreadY,
        (Math.random() - 0.5) * spreadZ
      ))

      const side = new THREE.Vector3((Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.45)
      const velocity = direction.clone().multiplyScalar(speedMin + Math.random() * (speedMax - speedMin)).add(side)

      this.scene.add(mesh)
      this.particles.push({
        mesh,
        velocity,
        age: 0,
        lifetime: baseLifetime * (0.78 + Math.random() * 0.5)
      })
    }
  }

  update(delta) {
    if (this.finished) return

    let aliveCount = 0

    this.particles.forEach((p) => {
      p.age += delta
      if (p.age >= p.lifetime) {
        if (p.mesh.parent) this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        return
      }

      aliveCount++
      p.mesh.position.addScaledVector(p.velocity, delta)

      const t = p.age / p.lifetime
      const flowPulse = 0.85 + Math.sin((p.age * 13.0) + p.mesh.id) * 0.2
      p.mesh.material.opacity = Math.max(0, (1 - t) * 0.46 * flowPulse)
      p.mesh.scale.setScalar(0.9 + t * 0.95)
    })

    if (aliveCount === 0) {
      this.finished = true
    }
  }
}

export function createReverseCurrentFlowEffect(scene, position, options = {}) {
  return new ReverseCurrentFlowEffect(scene, position, options)
}
