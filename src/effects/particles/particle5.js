import * as THREE from 'three';

// Tối ưu: Load texture một lần duy nhất và tái sử dụng
const textureLoader = new THREE.TextureLoader();
// Using white pixel texture instead of loading external file
let smokeTexture = new THREE.Texture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
smokeTexture.needsUpdate = true;

// Config
const PARTICLE_COUNT = 6;
const MAX_LIFETIME = 15;
const PARTICLE_SPEED = 1;

class BlackSmokePuffEffect {
    constructor(scene, position, options) {
        this.scene = scene;
        this.particles = [];
        this.finished = false;

        // Texture cho khói. Nếu không có file, nó sẽ là các ô vuông đen.

        const material = new THREE.SpriteMaterial({
            map: smokeTexture,
            color: 0x111111, // Màu khói đen/xám đậm
            transparent: true,
            blending: THREE.NormalBlending, // Normal blending cho khói đen
            depthWrite: false,
        });

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const sprite = new THREE.Sprite(material.clone());
            
            // Vị trí ban đầu có chút ngẫu nhiên
            const spawnOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            sprite.position.copy(position).add(spawnOffset);
            
            const scale = Math.random() * 1.0 + 0.5;
            sprite.scale.set(scale, scale, scale);

            this.scene.add(sprite);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.8, // Bay lên trên
                (Math.random() - 0.5) * 0.5
            ).normalize().multiplyScalar(Math.random() * PARTICLE_SPEED);

            this.particles.push({
                sprite,
                velocity,
                lifetime: Math.random() * MAX_LIFETIME + 1.0, // Tồn tại lâu hơn một chút
                age: 0,
                initialScale: scale,
            });
        }
    }

    update(delta) {
        if (this.finished) return;

        let allFinished = true;
        this.particles.forEach(p => {
            if (p.age >= p.lifetime) {
                if (p.sprite.parent) this.scene.remove(p.sprite);
                // Không dispose map vì nó được chia sẻ
                p.sprite.material.dispose();
                return;
            }
            allFinished = false;
            p.age += delta;

            // Di chuyển particle
            p.sprite.position.addScaledVector(p.velocity, delta);

            // Animation
            const t = p.age / p.lifetime; // Tiến trình từ 0 đến 1
            
            // Mờ dần theo thời gian, đặc biệt là ở cuối đời
            p.sprite.material.opacity = Math.sin((1.0 - t) * Math.PI);

            // To dần ra
            const currentScale = p.initialScale + t * 2.0;
            p.sprite.scale.set(currentScale, currentScale, currentScale);
        });

        if (allFinished) {
            this.finished = true;
        }
    }
}

export function createBlackSmokePuffEffect(scene, position, options) {
    return new BlackSmokePuffEffect(scene, position, options);
}