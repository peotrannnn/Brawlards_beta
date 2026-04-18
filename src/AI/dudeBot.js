import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const DUDE_AI_CONFIG = {
  orbitRadius: 0.85,
  minHorizontalSpeed: 1.25,
  maxHorizontalSpeed: 3.1,
  tangentSpeed: 2.15,
  radialGain: 1.45,
  verticalGain: 4.2,
  maxVerticalSpeed: 2.0,
  yTouchTolerance: 0.4,
  speedRampDuration: 20.0,
  maxLifetimeBeforeDespawn: 30.0,
  orbitDirectionMinSwitchTime: 1.0,
  orbitDirectionMaxSwitchTime: 5.0,
  orbitChaosStrength: 0.2,
  teleportMinDistance: 8.0,
  teleportMaxDistance: 10.0,
  teleportCheckInterval: 0.5,
  teleportFadeDuration: 0.5,
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export class DudeAI {
  constructor(dudeMesh, dudeBody, scene) {
    this.mesh = dudeMesh
    this.body = dudeBody
    this.scene = scene

    this.lockedTarget = null
    this.hasCompletedHaunt = false
    this.teleportCheckTimer = 0
    this.lastTeleportTime = -1000
    this.teleportState = 'idle'
    this.teleportOpacity = 1.0
    this.teleportTimer = 0

    this.timeAlive = 0
    this.orbitDirection = Math.random() < 0.5 ? -1 : 1
    this.orbitSwitchTimer = 0
    this.nextOrbitSwitchAt = this._randomOrbitSwitchTime()

    this._setupGhostBody()
  }

  _randomOrbitSwitchTime() {
    return DUDE_AI_CONFIG.orbitDirectionMinSwitchTime +
      Math.random() * (DUDE_AI_CONFIG.orbitDirectionMaxSwitchTime - DUDE_AI_CONFIG.orbitDirectionMinSwitchTime)
  }

  _setupGhostBody() {
    this.body.type = CANNON.Body.KINEMATIC
    this.body.collisionResponse = false
    this.body.collisionFilterMask = 0
    this.body.linearDamping = 0
    this.body.angularDamping = 1
    this.body.velocity.set(0, 0, 0)
    this.body.angularVelocity.set(0, 0, 0)
    this.body.updateMassProperties()
  }

  _acquireNearestPlayer(syncList) {
    let nearestPlayer = null
    let minDistanceSq = Infinity

    syncList.forEach((entry) => {
      if (entry.name !== 'Player' || !entry.mesh) return

      const distSq = this.mesh.position.distanceToSquared(entry.mesh.position)
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq
        nearestPlayer = entry
      }
    })

    return nearestPlayer
  }

  _isTargetValid(syncList) {
    return !!(this.lockedTarget && syncList.includes(this.lockedTarget) && this.lockedTarget.mesh)
  }

  _isTargetCameraAttached(possessedEntry) {
    return !!(this.lockedTarget && possessedEntry === this.lockedTarget)
  }

  _isTouchingTargetLikeGuy() {
    if (!this.mesh || !this.lockedTarget?.mesh) return false

    const dudeSmallTrigger = this.mesh.children.find(c => c.name === 'TriggerZone_Small')
    const targetSmallTrigger = this.lockedTarget.mesh.children.find(c => c.name === 'TriggerZone_Small')

    // Match Guy-like destroy check: prefer trigger zone, fallback to mesh position + default radius
    this.mesh.updateMatrixWorld(true)
    this.lockedTarget.mesh.updateMatrixWorld(true)

    let dudePos = this.mesh.position
    let dudeRadius = 0.5
    if (dudeSmallTrigger) {
      const dPos = new THREE.Vector3()
      dudeSmallTrigger.getWorldPosition(dPos)
      dudePos = dPos
      dudeRadius = dudeSmallTrigger.geometry?.parameters?.radius || 1.5
    }

    let targetPos = this.lockedTarget.mesh.position
    let targetRadius = 0.5
    if (targetSmallTrigger) {
      const tPos = new THREE.Vector3()
      targetSmallTrigger.getWorldPosition(tPos)
      targetPos = tPos
      targetRadius = targetSmallTrigger.geometry?.parameters?.radius || 1.5
    }

    return dudePos.distanceTo(targetPos) < (dudeRadius + targetRadius)
  }

  _isVisibleOnScreen(camera) {
    if (!camera) return false

    const vector = new THREE.Vector3()
    vector.setFromMatrixPosition(this.mesh.matrixWorld)
    vector.project(camera)

    const inViewport = vector.x > -1 && vector.x < 1 && vector.y > -1 && vector.y < 1 && vector.z > 0

    return inViewport
  }

  _findTeleportPosition(targetPos, camera) {
    const attempts = 24

    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = DUDE_AI_CONFIG.teleportMinDistance + Math.random() * (DUDE_AI_CONFIG.teleportMaxDistance - DUDE_AI_CONFIG.teleportMinDistance)

      const teleportX = targetPos.x + Math.cos(angle) * distance
      const teleportY = targetPos.y + (Math.random() - 0.5) * 1.0
      const teleportZ = targetPos.z + Math.sin(angle) * distance

      const teleportPos = new THREE.Vector3(teleportX, teleportY, teleportZ)

      // Check if this position is not visible to camera after teleporting
      if (!camera) {
        return teleportPos
      }

      const vector = teleportPos.clone()
      vector.project(camera)

      const isOutOfView = vector.x < -1.2 || vector.x > 1.2 || vector.y < -1.2 || vector.y > 1.2 || vector.z <= 0

      if (isOutOfView) {
        return teleportPos
      }
    }

    // Fallback: keep random direction, but outside normal orbit range
    const angle = Math.random() * Math.PI * 2
    const distance = DUDE_AI_CONFIG.teleportMaxDistance
    return new THREE.Vector3(
      targetPos.x + Math.cos(angle) * distance,
      targetPos.y,
      targetPos.z + Math.sin(angle) * distance
    )
  }

  update(delta, syncList, camera, possessedEntry = null) {
    this.timeAlive += delta

    if (this.hasCompletedHaunt) {
      return { shouldDespawn: true, targetYaw: null, touchedPlayer: false }
    }

    if (this.timeAlive >= DUDE_AI_CONFIG.maxLifetimeBeforeDespawn) {
      this.hasCompletedHaunt = true
      this.body.velocity.set(0, 0, 0)
      return { shouldDespawn: true, targetYaw: null, touchedPlayer: false }
    }

    if (!this.lockedTarget) {
      this.lockedTarget = this._acquireNearestPlayer(syncList)
    }

    if (!this._isTargetValid(syncList)) {
      this.hasCompletedHaunt = true
      this.body.velocity.set(0, 0, 0)
      return { shouldDespawn: true, targetYaw: null, touchedPlayer: false }
    }

    const targetPos = this.lockedTarget.mesh.position
    const toTarget = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    const toTargetXZ = new THREE.Vector3(toTarget.x, 0, toTarget.z)
    const horizontalDistance = toTargetXZ.length()
    const yDiff = targetPos.y - this.mesh.position.y

    if (this._isTouchingTargetLikeGuy()) {
      this.hasCompletedHaunt = true
      this.body.velocity.set(0, 0, 0)
      return { shouldDespawn: true, targetYaw: null, touchedPlayer: true }
    }

    if (horizontalDistance < 0.001) {
      toTargetXZ.set(1, 0, 0)
    } else {
      toTargetXZ.normalize()
    }

    const speedRamp = clamp(this.timeAlive / DUDE_AI_CONFIG.speedRampDuration, 0, 1)
    const currentMaxHorizontalSpeed = THREE.MathUtils.lerp(
      DUDE_AI_CONFIG.minHorizontalSpeed,
      DUDE_AI_CONFIG.maxHorizontalSpeed,
      speedRamp
    )

    this.orbitSwitchTimer += delta
    if (this.orbitSwitchTimer >= this.nextOrbitSwitchAt) {
      this.orbitSwitchTimer = 0
      this.nextOrbitSwitchAt = this._randomOrbitSwitchTime()
      this.orbitDirection = Math.random() < 0.7 ? -this.orbitDirection : (Math.random() < 0.5 ? -1 : 1)
    }

    const tangent = new THREE.Vector3(-toTargetXZ.z, 0, toTargetXZ.x).multiplyScalar(this.orbitDirection)
    const radialError = horizontalDistance - DUDE_AI_CONFIG.orbitRadius
    const inwardBias = THREE.MathUtils.lerp(0.1, 0.95, speedRamp)

    const radialSpeed = clamp(
      radialError * DUDE_AI_CONFIG.radialGain - inwardBias,
      -currentMaxHorizontalSpeed,
      currentMaxHorizontalSpeed,
    )

    const chaos = (Math.random() * 2 - 1) * DUDE_AI_CONFIG.orbitChaosStrength
    let tangentSpeed = DUDE_AI_CONFIG.tangentSpeed + chaos
    tangentSpeed *= (0.85 + speedRamp * 0.4)
    if (horizontalDistance < 1.4) tangentSpeed *= 0.65
    if (horizontalDistance < 1.1) tangentSpeed *= 0.45

    const velocityXZ = new THREE.Vector3()
      .addScaledVector(toTargetXZ, radialSpeed)
      .addScaledVector(tangent, tangentSpeed)

    if (velocityXZ.length() > currentMaxHorizontalSpeed) {
      velocityXZ.normalize().multiplyScalar(currentMaxHorizontalSpeed)
    }

    const verticalSpeed = clamp(
      yDiff * DUDE_AI_CONFIG.verticalGain,
      -DUDE_AI_CONFIG.maxVerticalSpeed,
      DUDE_AI_CONFIG.maxVerticalSpeed,
    )

    this.body.velocity.set(velocityXZ.x, verticalSpeed, velocityXZ.z)
    this.body.angularVelocity.set(0, 0, 0)

    const targetYaw = Math.atan2(toTargetXZ.x, toTargetXZ.z)
    let didTeleport = false
    let teleportPos = null
    

    // Fade in/out teleport effect
    this.teleportCheckTimer += delta

    const canTriggerTeleport =
      this._isTargetCameraAttached(possessedEntry) &&
      this._isVisibleOnScreen(camera) &&
      (Date.now() - this.lastTeleportTime) > 2000

    if (this.teleportState === 'idle') {
      if (canTriggerTeleport) {
        this.teleportState = 'fading_out'
        this.teleportTimer = 0
        this.teleportOpacity = 1.0
      }
    } else if (this.teleportState === 'fading_out') {
      if (!this._isTargetCameraAttached(possessedEntry)) {
        this.teleportState = 'idle'
        this.teleportTimer = 0
        this.teleportOpacity = 1.0
      }

      this.teleportTimer += delta
      this.teleportOpacity = Math.max(0, 1.0 - (this.teleportTimer / DUDE_AI_CONFIG.teleportFadeDuration))

      if (this.teleportOpacity <= 0) {
        // Perform teleport
        teleportPos = this._findTeleportPosition(targetPos, camera)
        this.mesh.position.copy(teleportPos)
        this.body.position.copy(new CANNON.Vec3(teleportPos.x, teleportPos.y, teleportPos.z))
        this.body.velocity.set(0, 0, 0)
        didTeleport = true
        
        this.teleportState = 'fading_in'
        this.teleportTimer = 0
        this.lastTeleportTime = Date.now()
      }
    } else if (this.teleportState === 'fading_in') {
      this.teleportTimer += delta
      this.teleportOpacity = Math.min(1.0, this.teleportTimer / DUDE_AI_CONFIG.teleportFadeDuration)

      if (this.teleportOpacity >= 1.0) {
        this.teleportState = 'idle'
        this.teleportOpacity = 1.0
      }
    }

    return { shouldDespawn: false, targetYaw, opacity: this.teleportOpacity, didTeleport, teleportPos, touchedPlayer: false }
  }
}
