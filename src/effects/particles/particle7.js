import * as THREE from 'three';

// Impact ring effect - hình tròn phát ra từ tâm va chạm (shock wave nhỏ)
const PARTICLE_CONFIG = {
  ringRadius: 0.0005,        // Bé tí ti
  ringThickness: 0.008,    // Mỏng
  lifetime: 0.3,
  expandSpeed: 3.0,        // Mở rộng từ từ hơn
  initialOpacity: 0.7
};

class ImpactRingEffect {
  constructor(scene, position, options = {}) {
    this.scene = scene;
    this.finished = false;
    this.paused = false;
    this.age = 0;
    this.lifetime = options.lifetime || PARTICLE_CONFIG.lifetime;
    
    // Lấy cấu hình từ options hoặc dùng mặc định
    const config = { ...PARTICLE_CONFIG, ...options };

    // Tạo ring geometry
    const ringGeometry = new THREE.TorusGeometry(
      config.ringRadius,
      config.ringThickness,
      12,      // radial segments (giảm để lag ít)
      32       // tube segments
    );

    // Material phát sáng theo hướng impact
    const ringMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,  // Màu xanh nhạt
      emissive: 0x44aaff,
      emissiveIntensity: 1.2,
      metalness: 0.2,
      roughness: 0.3,
      transparent: true,
      opacity: config.initialOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Tạo mesh ring
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.position.copy(position);
    
    // ✨ Orient ring based on impact normal (perpendicular to impact direction)
    if (options.impactNormal) {
      const normal = options.impactNormal.clone().normalize();
      const defaultNormal = new THREE.Vector3(0, 0, 1);
      
      // Create quaternion to rotate from default (0,0,1) to impact normal
      this.ring.quaternion.setFromUnitVectors(defaultNormal, normal);
    } else {
      // Fallback: hơi xiên
      this.ring.rotation.x = Math.PI * 0.3;
    }
    
    this.scene.add(this.ring);

    // Lưu config
    this.config = config;
    this.initialRadius = config.ringRadius;
  }

  update(delta) {
    if (this.finished || this.paused) return;

    this.age += delta;
    const t = this.age / this.lifetime;

    if (t >= 1.0) {
      this.scene.remove(this.ring);
      this.ring.material.dispose();
      this.ring.geometry.dispose();
      this.finished = true;
      return;
    }

    // Radius mở rộng từ từ theo thời gian
    const expandedRadius = this.initialRadius + t * this.config.expandSpeed;
    
    // Update geometry - recreate torus with new radius
    const newGeometry = new THREE.TorusGeometry(
      expandedRadius,
      this.config.ringThickness,
      12,
      32
    );
    
    // Dispose old geometry
    this.ring.geometry.dispose();
    this.ring.geometry = newGeometry;

    // Opacity giảm dần (fade out nhanh)
    const fadeOut = Math.max(0, 1.0 - t * 1.5);
    this.ring.material.opacity = this.config.initialOpacity * fadeOut;
    this.ring.material.emissiveIntensity = 1.2 * fadeOut;
  }

  pause() {
    if (this.finished) return;
    this.paused = true;
  }
}

export function createImpactRingEffect(scene, position, options = {}) {
  return new ImpactRingEffect(scene, position, options);
}
