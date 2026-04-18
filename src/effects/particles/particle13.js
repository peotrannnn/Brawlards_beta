import * as THREE from 'three'

const shockwaveSmokeConfig = {
  count: 30,
  lifetime: 0.65,
  baseRadius: 0.05,
  maxRadius: 1.5,
  riseHeight: 0.35,
  color: 0xc4c4c4,
  particleSize: 0.08
}

// Shockwave-like smoke ring that expands along the ground after a heavy landing.
export function createShockwaveSmokeEffect(scene, position, options = {}) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const color = options.color ?? shockwaveSmokeConfig.color
  const lifetime = options.lifetime ?? shockwaveSmokeConfig.lifetime
  const maxRadius = options.maxRadius ?? shockwaveSmokeConfig.maxRadius

  const geometry = new THREE.SphereGeometry(options.particleSize ?? shockwaveSmokeConfig.particleSize, 8, 8)
  const particles = []

  for (let i = 0; i < shockwaveSmokeConfig.count; i++) {
    const angle = (i / shockwaveSmokeConfig.count) * Math.PI * 2
    const radialBias = 0.85 + Math.random() * 0.3

    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      Math.cos(angle) * shockwaveSmokeConfig.baseRadius,
      Math.random() * 0.03,
      Math.sin(angle) * shockwaveSmokeConfig.baseRadius
    )

    particles.push({ mesh, angle, radialBias })
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return

    age += delta
    const t = Math.min(1, age / lifetime)
    const radius = THREE.MathUtils.lerp(shockwaveSmokeConfig.baseRadius, maxRadius, t)

    for (const p of particles) {
      const r = radius * p.radialBias
      p.mesh.position.x = Math.cos(p.angle) * r
      p.mesh.position.z = Math.sin(p.angle) * r
      p.mesh.position.y = shockwaveSmokeConfig.riseHeight * t

      const s = 0.75 + t * 1.35
      p.mesh.scale.setScalar(s)
      p.mesh.material.opacity = (1 - t) * 0.78
    }

    if (t >= 1) {
      scene.remove(group)
      for (const p of particles) {
        p.mesh.material.dispose()
      }
      geometry.dispose()
      finished = true
    }
  }

  return { group, update, get finished() { return finished } }
}
