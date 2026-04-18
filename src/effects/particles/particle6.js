import * as THREE from 'three';

// Config
const PARTICLE_COUNT = 1; // Tăng số lượng hạt cho hiệu ứng dày hơn
const MAX_LIFETIME = 3;
const INITIAL_SPEED = 0.3; // Tốc độ văng ra ban đầu
const GRAVITY = -2.0;      // Trọng lực nhẹ để khói từ từ rơi xuống
const SPREAD = 1;        // Độ phân tán ban đầu

class GhostSmokeEffect {
    constructor(scene, position, options) {
        this.scene = scene;
        this.particles = [];
        this.finished = false;
        this.groundObjects = options.groundObjects || [];
        this.raycaster = new THREE.Raycaster();
        this.downVector = new THREE.Vector3(0, -1, 0);

        // Material chung cho các hạt khói
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
        });

        const baseGeometry = new THREE.SphereGeometry(0.15, 8, 8); // Làm cho hạt khói to hơn

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Mỗi hạt cần material riêng để có opacity độc lập
            const mesh = new THREE.Mesh(baseGeometry, material.clone());
            
            mesh.position.copy(position).add(new THREE.Vector3(
                (Math.random() - 0.5) * SPREAD,
                (Math.random() - 0.5) * SPREAD * 0.5,
                (Math.random() - 0.5) * SPREAD
            ));
            
            this.scene.add(mesh);

            // Vận tốc ban đầu: văng ra xung quanh, hơi hướng lên
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5),
                Math.random() * 0.4,
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(Math.random() * INITIAL_SPEED);

            this.particles.push({
                mesh,
                velocity,
                lifetime: Math.random() * 1.0 + (MAX_LIFETIME - 1.0),
                age: 0,
                stuck: false,
            });
        }

        // Dọn dẹp geometry gốc sau khi đã dùng để tạo mesh
        baseGeometry.dispose();
    }

    update(delta) {
        if (this.finished) return;

        let allFinished = true;
        let remainingParticles = 0;
        this.particles.forEach(p => {
            if (p.age >= p.lifetime) {
                if (p.mesh.parent) {
                    this.scene.remove(p.mesh);
                    p.mesh.material.dispose();
                }
                return;
            }
            allFinished = false;
            remainingParticles++;
            p.age += delta;

            if (!p.stuck) {
                p.velocity.y += GRAVITY * delta;
                p.mesh.position.addScaledVector(p.velocity, delta);

                if (this.groundObjects.length > 0 && p.velocity.y < 0) {
                    this.raycaster.set(p.mesh.position, this.downVector);
                    const intersects = this.raycaster.intersectObjects(this.groundObjects, true);
                    
                    if (intersects.length > 0 && intersects[0].distance < 0.2) {
                        p.stuck = true;
                        p.mesh.position.y = intersects[0].point.y + 0.01;
                    }
                }
            }

            const fadeT = p.age / p.lifetime;

            if (p.stuck) {
                // Vệt loang: dẹp xuống, lan rộng ra
                const spreadScale = 1.0 + fadeT * 3.5; // Làm cho vệt loang to hơn
                p.mesh.scale.set(spreadScale, 0.05, spreadScale);
                
                // Mờ dần
                p.mesh.material.opacity = 0.9 * (1.0 - Math.pow(fadeT, 2)); 
            } else {
                // Khi đang rơi: chỉ mờ dần
                p.mesh.material.opacity = 0.8 * (1.0 - fadeT);
            }
        });

        if (allFinished || remainingParticles === 0) {
            this.finished = true;
        }
    }
}

export function createGhostSmokeEffect(scene, position, options) {
    return new GhostSmokeEffect(scene, position, options);
}