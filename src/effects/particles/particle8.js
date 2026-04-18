import * as THREE from 'three'

// Sweat drop effect configuration - mồ hôi văng khi ball mệt
export const sweatConfig = {
  count: 8,           // Số giọt mồ hôi
  size: 0.05,         // Kích thước nhỏ
  color: 0xccddff,    // Màu xanh nhạt (nước/mồ hôi)
  lifetime: 0.7,      // Tồn tại 0.7 giây
  speed: 2.5,         // Bay ra với tốc độ vừa phải
  gravity: 2.0,       // Trọng lực nhẹ (rơi chậm hơn lửa)
  spread: 0.3         // Lan rộng từ tâm
}

// returns an object that has { group, update(delta), finished }
export function createSweatEffect(scene, position, options = {}) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const geometry = new THREE.SphereGeometry(sweatConfig.size, 8, 8)
  
  const velocities = []

  for (let i = 0; i < sweatConfig.count; i++) {
    // Mỗi giọt nước cần material riêng để có thể mờ dần độc lập
    const material = new THREE.MeshBasicMaterial({
      color: sweatConfig.color,
      transparent: true,
      opacity: 1
    })

    const mesh = new THREE.Mesh(geometry, material)
    
    // Bắn ra theo hướng ngẫu nhiên, hơi hướng lên
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.5) + 0.3, // Hơi hướng lên một chút
      (Math.random() - 0.5)
    ).normalize().multiplyScalar(sweatConfig.speed * (0.6 + Math.random() * 0.7))

    velocities.push(velocity)
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return
    age += delta
    const t = age / sweatConfig.lifetime

    // Cập nhật vị trí và opacity từng giọt
    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i]
      const vel = velocities[i]

      mesh.position.addScaledVector(vel, delta)
      vel.y -= sweatConfig.gravity * delta // Trọng lực kéo xuống
      
      // Mờ dần
      mesh.material.opacity = 1 - t
    }

    if (age >= sweatConfig.lifetime) {
      scene.remove(group)
      // Dọn dẹp material để tránh rò rỉ bộ nhớ
      group.children.forEach(child => {
        child.material.dispose()
      })
      geometry.dispose()

      finished = true
    }
  }

  return { group, update, get finished() { return finished } }
}
