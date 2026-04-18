import * as THREE from 'three';

const PARTICLE_COUNT = 2;
const MAX_LIFETIME = 2.8;
const INITIAL_SPEED = 0.2;
const GRAVITY = -1.4;
const SPREAD = 0.7;

class WhiteMistFallEffect {
  constructor(scene, position, options) {
    this.scene = scene;
    this.particles = [];
    this.finished = false;
    this.groundObjects = options.groundObjects || [];
    this.raycaster = new THREE.Raycaster();
    this.downVector = new THREE.Vector3(0, -1, 0);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const baseGeometry = new THREE.SphereGeometry(0.18, 8, 8);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mesh = new THREE.Mesh(baseGeometry, material.clone());

      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * SPREAD,
        (Math.random() - 0.5) * SPREAD * 0.25,
        (Math.random() - 0.5) * SPREAD,
      ));

      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5),
        Math.random() * 0.25,
        (Math.random() - 0.5),
      ).normalize().multiplyScalar(Math.random() * INITIAL_SPEED);

      this.particles.push({
        mesh,
        velocity,
        lifetime: Math.random() * 0.7 + (MAX_LIFETIME - 0.7),
        age: 0,
        stuck: false,
      });
    }

    baseGeometry.dispose();
  }

  update(delta) {
    if (this.finished) return;

    let allFinished = true;
    let remainingParticles = 0;

    this.particles.forEach((p) => {
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

          if (intersects.length > 0 && intersects[0].distance < 0.18) {
            p.stuck = true;
            p.mesh.position.y = intersects[0].point.y + 0.015;
          }
        }
      }

      const fadeT = p.age / p.lifetime;

      if (p.stuck) {
        const spreadScale = 1.1 + fadeT * 3.0;
        p.mesh.scale.set(spreadScale, 0.045, spreadScale);
        p.mesh.material.opacity = 0.26 * (1.0 - Math.pow(fadeT, 1.5));
      } else {
        const floatScale = 1.0 + fadeT * 0.9;
        p.mesh.scale.setScalar(floatScale);
        p.mesh.material.opacity = 0.28 * (1.0 - fadeT);
      }
    });

    if (allFinished || remainingParticles === 0) {
      this.finished = true;
    }
  }
}

export function createWhiteMistFallEffect(scene, position, options) {
  return new WhiteMistFallEffect(scene, position, options);
}
