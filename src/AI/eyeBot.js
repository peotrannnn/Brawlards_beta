import * as THREE from 'three'

const EYE_BOT_DEFAULTS = {
  descentDurationSec: 300, // 5 minutes
  targetBlendSpeed: 4.0,
  moveBlendSpeed: 3.0,
}

export class EyeBot {
  constructor(eyeMesh, triggerMesh = null, options = {}) {
    this.eyeMesh = eyeMesh
    this.triggerMesh = triggerMesh

    this.descentDurationSec = Math.max(
      0.1,
      options.descentDurationSec ?? EYE_BOT_DEFAULTS.descentDurationSec
    )
    this.targetBlendSpeed = Math.max(
      0.1,
      options.targetBlendSpeed ?? EYE_BOT_DEFAULTS.targetBlendSpeed
    )
    this.moveBlendSpeed = Math.max(
      0.1,
      options.moveBlendSpeed ?? EYE_BOT_DEFAULTS.moveBlendSpeed
    )

    this._descentStarted = false
    this._descentElapsed = 0
    this._initialPosition = eyeMesh?.position?.clone?.() || new THREE.Vector3()
    this._smoothedTargetPos = new THREE.Vector3().copy(this._initialPosition)
    this._desiredEyePos = new THREE.Vector3().copy(this._initialPosition)
    this._hasActiveTarget = false

    this._tmpTargetPos = new THREE.Vector3()
    this._tmpEyeWorldPos = new THREE.Vector3()
    this._tmpTriggerWorldPos = new THREE.Vector3()
    this._tmpTargetWorldPos = new THREE.Vector3()
  }

  reset() {
    this._descentStarted = false
    this._descentElapsed = 0
    this._hasActiveTarget = false
    if (this.eyeMesh?.position) {
      this.eyeMesh.position.copy(this._initialPosition)
    }
    this._smoothedTargetPos.copy(this._initialPosition)
    this._desiredEyePos.copy(this._initialPosition)
  }

  _syncBodyToMesh(entry) {
    if (!entry?.body || !entry?.mesh) return

    entry.mesh.updateMatrixWorld(true)
    entry.mesh.getWorldPosition(this._tmpEyeWorldPos)

    entry.body.position.set(
      this._tmpEyeWorldPos.x,
      this._tmpEyeWorldPos.y,
      this._tmpEyeWorldPos.z
    )
    entry.body.velocity.set(0, 0, 0)
    entry.body.angularVelocity.set(0, 0, 0)
    entry.body.aabbNeedsUpdate = true
  }

  _isTriggerTouchingEntry(targetEntry) {
    if (!this.triggerMesh || !targetEntry?.mesh) return false

    const triggerGeometry = this.triggerMesh.geometry?.parameters || {}
    const triggerRadius = Math.max(
      0.01,
      triggerGeometry.radiusTop || triggerGeometry.radius || 1
    )
    const triggerHalfHeight = Math.max(0.01, (triggerGeometry.height || 1) * 0.5)

    this.triggerMesh.updateMatrixWorld(true)
    this.triggerMesh.getWorldPosition(this._tmpTriggerWorldPos)

    const targetSmallTrigger =
      targetEntry.mesh.userData?.smallTriggerZone ||
      targetEntry.mesh.children?.find((c) => c.name === 'TriggerZone_Small')

    let targetRadius = 0.5
    if (targetSmallTrigger) {
      targetSmallTrigger.updateMatrixWorld(true)
      targetSmallTrigger.getWorldPosition(this._tmpTargetWorldPos)
      targetRadius = targetSmallTrigger.geometry?.parameters?.radius || 1.5
    } else {
      targetEntry.mesh.updateMatrixWorld(true)
      targetEntry.mesh.getWorldPosition(this._tmpTargetWorldPos)
    }

    const dx = this._tmpTargetWorldPos.x - this._tmpTriggerWorldPos.x
    const dz = this._tmpTargetWorldPos.z - this._tmpTriggerWorldPos.z
    const horizontalDistance = Math.sqrt((dx * dx) + (dz * dz))
    const verticalDistance = Math.abs(this._tmpTargetWorldPos.y - this._tmpTriggerWorldPos.y)

    const horizontalTouch = horizontalDistance <= (triggerRadius + targetRadius)
    const verticalTouch = verticalDistance <= (triggerHalfHeight + targetRadius)
    return horizontalTouch && verticalTouch
  }

  update(delta, context = {}) {
    if (!this.eyeMesh) return { touchedTarget: false, targetEntry: null }

    const {
      playerEntry = null,
      targetEntry = null,
      fixedTargetPosition = null,
      allowPlayerTarget = true,
      allowTargetTouch = true,
      playerInSection3 = false,
      eyeEntry = null,
      triggerEntry = null,
    } = context

    if (!this._descentStarted && playerInSection3 && playerEntry?.mesh) {
      this._descentStarted = true
      this._descentElapsed = 0
      this._initialPosition.copy(this.eyeMesh.position)
    }

    if (!this._descentStarted) {
      this.eyeMesh.position.copy(this._initialPosition)
      this._smoothedTargetPos.copy(this._initialPosition)
      this._desiredEyePos.copy(this._initialPosition)
      this._hasActiveTarget = false
      this._syncBodyToMesh(eyeEntry)
      this._syncBodyToMesh(triggerEntry)
      return { touchedTarget: false, targetEntry: null }
    }

    this._descentElapsed = Math.min(this.descentDurationSec, this._descentElapsed + Math.max(0, delta))
    const progress = THREE.MathUtils.clamp(this._descentElapsed / this.descentDurationSec, 0, 1)

    const activeTargetEntry = targetEntry?.mesh ? targetEntry : (allowPlayerTarget ? playerEntry : null)

    if (!activeTargetEntry?.mesh) {
      this._hasActiveTarget = false
      this._syncBodyToMesh(eyeEntry)
      this._syncBodyToMesh(triggerEntry)
      return { touchedTarget: false, targetEntry: null }
    }

    if (fixedTargetPosition) {
      this._tmpTargetPos.copy(fixedTargetPosition)
    } else {
      this._tmpTargetPos.copy(activeTargetEntry.mesh.position)
    }
    if (!this._hasActiveTarget) {
      this._smoothedTargetPos.copy(this._tmpTargetPos)
      this._hasActiveTarget = true
    } else {
      const targetAlpha = 1 - Math.exp(-this.targetBlendSpeed * Math.max(0, delta))
      this._smoothedTargetPos.lerp(this._tmpTargetPos, targetAlpha)
    }

    this._desiredEyePos.copy(this._initialPosition).lerp(this._smoothedTargetPos, progress)

    const moveAlpha = 1 - Math.exp(-this.moveBlendSpeed * Math.max(0, delta))
    this.eyeMesh.position.lerp(this._desiredEyePos, moveAlpha)

    this._syncBodyToMesh(eyeEntry)
    this._syncBodyToMesh(triggerEntry)

    const touchedTarget = allowTargetTouch && this._isTriggerTouchingEntry(activeTargetEntry)
    return { touchedTarget, targetEntry: activeTargetEntry }
  }
}
