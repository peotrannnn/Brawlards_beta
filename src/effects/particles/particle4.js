import * as THREE from 'three';

// Config
const PARTICLE_COUNT = 40;
const MAX_LIFETIME = 3.0;
const PARTICLE_SPEED = 4;
const GRAVITY = -9.8;

class WaterSplashEffect {
    constructor(scene, position, options) {
        this.scene = scene;
        this.particles = [];
        this.finished = false;
        this.groundObjects = options.groundObjects || [];
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);

        const material = new THREE.MeshBasicMaterial({
            color: 0x000000, // Màu đen
            transparent: true,
            opacity: 0.8,
        });

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const geometry = new THREE.SphereGeometry(Math.random() * 0.04 + 0.02, 4, 4);
            const mesh = new THREE.Mesh(geometry, material.clone());
            mesh.position.copy(position);
            this.scene.add(mesh);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5),
                Math.random() * 0.7, // Văng lên trên
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(Math.random() * PARTICLE_SPEED);

            this.particles.push({
                mesh,
                velocity,
                lifetime: Math.random() * MAX_LIFETIME,
                age: 0,
                stuck: false, // Đã dính vào sàn chưa
            });
        }
    }

    update(delta) {
        if (this.finished) return;

        let allFinished = true;
        this.particles.forEach(p => {
            if (p.age >= p.lifetime) {
                if (p.mesh.parent) this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                return;
            }
            allFinished = false;
            p.age += delta;

            if (!p.stuck) {
                // Áp dụng trọng lực
                p.velocity.y += GRAVITY * delta;
                p.mesh.position.addScaledVector(p.velocity, delta);

                // Raycast xuống để tìm mặt sàn
                if (this.groundObjects.length > 0 && p.velocity.y < 0) {
                    this.raycaster.set(p.mesh.position, this.downVector);
                    const intersects = this.raycaster.intersectObjects(this.groundObjects, true);
                    
                    // Nếu va chạm với sàn trong khoảng cách gần
                    if (intersects.length > 0 && intersects[0].distance < 0.2) {
                        p.stuck = true;
                        p.mesh.position.y = intersects[0].point.y + 0.01; // Dính vào sàn
                    }
                }
            }

            const fadeT = p.age / p.lifetime;

            if (p.stuck) {
                // Khi dính vào sàn, nó sẽ loang ra và mờ dần
                p.mesh.scale.y = Math.max(0.1, 1 - fadeT); // Dẹp xuống
                p.mesh.scale.x = 1 + fadeT * 2; // Loang ra
                p.mesh.scale.z = 1 + fadeT * 2;
                p.mesh.material.opacity = 0.7 * (1.0 - fadeT);
            } else {
                // Khi đang bay, nó chỉ mờ dần
                p.mesh.material.opacity = 0.8 * (1.0 - fadeT);
            }
        });

        if (allFinished) {
            this.finished = true;
        }
    }
}

export function createWaterSplashEffect(scene, position, options) {
    return new WaterSplashEffect(scene, position, options);
}