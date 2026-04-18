import * as THREE from 'three'

const BOWLING_AI_CONFIG = {
  baseMaxSpeed: 0.9,          // Slow movement speed
  acceleration: 4.0,
  rotationSmooth: 2.2,
  fixedTimeStep: 1 / 60,
  airControlMultiplier: 0.45,
  maxHorizontalSpeedGround: 1.4,
  maxHorizontalSpeedAir: 1.0,
  maxHorizontalSpeedAirPounce: 2.3,
  maxAngularSpeedGround: 6.0,
  maxAngularSpeedAir: 4.0,
  angularBrakeGround: 0.92,
  minJumpCooldown: 10.0,      // seconds
  maxJumpCooldown: 20.0,      // seconds
  jumpPower: 8,             // stronger random jump
  pounceTriggerDistance: 3.0,
  pounceMinCooldown: 2.0,
  pounceMaxCooldown: 4.0,
  pounceUpPower: 4.2,
  pounceForwardPower: 2.2,
  pounceAirBoost: 3.8,
  pounceAirBoostDistance: 4.0,
  landingShockwaveMinFallSpeed: 1.1,
  landingShockwaveCooldown: 0.12
}

export class BowlingAI {
  constructor(bowlingMesh, bowlingBody) {
    this.mesh = bowlingMesh
    this.body = bowlingBody

    this.baseMaxSpeed = BOWLING_AI_CONFIG.baseMaxSpeed
    this.acceleration = BOWLING_AI_CONFIG.acceleration
    this.rotationSmooth = BOWLING_AI_CONFIG.rotationSmooth
    this.fixedTimeStep = BOWLING_AI_CONFIG.fixedTimeStep
    this.airControlMultiplier = BOWLING_AI_CONFIG.airControlMultiplier
    this.maxHorizontalSpeedGround = BOWLING_AI_CONFIG.maxHorizontalSpeedGround
    this.maxHorizontalSpeedAir = BOWLING_AI_CONFIG.maxHorizontalSpeedAir
    this.maxHorizontalSpeedAirPounce = BOWLING_AI_CONFIG.maxHorizontalSpeedAirPounce
    this.maxAngularSpeedGround = BOWLING_AI_CONFIG.maxAngularSpeedGround
    this.maxAngularSpeedAir = BOWLING_AI_CONFIG.maxAngularSpeedAir
    this.angularBrakeGround = BOWLING_AI_CONFIG.angularBrakeGround

    this.bodyYaw = 0

    this.jumpPower = BOWLING_AI_CONFIG.jumpPower
    this.jumpCooldown = this._randomJumpCooldown()
    this.pounceCooldown = this._randomPounceCooldown()
    this.isGrounded = true
    this.justJumped = false
    this.isPounceActive = false
    this.pounceTargetEntry = null
    this.pendingLandingShockwave = null
    this.isAngry = false
    this.airborneForLanding = false
    this.lastVerticalSpeed = 0
    this.lastLandingShockwaveTime = -Infinity

    this.touchPadding = 0.08

    this._configureStablePhysics()

    this._onBodyCollide = () => {
      const now = performance.now() / 1000
      if (now - this.lastLandingShockwaveTime < BOWLING_AI_CONFIG.landingShockwaveCooldown) {
        return
      }

      const minFallSpeed = BOWLING_AI_CONFIG.landingShockwaveMinFallSpeed
      const descendingFast = this.body.velocity.y < -minFallSpeed || this.lastVerticalSpeed < -minFallSpeed
      if (!this.airborneForLanding || !descendingFast) return

      const r = this._bodyRadius(this.body)
      this.pendingLandingShockwave = new THREE.Vector3(
        this.body.position.x,
        this.body.position.y - r + 0.05,
        this.body.position.z
      )

      this.lastLandingShockwaveTime = now
      this.airborneForLanding = false
      this.isPounceActive = false
      this.pounceTargetEntry = null
    }

    if (typeof this.body.addEventListener === 'function') {
      this.body.addEventListener('collide', this._onBodyCollide)
    }
  }

  dispose() {
    if (typeof this.body?.removeEventListener === 'function' && this._onBodyCollide) {
      this.body.removeEventListener('collide', this._onBodyCollide)
    }
  }

  consumeLandingShockwave() {
    const shockwavePos = this.pendingLandingShockwave
    this.pendingLandingShockwave = null
    return shockwavePos
  }

  getAngryState() {
    return this.isAngry
  }

  _configureStablePhysics() {
    // Allow rolling, but keep it bounded to avoid unstable burst movement.
    this.body.fixedRotation = false
    if (typeof this.body.updateMassProperties === 'function') {
      this.body.updateMassProperties()
    }

    this.body.angularDamping = Math.max(this.body.angularDamping || 0, 0.75)
    this.body.linearDamping = Math.max(this.body.linearDamping || 0, 0.14)
  }

  _stabilizeMotion() {
    if (this.body.angularVelocity) {
      const av = this.body.angularVelocity
      const angSpeed = Math.hypot(av.x, av.y, av.z)
      const maxAngularSpeed = this.isGrounded ? this.maxAngularSpeedGround : this.maxAngularSpeedAir

      if (angSpeed > maxAngularSpeed && angSpeed > 0.0001) {
        const scale = maxAngularSpeed / angSpeed
        av.x *= scale
        av.y *= scale
        av.z *= scale
      }

      if (this.isGrounded) {
        av.x *= this.angularBrakeGround
        av.y *= this.angularBrakeGround
        av.z *= this.angularBrakeGround
      }
    }

    const vx = this.body.velocity.x
    const vz = this.body.velocity.z
    const horizontalSpeed = Math.hypot(vx, vz)
    const maxSpeed = this.isGrounded
      ? this.maxHorizontalSpeedGround
      : (this.isPounceActive ? this.maxHorizontalSpeedAirPounce : this.maxHorizontalSpeedAir)

    if (horizontalSpeed > maxSpeed && horizontalSpeed > 0.0001) {
      const scale = maxSpeed / horizontalSpeed
      this.body.velocity.x *= scale
      this.body.velocity.z *= scale
    }
  }

  _randomJumpCooldown() {
    const { minJumpCooldown, maxJumpCooldown } = BOWLING_AI_CONFIG
    return minJumpCooldown + Math.random() * (maxJumpCooldown - minJumpCooldown)
  }

  _randomPounceCooldown() {
    const { pounceMinCooldown, pounceMaxCooldown } = BOWLING_AI_CONFIG
    return pounceMinCooldown + Math.random() * (pounceMaxCooldown - pounceMinCooldown)
  }

  _isDynamicTarget(entry) {
    if (!entry || entry.type !== 'dynamic') return false
    if (!entry.mesh || !entry.body) return false
    if (entry === this.selfEntry) return false
    if (entry.body === this.body) return false
    return true
  }

  _findNearestTarget(syncList, selfEntry) {
    this.selfEntry = selfEntry

    let nearest = null
    let minDistance = Infinity

    for (const entry of syncList) {
      if (!this._isDynamicTarget(entry)) continue
      const dist = this.mesh.position.distanceTo(entry.mesh.position)
      if (dist < minDistance) {
        minDistance = dist
        nearest = entry
      }
    }

    return { target: nearest, distance: minDistance }
  }

  _bodyRadius(body) {
    const shape = body?.shapes?.[0]
    if (shape && typeof shape.radius === 'number') return shape.radius
    return 0.25
  }

  _checkTouchTarget(targetEntry) {
    if (!targetEntry?.body) return false

    const myPos = this.body.position
    const targetPos = targetEntry.body.position
    const dx = myPos.x - targetPos.x
    const dy = myPos.y - targetPos.y
    const dz = myPos.z - targetPos.z

    const horizontalDistSq = dx * dx + dz * dz
    const touchDist = this._bodyRadius(this.body) + this._bodyRadius(targetEntry.body) + this.touchPadding
    const verticalTolerance = Math.max(0.9, touchDist * 1.5)

    return horizontalDistSq <= touchDist * touchDist && Math.abs(dy) <= verticalTolerance
  }

  _launchJump(verticalSpeed, forwardDir = null, forwardSpeed = 0) {
    // Use deterministic launch velocity so jump apex is consistent each time.
    this.body.velocity.y = verticalSpeed

    if (forwardDir && forwardSpeed > 0) {
      this.body.velocity.x = forwardDir.x * forwardSpeed
      this.body.velocity.z = forwardDir.z * forwardSpeed
    }

    this.justJumped = true
    this._stabilizeMotion()
  }

  _updateJump(delta, targetEntry, targetDistance) {
    const vy = this.body.velocity.y

    if (vy < -0.1) {
      this.justJumped = false
    }

    this.isGrounded = Math.abs(vy) < 0.1 && !this.justJumped
    this.jumpCooldown -= delta
    this.pounceCooldown -= delta

    const canPounce = this.isGrounded &&
      !!targetEntry &&
      Number.isFinite(targetDistance) &&
      targetDistance <= BOWLING_AI_CONFIG.pounceTriggerDistance &&
      this.pounceCooldown <= 0

    if (canPounce) {
      const pounceDir = new THREE.Vector3()
        .subVectors(targetEntry.mesh.position, this.mesh.position)
      pounceDir.y = 0

      if (pounceDir.lengthSq() > 0.0001) {
        pounceDir.normalize()
      } else {
        pounceDir.set(0, 0, 1)
      }

      const pounceVerticalSpeed = Math.max(this.jumpPower, BOWLING_AI_CONFIG.pounceUpPower)
      this._launchJump(pounceVerticalSpeed, pounceDir, BOWLING_AI_CONFIG.pounceForwardPower)
      this.isPounceActive = true
      this.pounceTargetEntry = targetEntry
      this.pounceCooldown = this._randomPounceCooldown()
      this.jumpCooldown = this._randomJumpCooldown()
      return
    }

    if (this.jumpCooldown <= 0 && this.isGrounded) {
      this._launchJump(this.jumpPower)
      this.isPounceActive = false
      this.pounceTargetEntry = null
      this.jumpCooldown = this._randomJumpCooldown()
      this.pounceCooldown = Math.max(this.pounceCooldown, 0.7)
    }
  }

  _applyPounceAirBoost(delta) {
    if (!this.isPounceActive || this.isGrounded) return

    const target = this.pounceTargetEntry
    if (!target?.mesh) return

    const toTarget = new THREE.Vector3().subVectors(target.mesh.position, this.mesh.position)
    toTarget.y = 0

    const dist = toTarget.length()
    if (dist < 0.001) return

    toTarget.normalize()

    const distFactor = Math.min(1, dist / BOWLING_AI_CONFIG.pounceAirBoostDistance)
    const boost = BOWLING_AI_CONFIG.pounceAirBoost * (0.35 + distFactor * 0.65)

    this.body.velocity.x += toTarget.x * boost * delta
    this.body.velocity.z += toTarget.z * boost * delta
  }

  update(delta, syncList, selfEntry) {
    this.lastVerticalSpeed = this.body.velocity.y

    const { target, distance } = this._findNearestTarget(syncList, selfEntry)
    this.isAngry = !!target
    this._updateJump(delta, target, distance)
    this._applyPounceAirBoost(delta)

    this.airborneForLanding = !this.isGrounded || this.body.velocity.y < -0.25

    if (!target) {
      return { targetYaw: this.bodyYaw, touchedTarget: null }
    }

    // Destroy any dynamic target once touched
    if (this._checkTouchTarget(target)) {
      return { targetYaw: this.bodyYaw, touchedTarget: target }
    }

    const moveDir = new THREE.Vector3()
      .subVectors(target.mesh.position, this.mesh.position)
      .normalize()

    const targetYaw = Math.atan2(moveDir.x, moveDir.z)
    let yawDiff = targetYaw - this.bodyYaw
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2

    this.bodyYaw += yawDiff * this.rotationSmooth * this.fixedTimeStep
    this.mesh.rotation.y = this.bodyYaw

    const targetVelX = moveDir.x * this.baseMaxSpeed
    const targetVelZ = moveDir.z * this.baseMaxSpeed
    const controlMultiplier = this.isGrounded ? 1 : this.airControlMultiplier

    this.body.velocity.x += (targetVelX - this.body.velocity.x) * this.acceleration * this.fixedTimeStep * controlMultiplier
    this.body.velocity.z += (targetVelZ - this.body.velocity.z) * this.acceleration * this.fixedTimeStep * controlMultiplier

    this._stabilizeMotion()

    return { targetYaw: this.bodyYaw, touchedTarget: null }
  }
}
