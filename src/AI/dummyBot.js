import * as THREE from 'three'

const DUMMY_AI_CONFIG = {
  baseMaxSpeed: 1.45,
  acceleration: 5.0,
  rotationSmooth: 3.2,
  fixedTimeStep: 1 / 60,
  randomMoveIntervalMin: 0.8,
  randomMoveIntervalMax: 2.1,
  idleChance: 0.22,
  obstacleAvoidanceRange: 1.8,
  obstacleCheckInterval: 0.1,
  playerLookDistance: 28,
}

export class DummyAI {
  constructor(dummyMesh, dummyBody, scene, camera = null) {
    this.mesh = dummyMesh
    this.body = dummyBody
    this.scene = scene
    this.camera = camera

    this.baseMaxSpeed = DUMMY_AI_CONFIG.baseMaxSpeed
    this.acceleration = DUMMY_AI_CONFIG.acceleration
    this.rotationSmooth = DUMMY_AI_CONFIG.rotationSmooth
    this.fixedTimeStep = DUMMY_AI_CONFIG.fixedTimeStep

    this.bodyYaw = dummyMesh?.rotation?.y || 0
    this.randomMoveTimer = 0
    this.randomDir = new THREE.Vector3(0, 0, 1)
    this.obstacleCheckTimer = 0

    this._pickRandomDirection(true)
  }

  _pickRandomDirection(forceMove = false) {
    const shouldIdle = !forceMove && Math.random() < DUMMY_AI_CONFIG.idleChance
    if (shouldIdle) {
      this.randomDir.set(0, 0, 0)
    } else {
      const angle = Math.random() * Math.PI * 2
      this.randomDir.set(Math.sin(angle), 0, Math.cos(angle)).normalize()
    }

    const span = DUMMY_AI_CONFIG.randomMoveIntervalMax - DUMMY_AI_CONFIG.randomMoveIntervalMin
    this.randomMoveTimer = DUMMY_AI_CONFIG.randomMoveIntervalMin + Math.random() * span
  }

  _acquireNearestPlayer(syncList) {
    let nearest = null
    let minDistSq = Infinity

    for (const entry of syncList || []) {
      if (!entry?.mesh || !entry?.body) continue
      if (entry.name !== 'Player') continue
      if (entry.body === this.body) continue

      const distSq = this.mesh.position.distanceToSquared(entry.mesh.position)
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = entry
      }
    }

    return nearest
  }

  _faceTowardPosition(targetPos) {
    if (!targetPos || !this.mesh) return this.bodyYaw

    const lookDir = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    lookDir.y = 0
    if (lookDir.lengthSq() < 1e-6) return this.bodyYaw

    const desiredYaw = Math.atan2(lookDir.x, lookDir.z)
    let yawDiff = desiredYaw - this.bodyYaw
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    this.bodyYaw += yawDiff * this.rotationSmooth * this.fixedTimeStep

    return this.bodyYaw
  }

  _avoidObstaclesInPath(moveDir) {
    this.obstacleCheckTimer += this.fixedTimeStep
    if (this.obstacleCheckTimer < DUMMY_AI_CONFIG.obstacleCheckInterval) return null
    this.obstacleCheckTimer = 0

    if (!this.scene || !moveDir || moveDir.lengthSq() < 1e-6) return null

    const origin = this.mesh.position.clone()
    origin.y += 0.35

    const raycaster = new THREE.Raycaster(origin, moveDir.clone().normalize())
    if (this.camera) {
      raycaster.camera = this.camera
    }

    const allObjects = this.scene.children.filter((obj) => obj !== this.mesh && obj.name !== 'Player')
    const hit = raycaster.intersectObjects(allObjects, true)

    if (hit.length > 0 && hit[0].distance < DUMMY_AI_CONFIG.obstacleAvoidanceRange) {
      const fallbackAngles = [Math.PI * 0.5, -Math.PI * 0.5, Math.PI]
      for (const offset of fallbackAngles) {
        const dir = moveDir.clone().normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), offset)
        const testRay = new THREE.Raycaster(origin, dir)
        if (this.camera) {
          testRay.camera = this.camera
        }
        const testHit = testRay.intersectObjects(allObjects, true)
        if (testHit.length === 0 || testHit[0].distance >= DUMMY_AI_CONFIG.obstacleAvoidanceRange) {
          return dir.normalize()
        }
      }
      return moveDir.clone().negate().normalize()
    }

    return null
  }

  update(delta, syncList) {
    if (!this.mesh || !this.body) return { targetYaw: this.bodyYaw }

    this.randomMoveTimer -= delta
    if (this.randomMoveTimer <= 0) {
      this._pickRandomDirection()
    }

    let moveDir = this.randomDir.clone()
    if (moveDir.lengthSq() > 1e-6) {
      const obstacleDir = this._avoidObstaclesInPath(moveDir)
      if (obstacleDir) {
        moveDir.copy(obstacleDir)
        this.randomDir.copy(obstacleDir)
      }
    }

    if (moveDir.lengthSq() > 1e-6) {
      moveDir.normalize()
      const targetVelX = moveDir.x * this.baseMaxSpeed
      const targetVelZ = moveDir.z * this.baseMaxSpeed
      this.body.velocity.x += (targetVelX - this.body.velocity.x) * this.acceleration * this.fixedTimeStep
      this.body.velocity.z += (targetVelZ - this.body.velocity.z) * this.acceleration * this.fixedTimeStep
    } else {
      this.body.velocity.x *= 0.84
      this.body.velocity.z *= 0.84
    }

    const nearestPlayer = this._acquireNearestPlayer(syncList)
    let targetYaw = this.bodyYaw

    if (moveDir.lengthSq() > 1e-6) {
      // While moving, Dummy faces its travel direction.
      targetYaw = this._faceTowardPosition(this.mesh.position.clone().add(moveDir))
    } else if (nearestPlayer?.mesh && this.mesh.position.distanceToSquared(nearestPlayer.mesh.position) <= DUMMY_AI_CONFIG.playerLookDistance * DUMMY_AI_CONFIG.playerLookDistance) {
      // When idle, Dummy occasionally stands and looks at the nearest player.
      targetYaw = this._faceTowardPosition(nearestPlayer.mesh.position)
    }

    return { targetYaw }
  }
}
