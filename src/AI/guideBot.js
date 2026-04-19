import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const GUIDE_AI_CONFIG = {
  baseMaxSpeed: 3,
  acceleration: 6.5,
  rotationSmooth: 3.0,
  fixedTimeStep: 1 / 60,
  smallTriggerFallback: 1.5,
  largeTriggerFallback: 3.0,
  pickupPadding: 0.03,
  stopDistance: 0.04,
  collectAnimationDuration: 0.22,
  collectArcLift: 0.14,
  glowTransitionDuration: 10.0,
  offColor: new THREE.Color('#8fd88f'),
  onColor: new THREE.Color('#ffffff'),
  onEmissive: new THREE.Color('#00ff00'),
  offOpacity: 0.56,
  onOpacity: 0.8,
  onEmissiveIntensity: 2,
  onPointLightIntensity: 2,
  onPointLightDistance: 5,
  followPreferredDistance: 1.15,
  followStopDistance: 0.65,
  followTeleportPadding: 0.2,
  protectSpeedMultiplier: 1.25,
  collectScanIntervalSec: 1 / 18,
}

const LIGHT_STICK_OFF_NAMES = new Set(['Light Stick Off'])

function getTriggerRadius(mesh, triggerName, fallbackRadius) {
  const trigger = mesh?.children?.find(c => c.name === triggerName)
  return trigger?.geometry?.parameters?.radius || fallbackRadius
}

function getSmallTriggerCenter(mesh, fallbackRadius) {
  const smallTrigger = mesh?.children?.find(c => c.name === 'TriggerZone_Small')
  const center = new THREE.Vector3()
  if (smallTrigger) {
    smallTrigger.getWorldPosition(center)
  } else {
    center.copy(mesh?.position || new THREE.Vector3())
  }
  const radius = smallTrigger?.geometry?.parameters?.radius || fallbackRadius
  return { center, radius }
}

function getTriggerCenter(mesh, triggerName) {
  const trigger = mesh?.children?.find(c => c.name === triggerName)
  const center = new THREE.Vector3()
  if (trigger) {
    trigger.getWorldPosition(center)
  } else {
    center.copy(mesh?.position || new THREE.Vector3())
  }
  return center
}

export class GuideAI {
  constructor(guideMesh, guideBody) {
    this.mesh = guideMesh
    this.body = guideBody
    this.bodyYaw = guideMesh?.rotation?.y || 0

    this.baseMaxSpeed = GUIDE_AI_CONFIG.baseMaxSpeed
    this.acceleration = GUIDE_AI_CONFIG.acceleration
    this.rotationSmooth = GUIDE_AI_CONFIG.rotationSmooth
    this.fixedTimeStep = GUIDE_AI_CONFIG.fixedTimeStep

    this.carried = null
    this.targetItemEntry = null
    this.loyalPlayerEntry = null
    this.protectTargetGuyEntry = null

    this._collectScanAccumulator = 0
    this._tmpTriggerCenter = new THREE.Vector3()
    this._tmpMoveDir = new THREE.Vector3()
    this._tmpCollectPos = new THREE.Vector3()
    this._tmpQuat = new THREE.Quaternion()

    this._smallTriggerRef = null

    this._setGuideMood('sad')
  }

  dispose() {
    this._dropCarriedAsGlowing()
    this.targetItemEntry = null
    this.loyalPlayerEntry = null
    this.protectTargetGuyEntry = null
  }

  syncCarriedItem(delta) {
    this._updateCarriedAttachment(delta)
  }

  _setGuideMood(mood) {
    if (typeof this.mesh?.userData?.setMood === 'function') {
      this.mesh.userData.setMood(mood)
    }
  }

  _isValidLightStickOff(entry) {
    if (!entry || !entry.mesh || !entry.body) return false
    if (!LIGHT_STICK_OFF_NAMES.has(entry.name)) return false
    if (entry.type !== 'dynamic') return false
    if (entry.body === this.body) return false
    if (entry.body.userData?.isCollectedItem) return false
    return true
  }

  _isValidGuyEntry(entry) {
    if (!entry || !entry.mesh || !entry.body) return false
    if (entry.name !== 'Guy') return false
    return entry.body !== this.body
  }

  _isValidPlayerEntry(entry) {
    if (!entry || !entry.mesh || !entry.body) return false
    if (entry.name !== 'Player') return false
    return entry.body !== this.body
  }

  _isEntryAlive(syncList, entry) {
    return !!(entry && Array.isArray(syncList) && syncList.includes(entry))
  }

  _acquireNearestPlayer(syncList) {
    let nearest = null
    let minDistSq = Infinity

    for (const entry of syncList) {
      if (!this._isValidPlayerEntry(entry)) continue
      const distSq = this.mesh.position.distanceToSquared(entry.mesh.position)
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = entry
      }
    }

    return nearest
  }

  _faceTowardPosition(targetPos) {
    if (!targetPos || !this.mesh) return null

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

  _bodyApproxRadius(body) {
    if (!body?.shapes?.length) return 0.12

    let maxR = 0.12
    body.shapes.forEach(shape => {
      if (!shape) return

      if (shape instanceof CANNON.Sphere) {
        maxR = Math.max(maxR, shape.radius || 0)
        return
      }

      if (shape instanceof CANNON.Cylinder) {
        const r = Math.max(shape.radiusTop || 0, shape.radiusBottom || 0)
        maxR = Math.max(maxR, r)
        return
      }

      if (shape instanceof CANNON.Box) {
        const he = shape.halfExtents
        if (he) {
          maxR = Math.max(maxR, Math.max(he.x, he.y, he.z))
        }
      }
    })

    return maxR
  }

  _findNearestLightStickOffInRange(syncList, anchorPos, maxRange) {
    let nearest = null
    let minDistSq = Infinity

    for (const entry of syncList) {
      if (!this._isValidLightStickOff(entry)) continue

      const distSq = anchorPos.distanceToSquared(entry.mesh.position)
      if (distSq > maxRange * maxRange) continue

      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = entry
      }
    }

    return nearest
  }

  _findNearestGuyAroundAnchor(syncList, anchorPos, maxRange) {
    let nearest = null
    let minDistSq = Infinity
    const maxRangeSq = maxRange * maxRange

    for (const entry of syncList) {
      if (!this._isValidGuyEntry(entry)) continue
      const guySmall = getSmallTriggerCenter(entry.mesh, GUIDE_AI_CONFIG.smallTriggerFallback)
      const distSq = anchorPos.distanceToSquared(guySmall.center)
      if (distSq > maxRangeSq) continue
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearest = entry
      }
    }

    return nearest
  }

  _getGuideTriggerRadii() {
    const smallRadius = getTriggerRadius(this.mesh, 'TriggerZone_Small', GUIDE_AI_CONFIG.smallTriggerFallback)
    const largeRadius = getTriggerRadius(this.mesh, 'TriggerZone_Large', GUIDE_AI_CONFIG.largeTriggerFallback)
    return { smallRadius, largeRadius }
  }

  _isTouchingCharacterLikeTrigger(aEntry, bEntry) {
    if (!aEntry?.mesh || !bEntry?.mesh) return false

    // Destroy condition: inner trigger sphere of Guide touches inner trigger sphere of Guy.
    const a = getSmallTriggerCenter(aEntry.mesh, GUIDE_AI_CONFIG.smallTriggerFallback)
    const b = getSmallTriggerCenter(bEntry.mesh, GUIDE_AI_CONFIG.smallTriggerFallback)
    return a.center.distanceToSquared(b.center) <= (a.radius + b.radius) * (a.radius + b.radius)
  }

  _getAnchorWorldTransform() {
    this.mesh.updateMatrixWorld(true)

    const anchorName = this.mesh.userData?.lightStickAnchorName || 'GuideLightStickAnchor'
    const anchor = this.mesh.getObjectByName(anchorName)
    if (anchor) {
      const worldPos = new THREE.Vector3()
      const worldQuat = new THREE.Quaternion()
      anchor.getWorldPosition(worldPos)
      anchor.getWorldQuaternion(worldQuat)
      return { position: worldPos, quaternion: worldQuat }
    }

    const fallbackPos = this.mesh.position.clone()
    const fallbackQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.bodyYaw, 0))
    return { position: fallbackPos, quaternion: fallbackQuat }
  }

  _syncBodyAndMeshToTransform(entry, position, quaternion) {
    const body = entry?.body
    const mesh = entry?.mesh
    if (!body || !mesh) return false

    body.type = CANNON.Body.KINEMATIC
    body.collisionResponse = false
    body.collisionFilterMask = 0
    body.velocity.set(0, 0, 0)
    body.angularVelocity.set(0, 0, 0)
    body.position.set(position.x, position.y, position.z)
    body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    body.aabbNeedsUpdate = true

    mesh.position.copy(position)
    mesh.quaternion.copy(quaternion)
    mesh.traverse(child => {
      if (child.isMesh) child.userData.isCarriedItem = true
    })

    return true
  }

  _lockItemToAnchor(entry) {
    const { position, quaternion } = this._getAnchorWorldTransform()
    return this._syncBodyAndMeshToTransform(entry, position, quaternion)
  }

  _ensureGlowComponents(entry) {
    const meshRoot = entry?.mesh
    if (!meshRoot) return { stickMeshes: [], pointLight: null }

    const stickMeshes = []
    meshRoot.traverse(child => {
      if (child.isMesh) {
        if (!child.userData.guideGlowMaterialCloned) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => (m?.clone ? m.clone() : m))
          } else if (child.material?.clone) {
            child.material = child.material.clone()
          }
          child.userData.guideGlowMaterialCloned = true
        }
        stickMeshes.push(child)
      }
    })

    let pointLight = meshRoot.getObjectByName('StickPointLight')
    if (!pointLight) {
      pointLight = new THREE.PointLight('#00ff00', 0, GUIDE_AI_CONFIG.onPointLightDistance)
      pointLight.name = 'StickPointLight'
      pointLight.castShadow = false
      meshRoot.add(pointLight)
    }

    return { stickMeshes, pointLight }
  }

  _setGlowProgress(entry, progress) {
    const t = THREE.MathUtils.clamp(progress, 0, 1)
    const { stickMeshes, pointLight } = this._ensureGlowComponents(entry)

    stickMeshes.forEach(stickMesh => {
      const mats = Array.isArray(stickMesh.material) ? stickMesh.material : [stickMesh.material]
      mats.forEach(mat => {
        if (!mat) return
        if (mat.color) {
          const c = GUIDE_AI_CONFIG.offColor.clone().lerp(GUIDE_AI_CONFIG.onColor, t)
          mat.color.copy(c)
        }
        if (mat.emissive) {
          mat.emissive.copy(GUIDE_AI_CONFIG.onEmissive)
        }
        mat.emissiveIntensity = GUIDE_AI_CONFIG.onEmissiveIntensity * t
        mat.transparent = true
        mat.opacity = THREE.MathUtils.lerp(GUIDE_AI_CONFIG.offOpacity, GUIDE_AI_CONFIG.onOpacity, t)
        mat.needsUpdate = true
      })
    })

    if (pointLight) {
      pointLight.color.copy(GUIDE_AI_CONFIG.onEmissive)
      pointLight.intensity = GUIDE_AI_CONFIG.onPointLightIntensity * t
      pointLight.distance = GUIDE_AI_CONFIG.onPointLightDistance
    }
  }

  _collectItem(entry, syncList) {
    if (this.carried || !this._isValidLightStickOff(entry)) return false

    const body = entry.body
    body.userData = body.userData || {}

    const startPos = new THREE.Vector3(body.position.x, body.position.y, body.position.z)
    const startQuat = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    const { position: targetPos, quaternion: targetQuat } = this._getAnchorWorldTransform()

    this._setGlowProgress(entry, 0)

    this.carried = {
      entry,
      state: 'collecting',
      animationTime: 0,
      glowTime: 0,
      startPosition: startPos,
      startQuaternion: startQuat,
      targetPosition: targetPos.clone(),
      targetQuaternion: targetQuat.clone(),
      originalType: body.type,
      originalCollisionResponse: body.collisionResponse,
      originalCollisionFilterMask: body.collisionFilterMask,
      originalQuaternion: new CANNON.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
    }

    body.userData.isCollectedItem = true
    this._setGuideMood('happy')
    this.loyalPlayerEntry = this._acquireNearestPlayer(syncList)
    this.protectTargetGuyEntry = null
    this.targetItemEntry = null
    return true
  }

  _dropCarriedAsGlowing() {
    if (!this.carried) return

    const body = this.carried.entry?.body
    const mesh = this.carried.entry?.mesh
    const carried = this.carried
    const glowProgress = Math.min(1, carried.glowTime / GUIDE_AI_CONFIG.glowTransitionDuration)
    const isFullyGlowing = glowProgress >= 0.999

    // Drop rule:
    // - Before full charge: always drop as Light Stick Off
    // - After full charge threshold: drop as Light Stick (fully glowing)
    this._setGlowProgress(carried.entry, isFullyGlowing ? 1 : 0)

    const { position, quaternion } = this._getAnchorWorldTransform()

    if (body) {
      body.userData = body.userData || {}
      body.userData.isCollectedItem = false
      body.type = this.carried.originalType ?? CANNON.Body.DYNAMIC
      body.collisionResponse = this.carried.originalCollisionResponse ?? true
      body.collisionFilterMask = this.carried.originalCollisionFilterMask ?? body.collisionFilterMask
      body.velocity.set(0, 0, 0)
      body.angularVelocity.set(0, 0, 0)
      if (this.carried.originalQuaternion) {
        body.quaternion.copy(this.carried.originalQuaternion)
      }
      body.position.set(position.x, position.y, position.z)
      body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
      body.aabbNeedsUpdate = true
    }

    if (mesh) {
      mesh.name = isFullyGlowing ? 'Light Stick' : 'Light Stick Off'
      mesh.traverse(child => {
        if (child.isMesh) child.userData.isCarriedItem = false
      })
    }

    carried.entry.name = isFullyGlowing ? 'Light Stick' : 'Light Stick Off'

    this.carried = null
    this.loyalPlayerEntry = null
    this.protectTargetGuyEntry = null
  }

  _tryCollectTarget(syncList) {
    if (this.carried) return

    const smallTrigger = this._smallTriggerRef || this.mesh.children.find(c => c.name === 'TriggerZone_Small')
    if (smallTrigger) this._smallTriggerRef = smallTrigger

    const smallRadius = smallTrigger?.geometry?.parameters?.radius || GUIDE_AI_CONFIG.smallTriggerFallback
    const detectRadius = smallRadius * 2

    const triggerCenter = this._tmpTriggerCenter
    if (smallTrigger) {
      smallTrigger.getWorldPosition(triggerCenter)
    } else {
      triggerCenter.copy(this.mesh.position)
    }

    if (!this.targetItemEntry || !this._isValidLightStickOff(this.targetItemEntry)) {
      // Detect pickup targets using the inner trigger sphere only.
      this.targetItemEntry = this._findNearestLightStickOffInRange(syncList, triggerCenter, detectRadius)
    } else {
      const distToCurrent = triggerCenter.distanceTo(this.targetItemEntry.mesh.position)
      if (distToCurrent > detectRadius) {
        this.targetItemEntry = this._findNearestLightStickOffInRange(syncList, triggerCenter, detectRadius)
      }
    }

    if (!this.targetItemEntry) return

    const itemRadius = this._bodyApproxRadius(this.targetItemEntry.body)
    const touchDistance = smallRadius + itemRadius + GUIDE_AI_CONFIG.pickupPadding
    const itemPos = this.targetItemEntry.body.position
    const dx = triggerCenter.x - itemPos.x
    const dz = triggerCenter.z - itemPos.z
    const horizontalDistSq = dx * dx + dz * dz

    if (horizontalDistSq <= touchDistance * touchDistance) {
      this._collectItem(this.targetItemEntry, syncList)
    }
  }

  _updateCarriedAttachment(delta) {
    if (!this.carried?.entry) return

    const carried = this.carried
    const entry = carried.entry
    const { position: anchorPos, quaternion: anchorQuat } = this._getAnchorWorldTransform()

    carried.targetPosition.copy(anchorPos)
    carried.targetQuaternion.copy(anchorQuat)

    if (carried.state === 'collecting') {
      carried.animationTime += delta
      const t = Math.min(1, carried.animationTime / GUIDE_AI_CONFIG.collectAnimationDuration)
      const eased = t * t * (3 - 2 * t)
      const curvedLift = Math.sin(eased * Math.PI) * GUIDE_AI_CONFIG.collectArcLift

      const pos = this._tmpCollectPos.set(
        THREE.MathUtils.lerp(carried.startPosition.x, carried.targetPosition.x, eased),
        THREE.MathUtils.lerp(carried.startPosition.y, carried.targetPosition.y, eased) + curvedLift,
        THREE.MathUtils.lerp(carried.startPosition.z, carried.targetPosition.z, eased)
      )

      const quat = this._tmpQuat.copy(carried.startQuaternion).slerp(carried.targetQuaternion, eased)
      this._syncBodyAndMeshToTransform(entry, pos, quat)

      if (t >= 1) {
        carried.state = 'carried'
      }
    } else {
      this._syncBodyAndMeshToTransform(entry, carried.targetPosition, carried.targetQuaternion)
    }

    carried.glowTime += delta
    const glowT = Math.min(1, carried.glowTime / GUIDE_AI_CONFIG.glowTransitionDuration)
    this._setGlowProgress(entry, glowT)
  }

  _moveTowardTarget() {
    if (!this.targetItemEntry?.mesh) {
      this.body.velocity.x *= 0.85
      this.body.velocity.z *= 0.85
      return this.bodyYaw
    }

    const moveDir = this._tmpMoveDir.subVectors(this.targetItemEntry.mesh.position, this.mesh.position)
    moveDir.y = 0
    const dist = moveDir.length()

    if (dist <= GUIDE_AI_CONFIG.stopDistance) {
      this.body.velocity.x *= 0.8
      this.body.velocity.z *= 0.8
      return this.bodyYaw
    }

    moveDir.normalize()

    const targetYaw = Math.atan2(moveDir.x, moveDir.z)
    let yawDiff = targetYaw - this.bodyYaw
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    this.bodyYaw += yawDiff * this.rotationSmooth * this.fixedTimeStep

    const targetVelX = moveDir.x * this.baseMaxSpeed
    const targetVelZ = moveDir.z * this.baseMaxSpeed
    this.body.velocity.x += (targetVelX - this.body.velocity.x) * this.acceleration * this.fixedTimeStep
    this.body.velocity.z += (targetVelZ - this.body.velocity.z) * this.acceleration * this.fixedTimeStep

    return this.bodyYaw
  }

  _moveTowardPosition(targetPos, speedMultiplier = 1.0, stopDistance = GUIDE_AI_CONFIG.stopDistance) {
    if (!targetPos) {
      this.body.velocity.x *= 0.85
      this.body.velocity.z *= 0.85
      return this.bodyYaw
    }

    const moveDir = this._tmpMoveDir.subVectors(targetPos, this.mesh.position)
    moveDir.y = 0
    const dist = moveDir.length()

    if (dist <= stopDistance) {
      this.body.velocity.x *= 0.8
      this.body.velocity.z *= 0.8
      return this.bodyYaw
    }

    moveDir.normalize()

    const targetYaw = Math.atan2(moveDir.x, moveDir.z)
    let yawDiff = targetYaw - this.bodyYaw
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    this.bodyYaw += yawDiff * this.rotationSmooth * this.fixedTimeStep

    const speed = this.baseMaxSpeed * speedMultiplier
    const targetVelX = moveDir.x * speed
    const targetVelZ = moveDir.z * speed
    this.body.velocity.x += (targetVelX - this.body.velocity.x) * this.acceleration * this.fixedTimeStep
    this.body.velocity.z += (targetVelZ - this.body.velocity.z) * this.acceleration * this.fixedTimeStep

    return this.bodyYaw
  }

  _teleportNearLoyalPlayer(playerEntry, smallRadius) {
    if (!playerEntry?.mesh || !playerEntry?.body || !this.mesh || !this.body) return false

    const toGuide = new THREE.Vector3().subVectors(this.mesh.position, playerEntry.mesh.position)
    toGuide.y = 0
    if (toGuide.lengthSq() < 0.0001) {
      toGuide.set(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw))
    }
    toGuide.normalize()

    const teleportDistance = Math.max(
      GUIDE_AI_CONFIG.followPreferredDistance,
      smallRadius + GUIDE_AI_CONFIG.followTeleportPadding
    )

    const targetPos = playerEntry.mesh.position.clone().addScaledVector(toGuide, teleportDistance)
    targetPos.y = playerEntry.body.position.y

    this.body.position.set(targetPos.x, targetPos.y, targetPos.z)
    this.body.velocity.set(0, 0, 0)
    this.body.angularVelocity.set(0, 0, 0)
    this.body.aabbNeedsUpdate = true

    this.mesh.position.copy(targetPos)
    return true
  }

  _updateLoyalProtectionState(syncList) {
    if (!this.carried) return { targetYaw: this.bodyYaw, touchedGuy: null }

    const { smallRadius, largeRadius } = this._getGuideTriggerRadii()

    if (!this._isEntryAlive(syncList, this.loyalPlayerEntry) || !this._isValidPlayerEntry(this.loyalPlayerEntry)) {
      this.loyalPlayerEntry = null
    }

    if (!this.loyalPlayerEntry) {
      this.loyalPlayerEntry = this._acquireNearestPlayer(syncList)
    }

    if (this.loyalPlayerEntry?.mesh) {
      const largeTriggerCenter = getTriggerCenter(this.mesh, 'TriggerZone_Large')
      const distanceToPlayer = largeTriggerCenter.distanceTo(this.loyalPlayerEntry.mesh.position)
      if (distanceToPlayer > largeRadius) {
        this._teleportNearLoyalPlayer(this.loyalPlayerEntry, smallRadius)
        this.protectTargetGuyEntry = null
      }
    }

    const protectionAnchor = this.loyalPlayerEntry?.mesh?.position || this.mesh.position

    if (!this._isEntryAlive(syncList, this.protectTargetGuyEntry) || !this._isValidGuyEntry(this.protectTargetGuyEntry)) {
      this.protectTargetGuyEntry = null
    }

    if (!this.protectTargetGuyEntry) {
      // Protection range follows Guide outer trigger sphere.
      this.protectTargetGuyEntry = this._findNearestGuyAroundAnchor(syncList, protectionAnchor, largeRadius)
    }

    if (this.protectTargetGuyEntry) {
      const targetYaw = this._moveTowardPosition(
        this.protectTargetGuyEntry.mesh.position,
        GUIDE_AI_CONFIG.protectSpeedMultiplier,
        0.2
      )

      if (this._isTouchingCharacterLikeTrigger({ mesh: this.mesh }, this.protectTargetGuyEntry)) {
        const touchedGuy = this.protectTargetGuyEntry
        this.protectTargetGuyEntry = null
        return { targetYaw, touchedGuy }
      }

      return { targetYaw, touchedGuy: null }
    }

    if (this.loyalPlayerEntry?.mesh) {
      const offsetDir = new THREE.Vector3().subVectors(this.mesh.position, this.loyalPlayerEntry.mesh.position)
      offsetDir.y = 0
      if (offsetDir.lengthSq() < 0.0001) {
        offsetDir.set(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw))
      }
      offsetDir.normalize()

      const followTargetPos = this.loyalPlayerEntry.mesh.position.clone().addScaledVector(offsetDir, GUIDE_AI_CONFIG.followPreferredDistance)
      const targetYaw = this._moveTowardPosition(followTargetPos, 1.0, GUIDE_AI_CONFIG.followStopDistance)
      return { targetYaw, touchedGuy: null }
    }

    this.body.velocity.x *= 0.82
    this.body.velocity.z *= 0.82
    return { targetYaw: this.bodyYaw, touchedGuy: null }
  }

  update(delta, syncList) {
    this._collectScanAccumulator += delta
    if (this._collectScanAccumulator >= GUIDE_AI_CONFIG.collectScanIntervalSec) {
      this._collectScanAccumulator = 0
      this._tryCollectTarget(syncList)
    }
    this._updateCarriedAttachment(delta)

    if (this.carried) {
      return this._updateLoyalProtectionState(syncList)
    }

    const hasTargetItem = this.targetItemEntry && this._isValidLightStickOff(this.targetItemEntry)
    if (!hasTargetItem) {
      const nearestPlayer = this._acquireNearestPlayer(syncList)
      if (nearestPlayer?.mesh) {
        this.body.velocity.x *= 0.82
        this.body.velocity.z *= 0.82
        const targetYaw = this._faceTowardPosition(nearestPlayer.mesh.position)
        return { targetYaw, touchedGuy: null }
      }
    }

    const targetYaw = this._moveTowardTarget()
    return { targetYaw, touchedGuy: null }
  }
}
