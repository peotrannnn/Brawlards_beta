import * as THREE from 'three'

// Dust effect configuration
export const dustConfig = {
  count: 8,           // Số lượng hạt mỗi lần spawn (ít thôi để tránh lag khi lăn liên tục)
  size: 0.1,         // Kích thước hạt to hơn
  lifetime: 0.6,      // Tồn tại ngắn
  speed: 0.3,         // Bay lên chậm
  spread: 0.1         // Độ tản ra
}

// returns an object that has { group, update(delta), finished }
export function createDustEffect(scene, position, options = {}) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  // Màu mặc định là màu xanh của bàn nếu không được cung cấp
  const color = options.color || 0x0c6b34 

  // Dùng BoxGeometry hoặc PlaneGeometry nhỏ cho nhẹ
  const geometry = new THREE.BoxGeometry(dustConfig.size, dustConfig.size, dustConfig.size)
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.6 // Bụi hơi mờ
  })
  const particleMaterials = []

  const velocities = []

  for (let i = 0; i < dustConfig.count; i++) {
    const mat = material.clone()
    particleMaterials.push(mat)
    const mesh = new THREE.Mesh(geometry, mat) // Clone material
    
    // Vị trí ngẫu nhiên xung quanh điểm tiếp xúc
    mesh.position.set(
      (Math.random() - 0.5) * dustConfig.spread,
      (Math.random() * 0.1), // Hơi nhích lên trên mặt bàn
      (Math.random() - 0.5) * dustConfig.spread
    )

    // Bay nhẹ lên trên và tản ra
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 1.0, // Luôn bay lên
      (Math.random() - 0.5) * 0.5
    ).normalize().multiplyScalar(dustConfig.speed * (0.5 + Math.random() * 0.5))

    velocities.push(velocity)
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return
    age += delta
    const t = age / dustConfig.lifetime

    // Cập nhật vị trí từng hạt
    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i]
      const vel = velocities[i]

      mesh.position.addScaledVector(vel, delta)
      
      // Xoay nhẹ
      mesh.rotation.x += delta * 2
      mesh.rotation.z += delta * 2
      
      // Mờ dần và nhỏ đi
      mesh.material.opacity = 0.8 * (1 - t) // đậm hơn
      const scale = 1 - (t * 0.5)
      mesh.scale.setScalar(scale)
    }

    if (age >= dustConfig.lifetime) {
      scene.remove(group)
      // Dọn dẹp
      particleMaterials.forEach(mat => mat.dispose())
      geometry.dispose()
      material.dispose()
      finished = true
    }
  }

  return { group, update, get finished() { return finished } }
}