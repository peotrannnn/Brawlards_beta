import * as THREE from 'three'

// Blasting effect configuration - khi cue va chạm ball 8 (nhưng không fatigue)
// Hiệu ứng này mạnh hơn spark, với hạt lớn hơn bay nhanh hơn
export const blastingConfig = {
  count: 16,          // Số lượng hạt nhiều hơn spark
  size: 0.12,         // Kích thước lớn hơn spark (0.08 -> 0.12)
  color: 0xff6600,    // Màu cam nổi (hơi đỏ hơn spark)
  lifetime: 0.5,      // Tồn tại lâu hơn spark (0.4 -> 0.5)
  speed: 5.5,         // Bay nhanh hơn spark (4.0 -> 5.5)
  gravity: 6.0,       // Rơi chậm hơn spark (8.0 -> 6.0)
  spread: 0.4         // Lan rộng hơn
}

// returns an object that has { group, update(delta), finished }
export function createBlastingEffect(scene, position, options = {}) {
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const { color1, color2 } = options
  const useMixedColors = color1 && color2

  // Dùng BoxGeometry cho hạt blasting
  const geometry = new THREE.BoxGeometry(blastingConfig.size, blastingConfig.size, blastingConfig.size)

  const velocities = []

  for (let i = 0; i < blastingConfig.count; i++) {
    let particleColor
    if (useMixedColors) {
      // Trộn lẫn 2 màu
      particleColor = Math.random() < 0.5 ? color1 : color2
    } else {
      // Dùng màu mặc định blasting
      particleColor = blastingConfig.color
    }

    // Mỗi hạt cần material riêng để có thể mờ dần độc lập
    const material = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 1
    })

    const mesh = new THREE.Mesh(geometry, material)
    
    // Bắn ra theo hướng ngẫu nhiên - mạnh hơn spark
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.5) + 0.6, // Hơi hướng lên trên một chút, hơn spark
      (Math.random() - 0.5)
    ).normalize().multiplyScalar(blastingConfig.speed * (0.6 + Math.random() * 0.7))

    velocities.push(velocity)
    group.add(mesh)
  }

  let age = 0
  let finished = false

  function update(delta) {
    if (finished) return
    age += delta
    const t = age / blastingConfig.lifetime

    // Cập nhật vị trí và opacity từng hạt
    for (let i = 0; i < group.children.length; i++) {
      const mesh = group.children[i]
      const vel = velocities[i]

      mesh.position.addScaledVector(vel, delta)
      vel.y -= blastingConfig.gravity * delta // Trọng lực kéo xuống
      
      // Xoay hạt cho sinh động
      mesh.rotation.x += delta * 12
      mesh.rotation.z += delta * 12
      
      // Mờ dần
      mesh.material.opacity = 1 - t
    }

    if (age >= blastingConfig.lifetime) {
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
