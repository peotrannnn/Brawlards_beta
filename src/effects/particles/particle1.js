import * as THREE from 'three'

// simple smoke effect configuration
export const smokeConfig = {
  count: 20,          // number of particles
  size: 0.1,          // sphere radius
  color: 0x888888,    // smoke color
  lifetime: 1.5,      // seconds until fade out
  speed: 0.3,         // upward drift speed
  spread: 0.4         // horizontal spread radius
}

// returns an object that has { group, update(delta), finished }
export function createSmokeEffect(scene, position) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const baseGeom = new THREE.SphereGeometry(smokeConfig.size, 8, 8)
  const baseMat = new THREE.MeshBasicMaterial({ // Change to MeshBasicMaterial
    color: smokeConfig.color,
    transparent: true,
    opacity: 1
  })
  const particleMaterials = []

  for (let i = 0; i < smokeConfig.count; i++) {
    // Clone material để mỗi particle có thể có opacity riêng
    const mat = baseMat.clone()
    particleMaterials.push(mat)
    const mesh = new THREE.Mesh(baseGeom, mat)
    mesh.position.set(
      (Math.random() - 0.5) * smokeConfig.spread,
      (Math.random() - 0.5) * smokeConfig.spread,
      (Math.random() - 0.5) * smokeConfig.spread
    )
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return
    age += delta
    const t = age / smokeConfig.lifetime
    group.children.forEach(m => {
      m.material.opacity = Math.max(0, 1 - t)
    })
    group.position.y += smokeConfig.speed * delta
    if (age >= smokeConfig.lifetime) {
      scene.remove(group)

      // Dọn dẹp tài nguyên dùng chung
      particleMaterials.forEach(mat => mat.dispose())
      baseGeom.dispose()
      baseMat.dispose()
      finished = true
    }
  }

  return { group, update, get finished() { return finished } }
}
