import * as THREE from "three"
import * as CANNON from "cannon-es"
import { COLLISION_GROUPS, COLLISION_MASKS, detectCueTouchingBalls, OBJECT_MASSES } from "../physics/physicsHelper.js"
import { CollisionManager } from "../utils/collisionManager.js"
import { createImpactRingEffect } from "../effects/particles/particle7.js"
import { playSound1, primeSound1Audio } from "../sounds/sound1.js"
import { computeSound4EquivalentFallHeight, playSound4 } from "../sounds/sound4.js"
import { playSound5, primeSound5Audio } from "../sounds/sound5.js"
import { playSound14 } from "../sounds/sound14.js"
import { playSound7 } from "../sounds/sound7.js"
import { playSound8 } from "../sounds/sound8.js"

// =============================================
const PLAYER_CONFIG = {
    maxSpeed: 5,
    acceleration: 10,
    jumpHeight: 1.5,
    maxSlopeAngle: 45,
    fixedTimeStep: 1 / 60,
    walkSpeed: 8,
    maxLegSwing: THREE.MathUtils.degToRad(45),
    chargeSpeed: 1.5,
    releaseSpeed: 10,
    maxCharge: 1,
    minForce: 0.005,
    maxForce: 0.05,
    forceMultiplier: 10,
    shotCooldown: 0.5,
    maxHeadYaw: THREE.MathUtils.degToRad(90),
    maxHeadPitch: THREE.MathUtils.degToRad(60),
    pitchSmooth: 0.3,
    bodyRotationSmooth: 5,
    showHitboxes: true,
    hitboxColor: 0xff4444,
    hitboxOpacity: 0.3,
    baseHitboxLength: 0.2,
    baseHitboxRadius: 0.1,
    hitboxLengthMultiplier: 2.5,
    hitboxRadiusMultiplier: 0.1,
    effectRadius: 0.001,
    effectRadiusMultiplier: 0.8,
    effectLength: 1.5,
    effectLengthMultiplier: 2.5,
    maxCarriedItems: 3,
    collectAnimationDuration: 0.22,
    stackGap: 0.0,
    stackBaseGap: 0.0,
    stackHeadInset: 0.04,
    dropForwardOffset: 0.52,
    dropUpwardOffset: 0.34,
    dropImpulse: 0.09,
    dropUpwardImpulse: 0.03,
    dropStabilizeMs: 260,
    dropStabilizeAngularDamping: 0.92,
    dropMaxAngularSpeed: 2.1,
    dropProbePadding: 0.08,
    dropRetryStep: 0.42,
    dropRetryHeightStep: 0.18,
    shuffleCameraPassthroughMs: 450,
    uncollectedItemMarkerScale: 0.42,
    uncollectedItemMarkerBobAmplitude: 0.05,
    uncollectedItemMarkerBobSpeed: 3.0,
    uncollectedItemMarkerYOffset: 0.22,
    uncollectedItemMarkerLifetimeMs: 60_000,
    collectScanIntervalSec: 1 / 20,
    markerUpdateIntervalSec: 1 / 12,
    movementTingMinSpeed: 0.35,
    movementTingMaxInterval: 0.17,
    movementTingMinInterval: 0.085,
    dropBlockedHintMs: 900,
    keys: {
        forward: "KeyW",
        backward: "KeyS", left: "KeyA", right: "KeyD",
        jump: "Space",
        charge: "KeyE",
        dropItem: "KeyQ",
        throwItem: "KeyZ",
    }
}

export class PlayerMovementController {
    constructor(camera, scene, physicsMaterials, canvas = null, syncList = null, destroySystem = null, cameraController = null) {
        this.camera = camera
        this.scene = scene
        this.physicsMaterials = physicsMaterials
        this.canvas = canvas
        this.syncList = syncList
        this.destroySystem = destroySystem
        this.cameraController = cameraController
        this.particleManager = null  // Will be set later
        this.uiManager = null

        this.keys = {
            w: false, a: false, s: false, d: false
        }
        this.jumpPressed = false
        this.canJump = false
        this.canAcceptInput = true
        this._inputDisabled = false
        
        this._isCharging = false
        this.chargeStartTime = 0
        this.currentCharge = 0
        this.lastShotTime = 0

        this.maxSlopeDot = Math.cos(THREE.MathUtils.degToRad(PLAYER_CONFIG.maxSlopeAngle))

        this.walkTime = 0
        this.bodyYaw = 0
        this.currentPitch = 0

        this.cueBody = null
        this.forceBody = null
        this.cueActive = false
        this.currentCuePivot = null
        this.moveDir = new THREE.Vector3()

        this.particleEffects = []
        this.globalShowHitboxes = PLAYER_CONFIG.showHitboxes
        this.currentMesh = null
        this.currentBody = null
        this.carriedItems = []
        this.dropItemQueued = false
        this.dropItemHeld = false
        this.throwItemQueued = false
        this.throwItemHeld = false
        this._cachedPlayerHeadOffset = null
        this._lastUpdateTs = performance.now()
        this._collectScanAccumulator = 0
        this._markerUpdateAccumulator = 0
        this._movementSoundAccumulator = 0
        this._movementSurfaceAudioType = "default-ground"
        this._movementSurfaceAudioCache = new WeakMap()
        this._wasGroundedLastFrame = false
        this._airborneMaxDownwardSpeed = 0

        this._tmpCollectTriggerCenter = new THREE.Vector3()
        this._tmpCollectItemPos = new THREE.Vector3()
        this._tmpCarryTargetQuat = new THREE.Quaternion()
        this._tmpMovementSoundSource = new THREE.Vector3()
        this._tmpMovementSoundListener = new THREE.Vector3()
        this._tmpInteractionSoundSource = new THREE.Vector3()
        this._tmpInteractionSoundListener = new THREE.Vector3()

        // Keep stable handler references for proper cleanup.
        this._boundOnKeyDown = this._onKeyDown.bind(this)
        this._boundOnKeyUp = this._onKeyUp.bind(this)
        this._updateInputFlag = () => {
            const activeElement = document.activeElement
            const isOnCanvas = activeElement === this.canvas
            const isOnBody = activeElement === document.body
            const isOnHTML = activeElement === document.documentElement

            this.canAcceptInput = isOnCanvas || isOnBody || isOnHTML

            if (!this.canAcceptInput) {
                this._resetAllKeys()
            }
        }
        this._onCanvasPointerLeave = () => {
            this.canAcceptInput = false
            this._resetAllKeys()
        }
        this._onCanvasPointerEnter = () => {
            this.canAcceptInput = true
        }

        this._setupEventListeners()
    }

    /**
     * Set the syncList and destroySystem for Ball 8 destruction on cue stroke
     */
    setSyncListAndDestroySystem(syncList, destroySystem) {
        this.syncList = syncList;
        this.destroySystem = destroySystem;
    }

    /**
     * Set the particleManager for spawning effects
     */
    setParticleManager(particleManager) {
        this.particleManager = particleManager;
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager || null
    }

    _setupEventListeners() {
        window.addEventListener("keydown", this._boundOnKeyDown)
        window.addEventListener("keyup", this._boundOnKeyUp)

        window.addEventListener("blur", this._updateInputFlag)
        document.addEventListener("focusin", this._updateInputFlag)
        document.addEventListener("focusout", this._updateInputFlag)
        document.addEventListener("mousedown", this._updateInputFlag)
        document.addEventListener("mouseup", this._updateInputFlag)
        
        if (this.canvas) {
            this.canvas.addEventListener("pointerleave", this._onCanvasPointerLeave)
            this.canvas.addEventListener("pointerenter", this._onCanvasPointerEnter)
        }
    }
    
    _resetAllKeys() {
        this.keys.w = false
        this.keys.a = false
        this.keys.s = false
        this.keys.d = false
        this.jumpPressed = false
        this._movementSoundAccumulator = 0
        this._movementSurfaceAudioType = "default-ground"
        this.moveDir.set(0, 0, 0)
        if (this._isCharging) {
            this._isCharging = false
            this.currentCharge = 0
        }
    }

    _onKeyDown(e) {
        if (this._inputDisabled || !this.canAcceptInput) {
            return
        }
        
        if (e.code === PLAYER_CONFIG.keys.forward) this.keys.w = true
        if (e.code === PLAYER_CONFIG.keys.left) this.keys.a = true
        if (e.code === PLAYER_CONFIG.keys.backward) this.keys.s = true
        if (e.code === PLAYER_CONFIG.keys.right) this.keys.d = true
        if (
            e.code === PLAYER_CONFIG.keys.forward
            || e.code === PLAYER_CONFIG.keys.left
            || e.code === PLAYER_CONFIG.keys.backward
            || e.code === PLAYER_CONFIG.keys.right
        ) {
            primeSound5Audio()
        }
        if (e.code === PLAYER_CONFIG.keys.jump) this.jumpPressed = true
        if (e.code === PLAYER_CONFIG.keys.dropItem && !this.dropItemHeld) {
            this.dropItemHeld = true
            this.dropItemQueued = true
        }
        if (e.code === PLAYER_CONFIG.keys.throwItem && !this.throwItemHeld) {
            this.throwItemHeld = true
            this.throwItemQueued = true
        }
        
        if (e.code === PLAYER_CONFIG.keys.charge && 
            !this._isCharging && 
            Date.now() - this.lastShotTime > PLAYER_CONFIG.shotCooldown * 1000) {
            primeSound1Audio()
            this._isCharging = true
            this.chargeStartTime = Date.now()
            this.currentCharge = 0
        }
    }

    _onKeyUp(e) {
        // ✨ IMPORTANT: Always reset keys on keyup, even if input is disabled
        // This prevents ghost movement when ESC is pressed while keys are held
        if (e.code === PLAYER_CONFIG.keys.forward) this.keys.w = false
        if (e.code === PLAYER_CONFIG.keys.left) this.keys.a = false
        if (e.code === PLAYER_CONFIG.keys.backward) this.keys.s = false
        if (e.code === PLAYER_CONFIG.keys.right) this.keys.d = false
        if (e.code === PLAYER_CONFIG.keys.dropItem) this.dropItemHeld = false
        if (e.code === PLAYER_CONFIG.keys.throwItem) this.throwItemHeld = false
        
        if (!this.canAcceptInput) {
            return
        }
        
        if (e.code === PLAYER_CONFIG.keys.charge && this._isCharging) {
            this._shoot()
            this._isCharging = false
            this.currentCharge = 0
        }
    }

    resetKeys() {
        this.keys.w = false
        this.keys.a = false
        this.keys.s = false
        this.keys.d = false
        this.jumpPressed = false
        this._movementSoundAccumulator = 0
        this.moveDir.set(0, 0, 0)
        this._isCharging = false
        this.currentCharge = 0
        this.dropItemQueued = false
        this.dropItemHeld = false
        this.throwItemQueued = false
        this.throwItemHeld = false
    }

    /**
     * Explicitly handle key up event for WASD to prevent ghost movement
     * Called from SimulationTest when ESC is pressed
     */
    handleKeyUp(keyCode) {
        if (keyCode === PLAYER_CONFIG.keys.forward) this.keys.w = false
        if (keyCode === PLAYER_CONFIG.keys.left) this.keys.a = false
        if (keyCode === PLAYER_CONFIG.keys.backward) this.keys.s = false
        if (keyCode === PLAYER_CONFIG.keys.right) this.keys.d = false
    }

    /**
     * Completely disable input handling to prevent ghost movement
     * Called from SimulationTest when ESC is pressed
     */
    disableInput() {
        this._inputDisabled = true
        this.canAcceptInput = false
        this._resetAllKeys()
    }

    /**
     * Re-enable input handling
     * Also resets all keys to prevent ghost movement from stale key state
     */
    enableInput() {
        this._inputDisabled = false
        this.canAcceptInput = true
        this._resetAllKeys()
    }

    _checkGrounded(body) {
        this.canJump = false;
        this._movementSurfaceAudioType = "default-ground"
        if (!body.world) return

        const up = new CANNON.Vec3(0, 1, 0)
        let groundedBody = null
        let groundedShape = null
        let bestGroundDot = -Infinity

        for (let contact of body.world.contacts) {
            if (contact.bi !== body && contact.bj !== body) continue

            const normal = new CANNON.Vec3()
            if (contact.bi === body) {
                contact.ni.negate(normal)
            } else {
                normal.copy(contact.ni)
            }

            const groundDot = normal.dot(up)
            if (groundDot > this.maxSlopeDot && groundDot > bestGroundDot) {
                bestGroundDot = groundDot
                groundedBody = contact.bi === body ? contact.bj : contact.bi
                groundedShape = contact.bi === body ? contact.sj : contact.si
            }
        }

        if (groundedBody) {
            this.canJump = true;
            this._movementSurfaceAudioType = this._resolveGroundedSurfaceAudioType(groundedBody, groundedShape)
        }
    }

    _resolveGroundedSurfaceAudioType(groundedBody, groundedShape) {
        const directShapeType = groundedShape?.userData?.surfaceAudioType
        if (typeof directShapeType === "string" && directShapeType.trim().length > 0) {
            return directShapeType.trim()
        }

        const indexedShapeTypes = groundedBody?.userData?.surfaceAudioTypesByShapeIndex
        if (Array.isArray(indexedShapeTypes) && groundedShape && Array.isArray(groundedBody?.shapes)) {
            const shapeIndex = groundedBody.shapes.indexOf(groundedShape)
            if (shapeIndex >= 0) {
                const indexedType = indexedShapeTypes[shapeIndex]
                if (typeof indexedType === "string" && indexedType.trim().length > 0) {
                    return indexedType.trim()
                }
            }
        }

        const bodySurfaceType = groundedBody?.userData?.surfaceAudioType
        if (typeof bodySurfaceType === "string" && bodySurfaceType.trim().length > 0) {
            return bodySurfaceType.trim()
        }

        return this._getMovementSurfaceAudioType(groundedBody, groundedShape)
    }

    _getMovementSurfaceAudioType(surfaceBody, groundedShape = null) {
        if (!surfaceBody || typeof surfaceBody !== "object") return "default-ground"

        const cachedType = this._movementSurfaceAudioCache.get(surfaceBody)
        if (cachedType !== undefined) {
            return this._appendMovementShapeRole(cachedType, groundedShape)
        }

        const surfaceEntry = Array.isArray(this.syncList)
            ? this.syncList.find((entry) => entry?.body === surfaceBody && entry.mesh)
            : null
        const surfaceType = this._resolveMovementSurfaceAudioType(surfaceEntry?.mesh || null, surfaceBody?.name)

        this._movementSurfaceAudioCache.set(surfaceBody, surfaceType)
        return this._appendMovementShapeRole(surfaceType, groundedShape)
    }

    _resolveMovementSurfaceAudioType(surfaceMesh, fallbackName = "") {
        if (typeof surfaceMesh?.userData?.surfaceAudioType === "string" && surfaceMesh.userData.surfaceAudioType.trim().length > 0) {
            return surfaceMesh.userData.surfaceAudioType.trim()
        }

        let resolvedSurfaceType = ""
        let fallbackMeshName = ""
        if (surfaceMesh && typeof surfaceMesh.traverse === "function") {
            surfaceMesh.traverse((child) => {
                if (!resolvedSurfaceType && typeof child?.userData?.surfaceAudioType === "string" && child.userData.surfaceAudioType.trim().length > 0) {
                    resolvedSurfaceType = child.userData.surfaceAudioType.trim()
                    return
                }

                if (!fallbackMeshName && child?.isMesh && typeof child.name === "string" && child.name.trim().length > 0) {
                    fallbackMeshName = child.name.trim()
                }
            })
        }

        if (resolvedSurfaceType) {
            return resolvedSurfaceType
        }

        const normalizedName = this._normalizeMovementSurfaceToken(surfaceMesh?.name || fallbackMeshName || fallbackName)
        return normalizedName ? `object:${normalizedName}` : "default-ground"
    }

    _appendMovementShapeRole(baseSurfaceType, groundedShape) {
        const normalizedBaseType = typeof baseSurfaceType === "string" && baseSurfaceType.trim().length > 0
            ? baseSurfaceType.trim()
            : "default-ground"
        const normalizedRole = this._normalizeMovementSurfaceToken(groundedShape?.userData?.role)
        if (!normalizedRole || normalizedBaseType.startsWith("shape:")) {
            return normalizedBaseType
        }

        return `${normalizedBaseType}:shape-${normalizedRole}`
    }

    _normalizeMovementSurfaceToken(value) {
        if (typeof value !== "string") return ""

        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
    }

    _isItemEntry(entry) {
        if (!entry?.body || !entry?.mesh) return false

        const explicitCategory = entry.spawnCategory || entry.body?.userData?.spawnCategory || entry.mesh?.userData?.spawnCategory
        if (explicitCategory === 'item') return true
        if (explicitCategory === 'gameObject') return false

        return entry.body.collisionFilterGroup === COLLISION_GROUPS.ITEM
    }

    _isEntryCarried(entry) {
        return this.carriedItems.some(carried => carried.entry === entry)
    }

    _clearUncollectedItemMarker(entry) {
        const ownerMesh = entry?.mesh
        if (!ownerMesh || !this.particleManager?.clearItemArrowForOwner) return
        this.particleManager.clearItemArrowForOwner(ownerMesh)
    }

    _resetUncollectedItemMarkerLifetime(entry) {
        const userData = entry?.body?.userData
        if (!userData) return
        delete userData.uncollectedItemMarkerShownAt
    }

    _shouldShowUncollectedItemMarker(entry, now = Date.now()) {
        if (!this._isItemEntry(entry)) return false

        const body = entry?.body
        const ownerMesh = entry?.mesh
        if (!body || !ownerMesh) return false

        body.userData = body.userData || {}
        const userData = body.userData
        const isCollectedItem = !!userData.isCollectedItem
        const hasBeenCollectedOnce = !!userData.hasBeenCollectedOnce
        const isCarriedItem = !!userData.isCarriedItem || !!ownerMesh.userData?._cachedCarriedFlag || !!ownerMesh.userData?.isCarriedItem

        if (hasBeenCollectedOnce || isCollectedItem || isCarriedItem) {
            this._resetUncollectedItemMarkerLifetime(entry)
            return false
        }

        if (!Number.isFinite(userData.uncollectedItemMarkerShownAt)) {
            userData.uncollectedItemMarkerShownAt = now
        }

        return (now - userData.uncollectedItemMarkerShownAt) < PLAYER_CONFIG.uncollectedItemMarkerLifetimeMs
    }

    _syncCarriedItemMarkers() {
        if (!this.particleManager || this.carriedItems.length === 0) return

        for (const carried of this.carriedItems) {
            this._clearUncollectedItemMarker(carried?.entry)
        }
    }

    _getQuaternionYRowAbs(q) {
        const x = q?.x ?? 0
        const y = q?.y ?? 0
        const z = q?.z ?? 0
        const w = q?.w ?? 1

        return {
            x: Math.abs(2 * ((x * y) + (w * z))),
            y: Math.abs(1 - (2 * ((x * x) + (z * z)))),
            z: Math.abs(2 * ((y * z) - (w * x)))
        }
    }

    _getShapeVerticalExtent(shape, orientation) {
        if (!shape) return 0.12

        if (shape instanceof CANNON.Sphere) {
            return shape.radius || 0.12
        }

        if (shape instanceof CANNON.Box) {
            const he = shape.halfExtents
            if (!he) return 0.12
            const row = this._getQuaternionYRowAbs(orientation)
            return (row.x * he.x) + (row.y * he.y) + (row.z * he.z)
        }

        if (shape instanceof CANNON.Cylinder) {
            const rTop = shape.radiusTop ?? shape.radius ?? 0.06
            const rBottom = shape.radiusBottom ?? shape.radius ?? 0.06
            const radius = Math.max(rTop, rBottom)
            const halfHeight = (shape.height ?? shape.length ?? 0.24) * 0.5
            const row = this._getQuaternionYRowAbs(orientation)
            return (row.x * radius) + (row.y * halfHeight) + (row.z * radius)
        }

        if (typeof shape.boundingSphereRadius === 'number') {
            return Math.max(0.12, shape.boundingSphereRadius)
        }

        return 0.12
    }

    _getBodyVerticalBounds(body) {
        if (!body || !body.shapes || body.shapes.length === 0) {
            return { minY: -0.12, maxY: 0.12, height: 0.24 }
        }

        let minY = Infinity
        let maxY = -Infinity

        for (let i = 0; i < body.shapes.length; i++) {
            const shape = body.shapes[i]
            if (!shape) continue

            const offset = body.shapeOffsets?.[i] || new CANNON.Vec3(0, 0, 0)
            const orientation = body.shapeOrientations?.[i] || new CANNON.Quaternion(0, 0, 0, 1)
            const extentY = this._getShapeVerticalExtent(shape, orientation)

            minY = Math.min(minY, offset.y - extentY)
            maxY = Math.max(maxY, offset.y + extentY)
        }

        if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY <= minY) {
            return { minY: -0.12, maxY: 0.12, height: 0.24 }
        }

        return {
            minY,
            maxY,
            height: maxY - minY
        }
    }

    _getBodyApproxHeight(body) {
        return this._getBodyVerticalBounds(body).height
    }

    _handleMovement(body) {
        // ✨ If input is disabled, stop movement immediately
        if (this._inputDisabled || !this.canAcceptInput) {
            this.keys.w = false
            this.keys.a = false
            this.keys.s = false
            this.keys.d = false
            this.moveDir.set(0, 0, 0)
            body.velocity.x = 0
            body.velocity.z = 0
            return
        }

        const cameraDir = new THREE.Vector3();
        if (this.cameraController && typeof this.cameraController.getControlWorldDirection === 'function') {
            this.cameraController.getControlWorldDirection(cameraDir)
        } else {
            this.camera.getWorldDirection(cameraDir)
        }
        cameraDir.y = 0
        cameraDir.normalize()

        const right = new THREE.Vector3()
        right.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize()

        this.moveDir.set(0, 0, 0);

        if (this.keys.w) this.moveDir.add(cameraDir);
        if (this.keys.s) this.moveDir.sub(cameraDir);
        if (this.keys.a) this.moveDir.sub(right);
        if (this.keys.d) this.moveDir.add(right);

        if (this.moveDir.length() > 0) {
            this.moveDir.normalize();

            const targetYaw = Math.atan2(this.moveDir.x, this.moveDir.z);
            let diff = targetYaw - this.bodyYaw;

            while (diff > Math.PI) diff -= Math.PI * 2
            while (diff < -Math.PI) diff += Math.PI * 2

            this.bodyYaw += diff * PLAYER_CONFIG.bodyRotationSmooth * PLAYER_CONFIG.fixedTimeStep;
        }

        const targetVelX = this.moveDir.x * PLAYER_CONFIG.maxSpeed;
        const targetVelZ = this.moveDir.z * PLAYER_CONFIG.maxSpeed;

        body.velocity.x += (targetVelX - body.velocity.x) * PLAYER_CONFIG.acceleration * PLAYER_CONFIG.fixedTimeStep
        body.velocity.z += (targetVelZ - body.velocity.z) * PLAYER_CONFIG.acceleration * PLAYER_CONFIG.fixedTimeStep
    }

    _handleJump(body, mesh, cameraController) {
        if (!this.jumpPressed || !this.canJump) return;

        const gravity = Math.abs(body.world.gravity.y)
        const jumpSpeed = Math.sqrt(2 * gravity * PLAYER_CONFIG.jumpHeight)

        const sourcePosition = this._tmpMovementSoundSource.set(body.position.x, body.position.y, body.position.z)
        const listenerBase = cameraController?.camera?.position || this.cameraController?.camera?.position || this.camera?.position
        const listenerPosition = listenerBase
            ? this._tmpMovementSoundListener.copy(listenerBase)
            : null

        body.velocity.y = jumpSpeed;
        playSound14({
            jumpSpeed,
            sourcePosition,
            listenerPosition,
        })
        this.jumpPressed = false;
        this.canJump = false;
    }

    _updateMovementTingSound(body, mesh, cameraController, frameDelta) {
        if (!body || !mesh || mesh.name !== "Player") {
            this._movementSoundAccumulator = 0
            return
        }

        const hasMovementInput = this.keys.w || this.keys.a || this.keys.s || this.keys.d
        const horizontalSpeed = Math.hypot(body.velocity.x || 0, body.velocity.z || 0)
        if (
            !this.canJump
            || !hasMovementInput
            || horizontalSpeed < PLAYER_CONFIG.movementTingMinSpeed
            || this._inputDisabled
            || !this.canAcceptInput
        ) {
            this._movementSoundAccumulator = 0
            return
        }

        const speedNorm = THREE.MathUtils.clamp(horizontalSpeed / Math.max(0.001, PLAYER_CONFIG.maxSpeed), 0, 1)
        const interval = THREE.MathUtils.lerp(
            PLAYER_CONFIG.movementTingMaxInterval,
            PLAYER_CONFIG.movementTingMinInterval,
            speedNorm
        )

        this._movementSoundAccumulator += frameDelta
        if (this._movementSoundAccumulator < interval) {
            return
        }

        this._movementSoundAccumulator %= interval

        const sourcePosition = this._tmpMovementSoundSource.set(body.position.x, body.position.y, body.position.z)
        const listenerBase = cameraController?.camera?.position || this.camera?.position
        const listenerPosition = listenerBase
            ? this._tmpMovementSoundListener.copy(listenerBase)
            : null

        playSound5({
            speed: horizontalSpeed,
            surfaceAudioType: this._movementSurfaceAudioType,
            sourcePosition,
            listenerPosition,
        })
    }

    _updateLandingThudSound(body, mesh, cameraController) {
        if (!body || !mesh || mesh.name !== "Player") {
            this._wasGroundedLastFrame = false
            this._airborneMaxDownwardSpeed = 0
            return
        }

        const isGrounded = this.canJump === true
        const downwardSpeed = Math.max(0, -(body.velocity?.y || 0))

        if (!isGrounded) {
            this._airborneMaxDownwardSpeed = Math.max(this._airborneMaxDownwardSpeed, downwardSpeed)
        } else if (!this._wasGroundedLastFrame) {
            const fallHeight = computeSound4EquivalentFallHeight(this._airborneMaxDownwardSpeed)
            if (fallHeight >= 0.55) {
                const sourcePosition = this._tmpMovementSoundSource.set(body.position.x, body.position.y, body.position.z)
                const listenerBase = cameraController?.camera?.position || this.camera?.position
                const listenerPosition = listenerBase
                    ? this._tmpMovementSoundListener.copy(listenerBase)
                    : null

                playSound4({
                    fallHeight,
                    targetMass: body.mass || 1,
                    sourcePosition,
                    listenerPosition,
                })
            }

            this._airborneMaxDownwardSpeed = 0
        }

        if (isGrounded && this._wasGroundedLastFrame) {
            this._airborneMaxDownwardSpeed = 0
        }

        this._wasGroundedLastFrame = isGrounded
    }

    _getPlayerInteractionSoundPositions(mesh) {
        const sourcePosition = this.currentBody
            ? this._tmpInteractionSoundSource.set(this.currentBody.position.x, this.currentBody.position.y, this.currentBody.position.z)
            : mesh?.position
                ? this._tmpInteractionSoundSource.copy(mesh.position)
                : null

        const listenerBase = this.cameraController?.camera?.position || this.camera?.position
        const listenerPosition = listenerBase
            ? this._tmpInteractionSoundListener.copy(listenerBase)
            : null

        return { sourcePosition, listenerPosition }
    }

    _animateLegs(mesh, body) {
        if (!mesh) return

        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.z ** 2)

        const legs = []
        mesh.traverse(child => {
            if (child.userData && child.userData.isLeg) legs.push(child)
        })

        if (speed > 0.2) {
            this.walkTime += PLAYER_CONFIG.fixedTimeStep * PLAYER_CONFIG.walkSpeed * speed;
            const swing = Math.sin(this.walkTime) * PLAYER_CONFIG.maxLegSwing;
            if (legs[0]) legs[0].rotation.x = swing
            if (legs[1]) legs[1].rotation.x = -swing
        } else {
            this.walkTime = 0;
            legs.forEach(leg => {
                leg.rotation.x += (0 - leg.rotation.x) * 10 * PLAYER_CONFIG.fixedTimeStep
            })
        }
    }

    _updateHeadRotation(mesh) {
        let cuePivot = null
        mesh.traverse(child => {
            if (child.userData && child.userData.isCuePivot) cuePivot = child
        })

        if (!cuePivot) return

        const cameraDir = new THREE.Vector3();
        if (this.cameraController && typeof this.cameraController.getControlWorldDirection === 'function') {
            this.cameraController.getControlWorldDirection(cameraDir)
        } else {
            this.camera.getWorldDirection(cameraDir)
        }

        const bodyMatrix = new THREE.Matrix4().makeRotationY(this.bodyYaw);
        const invBody = bodyMatrix.clone().invert()

        const localDir = cameraDir.clone().applyMatrix4(invBody)

        let yaw = Math.atan2(localDir.x, localDir.z)
        const horizontalLen = Math.sqrt(localDir.x ** 2 + localDir.z ** 2)
        let pitch = -Math.atan2(localDir.y, horizontalLen)

        pitch = Math.max(-PLAYER_CONFIG.maxHeadPitch, Math.min(PLAYER_CONFIG.maxHeadPitch, pitch))

        if (yaw > PLAYER_CONFIG.maxHeadYaw) {
            this.bodyYaw += yaw - PLAYER_CONFIG.maxHeadYaw;
            yaw = PLAYER_CONFIG.maxHeadYaw
        }

        if (yaw < -PLAYER_CONFIG.maxHeadYaw) {
            this.bodyYaw += yaw + PLAYER_CONFIG.maxHeadYaw;
            yaw = -PLAYER_CONFIG.maxHeadYaw
        }

        this.currentPitch += (pitch - this.currentPitch) * PLAYER_CONFIG.pitchSmooth;
        cuePivot.rotation.set(Math.PI / 2 + this.currentPitch, yaw, 0, "YXZ");
    }

    _animateCueCharge(mesh) {
        let cuePivot = null
        mesh.traverse(child => {
            if (child.userData && child.userData.isCuePivot) cuePivot = child
        })

        if (!cuePivot) return

        const cueBody = cuePivot.getObjectByName("PlayerCue")
        if (!cueBody) return

        const originalLength = cuePivot.userData.originalLength || 4;
        const minLength = cuePivot.userData.minLength || 2;

        if (this._isCharging) {
            const chargeTime = (Date.now() - this.chargeStartTime) / 1000;
            this.currentCharge = Math.min(chargeTime * PLAYER_CONFIG.chargeSpeed, PLAYER_CONFIG.maxCharge);
        } else {
            this.currentCharge -= PLAYER_CONFIG.releaseSpeed * PLAYER_CONFIG.fixedTimeStep;
            if (this.currentCharge < 0) this.currentCharge = 0;
        }

        const currentLength = originalLength - this.currentCharge * (originalLength - minLength);
        const scaleY = currentLength / originalLength

        cueBody.scale.set(1, scaleY, 1)
        cueBody.position.y = (currentLength / 2)

        // Đã loại bỏ logic cập nhật force hitbox (màu đỏ) theo yêu cầu.
    }

    _shoot() {
        if (!this.currentMesh || this.currentCharge <= 0.1) return;
        
        this.lastShotTime = Date.now();
        
        const force = (PLAYER_CONFIG.minForce + 
                      this.currentCharge * (PLAYER_CONFIG.maxForce - PLAYER_CONFIG.minForce)) * 
                      PLAYER_CONFIG.forceMultiplier;
        
        const direction = this.getCueWorldDirection(this.currentMesh);
        const tipPos = this.getCueTipPosition(this.currentMesh);
        
        if (this.currentBody && this.currentBody.world) {
            const hitRadius = PLAYER_CONFIG.effectRadius + 
                            this.currentCharge * PLAYER_CONFIG.effectRadiusMultiplier;
            const hitLength = PLAYER_CONFIG.effectLength + 
                            this.currentCharge * PLAYER_CONFIG.effectLengthMultiplier;
            
            // ✨ Track balls hit by cue for particle effects + recoil calculation
            const hitBalls = [];
            let totalRecoilImpulse = 0;  // ✨ Track recoil for Newton's 3rd law
            
            this.currentBody.world.bodies.forEach(body => {
                if (body.mass === 0 || body === this.currentBody) return;
                
                const bodyPos = body.position
                const toBody = new CANNON.Vec3(
                    bodyPos.x - tipPos.x,
                    bodyPos.y - tipPos.y,
                    bodyPos.z - tipPos.z
                )
                const dirVec = new CANNON.Vec3(direction.x, direction.y, direction.z);
                const distAlongDir = toBody.dot(dirVec);
                if (distAlongDir < 0 || distAlongDir > hitLength) return;
                
                const perpDistSq = Math.max(0, toBody.lengthSquared() - distAlongDir * distAlongDir);
                
                const bodyRadius = this._getBodyApproxRadius(body);
                const totalRadius = hitRadius + bodyRadius;

                if (perpDistSq > totalRadius * totalRadius) return;
                
                // ✨ Tính impact normal (hướng từ cue tip đến ball contact point)
                const toBallVec = new THREE.Vector3(
                    bodyPos.x - tipPos.x,
                    bodyPos.y - tipPos.y,
                    bodyPos.z - tipPos.z
                ).normalize();

                const impactPoint = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z)
                    .addScaledVector(toBallVec, -(bodyRadius || 0.08));

                const forceFactor = 1 - (distAlongDir / hitLength);
                const finalForce = force * forceFactor;
                
                // ✨ Lưu lại ball hit info + normal
                hitBalls.push({
                    body: body,
                    contactPos: new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z),
                    impactPoint: impactPoint,
                    impactNormal: toBallVec,
                    impactForce: finalForce,
                    targetMass: body.mass || OBJECT_MASSES.BILLIARD_BALL
                });
                
                // ✨ Find ball name in syncList to check if it's Ball 8
                const ballEntry = this.syncList ? this.syncList.find(e => e.body === body) : null;
                const isBall8 = ballEntry && ballEntry.name === 'Ball 8';
                
                // ✨ Apply impulse: Contact Point for Ball 8, Center of Mass for regular balls
                if (isBall8) {
                    // Ball 8: Apply impulse at contact point to reduce unwanted spin
                    const ballRadius = (body.shapes[0] && body.shapes[0] instanceof CANNON.Sphere) ? body.shapes[0].radius : 0.15;
                    const impactOffset = new CANNON.Vec3(
                        toBallVec.x * ballRadius * 0.8,  // 80% of radius to reduce spin further
                        toBallVec.y * ballRadius * 0.8,
                        toBallVec.z * ballRadius * 0.8
                    );
                    
                    body.applyImpulse(
                        new CANNON.Vec3(
                            direction.x * finalForce,
                            direction.y * finalForce,
                            direction.z * finalForce
                        ),
                        impactOffset  // Apply at contact point
                    );
                    
                    // Dampen angular velocity to prevent excessive spin (Ball 8 only)
                    if (body.angularVelocity) {
                        body.angularVelocity.scale(0.3, body.angularVelocity);  // Keep only 30% of spin
                    }
                } else {
                    // Regular balls: Apply impulse at center of mass (normal behavior)
                    body.applyImpulse(
                        new CANNON.Vec3(
                            direction.x * finalForce,
                            direction.y * finalForce,
                            direction.z * finalForce
                        ),
                        body.position  // Apply at center
                    );
                }
                
                // ✨ Newton's 3rd Law Recoil
                // Because player is very light (0.01kg), heavier objects push much harder
                // Scaling: ball(0.17kg)→light, bowling(6.5kg)→medium, dummy(100kg)→strong
                const hitObjectMass = body.mass || 0.17;  // Default to ball mass if not set
                const massRatio = hitObjectMass / OBJECT_MASSES.PLAYER;  // e.g., 17 for ball, 650 for bowling, 10000 for dummy
                const sqrtMassRatio = Math.sqrt(massRatio);  // Square root prevents extreme scaling
                const recoilScaling = Math.min(sqrtMassRatio * 0.08, 3.0);  // Cap at 3.0 to keep reasonable bounds
                totalRecoilImpulse += finalForce * recoilScaling;
            })
            
            // ✨ Apply recoil impulse to player (push backwards)
            if (totalRecoilImpulse > 0 && this.currentBody) {
                this.currentBody.applyImpulse(
                    new CANNON.Vec3(
                        -direction.x * totalRecoilImpulse,
                        -direction.y * totalRecoilImpulse * 0.3,  // Reduce vertical recoil
                        -direction.z * totalRecoilImpulse
                    ),
                    this.currentBody.position
                )
                
                // ✨ Prevent excessive spinning during recoil
                // Dampen angular velocity perpendicular to movement to prevent wild rotation
                // Keep rolling motion along movement direction
                const moveDir = new THREE.Vector3(direction.x, 0, direction.z).normalize();
                const angVel = this.currentBody.angularVelocity;
                const angVelAlongMove = angVel.dot(new CANNON.Vec3(moveDir.x, 0, moveDir.z));
                
                // Reset angular velocity and only keep forward-roll component (reduced)
                this.currentBody.angularVelocity.set(
                    angVelAlongMove * moveDir.x * 0.3,  // Keep 30% of forward roll
                    angVel.y * 0.1,  // Heavily dampen vertical spin
                    angVelAlongMove * moveDir.z * 0.3   // Keep 30% of forward roll
                );
            }
            
            // ✨ Check if Ball 8 was hit by cue - only destroy if FATIGUED
            if (this.syncList && this.destroySystem) {
                hitBalls.forEach(hit => {
                    // Find the entry in syncList corresponding to this body
                    const ball8Entry = this.syncList.find(e => e.body === hit.body);
                    if (ball8Entry && ball8Entry.name === 'Ball 8') {
                        const ball8AI = ball8Entry.body.userData?.ball8AI;
                        
                        // ✨ NEW: Only destroy if ball 8 is FATIGUED
                        if (ball8AI && ball8AI.isFatigued) {
                            console.debug('[playerMovement] Ball 8 hit by cue while FATIGUED - destroying');
                            // Destroy Ball 8 by calling the destroy system's destroy method
                            this.destroySystem._destroyEntry(ball8Entry);
                        } else {
                            // ✨ NEW: Ball 8 not fatigued - trigger blasting effect instead
                            console.debug('[playerMovement] Ball 8 hit by cue while NOT fatigued - blasting effect');
                            if (this.particleManager) {
                                this.particleManager.spawn('blasting', hit.contactPos);
                            }
                        }
                    }
                });
            }
            
            // ✨ Trigger impact ring effect cho mỗi ball bị chạm
            if (hitBalls.length > 0) {
                hitBalls.forEach(hit => {
                    if (this.scene) {
                        const impactEffect = createImpactRingEffect(
                            this.scene,
                            hit.contactPos,
                            {
                                lifetime: 0.3,
                                initialOpacity: Math.min(this.currentCharge * 0.8, 0.9),
                                impactNormal: hit.impactNormal
                            }
                        );
                        // Store effect để update trong loop
                        if (!this.particleEffects) {
                            this.particleEffects = [];
                        }
                        this.particleEffects.push(impactEffect);
                    }

                    playSound1({
                        impactForce: hit.impactForce,
                        targetMass: hit.targetMass,
                        charge: this.currentCharge,
                        sourcePosition: hit.impactPoint,
                        listenerPosition: this.camera ? this.camera.position : null
                    })
                });
            }
        }
        

    }

            _getBodyApproxRadius(body) {
                if (!body || !body.shapes || body.shapes.length === 0) return 0.12;

                let maxRadius = 0;
                body.shapes.forEach(shape => {
                    if (!shape) return;

                    if (shape instanceof CANNON.Sphere) {
                        maxRadius = Math.max(maxRadius, shape.radius || 0);
                        return;
                    }

                    if (shape instanceof CANNON.Cylinder) {
                        const topRadius = shape.radiusTop ?? shape.radius ?? 0;
                        const bottomRadius = shape.radiusBottom ?? shape.radius ?? 0;
                        maxRadius = Math.max(maxRadius, topRadius, bottomRadius);
                        return;
                    }

                    if (shape instanceof CANNON.Box) {
                        const he = shape.halfExtents;
                        if (he) {
                            maxRadius = Math.max(maxRadius, Math.sqrt((he.x * he.x) + (he.y * he.y) + (he.z * he.z)));
                        }
                    }
                });

                return Math.max(maxRadius, 0.12);
            }

    _getItemStackHeight(entry) {
        // Prefer physics body height — more reliable than world-space mesh bounds
        if (entry?.body) {
            const h = this._getBodyApproxHeight(entry.body)
            if (h > 0.001) return h
        }

        if (entry?.mesh) {
            entry.mesh.updateMatrixWorld(true)
            const box = new THREE.Box3().setFromObject(entry.mesh)
            const size = box.getSize(new THREE.Vector3())
            if (size.y > 0.0001) return size.y
        }

        return 0.24
    }

    _getPlayerBodyTop(mesh, playerBody = null) {
        const anchorBody = playerBody || this.currentBody
        if (anchorBody) {
            if ((this._cachedPlayerHeadOffset === null || !Number.isFinite(this._cachedPlayerHeadOffset)) && mesh) {
                mesh.updateMatrixWorld(true)
                const bodyMesh = mesh.getObjectByName('PlayerBodyMesh') || mesh.children.find(child => child.userData?.isPlayerBodyMain)
                if (bodyMesh) {
                    const box = new THREE.Box3().setFromObject(bodyMesh)
                    this._cachedPlayerHeadOffset = box.max.y - anchorBody.position.y
                }
            }

            const headOffset = Number.isFinite(this._cachedPlayerHeadOffset) ? this._cachedPlayerHeadOffset : 0.9
            const predictedY = anchorBody.position.y + ((anchorBody.velocity?.y || 0) * PLAYER_CONFIG.fixedTimeStep)
            return predictedY + headOffset - PLAYER_CONFIG.stackHeadInset
        }

        if (!mesh) return 0

        mesh.updateMatrixWorld(true)
        const bodyMesh = mesh.getObjectByName('PlayerBodyMesh') || mesh.children.find(child => child.userData?.isPlayerBodyMain)
        if (bodyMesh) {
            const box = new THREE.Box3().setFromObject(bodyMesh)
            return box.max.y - PLAYER_CONFIG.stackHeadInset
        }

        return mesh.position.y + 0.9 - PLAYER_CONFIG.stackHeadInset
    }

    _getStackTargetForIndex(index, mesh, playerBody = null) {
        // Use mesh position directly to avoid 1-frame carry item delay
        // Items follow the visual position (already synced), not predicted physics position
        const anchorBody = playerBody || this.currentBody
        const anchorX = mesh.position.x
        const anchorZ = mesh.position.z
        const baseY = this._getPlayerBodyTop(mesh, anchorBody) + PLAYER_CONFIG.stackBaseGap
        let accumulatedHeight = 0

        for (let i = 0; i < index; i++) {
            const prevBounds = this.carriedItems[i]?.stackBounds || { height: this.carriedItems[i]?.stackHeight || 0.24 }
            accumulatedHeight += prevBounds.height + PLAYER_CONFIG.stackGap
        }

        const carried = this.carriedItems[index]
        const currentBounds = carried?.stackBounds || { minY: -0.12, height: carried?.stackHeight || 0.24 }
        const targetY = baseY + accumulatedHeight - currentBounds.minY
        return new THREE.Vector3(
            anchorX,
            targetY,
            anchorZ
        )
    }

    _syncBodyInterpolation(body) {
        if (!body) return

        if (body.previousPosition) {
            body.previousPosition.copy(body.position)
        }
        if (body.interpolatedPosition) {
            body.interpolatedPosition.copy(body.position)
        }
        if (body.previousQuaternion) {
            body.previousQuaternion.copy(body.quaternion)
        }
        if (body.interpolatedQuaternion) {
            body.interpolatedQuaternion.copy(body.quaternion)
        }
    }

    _getDropReleaseDirection() {
        const direction = new THREE.Vector3()

        if (this.cameraController && typeof this.cameraController.getControlWorldDirection === 'function') {
            this.cameraController.getControlWorldDirection(direction)
        } else if (this.camera && typeof this.camera.getWorldDirection === 'function') {
            this.camera.getWorldDirection(direction)
        }

        direction.y = 0
        if (direction.lengthSq() < 1e-5) {
            direction.set(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw))
        }

        return direction.normalize()
    }

    _isDropShapeBlocked(candidatePos, probeRadius, bodyPosition, bodyQuaternion, shape, shapeOffset, shapeOrientation) {
        if (!shape) return false

        const padding = probeRadius + PLAYER_CONFIG.dropProbePadding
        const worldShapePosition = new THREE.Vector3(shapeOffset.x, shapeOffset.y, shapeOffset.z)
            .applyQuaternion(bodyQuaternion)
            .add(bodyPosition)
        const worldShapeQuaternion = new THREE.Quaternion(
            bodyQuaternion.x,
            bodyQuaternion.y,
            bodyQuaternion.z,
            bodyQuaternion.w
        ).multiply(new THREE.Quaternion(
            shapeOrientation.x,
            shapeOrientation.y,
            shapeOrientation.z,
            shapeOrientation.w
        ))

        if (shape instanceof CANNON.Sphere) {
            const radius = (shape.radius || 0) + padding
            return candidatePos.distanceToSquared(worldShapePosition) <= radius * radius
        }

        const localPoint = candidatePos.clone().sub(worldShapePosition).applyQuaternion(worldShapeQuaternion.clone().invert())

        if (shape instanceof CANNON.Box) {
            const he = shape.halfExtents
            return (
                Math.abs(localPoint.x) <= Math.abs(he.x) + padding &&
                Math.abs(localPoint.y) <= Math.abs(he.y) + padding &&
                Math.abs(localPoint.z) <= Math.abs(he.z) + padding
            )
        }

        if (shape instanceof CANNON.Cylinder) {
            const radius = Math.max(shape.radiusTop || 0, shape.radiusBottom || 0) + padding
            const halfHeight = (shape.height || shape.length || 0) * 0.5 + padding
            return ((localPoint.x * localPoint.x) + (localPoint.z * localPoint.z)) <= radius * radius && Math.abs(localPoint.y) <= halfHeight
        }

        return false
    }

    _isDropCandidateBlocked(candidatePos, probeRadius, droppedEntry, playerMesh) {
        if (!Array.isArray(this.syncList)) return false

        for (const entry of this.syncList) {
            if (!entry?.body) continue
            if (entry === droppedEntry) continue
            if (entry.mesh === playerMesh) continue
            if (entry.type === 'trigger') continue
            if (entry.mesh?.userData?.isTriggerBox) continue
            if (this._isEntryCarried(entry)) continue

            const bodyPosition = new THREE.Vector3(entry.body.position.x, entry.body.position.y, entry.body.position.z)
            const bodyQuaternion = new THREE.Quaternion(
                entry.body.quaternion.x,
                entry.body.quaternion.y,
                entry.body.quaternion.z,
                entry.body.quaternion.w
            )
            const shapes = entry.body.shapes || []

            for (let index = 0; index < shapes.length; index += 1) {
                const shape = shapes[index]
                const shapeOffset = entry.body.shapeOffsets?.[index] || new CANNON.Vec3(0, 0, 0)
                const shapeOrientation = entry.body.shapeOrientations?.[index] || new CANNON.Quaternion(0, 0, 0, 1)

                if (this._isDropShapeBlocked(candidatePos, probeRadius, bodyPosition, bodyQuaternion, shape, shapeOffset, shapeOrientation)) {
                    return true
                }
            }
        }

        return false
    }

    _findSafeDropPosition(mesh, carried, forward) {
        const body = carried?.entry?.body
        const probeRadius = this._getBodyApproxRadius(body)
        const baseY = this._getPlayerBodyTop(mesh) + PLAYER_CONFIG.dropUpwardOffset
        const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize()
        const step = PLAYER_CONFIG.dropRetryStep
        const lift = PLAYER_CONFIG.dropRetryHeightStep
        const candidateOffsets = [
            { forward: PLAYER_CONFIG.dropForwardOffset, right: 0, up: 0 },
            { forward: PLAYER_CONFIG.dropForwardOffset * 0.92, right: step * 0.55, up: 0 },
            { forward: PLAYER_CONFIG.dropForwardOffset * 0.92, right: -step * 0.55, up: 0 },
            { forward: PLAYER_CONFIG.dropForwardOffset + step * 0.2, right: 0, up: lift * 0.5 },
            { forward: step * 0.22, right: step, up: 0 },
            { forward: step * 0.22, right: -step, up: 0 },
            { forward: 0, right: step * 1.05, up: lift * 0.4 },
            { forward: 0, right: -step * 1.05, up: lift * 0.4 },
            { forward: -step * 0.25, right: 0, up: lift * 0.85 },
            { forward: 0, right: 0, up: lift * 1.6 }
        ]

        for (const offset of candidateOffsets) {
            const candidate = new THREE.Vector3(
                mesh.position.x + (forward.x * offset.forward) + (right.x * offset.right),
                baseY + offset.up,
                mesh.position.z + (forward.z * offset.forward) + (right.z * offset.right)
            )

            if (!this._isDropCandidateBlocked(candidate, probeRadius, carried.entry, mesh)) {
                return candidate
            }
        }

        return null
    }

    _setMeshCarriedFlag(itemMesh, isCarried, itemBody = null) {
    if (!itemMesh) return
    if (itemMesh.userData?._cachedCarriedFlag === isCarried && itemBody?.userData?.isCarriedItem === isCarried) return

    itemMesh.userData = itemMesh.userData || {}
    itemMesh.userData._cachedCarriedFlag = isCarried
    itemMesh.userData.isCarriedItem = isCarried
    itemMesh.userData.carriedByPlayer = isCarried
    itemMesh.userData.ignoreRaycast = isCarried || itemMesh.userData.cameraPassthrough === true
    if (isCarried) {
        itemMesh.userData.carriedByGuide = false
    }

    if (itemBody) {
        itemBody.userData = itemBody.userData || {}
        itemBody.userData.isCarriedItem = isCarried
        itemBody.userData.carriedByPlayer = isCarried
        if (isCarried) {
            itemBody.userData.carriedByGuide = false
        }
    }

    itemMesh.traverse(child => {
        if (!child.isMesh) return
        child.userData.isCarriedItem = isCarried
        child.userData.carriedByPlayer = isCarried
        child.userData.ignoreRaycast = isCarried || child.userData.cameraPassthrough === true
        if (isCarried) {
            child.userData.carriedByGuide = false
        }
    })

    if (this.cameraController) {
        this.cameraController.forceRefreshCollisionCache()
    }
}

    _setMeshCameraPassthroughFlag(itemMesh, enabled, itemBody = null) {
        if (!itemMesh) return

        itemMesh.userData = itemMesh.userData || {}
        itemMesh.userData.cameraPassthrough = enabled
        itemMesh.userData.ignoreRaycast = enabled || itemMesh.userData.isCarriedItem === true

        if (itemBody) {
            itemBody.userData = itemBody.userData || {}
            itemBody.userData.cameraPassthrough = enabled
        }

        itemMesh.traverse(child => {
            if (!child.isMesh) return
            child.userData.cameraPassthrough = enabled
            child.userData.ignoreRaycast = enabled || child.userData.isCarriedItem === true
        })

        if (this.cameraController) {
            this.cameraController.forceRefreshCollisionCache()
        }
    }

    _setCarriedBodyLocked(carried, targetPos) {
        const body = carried?.entry?.body
        if (!body) return

        body.type = CANNON.Body.KINEMATIC
        body.collisionResponse = false
        body.collisionFilterGroup = 0
        body.collisionFilterMask = 0
        body.velocity.set(0, 0, 0)
        body.angularVelocity.set(0, 0, 0)
        body.position.set(targetPos.x, targetPos.y, targetPos.z)
        // Rotate item to follow player body yaw
        const halfYaw = this.bodyYaw * 0.5
        body.quaternion.set(0, Math.sin(halfYaw), 0, Math.cos(halfYaw))
        this._syncBodyInterpolation(body)
        if (typeof body.wakeUp === 'function') body.wakeUp()
        body.aabbNeedsUpdate = true

        // Directly sync mesh to eliminate render-lag (don't wait for syncList loop)
        const itemMesh = carried.entry?.mesh
        if (itemMesh) {
            itemMesh.position.set(targetPos.x, targetPos.y, targetPos.z)
            itemMesh.quaternion.set(0, Math.sin(halfYaw), 0, Math.cos(halfYaw))
            // Mark mesh so camera raycaster skips it
            this._setMeshCarriedFlag(itemMesh, true, body)
        }
    }

    _collectItem(entry, mesh) {
        if (!entry?.body || !entry?.mesh) return false
        if (this.carriedItems.length >= PLAYER_CONFIG.maxCarriedItems) return false
        if (this._isEntryCarried(entry)) return false

        const stackBounds = this._getBodyVerticalBounds(entry.body)
        const stackHeight = stackBounds.height
        const body = entry.body
        body.userData = body.userData || {}

        const carried = {
            entry,
            stackBounds,
            stackHeight,
            startPosition: new THREE.Vector3(body.position.x, body.position.y, body.position.z),
            startQuaternion: new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w),
            animationTime: 0,
            state: 'collecting',
            originalType: body.type,
            originalCollisionResponse: body.collisionResponse,
            originalCollisionFilterGroup: body.collisionFilterGroup,
            originalCollisionFilterMask: body.collisionFilterMask,
            originalAngularDamping: body.angularDamping,
            originalQuaternion: new CANNON.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
        }

        body.userData.hasBeenCollectedOnce = true
        body.userData.isCollectedItem = true
        this.carriedItems.push(carried)
        this._resetUncollectedItemMarkerLifetime(entry)
        this._clearUncollectedItemMarker(entry)

        const targetPos = this._getStackTargetForIndex(this.carriedItems.length - 1, mesh, this.currentBody)
        this._setCarriedBodyLocked(carried, targetPos)

        const { sourcePosition, listenerPosition } = this._getPlayerInteractionSoundPositions(mesh)
        playSound7({
            sourcePosition,
            listenerPosition,
        })

        return true
    }

    _tryCollectNearbyItem(mesh) {
        if (!mesh || mesh.name !== 'Player' || !this.syncList || this.carriedItems.length >= PLAYER_CONFIG.maxCarriedItems) return

                const triggerMesh = mesh.userData._smallTriggerRef || mesh.children.find(child => child.name === 'TriggerZone_Small')
                if (triggerMesh) mesh.userData._smallTriggerRef = triggerMesh

                const triggerCenter = this._tmpCollectTriggerCenter
                triggerCenter.copy(mesh.position)
        let triggerRadius = 1.5

        if (triggerMesh) {
            triggerMesh.getWorldPosition(triggerCenter)
            triggerRadius = triggerMesh.geometry?.parameters?.radius || triggerRadius
        }

        for (const entry of this.syncList) {
            if (!this._isItemEntry(entry)) continue
            if (this._isEntryCarried(entry)) continue
            if (entry.body?.userData?.isCollectedItem) continue
            if (entry.body?.userData?.dropCooldownUntil > Date.now()) continue

            const itemPos = entry.body
                ? this._tmpCollectItemPos.set(entry.body.position.x, entry.body.position.y, entry.body.position.z)
                : entry.mesh.position
            const itemRadius = this._getBodyApproxRadius(entry.body)
            const maxDistance = triggerRadius + itemRadius
            if (triggerCenter.distanceToSquared(itemPos) > maxDistance * maxDistance) continue

            if (this._collectItem(entry, mesh)) {
                break
            }
        }
    }

    _updateCarriedItems(delta, mesh) {
        if (!mesh || this.carriedItems.length === 0) return

        for (let index = 0; index < this.carriedItems.length; index++) {
            const carried = this.carriedItems[index]
            const body = carried.entry?.body
            if (!body) continue

            const targetPos = this._getStackTargetForIndex(index, mesh, this.currentBody)

            if (carried.state === 'collecting') {
                carried.animationTime += delta
                const t = Math.min(1, carried.animationTime / PLAYER_CONFIG.collectAnimationDuration)
                const eased = t * t * (3 - 2 * t)
                const curvedLift = Math.sin(eased * Math.PI) * Math.max(0.06, carried.stackHeight * 0.25)

                const lerpX = THREE.MathUtils.lerp(carried.startPosition.x, targetPos.x, eased)
                const lerpY = THREE.MathUtils.lerp(carried.startPosition.y, targetPos.y, eased) + curvedLift
                const lerpZ = THREE.MathUtils.lerp(carried.startPosition.z, targetPos.z, eased)
                body.position.set(lerpX, lerpY, lerpZ)

                const halfYawAnim = this.bodyYaw * 0.5
                const targetQuat = this._tmpCarryTargetQuat.set(0, Math.sin(halfYawAnim), 0, Math.cos(halfYawAnim))
                const nextQuat = carried.startQuaternion.clone().slerp(targetQuat, eased)

                body.type = CANNON.Body.KINEMATIC
                body.collisionResponse = false
                body.collisionFilterGroup = 0
                body.collisionFilterMask = 0
                body.velocity.set(0, 0, 0)
                body.angularVelocity.set(0, 0, 0)
                body.quaternion.set(nextQuat.x, nextQuat.y, nextQuat.z, nextQuat.w)
                this._syncBodyInterpolation(body)
                body.aabbNeedsUpdate = true

                // Sync mesh directly during animation
                if (carried.entry?.mesh) {
                    carried.entry.mesh.position.set(lerpX, lerpY, lerpZ)
                    carried.entry.mesh.quaternion.set(nextQuat.x, nextQuat.y, nextQuat.z, nextQuat.w)
                    this._setMeshCarriedFlag(carried.entry.mesh, true, body)
                }

                if (t >= 1) {
                    carried.state = 'stacked'
                }
                continue
            }


            // Nếu player đang nhảy (không grounded), hover item bằng cách lerp trục Y, nhưng không cho xuống thấp hơn targetY (mượt hơn)
            if (!this.canJump) {
                const lerpSpeed = 0.22;
                body.position.x = targetPos.x;
                body.position.z = targetPos.z;
                let nextY = body.position.y;
                if (body.position.y > targetPos.y) {
                    // Chỉ nội suy khi đi lên
                    nextY = THREE.MathUtils.lerp(body.position.y, targetPos.y, lerpSpeed);
                } else {
                    // Nếu đi xuống hoặc bằng, giữ ở targetY
                    nextY = targetPos.y;
                }
                body.position.y = nextY;
                // Sync mesh trực tiếp
                if (carried.entry?.mesh) {
                    carried.entry.mesh.position.x = body.position.x;
                    carried.entry.mesh.position.z = body.position.z;
                    carried.entry.mesh.position.y = body.position.y;
                }
                // Giữ quaternion đúng hướng
                const halfYaw = this.bodyYaw * 0.5;
                body.quaternion.set(0, Math.sin(halfYaw), 0, Math.cos(halfYaw));
                this._syncBodyInterpolation(body);
                body.aabbNeedsUpdate = true;
                continue;
            }

            // Nếu grounded, snap về đúng vị trí stack như cũ
            this._setCarriedBodyLocked(carried, targetPos)
        }
    }

    _updateTemporaryCameraPassthrough() {
        if (!this.syncList) return

        const now = Date.now()
        for (const entry of this.syncList) {
            const body = entry?.body
            const mesh = entry?.mesh
            if (!body || !mesh || !body.userData) continue

            const until = body.userData.cameraPassthroughUntil
            if (!until || now < until) continue
            if (body.userData.isCollectedItem) continue

            delete body.userData.cameraPassthroughUntil
            this._setMeshCameraPassthroughFlag(mesh, false, body)
        }
    }

    _updateDroppedItemStabilization() {
        if (!this.syncList) return

        const now = Date.now()
        for (const entry of this.syncList) {
            const body = entry?.body
            if (!body?.userData) continue
            if (body.userData.isCollectedItem) continue

            const stabilizeUntil = body.userData.dropStabilizeUntil
            const savedAngularDamping = body.userData.preDropAngularDamping
            if (!stabilizeUntil) continue

            if (now < stabilizeUntil) {
                body.angularDamping = Math.max(
                    savedAngularDamping ?? 0,
                    PLAYER_CONFIG.dropStabilizeAngularDamping
                )

                const spin = body.angularVelocity.length()
                if (spin > PLAYER_CONFIG.dropMaxAngularSpeed && spin > 0.0001) {
                    body.angularVelocity.scale(PLAYER_CONFIG.dropMaxAngularSpeed / spin, body.angularVelocity)
                }
                continue
            }

            if (typeof savedAngularDamping === 'number') {
                body.angularDamping = savedAngularDamping
            }
            delete body.userData.dropStabilizeUntil
            delete body.userData.preDropAngularDamping
        }
    }

    _updateUncollectedItemMarkers() {
        if (!this.syncList || !this.particleManager) return

        const now = Date.now()

        for (const entry of this.syncList) {
            if (!this._isItemEntry(entry)) continue
            const ownerMesh = entry.mesh
            const shouldShowMarker = this._shouldShowUncollectedItemMarker(entry, now)

            if (!shouldShowMarker) {
                this._clearUncollectedItemMarker(entry)
                continue
            }

            const bodyHeight = this._getBodyApproxHeight(entry.body)
            const yOffset = (bodyHeight * 0.5) + PLAYER_CONFIG.uncollectedItemMarkerYOffset
            this.particleManager.setItemArrowState(ownerMesh, shouldShowMarker, {
                scale: PLAYER_CONFIG.uncollectedItemMarkerScale,
                yOffset,
                bobAmplitude: PLAYER_CONFIG.uncollectedItemMarkerBobAmplitude,
                bobSpeed: PLAYER_CONFIG.uncollectedItemMarkerBobSpeed
            })
        }
    }

    _dropCarriedItem(mesh, withImpulse = true, withCooldown = false) {
        if (!mesh || this.carriedItems.length === 0) return false

        const carried = this.carriedItems[0]
        const body = carried?.entry?.body
        if (!body) return false

        const forward = this._getDropReleaseDirection()
        const dropPos = this._findSafeDropPosition(mesh, carried, forward)
        if (!dropPos) {
            this.uiManager?.showCenterActionHint?.('Space blocked', PLAYER_CONFIG.dropBlockedHintMs)
            return false
        }

        this.carriedItems.shift()

        body.userData = body.userData || {}
        body.userData.isCollectedItem = false
        body.type = carried.originalType ?? CANNON.Body.DYNAMIC
        body.collisionResponse = carried.originalCollisionResponse ?? true
        body.collisionFilterGroup = carried.originalCollisionFilterGroup ?? COLLISION_GROUPS.ITEM
        body.collisionFilterMask = carried.originalCollisionFilterMask ?? COLLISION_MASKS.ITEM
        body.velocity.set(0, 0, 0)
        body.angularVelocity.set(0, 0, 0)

        body.userData.cameraPassthroughUntil = Date.now() + PLAYER_CONFIG.shuffleCameraPassthroughMs

        if (carried.entry?.mesh) {
            this._setMeshCarriedFlag(carried.entry.mesh, false, body)
            this._setMeshCameraPassthroughFlag(carried.entry.mesh, true, body)
        }

        if (withCooldown) {
            body.userData.dropCooldownUntil = Date.now() + 2000
        }

        body.position.set(dropPos.x, dropPos.y, dropPos.z)
        body.quaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        )
        body.userData.preDropAngularDamping = carried.originalAngularDamping ?? body.angularDamping
        body.userData.dropStabilizeUntil = Date.now() + PLAYER_CONFIG.dropStabilizeMs
        body.angularDamping = Math.max(body.userData.preDropAngularDamping, PLAYER_CONFIG.dropStabilizeAngularDamping)
        this._syncBodyInterpolation(body)

        if (withImpulse) {
            body.applyImpulse(
                new CANNON.Vec3(
                    forward.x * PLAYER_CONFIG.dropImpulse,
                    PLAYER_CONFIG.dropUpwardImpulse,
                    forward.z * PLAYER_CONFIG.dropImpulse
                ),
                body.position
            )
        }

        const { sourcePosition, listenerPosition } = this._getPlayerInteractionSoundPositions(mesh)
        playSound8({
            sourcePosition,
            listenerPosition,
        })

        return true
    }

    dropAllCarriedItems(withImpulse = false) {
        while (this.carriedItems.length > 0 && this.currentMesh) {
            this._dropCarriedItem(this.currentMesh, withImpulse)
        }
        this.dropItemQueued = false
    }

    _createCueBody(world) {
        if (!world || !this.currentMesh) return null;
        
        // Xóa cue body cũ nếu có
        this.removeCueBody();
        
        const cuePivot = this.currentMesh.getObjectByName("CuePivot");
        if (!cuePivot) return null;

        const originalLength = cuePivot.userData.originalLength || 4;
        
        // Tạo cue shape với kích thước thay đổi theo charge
        const cueShape = new CANNON.Cylinder(0.015, 0.06, originalLength, 16);

        // Tạo cue body
        const body = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC,
            collisionFilterGroup: COLLISION_GROUPS.CUE,
            collisionFilterMask: COLLISION_MASKS.CUE,
            material: this.physicsMaterials?.cue || undefined  // ✨ Set cue material để tính contact forces
        });
        body.addShape(cueShape);
        world.addBody(body);
        
        // Tạo force trigger body - nằm ở đầu tip
        const forceShape = new CANNON.Sphere(PLAYER_CONFIG.baseHitboxRadius);
        const forceBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC,
            collisionFilterGroup: COLLISION_GROUPS.CUE,
            collisionFilterMask: COLLISION_MASKS.CUE,
            material: this.physicsMaterials?.cue || undefined  // ✨ Set cue material
        });
        forceBody.addShape(forceShape);
        world.addBody(forceBody);
        
        // Đánh dấu để CollisionManager biết
        body.userData = { 
            isCueBody: true, 
            isKinematic: true,
            originalLength: originalLength
        };
        forceBody.userData = { 
            isForceBody: true, 
            isTrigger: true
        };
        
        this.cueBody = body;
        this.forceBody = forceBody;
        this.cueActive = true;
        
        // Thêm vào CollisionManager ngay lập tức
        setTimeout(() => {
            if (this.cueBody && this.cueActive) {
                CollisionManager.addHitboxForObject({ 
                    body: this.cueBody, 
                    name: 'Cue', 
                    type: 'kinematic' 
                });
            }
            if (this.forceBody && this.cueActive) {
                CollisionManager.addHitboxForObject({ 
                    body: this.forceBody, 
                    name: 'Force', 
                    type: 'trigger' 
                });
            }
        }, 0);
        
        return body;
    }

    removeCueBody() {
        // Xóa khỏi world
        if (this.cueBody && this.cueBody.world) {
            this.cueBody.world.removeBody(this.cueBody);
        }
        if (this.forceBody && this.forceBody.world) {
            this.forceBody.world.removeBody(this.forceBody);
        }
        
        // Xóa khỏi CollisionManager
        if (this.cueBody) {
            CollisionManager.removeHitboxForObject({ body: this.cueBody });
        }
        if (this.forceBody) {
            CollisionManager.removeHitboxForObject({ body: this.forceBody });
        }
        
        this.cueBody = null;
        this.forceBody = null;
        this.cueActive = false;
        
    }

    _updateOpacityBasedOnCameraDistance(mesh, cameraController) {
        // Đã vô hiệu hóa tính năng làm mờ player khi zoom gần camera theo yêu cầu.
        return;
    }

    _applyBodyRotation(mesh) {
        mesh.rotation.y = this.bodyYaw;
    }

    _getPhysicalCueWorldTransform(mesh) {
        const cuePivot = mesh.getObjectByName("CuePivot");
        if (!cuePivot) return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

        // Get world transform of the pivot
        const pivotWorldPosition = new THREE.Vector3();
        const pivotWorldQuaternion = new THREE.Quaternion();
        cuePivot.getWorldPosition(pivotWorldPosition);
        cuePivot.getWorldQuaternion(pivotWorldQuaternion);

        // Get original length
        const originalLength = cuePivot.userData.originalLength || 4;
        const minLength = cuePivot.userData.minLength || 2;

        // Calculate how much the cue is pulled back
        const pullBackDistance = this.currentCharge * (originalLength - minLength);

        // The center of the physical cue body (which has constant length)
        // starts at originalLength / 2 and moves back by pullBackDistance.
        // The cue's local "up" is its forward direction.
        const localCenterOffset = new THREE.Vector3(0, (originalLength / 2) - pullBackDistance, 0);

        // Transform this local offset into world space
        const worldCenterPosition = localCenterOffset.applyQuaternion(pivotWorldQuaternion).add(pivotWorldPosition);

        return { position: worldCenterPosition, quaternion: pivotWorldQuaternion };
    }

    _getCueWorldTransform(mesh) {
        const cuePivot = mesh.getObjectByName("CuePivot");
        if (!cuePivot) return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

        const cueMesh = cuePivot.getObjectByName("PlayerCue");
        if (!cueMesh) return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

        const worldPosition = new THREE.Vector3();
        cueMesh.getWorldPosition(worldPosition);

        const worldQuaternion = new THREE.Quaternion();
        cueMesh.getWorldQuaternion(worldQuaternion);

        return { position: worldPosition, quaternion: worldQuaternion };
    }

    getCueWorldDirection(mesh) {
        let cuePivot = null
        mesh.traverse(child => {
            if (child.userData && child.userData.isCuePivot) cuePivot = child
        })

        if (!cuePivot) return new THREE.Vector3(0, 0, 1)

        const worldDir = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(cuePivot.quaternion)
            .applyQuaternion(mesh.quaternion)
            .normalize();
        
        return worldDir
    }

    getCueTipPosition(mesh) {
        let cuePivot = null
        mesh.traverse(child => {
            if (child.userData && child.userData.isCuePivot) cuePivot = child
        })

        if (!cuePivot) return new THREE.Vector3();

        const cueBody = cuePivot.getObjectByName("PlayerCue")
        if (!cueBody) return new THREE.Vector3()

        const originalLength = cuePivot.userData.originalLength
        const currentLength = originalLength * cueBody.scale.y

        const tipLocalPos = new THREE.Vector3(0, currentLength, 0)
        
        const worldPos = tipLocalPos.clone()
            .applyQuaternion(cuePivot.quaternion)
            .add(cuePivot.position)
            .applyQuaternion(mesh.quaternion)
            .add(mesh.position)
        
        return worldPos
    }

    getOriginalCueTipPosition(mesh) {
        let cuePivot = null
        mesh.traverse(child => {
            if (child.userData && child.userData.isCuePivot) cuePivot = child
        })

        if (!cuePivot) return new THREE.Vector3();

        const originalLength = cuePivot.userData.originalLength || 4
        
        const tipLocalPos = new THREE.Vector3(0, originalLength, 0)
        
        const worldPos = tipLocalPos.clone()
            .applyQuaternion(cuePivot.quaternion)
            .add(cuePivot.position)
            .applyQuaternion(mesh.quaternion)
            .add(mesh.position)
        
        return worldPos
    }

    update(body, mesh, cameraController) {
        this.currentBody = body;
        this.currentMesh = mesh;

        const now = performance.now()
        let frameDelta = (now - this._lastUpdateTs) / 1000
        if (!Number.isFinite(frameDelta) || frameDelta <= 0) frameDelta = PLAYER_CONFIG.fixedTimeStep
        frameDelta = THREE.MathUtils.clamp(frameDelta, 1 / 240, 1 / 20)
        this._lastUpdateTs = now
        
        // Update canAcceptInput based on activeElement (but never override _inputDisabled)
        if (!this._inputDisabled) {
            const activeElement = document.activeElement;
            const isOnCanvas = activeElement === this.canvas;
            const isOnBody = activeElement === document.body;
            const isOnHTML = activeElement === document.documentElement;
            this.canAcceptInput = isOnCanvas || isOnBody || isOnHTML;
        }
        
        if ((this._inputDisabled || !this.canAcceptInput) && (this.keys.w || this.keys.a || this.keys.s || this.keys.d)) {
            this._resetAllKeys();
        }
        
        // Kiểm tra nếu cue bị remove từ bên ngoài
        const cuePivot = mesh.getObjectByName("CuePivot");
        if (!cuePivot && this.cueActive) {
            this.cueActive = false;
            this.removeCueBody();
        }
        
        // Auto-activate cue if shouldHaveCue flag is set (for Scene1 gameplay)
        if (mesh.userData.shouldHaveCue && !this.cueActive) {
            this.cueActive = true;
        }
        
        // Chỉ tạo cue body nếu đang active và có cuePivot
        if (!this.cueBody && body && body.world && this.cueActive && cuePivot) {
            this._createCueBody(body.world);
        }

        this._checkGrounded(body);
        this._updateLandingThudSound(body, mesh, cameraController)
        this._handleMovement(body);
        this._handleJump(body, mesh, cameraController);
        this._updateMovementTingSound(body, mesh, cameraController, frameDelta)
        this._animateLegs(mesh, body);
        this._updateHeadRotation(mesh);
        this._applyBodyRotation(mesh);
        this._animateCueCharge(mesh);
        this._updateTemporaryCameraPassthrough()
        this._updateDroppedItemStabilization()

        this._collectScanAccumulator += frameDelta
        if (this._collectScanAccumulator >= PLAYER_CONFIG.collectScanIntervalSec) {
            this._collectScanAccumulator = 0
            this._tryCollectNearbyItem(mesh)
        }

        if (this.dropItemQueued) {
            this._dropCarriedItem(mesh, false, false)  // Q = rearrange: no impulse, no cooldown
            this.dropItemQueued = false
        }

        if (this.throwItemQueued) {
            this._dropCarriedItem(mesh, true, true)  // Z = throw: impulse + cooldown
            this.throwItemQueued = false
        }

        this._markerUpdateAccumulator += frameDelta
        if (this._markerUpdateAccumulator >= PLAYER_CONFIG.markerUpdateIntervalSec) {
            this._markerUpdateAccumulator = 0
            this._updateUncollectedItemMarkers()
        }
        this._syncCarriedItemMarkers()

        if (mesh.name === "Player") {
            this._updateOpacityBasedOnCameraDistance(mesh, cameraController);
        }

        // Update physics bodies
        if (this.cueBody) {
            const { position, quaternion } = this._getPhysicalCueWorldTransform(mesh);
            this.cueBody.position.copy(position);
            this.cueBody.quaternion.copy(quaternion);
        }
        
        if (this.forceBody) {
            const tipPos = this.getCueTipPosition(mesh);
            this.forceBody.position.copy(tipPos);
            
            // Cập nhật kích thước force body theo charge
            const radius = PLAYER_CONFIG.baseHitboxRadius + 
                          this.currentCharge * PLAYER_CONFIG.hitboxRadiusMultiplier;
            
            // Cập nhật shape nếu cần (có thể tạo lại shape mới)
            if (this.forceBody.shapes.length > 0) {
                // Xóa shape cũ
                this.forceBody.shapes.forEach(shape => {
                    this.forceBody.removeShape(shape);
                });
                
                // Tạo shape mới với kích thước hiện tại
                const newShape = new CANNON.Sphere(radius);
                this.forceBody.addShape(newShape);
            }
        }

        // ✨ Update particle effects
        if (this.particleEffects && this.particleEffects.length > 0) {
            const delta = 1 / 60; // Assume 60 FPS
            for (let i = this.particleEffects.length - 1; i >= 0; i--) {
                const effect = this.particleEffects[i];
                effect.update(delta);
                if (effect.finished) {
                    this.particleEffects.splice(i, 1);
                }
            }
        }
    }

    getBodyYaw() { return this.bodyYaw; }
    getChargeAmount() { return this.currentCharge; }
    isCharging() { return this._isCharging; }
    cancelCharge() {
        this._isCharging = false;
        this.currentCharge = 0;
    }
    syncCarriedItemsPosition(frameDelta, playerMesh) {
        if (!playerMesh) return
        this._updateCarriedItems(frameDelta, playerMesh)
    }
    getConfig() { return PLAYER_CONFIG; }

    dispose() {
        this.dropAllCarriedItems(false)
        this.clearImpactEffects()
        if (this.particleManager?.clearAllItemArrows) {
            this.particleManager.clearAllItemArrows()
        }
        window.removeEventListener("keydown", this._boundOnKeyDown)
        window.removeEventListener("keyup", this._boundOnKeyUp)
        window.removeEventListener("blur", this._updateInputFlag)
        document.removeEventListener("focusin", this._updateInputFlag)
        document.removeEventListener("focusout", this._updateInputFlag)
        document.removeEventListener("mousedown", this._updateInputFlag)
        document.removeEventListener("mouseup", this._updateInputFlag)
        if (this.canvas) {
            this.canvas.removeEventListener("pointerleave", this._onCanvasPointerLeave)
            this.canvas.removeEventListener("pointerenter", this._onCanvasPointerEnter)
        }
        this.removeCueBody();
    }

    clearImpactEffects() {
        if (!Array.isArray(this.particleEffects) || this.particleEffects.length === 0) return
        this.particleEffects.forEach(effect => {
            if (!effect) return
            if (effect.ring && effect.scene) {
                effect.scene.remove(effect.ring)
            }
            if (effect.ring?.material?.dispose) {
                effect.ring.material.dispose()
            }
            if (effect.ring?.geometry?.dispose) {
                effect.ring.geometry.dispose()
            }
            effect.finished = true
        })
        this.particleEffects.length = 0
    }
}