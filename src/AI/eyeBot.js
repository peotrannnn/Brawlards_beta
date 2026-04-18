import * as THREE from 'three'

const EYE_BOT_DEFAULTS = {
  descentDurationSec: 300, // 5 minutes
}

export class EyeBot {
  constructor(eyeMesh, triggerMesh = null, options = {}) {
    this.eyeMesh = eyeMesh
    this.triggerMesh = triggerMesh

    this.descentDurationSec = Math.max(
      0.1,
      options.descentDurationSec ?? EYE_BOT_DEFAULTS.descentDurationSec
    )

    this._descentStarted = false
    this._descentElapsed = 0
    this._initialPosition = eyeMesh?.position?.clone?.() || new THREE.Vector3()

    this._tmpTargetPos = new THREE.Vector3()
    this._tmpEyeWorldPos = new THREE.Vector3()
    this._tmpTriggerWorldPos = new THREE.Vector3()
    this._tmpPlayerWorldPos = new THREE.Vector3()
  }

  reset() {
    this._descentStarted = false
    this._descentElapsed = 0
    if (this.eyeMesh?.position) {
      this.eyeMesh.position.copy(this._initialPosition)
    }
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

  _isTriggerTouchingPlayer(playerEntry) {
    if (!this.triggerMesh || !playerEntry?.mesh) return false

    const triggerGeometry = this.triggerMesh.geometry?.parameters || {}
    const triggerRadius = Math.max(
      0.01,
      triggerGeometry.radiusTop || triggerGeometry.radius || 1
    )
    const triggerHalfHeight = Math.max(0.01, (triggerGeometry.height || 1) * 0.5)

    this.triggerMesh.updateMatrixWorld(true)
    this.triggerMesh.getWorldPosition(this._tmpTriggerWorldPos)

    const playerSmallTrigger =
      playerEntry.mesh.userData?.smallTriggerZone ||
      playerEntry.mesh.children?.find((c) => c.name === 'TriggerZone_Small')

    let playerRadius = 0.5
    if (playerSmallTrigger) {
      playerSmallTrigger.updateMatrixWorld(true)
      playerSmallTrigger.getWorldPosition(this._tmpPlayerWorldPos)
      playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5
    } else {
      playerEntry.mesh.updateMatrixWorld(true)
      playerEntry.mesh.getWorldPosition(this._tmpPlayerWorldPos)
    }

    const dx = this._tmpPlayerWorldPos.x - this._tmpTriggerWorldPos.x
    const dz = this._tmpPlayerWorldPos.z - this._tmpTriggerWorldPos.z
    const horizontalDistance = Math.sqrt((dx * dx) + (dz * dz))
    const verticalDistance = Math.abs(this._tmpPlayerWorldPos.y - this._tmpTriggerWorldPos.y)

    const horizontalTouch = horizontalDistance <= (triggerRadius + playerRadius)
    const verticalTouch = verticalDistance <= (triggerHalfHeight + playerRadius)
    return horizontalTouch && verticalTouch
  }

  update(delta, context = {}) {
    if (!this.eyeMesh) return { touchedPlayer: false }

    const {
      playerEntry = null,
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
      this._syncBodyToMesh(eyeEntry)
      this._syncBodyToMesh(triggerEntry)
      return { touchedPlayer: false }
    }

    this._descentElapsed = Math.min(this.descentDurationSec, this._descentElapsed + Math.max(0, delta))
    const progress = THREE.MathUtils.clamp(this._descentElapsed / this.descentDurationSec, 0, 1)

    if (playerEntry?.mesh) {
      this._tmpTargetPos.copy(playerEntry.mesh.position)
    } else {
      this._tmpTargetPos.copy(this.eyeMesh.position)
    }

    this.eyeMesh.position.lerpVectors(this._initialPosition, this._tmpTargetPos, progress)

    this._syncBodyToMesh(eyeEntry)
    this._syncBodyToMesh(triggerEntry)

    const touchedPlayer = this._isTriggerTouchingPlayer(playerEntry)
    return { touchedPlayer }
  }
}
