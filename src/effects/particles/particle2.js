import * as THREE from 'three'

// Spark effect configuration
export const sparkConfig = {
  count: 12,          // Số lượng tia lửa
  size: 0.08,         // Kích thước hạt
  color: 0xffaa00,    // Màu vàng cam rực rỡ
  lifetime: 0.4,      // Tồn tại rất ngắn
  speed: 4.0,         // Bay nhanh
  gravity: 8.0        // Rơi xuống nhanh
}

// returns an object that has { group, update(delta), finished }
export function createSparkEffect(scene, position, options = {}) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const { color1, color2 } = options
  const useMixedColors = color1 && color2

  // Dùng BoxGeometry nhỏ cho tia lửa để nhẹ hơn Sphere
  const geometry = new THREE.BoxGeometry(sparkConfig.size, sparkConfig.size, sparkConfig.size)

  const velocities = []

  for (let i = 0; i < sparkConfig.count; i++) {
    let particleColor
    if (useMixedColors) {
      // Trộn lẫn 2 màu
      particleColor = Math.random() < 0.5 ? color1 : color2
    } else {
      // Dùng màu mặc định
      particleColor = sparkConfig.color
    }

    // Mỗi hạt cần material riêng để có thể mờ đi độc lập
    const material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 1
    })

    const mesh = new THREE.Mesh(geometry, material)
    
    // Bắn ra theo hướng ngẫu nhiên
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.5) + 0.5, // Hơi hướng lên trên một chút
      (Math.random() - 0.5)
    ).normalize().multiplyScalar(sparkConfig.speed * (0.5 + Math.random() * 0.5))

    velocities.push(velocity)
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return
    age += delta
    const t = age / sparkConfig.lifetime

    // Cập nhật vị trí và opacity từng hạt
    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i]
      const vel = velocities[i]

      mesh.position.addScaledVector(vel, delta)
      vel.y -= sparkConfig.gravity * delta // Trọng lực kéo xuống
      
      // Xoay hạt cho sinh động
      mesh.rotation.x += delta * 10
      mesh.rotation.z += delta * 10
      
      // Mờ dần
      mesh.material.opacity = 1 - t
    }

    if (age >= sparkConfig.lifetime) {
      scene.remove(group)
      // Dọn dẹp material và geometry để tránh rò rỉ bộ nhớ
      group.children.forEach(child => {
        child.material.dispose()
      })
      geometry.dispose()

      finished = true
    }
  }

  return { group, update, get finished() { return finished } }
}