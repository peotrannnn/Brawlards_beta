

import * as THREE from 'three'
import { settingsManager } from '../core/SettingsManager.js'

const CAMERA_CONFIG = {
  FOV: 60,
  NEAR: 0.1,
  FAR: 300,
  MOUSE_SENSITIVITY: 0.0007,
  INVERT_MOUSE_X: true,
  INVERT_MOUSE_Y: true,
  ROTATION_SPEED_LIMIT: 0.1,
  MOUSE_DELTA_LIMIT: 100,
  ZOOM_SPEED: 0.001,
  ZOOM_DELTA_LIMIT: 0.5,
  MIN_ZOOM_DISTANCE: 0.5,
  ZOOM_FADE_BUFFER: 1.0,
  MAX_ZOOM_DISTANCE: 100,
  DEFAULT_ZOOM_DISTANCE: 5,
  POSSESS_MAX_ZOOM_DISTANCE: 15,
  MIN_POLAR_ANGLE: 0.1,
  MAX_POLAR_ANGLE: Math.PI - 0.1,
  CAMERA_HEIGHT_OFFSET: 1.0,
  INERTIA_FACTOR: 0.8,
  INERTIA_THRESHOLD: 0.001,
  CROSSHAIR_COLOR: 'white',
  CROSSHAIR_SIZE: '20px',
  CROSSHAIR_FONT: 'monospace',
  CROSSHAIR_TEXT: '+',
  CROSSHAIR_Z_INDEX: '9999',
  SPECTATOR_SPEED: 10,
  COLLISION_CHECK_INTERVAL: 1 / 120,
  COLLISION_CHECK_INTERVAL_FAST_ROTATION: 1 / 30,
  COLLISION_FAST_ROTATION_DELTA_THRESHOLD: 0.05,
  COLLISION_CACHE_REFRESH_INTERVAL: 0.5,
  COLLISION_TARGET_EPSILON_SQ: 0.1,
  COLLISION_DIRECTION_EPSILON: 0.01,
  COLLISION_DISTANCE_EPSILON: 0.25,
  DITHER_UPDATE_INTERVAL: 1 / 20,
  DITHERING_ALPHA_EPSILON: 0.03,
  ADAPTIVE_PERF_SAMPLE_WINDOW_SEC: 0.5,
  ADAPTIVE_PERF_COOLDOWN_SEC: 0.9,
  ADAPTIVE_FPS_LEVEL1_ENTER: 52,
  ADAPTIVE_FPS_LEVEL1_EXIT: 58,
  ADAPTIVE_FPS_LEVEL2_ENTER: 40,
  ADAPTIVE_FPS_LEVEL2_EXIT: 48,
  ADAPTIVE_DITHER_UPDATE_INTERVAL_LEVEL1: 1 / 12,
  ADAPTIVE_DITHER_UPDATE_INTERVAL_LEVEL2: 1 / 8,
  ADAPTIVE_COLLISION_CHECK_INTERVAL_LEVEL1: 1 / 20,
  ADAPTIVE_COLLISION_CHECK_INTERVAL_LEVEL2: 1 / 12,
  ADAPTIVE_COLLISION_CHECK_FAST_INTERVAL_LEVEL1: 1 / 12,
  ADAPTIVE_COLLISION_CHECK_FAST_INTERVAL_LEVEL2: 1 / 8,
  ADAPTIVE_COLLISION_CACHE_REFRESH_INTERVAL_LEVEL1: 2.2,
  ADAPTIVE_COLLISION_CACHE_REFRESH_INTERVAL_LEVEL2: 3.0,
  DITHERING_DISTANCE_THRESHOLD: 1.0,
  DITHERING_ALPHA_START: 1.0,
  DITHERING_ALPHA_END: 0.05,
}

// Apply initial settings
CAMERA_CONFIG.MOUSE_SENSITIVITY = settingsManager.get('mouseSensitivity') * 0.0007
CAMERA_CONFIG.INVERT_MOUSE_Y = settingsManager.get('invertY')

// Listen for settings changes
settingsManager.onChange((settings) => {
  CAMERA_CONFIG.MOUSE_SENSITIVITY = settings.mouseSensitivity * 0.0007
  CAMERA_CONFIG.INVERT_MOUSE_Y = settings.invertY
})

export class ThirdPersonCameraController {
  /**
   * ✨ Camera Control System Architecture
   * 
   * States:
   * - isControlEnabled: Whether pointer lock is ACTIVE (true = locked, false = unlocked)
   * - isSpectator: Whether camera is in spectator mode (no target object focused)
   * - isPlayerTarget: Whether current target has a cue (player character)
   * 
   * Pointer Lock Flow:
   * 1. DEFAULT (on reset/init): 
   *    - isControlEnabled = false (no pointer lock)
   *    - cursor = 'default' (visible)
   *    - crosshair = hidden
   * 
   * 2. User presses C (KeyDown):
   *    - Call enableControl() → request pointer lock
   * 
   * 3. Pointer Lock Granted:
   *    - Browser fires 'pointerlockchange' event
   *    - _onPointerLockChange() runs:
   *      - isControlEnabled = true
   *      - cursor = 'none' (hidden)
   *      - crosshair = visible
   * 
   * 4. User releases C (KeyUp):
   *    - Call disableControl() → exit pointer lock
   * 
   * 5. Pointer Lock Exits:
   *    - Browser fires 'pointerlockchange' event again
   *    - _onPointerLockChange() runs:
   *      - isControlEnabled = false
   *      - cursor = 'default' (visible)
   *      - crosshair = hidden
   * 
   * Mouse Input:
   * - _onMouseMove() only updates rotation when isControlEnabled = true (pointer locked)
   * - Movement is ignored when isControlEnabled = false
   */
  constructor(renderer) {
    this.renderer = renderer
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_CONFIG.NEAR,
      CAMERA_CONFIG.FAR
    )

    this.targetObject = null
    this.cachedCuePivot = null
    this.isPlayerTarget = false
    this.isSpectator = true
    this.allowSpectator = true  // ✨ Flag to disable spectator mode (e.g., in gameplay)
    this.isGameplayMode = false  // ✨ Gameplay mode: locked camera on player, no clearFocus
    this.targetPosition = new THREE.Vector3()
    this.rotation = new THREE.Quaternion()
    this.rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    this.distance = CAMERA_CONFIG.DEFAULT_ZOOM_DISTANCE
    this.targetDistance = CAMERA_CONFIG.DEFAULT_ZOOM_DISTANCE
    this.isControlEnabled = false
    this.spectatorPosition = new THREE.Vector3(0, 0, 0)
    this.moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false }

    this.uiManager = null  // ✨ Set later from SimulationTest
    this.scene = null  // ✨ Set later for collision detection
    this.raycaster = new THREE.Raycaster()  // ✨ For camera collision detection
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.isMouseDown = false
    this.rotationDeltaX = 0
    this.rotationDeltaY = 0
    
    // ✨ Dithering state tracking
    this.originalMaterials = new Map()  // Store original materials for restoration
    this.ditherMaterials = new Map()    // Store dithering materials
    this.isDitheringActive = false      // Track if dithering is currently applied
    this.ditheredMeshes = new Map()     // key -> mesh, for reliable full restore
    this._ditherCleanupAccumulator = 0
    this._ditherUpdateAccumulator = CAMERA_CONFIG.DITHER_UPDATE_INTERVAL
    this._lastDitherAlpha = null
    this._collisionCheckAccumulator = CAMERA_CONFIG.COLLISION_CHECK_INTERVAL
    this._collisionCacheAccumulator = CAMERA_CONFIG.COLLISION_CACHE_REFRESH_INTERVAL
    this._cachedCollidables = []
    this._sectionCollidableCaches = new Map()
    this._activeSectionKey = 'section1' // Khởi tạo mặc định là section1 thay vì 'global'
    this._effectiveDitherUpdateInterval = CAMERA_CONFIG.DITHER_UPDATE_INTERVAL
    this._effectiveCollisionCheckInterval = CAMERA_CONFIG.COLLISION_CHECK_INTERVAL
    this._effectiveCollisionCheckFastInterval = CAMERA_CONFIG.COLLISION_CHECK_INTERVAL_FAST_ROTATION
    this._effectiveCollisionCacheRefreshInterval = CAMERA_CONFIG.COLLISION_CACHE_REFRESH_INTERVAL
    this._adaptivePerfWindowSec = 0
    this._adaptivePerfFrameCount = 0
    this._adaptivePerfCooldownSec = 0
    this._adaptiveQualityLevel = 0
    this._adaptiveDitherEnabled = true
    this._lastCollisionTargetPos = new THREE.Vector3()
    this._lastCollisionDirection = new THREE.Vector3(0, 0, 1)
    this._lastCollisionDistance = this.distance
    this._lastCollisionResult = this.distance
    this._tmpCueWorldPos = new THREE.Vector3()
    this._tmpOffset = new THREE.Vector3()
    this._tmpDirection = new THREE.Vector3()
    this._tmpSpectatorMovement = new THREE.Vector3()

    // Keep stable listener references so dispose() can correctly remove them.
    this._boundOnPointerLockChange = this._onPointerLockChange.bind(this)
    this._boundOnPointerLockError = this._onPointerLockError.bind(this)
    this._boundOnKeyDown = this._onKeyDown.bind(this)
    this._boundOnKeyUp = this._onKeyUp.bind(this)
    this._boundOnMouseDown = this._onMouseDown.bind(this)
    this._boundOnMouseUp = this._onMouseUp.bind(this)
    this._boundOnMouseMove = this._onMouseMove.bind(this)
    this._boundOnWheel = this._onWheel.bind(this)
    this._boundOnContextMenu = this._onContextMenu.bind(this)
    this._boundOnResize = this._onResize.bind(this)
    this._boundOnBlur = () => this._resetMoveState()
    this._boundOnFocusIn = (e) => {
      if (e.target !== this.renderer.domElement && e.target !== document.body) {
        this._resetMoveState()
      }
    }
    this._boundOnDocumentMouseDown = (e) => {
      if (e.target !== this.renderer.domElement) {
        this._resetMoveState()
      }
    }

    this._setupEventListeners()
    this._setupCrosshair()
    this.reset()
  }

  _setupCrosshair() {
    this.crosshair = document.createElement('div')
    this.crosshair.textContent = CAMERA_CONFIG.CROSSHAIR_TEXT
    this.crosshair.style.position = 'absolute'
    this.crosshair.style.top = '50%'
    this.crosshair.style.left = '50%'
    this.crosshair.style.transform = 'translate(-50%, -50%)'
    this.crosshair.style.color = CAMERA_CONFIG.CROSSHAIR_COLOR
    this.crosshair.style.fontSize = CAMERA_CONFIG.CROSSHAIR_SIZE
    this.crosshair.style.fontFamily = CAMERA_CONFIG.CROSSHAIR_FONT
    this.crosshair.style.zIndex = CAMERA_CONFIG.CROSSHAIR_Z_INDEX
    this.crosshair.style.pointerEvents = 'none'
    this.crosshair.style.display = 'none'
    document.body.appendChild(this.crosshair)
  }

  /**
   * ✨ Set UIManager reference - để update UI khi camera state thay đổi
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager
  }

  /**
   * ✨ Set gameplay mode - locks camera on player, disables spectator mode
   */
  setGameplayMode(isGameplay) {
    this.isGameplayMode = isGameplay
    this.allowSpectator = !isGameplay  // Disable spectator in gameplay
  }

  /**
   * ✨ Set scene reference for collision detection
   */
  setScene(scene) {
    this.scene = scene
    this._sectionCollidableCaches.clear()
    this._cachedCollidables = []
    this._refreshCollisionCache(true)
  }

  setActiveSectionKey(sectionKey) {
    // Chỉ chấp nhận section1, section2, section3, section4
    const validSections = ['section1', 'section2', 'section3', 'section4']
    const nextKey = validSections.includes(sectionKey) ? sectionKey : 'section1'
    if (this._activeSectionKey === nextKey) return

    this._activeSectionKey = nextKey
    const cached = this._sectionCollidableCaches.get(nextKey)
    if (cached?.collidables?.length) {
      this._cachedCollidables = cached.collidables
      this._collisionCacheAccumulator = 0
      return
    }

    this._cachedCollidables = []
    this._collisionCacheAccumulator = this._effectiveCollisionCacheRefreshInterval
  }

  _setAdaptiveQualityLevel(level) {
    this._adaptiveQualityLevel = level

    if (level <= 0) {
      this._effectiveDitherUpdateInterval = CAMERA_CONFIG.DITHER_UPDATE_INTERVAL
      this._effectiveCollisionCheckInterval = CAMERA_CONFIG.COLLISION_CHECK_INTERVAL
      this._effectiveCollisionCheckFastInterval = CAMERA_CONFIG.COLLISION_CHECK_INTERVAL_FAST_ROTATION
      this._effectiveCollisionCacheRefreshInterval = CAMERA_CONFIG.COLLISION_CACHE_REFRESH_INTERVAL
      this._adaptiveDitherEnabled = true
      return
    }

    if (level === 1) {
      this._effectiveDitherUpdateInterval = CAMERA_CONFIG.ADAPTIVE_DITHER_UPDATE_INTERVAL_LEVEL1
      this._effectiveCollisionCheckInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CHECK_INTERVAL_LEVEL1
      this._effectiveCollisionCheckFastInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CHECK_FAST_INTERVAL_LEVEL1
      this._effectiveCollisionCacheRefreshInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CACHE_REFRESH_INTERVAL_LEVEL1
      this._adaptiveDitherEnabled = true
      return
    }

    this._effectiveDitherUpdateInterval = CAMERA_CONFIG.ADAPTIVE_DITHER_UPDATE_INTERVAL_LEVEL2
    this._effectiveCollisionCheckInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CHECK_INTERVAL_LEVEL2
    this._effectiveCollisionCheckFastInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CHECK_FAST_INTERVAL_LEVEL2
    this._effectiveCollisionCacheRefreshInterval = CAMERA_CONFIG.ADAPTIVE_COLLISION_CACHE_REFRESH_INTERVAL_LEVEL2
    this._adaptiveDitherEnabled = false
    this._removeDithering()
  }

  _updateAdaptiveQuality(delta) {
    if (!(delta > 0)) return

    this._adaptivePerfWindowSec += delta
    this._adaptivePerfFrameCount += 1
    this._adaptivePerfCooldownSec = Math.max(0, this._adaptivePerfCooldownSec - delta)

    if (this._adaptivePerfWindowSec < CAMERA_CONFIG.ADAPTIVE_PERF_SAMPLE_WINDOW_SEC) {
      return
    }

    const fps = this._adaptivePerfFrameCount / Math.max(0.0001, this._adaptivePerfWindowSec)
    this._adaptivePerfWindowSec = 0
    this._adaptivePerfFrameCount = 0

    if (this._adaptivePerfCooldownSec > 0) {
      return
    }

    let targetLevel = this._adaptiveQualityLevel
    if (this._adaptiveQualityLevel < 2 && fps < CAMERA_CONFIG.ADAPTIVE_FPS_LEVEL2_ENTER) {
      targetLevel = 2
    } else if (this._adaptiveQualityLevel === 2 && fps > CAMERA_CONFIG.ADAPTIVE_FPS_LEVEL2_EXIT) {
      targetLevel = 1
    } else if (this._adaptiveQualityLevel === 0 && fps < CAMERA_CONFIG.ADAPTIVE_FPS_LEVEL1_ENTER) {
      targetLevel = 1
    } else if (this._adaptiveQualityLevel >= 1 && fps > CAMERA_CONFIG.ADAPTIVE_FPS_LEVEL1_EXIT) {
      targetLevel = 0
    }

    if (targetLevel !== this._adaptiveQualityLevel) {
      this._setAdaptiveQualityLevel(targetLevel)
      this._adaptivePerfCooldownSec = CAMERA_CONFIG.ADAPTIVE_PERF_COOLDOWN_SEC
    }
  }

  _setupEventListeners() {
    document.addEventListener('pointerlockchange', this._boundOnPointerLockChange)
    document.addEventListener('pointerlockerror', this._boundOnPointerLockError)
    window.addEventListener('keydown', this._boundOnKeyDown)
    window.addEventListener('keyup', this._boundOnKeyUp)
    this.renderer.domElement.addEventListener('mousedown', this._boundOnMouseDown)
    this.renderer.domElement.addEventListener('mouseup', this._boundOnMouseUp)
    this.renderer.domElement.addEventListener('mousemove', this._boundOnMouseMove)
    this.renderer.domElement.addEventListener('wheel', this._boundOnWheel, { passive: false })
    this.renderer.domElement.addEventListener('contextmenu', this._boundOnContextMenu)
    window.addEventListener('resize', this._boundOnResize)
    
    // ✨ Reset camera moveState when focus changes (fix ghost camera movement)
    window.addEventListener('blur', this._boundOnBlur)
    document.addEventListener('focusin', this._boundOnFocusIn)
    document.addEventListener('mousedown', this._boundOnDocumentMouseDown)
  }

  _resetMoveState() {
    this.moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
  }



  enableControl() {
    // ✨ In gameplay mode, allow pointer lock even if spectator is disabled
    // In simulator, require allowSpectator to use pointer lock
    if (!this.isGameplayMode && !this.allowSpectator) {
      return
    }
    
    // ✨ Don't request if already locked
    if (document.pointerLockElement === this.renderer.domElement) {
      return
    }
    
    try {
      const promise = this.renderer.domElement.requestPointerLock()
      if (promise && typeof promise.catch === 'function') {
        promise.catch(err => {
          if (err && err.name === 'SecurityError') {
            // user cancelled pointer lock — ignore
          } else {
            // pointer lock failed — ignore
          }
        })
      }
    } catch (err) {
      // pointer lock not supported or blocked — ignore
    }
  }

  disableControl() {
    if (document.pointerLockElement !== this.renderer.domElement) {
      return
    }
    
    try {
      document.exitPointerLock()
    } catch (err) {
      // ignore
    }
  }

  _onPointerLockChange() {
    const locked = document.pointerLockElement === this.renderer.domElement
    this.isControlEnabled = locked
    if (locked) {
      this.crosshair.style.display = 'block'
      this.renderer.domElement.style.cursor = 'none'
    } else {
      this.crosshair.style.display = 'none'
      this.renderer.domElement.style.cursor = 'default'
      this._resetMoveState()
    }

    // ✨ Update spectator UI text when pointer lock changes
    if (this.isSpectator && this.uiManager) {
      this.uiManager.showSpectatorUI(locked)
    }

    if (!locked) {
      this.rotationDeltaX = 0
      this.rotationDeltaY = 0
    }
  }

  _onPointerLockError(evt) {
    // non-critical, ignore
  }

  _onKeyDown(e) {
    // ✨ Ignore input if focus is not on canvas
    if (document.activeElement !== this.renderer.domElement && document.activeElement !== document.body) {
      return;
    }
    
    switch (e.code) {
      case 'KeyC':
        // Gameplay mode manages pause/resume pointer lock from SimulationTest.
        if (this.isGameplayMode) return
        e.preventDefault()
        this.disableControl()  // ✨ Hold C = unlock camera (exit pointer lock)
        break
      case 'KeyW': this.moveState.forward = true; break
      case 'KeyS': this.moveState.backward = true; break
      case 'KeyA': this.moveState.left = true; break
      case 'KeyD': this.moveState.right = true; break
      case 'Space': this.moveState.up = true; break
      case 'ShiftLeft':
      case 'ShiftRight': this.moveState.down = true; break
    }
  }

  _onKeyUp(e) {
    // ✨ Ignore input if focus is not on canvas
    if (document.activeElement !== this.renderer.domElement && document.activeElement !== document.body) {
      return;
    }
    
    switch (e.code) {
      case 'KeyC':
        // Gameplay mode manages pause/resume pointer lock from SimulationTest.
        if (this.isGameplayMode) return
        e.preventDefault()
        this.enableControl()  // ✨ Release C = lock camera (request pointer lock)
        break
      case 'KeyW': this.moveState.forward = false; break
      case 'KeyS': this.moveState.backward = false; break
      case 'KeyA': this.moveState.left = false; break
      case 'KeyD': this.moveState.right = false; break
      case 'Space': this.moveState.up = false; break
      case 'ShiftLeft':
      case 'ShiftRight': this.moveState.down = false; break
    }
  }

  _onMouseDown(e) {
    if (!this.isControlEnabled) return
    this.isMouseDown = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  _onMouseUp() {
    this.isMouseDown = false
    this.rotationDeltaX = 0
    this.rotationDeltaY = 0
  }

  _onMouseMove(e) {
    if (!this.isControlEnabled) return
    
    if (this.isMouseDown) {
      const deltaX = e.clientX - this.lastMouseX
      const deltaY = e.clientY - this.lastMouseY
      
      const clampedDeltaX = Math.max(-CAMERA_CONFIG.MOUSE_DELTA_LIMIT, Math.min(CAMERA_CONFIG.MOUSE_DELTA_LIMIT, deltaX))
      const clampedDeltaY = Math.max(-CAMERA_CONFIG.MOUSE_DELTA_LIMIT, Math.min(CAMERA_CONFIG.MOUSE_DELTA_LIMIT, deltaY))
      
      const finalDeltaX = clampedDeltaX * (CAMERA_CONFIG.INVERT_MOUSE_X ? -1 : 1)
      const finalDeltaY = clampedDeltaY * (settingsManager.get('invertY') ? 1 : -1)
      
      this.rotationDeltaX += finalDeltaX * settingsManager.get('mouseSensitivity') * 0.0007
      this.rotationDeltaY += finalDeltaY * settingsManager.get('mouseSensitivity') * 0.0007
      
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    } else {
      if (document.pointerLockElement !== this.renderer.domElement) return

      const deltaX = Math.max(-CAMERA_CONFIG.MOUSE_DELTA_LIMIT, Math.min(CAMERA_CONFIG.MOUSE_DELTA_LIMIT, e.movementX))
      const deltaY = Math.max(-CAMERA_CONFIG.MOUSE_DELTA_LIMIT, Math.min(CAMERA_CONFIG.MOUSE_DELTA_LIMIT, e.movementY))
      
      const finalDeltaX = deltaX * (CAMERA_CONFIG.INVERT_MOUSE_X ? -1 : 1)
      const finalDeltaY = deltaY * (settingsManager.get('invertY') ? 1 : -1)
      
      this.rotationDeltaX += finalDeltaX * settingsManager.get('mouseSensitivity') * 0.0007
      this.rotationDeltaY += finalDeltaY * settingsManager.get('mouseSensitivity') * 0.0007
    }
  }

  _onWheel(e) {
    e.preventDefault()

    if (this.targetObject) {
      const zoomSpeed = CAMERA_CONFIG.ZOOM_SPEED
      const deltaZoom = Math.max(-CAMERA_CONFIG.ZOOM_DELTA_LIMIT, Math.min(CAMERA_CONFIG.ZOOM_DELTA_LIMIT, e.deltaY * zoomSpeed))
      this.targetDistance *= 1 + deltaZoom
      const minRadius = CAMERA_CONFIG.MIN_ZOOM_DISTANCE - CAMERA_CONFIG.ZOOM_FADE_BUFFER
      const maxRadius = this.isSpectator ? CAMERA_CONFIG.MAX_ZOOM_DISTANCE : CAMERA_CONFIG.POSSESS_MAX_ZOOM_DISTANCE
      this.targetDistance = Math.max(minRadius, Math.min(maxRadius, this.targetDistance))
    } else if (this.isSpectator) {
      const zoomSpeed = CAMERA_CONFIG.ZOOM_SPEED * 10
      const delta = Math.max(-CAMERA_CONFIG.ZOOM_DELTA_LIMIT, Math.min(CAMERA_CONFIG.ZOOM_DELTA_LIMIT, e.deltaY * zoomSpeed))
      const dir = new THREE.Vector3()
      this.camera.getWorldDirection(dir)
      this.camera.position.addScaledVector(dir, delta)
      this.spectatorPosition.copy(this.camera.position)
    }
  }

  _onContextMenu(e) {
    e.preventDefault()
  }

  _updateCameraPosition(delta = 0) {
    const maxRotationPerFrame = CAMERA_CONFIG.ROTATION_SPEED_LIMIT
    if (Math.abs(this.rotationDeltaX) > CAMERA_CONFIG.INERTIA_THRESHOLD || Math.abs(this.rotationDeltaY) > CAMERA_CONFIG.INERTIA_THRESHOLD) {
      const dx = Math.max(-maxRotationPerFrame, Math.min(maxRotationPerFrame, this.rotationDeltaX))
      const dy = Math.max(-maxRotationPerFrame, Math.min(maxRotationPerFrame, this.rotationDeltaY))

      this.rotationEuler.y += dx
      this.rotationEuler.x += dy

      this.rotationEuler.x = Math.max(CAMERA_CONFIG.MIN_POLAR_ANGLE - Math.PI/2, Math.min(CAMERA_CONFIG.MAX_POLAR_ANGLE - Math.PI/2, this.rotationEuler.x))

      this.rotationDeltaX *= CAMERA_CONFIG.INERTIA_FACTOR
      this.rotationDeltaY *= CAMERA_CONFIG.INERTIA_FACTOR

      if (Math.abs(this.rotationDeltaX) < CAMERA_CONFIG.INERTIA_THRESHOLD) this.rotationDeltaX = 0
      if (Math.abs(this.rotationDeltaY) < CAMERA_CONFIG.INERTIA_THRESHOLD) this.rotationDeltaY = 0

      this.rotation.setFromEuler(this.rotationEuler)
    }

    // ✨ Smoothly interpolate camera distance toward targetDistance
    if (this.targetObject && !this.isSpectator) {
      // Clamp targetDistance
      this.targetDistance = Math.max(CAMERA_CONFIG.MIN_ZOOM_DISTANCE, Math.min(CAMERA_CONFIG.POSSESS_MAX_ZOOM_DISTANCE, this.targetDistance))
      // Smooth interpolation (lerp)
      const lerpAlpha = 1.0 - Math.pow(0.05, delta > 0 ? delta * 60 : 1) // ~0.15 per frame at 60fps
      this.distance += (this.targetDistance - this.distance) * lerpAlpha
    }

    if (this.targetObject) {
      if (this.isPlayerTarget && this.cachedCuePivot) {
        const cuePivot = this.cachedCuePivot
        if (cuePivot.parent) {
          const cueWorldPos = this._tmpCueWorldPos
          cuePivot.getWorldPosition(cueWorldPos)
          
          cueWorldPos.y += CAMERA_CONFIG.CAMERA_HEIGHT_OFFSET

          const offset = this._tmpOffset.set(0, 0, 1)
          offset.applyQuaternion(this.rotation)
          
          // ✨ Check for collision and clamp distance
          const direction = this._tmpDirection.copy(offset).normalize()
          const adjustedDistance = this._adjustCameraDistanceForCollision(cueWorldPos, direction, this.distance)
          // One-way smoothing: snap in when blocked, lerp out when clear
          let finalDistance = this.distance
          if (adjustedDistance < this.distance - 0.01) {
            // Snap in instantly if blocked
            finalDistance = adjustedDistance
            this.distance = adjustedDistance
          } else {
            // Lerp out smoothly if unblocked
            finalDistance += (adjustedDistance - finalDistance) * 0.15
            this.distance = finalDistance
          }
          offset.multiplyScalar(finalDistance)

          this.camera.position.copy(cueWorldPos).add(offset)
          this.camera.lookAt(cueWorldPos)
          // ✨ Apply dithering effect if camera is very close to target
          this._updateDithering(finalDistance, delta)
          return
        }
      }

      this.targetObject.getWorldPosition(this.targetPosition)
      
      const offset = this._tmpOffset.set(0, 0, 1)
      offset.applyQuaternion(this.rotation)
      
      // ✨ Check for collision and clamp distance
      const direction = this._tmpDirection.copy(offset).normalize()
      const adjustedDistance = this._adjustCameraDistanceForCollision(this.targetPosition, direction, this.distance)
      // One-way smoothing: snap in when blocked, lerp out when clear
      let finalDistance = this.distance
      if (adjustedDistance < this.distance - 0.01) {
        // Snap in instantly if blocked
        finalDistance = adjustedDistance
        this.distance = adjustedDistance
      } else {
        // Lerp out smoothly if unblocked
        finalDistance += (adjustedDistance - finalDistance) * 0.15
        this.distance = finalDistance
      }
      offset.multiplyScalar(finalDistance)

      this.camera.position.copy(this.targetPosition).add(offset)
      this.camera.lookAt(this.targetPosition)
      // ✨ Apply dithering effect if camera is very close to target
      this._updateDithering(finalDistance, delta)
    } else if (this.isSpectator) {
      this.camera.quaternion.copy(this.rotation)
      
      // ✨ Safety check: reset moveState if focus is not on canvas
      if (document.activeElement !== this.renderer.domElement && document.activeElement !== document.body) {
        this._resetMoveState();
      }
      
      if (delta > 0) {
        const movement = this._tmpSpectatorMovement.set(0, 0, 0)
        if (this.moveState.forward) movement.z -= 1
        if (this.moveState.backward) movement.z += 1
        if (this.moveState.left) movement.x -= 1
        if (this.moveState.right) movement.x += 1
        if (this.moveState.up) movement.y += 1
        if (this.moveState.down) movement.y -= 1

        if (movement.lengthSq() > 0) {
          movement.normalize()
          movement.applyQuaternion(this.camera.quaternion)
          movement.multiplyScalar(CAMERA_CONFIG.SPECTATOR_SPEED * delta)
          this.camera.position.add(movement)
          this.spectatorPosition.copy(this.camera.position)
        }
      }
    }
  }

  focus(object) {
    if (this.targetObject && this.targetObject !== object) {
      this._removeDithering()
      this._cleanupDitheringCaches(true)
    }

    this.targetObject = object
    this.cachedCuePivot = null
    this.isSpectator = false
    
    // ✨ Hide spectator UI when focusing on object
    if (this.uiManager) {
      this.uiManager.hideSpectatorUI()
    }
    
    object.traverse(child => {
      if (!this.cachedCuePivot && child.userData && child.userData.isCuePivot) {
        this.cachedCuePivot = child
      }
    })
    this.isPlayerTarget = !!this.cachedCuePivot

    const targetWorldPos = new THREE.Vector3()
    
    if (this.isPlayerTarget) {
      const cuePivot = this.cachedCuePivot
      if (cuePivot) {
        cuePivot.getWorldPosition(targetWorldPos)
        targetWorldPos.y += CAMERA_CONFIG.CAMERA_HEIGHT_OFFSET
      } else {
        object.getWorldPosition(targetWorldPos)
      }
    } else {
      object.getWorldPosition(targetWorldPos)
    }
    
    const offset = new THREE.Vector3().subVectors(this.camera.position, targetWorldPos)
    const dist = offset.length()

    // ✨ Apply reduced zoom distance when focusing on object
    this.distance = Math.max(CAMERA_CONFIG.MIN_ZOOM_DISTANCE, Math.min(CAMERA_CONFIG.POSSESS_MAX_ZOOM_DISTANCE, dist))

    if (dist > 0.001) {
      const yaw = Math.atan2(offset.x, offset.z)
      const pitch = -Math.asin(Math.max(-1, Math.min(1, offset.y / dist)))
      
      this.rotationEuler.set(pitch, yaw, 0, 'YXZ')
      this.rotation.setFromEuler(this.rotationEuler)
    }
    
    this.rotationDeltaX = 0
    this.rotationDeltaY = 0

    this._updateCameraPosition()
  }

  clearFocus() {
    // ✨ In gameplay mode, don't allow clearing focus from player
    if (this.isGameplayMode) return
    
    // ✨ Remove dithering before clearing focus
    this._removeDithering()
    this._cleanupDitheringCaches(true)
    
    this.targetObject = null
    this.cachedCuePivot = null
    this.isPlayerTarget = false
    this.isSpectator = true
    this.spectatorPosition.copy(this.camera.position)
    
    // ✨ Hide player UI and show spectator UI when exiting player
    if (this.uiManager) {
      this.uiManager.hidePlayerUI()
      this.uiManager.showSpectatorUI(this.isControlEnabled)
    }
  }

  /**
   * ✨ Disable camera control while keeping focus (for gameplay mode ESC)
   */
  disableControlOnly() {
    this.disableControl()
  }

  /**
   * ✨ Apply dithering effect to target object when camera is too close
   * Fades material alpha to avoid camera clipping through mesh
   * Excludes cue from dithering - cue always visible
   */
  _applyDithering(alpha) {
    if (!this.targetObject) return
    
    // Find cue pivot in target object hierarchy
    const cuePivot = this.cachedCuePivot
    
    // Helper: check if object is part of cue hierarchy
    const isPartOfCue = (obj) => {
      if (!cuePivot) return false
      let parent = obj.parent
      while (parent) {
        if (parent === cuePivot) return true
        parent = parent.parent
      }
      return obj === cuePivot
    }

    // Helper: check if object is part of target hierarchy
    const isPartOfTarget = (obj) => {
      let parent = obj.parent
      while (parent) {
        if (parent === this.targetObject) return true
        parent = parent.parent
      }
      return obj === this.targetObject
    }

    // First pass: restore meshes that no longer match dither criteria
    this.ditheredMeshes.forEach((child, key) => {
      if (!child || !child.isMesh) return

      const shouldDither = 
        isPartOfTarget(child) || 
        (this.targetObject.name === 'Player' && child.userData?.isCarriedItem && child.userData?.carriedByPlayer === true)

      if (!shouldDither) {
        // Restore this mesh
        const originalMat = this.originalMaterials.get(key)
        if (originalMat) {
          const index = parseInt(key.split('_').pop(), 10)
          if (Array.isArray(child.material)) {
            if (index < child.material.length) child.material[index] = originalMat
          } else {
            child.material = originalMat
          }
        }
        const ditherMat = this.ditherMaterials.get(key)
        if (ditherMat && typeof ditherMat.dispose === 'function') {
          ditherMat.dispose()
        }
        this.ditherMaterials.delete(key)
        this.originalMaterials.delete(key)
        // Remove from tracking
        this.ditheredMeshes.delete(key)
      }
    })
    
    const applyDitherToMesh = (child) => {
      if (!child.isMesh || !child.material) return

      const materials = Array.isArray(child.material) ? child.material : [child.material]

      materials.forEach((mat, index) => {
        // Store original material if not already stored
        const key = `${child.uuid}_${index}`
        if (!this.originalMaterials.has(key)) {
          this.originalMaterials.set(key, mat)
        }

        // Create dithering material if needed
        if (!this.ditherMaterials.has(key)) {
          const ditherMat = mat.clone()
          ditherMat.transparent = true
          // Keep alphaTest disabled for dithered carry-items to prevent hard cutout
          // when opacity is reduced at close camera distance.
          ditherMat.alphaTest = 0
          this.ditherMaterials.set(key, ditherMat)
        }

        // Update alpha
        const ditherMat = this.ditherMaterials.get(key)
        ditherMat.opacity = alpha
        ditherMat.transparent = true

        // Apply dithering material
        if (Array.isArray(child.material)) {
          child.material[index] = ditherMat
        } else {
          child.material = ditherMat
        }

        // Track which mesh owns this key so restore can work without re-traverse
        this.ditheredMeshes.set(key, child)
      })
    }

    // Traverse target object and apply dithering to all materials
    this.targetObject.traverse(child => {
      // Skip cue objects - keep them always visible
      if (isPartOfCue(child)) return
      applyDitherToMesh(child)
    })

    // Only dither carried items if target is Player
    if (this.targetObject.name === 'Player' && this.scene) {
      this.scene.traverse(child => {
        if (!child.isMesh) return
        if (!child.userData?.isCarriedItem) return
        if (child.userData?.carriedByPlayer !== true) return
        applyDitherToMesh(child)
      })
    }
    
    this.isDitheringActive = true
  }

  /**
   * ✨ Remove dithering effect and restore original materials
   * Uses the ditheredMeshes registry so ALL previously-dithered meshes are
   * restored even if target changed or items were dropped.
   * Preserves originalMaterials and ditherMaterials maps for reuse across cycles.
   */
  _removeDithering() {
    if (!this.isDitheringActive) return

    this.ditheredMeshes.forEach((child, key) => {
      if (!child || !child.isMesh) return
      const originalMat = this.originalMaterials.get(key)
      if (!originalMat) return

      const index = parseInt(key.split('_').pop(), 10)
      if (Array.isArray(child.material)) {
        if (index < child.material.length) child.material[index] = originalMat
      } else {
        child.material = originalMat
      }
    })

    this.ditheredMeshes.clear()
    this.isDitheringActive = false
    this._lastDitherAlpha = null
    this._ditherUpdateAccumulator = this._effectiveDitherUpdateInterval
  }

  _cleanupDitheringCaches(force = false) {
    const keysToDelete = []

    this.ditherMaterials.forEach((mat, key) => {
      const mesh = this.ditheredMeshes.get(key)
      const shouldDelete = force || !mesh || !mesh.parent
      if (!shouldDelete) return

      if (mat && typeof mat.dispose === 'function') {
        mat.dispose()
      }
      keysToDelete.push(key)
    })

    keysToDelete.forEach(key => {
      this.ditherMaterials.delete(key)
      this.originalMaterials.delete(key)
      this.ditheredMeshes.delete(key)
    })
  }

  /**
   * ✨ Update dithering based on camera distance to target
   */
  _updateDithering(cameraDistance, delta = 0) {
    if (!this.targetObject || this.isSpectator) return
    if (!this._adaptiveDitherEnabled) {
      if (this.isDitheringActive) this._removeDithering()
      return
    }

    this._ditherUpdateAccumulator += delta
    
    const threshold = CAMERA_CONFIG.DITHERING_DISTANCE_THRESHOLD
    
    if (cameraDistance < threshold) {
      // Calculate alpha based on distance (closer = more transparent)
      const alphaRange = CAMERA_CONFIG.DITHERING_ALPHA_START - CAMERA_CONFIG.DITHERING_ALPHA_END
      const alpha = CAMERA_CONFIG.DITHERING_ALPHA_END + (cameraDistance / threshold) * alphaRange
      const canSkipUpdate = this.isDitheringActive &&
        this._lastDitherAlpha !== null &&
        Math.abs(alpha - this._lastDitherAlpha) < CAMERA_CONFIG.DITHERING_ALPHA_EPSILON &&
        this._ditherUpdateAccumulator < this._effectiveDitherUpdateInterval

      if (canSkipUpdate) {
        return
      }

      this._ditherUpdateAccumulator = 0
      this._lastDitherAlpha = alpha
      this._applyDithering(alpha)
    } else if (this.isDitheringActive) {
      // Remove dithering when far enough
      this._removeDithering()
    }
  }

  /**
   * ✨ Check camera collision with visible meshes only
   * Returns adjusted distance to prevent clipping
   */
  _isCollisionCandidate(obj) {
    const isWaterSurface = obj.userData?.isSection2WaterSurface || obj.name === 'Section2 Water Surface'
    if (!obj.isMesh || obj.isInstancedMesh || !obj.visible || obj.userData?.isTriggerBox || obj.userData?.isCarriedItem || isWaterSurface) {
      return false
    }

    let current = obj
    while (current) {
      if (current.userData?.ignoreRaycast) {
        return false
      }
      current = current.parent
    }

    const material = Array.isArray(obj.material) ? obj.material[0] : obj.material
    if (!material || material.wireframe === true) {
      return false
    }

    return true
  }

  _refreshCollisionCache(force = false) {
    if (!this.scene) {
      this._cachedCollidables = []
      return
    }

    const sectionKey = this._activeSectionKey || 'global'
    const sectionCache = this._sectionCollidableCaches.get(sectionKey)
    if (!force && this._collisionCacheAccumulator < this._effectiveCollisionCacheRefreshInterval && sectionCache?.collidables?.length) {
      this._cachedCollidables = sectionCache.collidables
      return
    }

    if (!force && this._collisionCacheAccumulator < this._effectiveCollisionCacheRefreshInterval && this._cachedCollidables.length > 0) {
      return
    }

    this._collisionCacheAccumulator = 0
    const collidables = []
    this.scene.traverse(obj => {
      if (this._isCollisionCandidate(obj)) {
        collidables.push(obj)
      }
    })
    this._cachedCollidables = collidables
    this._sectionCollidableCaches.set(sectionKey, {
      collidables,
      capturedAt: performance.now()
    })
  }

  _isTargetHierarchyObject(obj) {
    if (!this.targetObject || !obj) return false
    let current = obj
    while (current) {
      if (current === this.targetObject) return true
      current = current.parent
    }
    return false
  }

  _cacheCollisionResult(targetPos, direction, desiredDistance, adjustedDistance) {
    this._lastCollisionTargetPos.copy(targetPos)
    this._lastCollisionDirection.copy(direction)
    this._lastCollisionDistance = desiredDistance
    this._lastCollisionResult = adjustedDistance
  }

  _adjustCameraDistanceForCollision(targetPos, direction, desiredDistance) {
    if (!this.scene || desiredDistance < 0.1) return desiredDistance

    this._refreshCollisionCache()


    const targetMoved = this._lastCollisionTargetPos.distanceToSquared(targetPos) > CAMERA_CONFIG.COLLISION_TARGET_EPSILON_SQ
    const directionChanged = 1 - Math.abs(this._lastCollisionDirection.dot(direction)) > CAMERA_CONFIG.COLLISION_DIRECTION_EPSILON
    const distanceChanged = Math.abs(this._lastCollisionDistance - desiredDistance) > CAMERA_CONFIG.COLLISION_DISTANCE_EPSILON
    const rotationDeltaMagnitude = Math.abs(this.rotationDeltaX) + Math.abs(this.rotationDeltaY)
    const isFastRotating = rotationDeltaMagnitude > CAMERA_CONFIG.COLLISION_FAST_ROTATION_DELTA_THRESHOLD
    const minCollisionInterval = isFastRotating
      ? this._effectiveCollisionCheckFastInterval
      : this._effectiveCollisionCheckInterval
    const hasPoseChange = targetMoved || directionChanged || distanceChanged

    // Nếu có flag ép kiểm tra va chạm, bỏ qua early return
    if (!this._forceCollisionCheck) {
      if (!hasPoseChange && this._collisionCheckAccumulator < this._effectiveCollisionCheckInterval) {
        return this._lastCollisionResult
      }

      if (hasPoseChange && this._collisionCheckAccumulator < minCollisionInterval) {
        return this._lastCollisionResult
      }
    } else {
      this._forceCollisionCheck = false
    }

    this._collisionCheckAccumulator = 0
    this.raycaster.set(targetPos, direction)
    this.raycaster.far = desiredDistance + 0.3

    const intersects = this.raycaster.intersectObjects(this._cachedCollidables, false)
    const closestHit = intersects.find(hit => hit.object?.visible && !this._isTargetHierarchyObject(hit.object))

    if (closestHit) {
      const buffer = 0.3
      const adjustedDistance = Math.max(0.5, Math.min(desiredDistance, closestHit.distance - buffer))
      this._cacheCollisionResult(targetPos, direction, desiredDistance, adjustedDistance)
      return adjustedDistance
    }

    this._cacheCollisionResult(targetPos, direction, desiredDistance, desiredDistance)
    return desiredDistance
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }

  update(delta) {
    this._updateAdaptiveQuality(delta)
    this._collisionCheckAccumulator += delta
    this._collisionCacheAccumulator += delta
    this._updateCameraPosition(delta)

    this._ditherCleanupAccumulator += delta
    if (this._ditherCleanupAccumulator > 1.0) {
      this._ditherCleanupAccumulator = 0
      this._cleanupDitheringCaches(false)
    }
  }

  isControlEnabled() { return this.isControlEnabled }
  getTarget() { return this.targetObject }
  setDistance(newDistance) { 
    // ✨ Apply reduced zoom distance when focusing on object (possess mode)
    const maxZoom = this.targetObject && !this.isSpectator ? CAMERA_CONFIG.POSSESS_MAX_ZOOM_DISTANCE : CAMERA_CONFIG.MAX_ZOOM_DISTANCE
    this.distance = Math.max(CAMERA_CONFIG.MIN_ZOOM_DISTANCE, Math.min(maxZoom, newDistance)) 
  }
  getDistance() { return this.distance }
  getMinZoomDistance() { return CAMERA_CONFIG.MIN_ZOOM_DISTANCE }
  getFadeBuffer() { return CAMERA_CONFIG.ZOOM_FADE_BUFFER }

  reset() {
    // Thiết lập tọa độ camera cụ thể: lùi ra xa (Z âm), cao lên (Y dương), nhìn xuống
    this.distance = CAMERA_CONFIG.DEFAULT_ZOOM_DISTANCE
    this.rotationDeltaX = 0
    this.rotationDeltaY = 0
    
    // Đặt vị trí camera: (X, Y, Z)
    this.spectatorPosition.set(0, 10, 10)
    this.camera.position.set(0, 10, 10)
    this.camera.lookAt(0, 15, 0)
    
    this.isSpectator = true
    this.targetObject = null
    this.isPlayerTarget = false
    this._lastDitherAlpha = null
    this._collisionCheckAccumulator = this._effectiveCollisionCheckInterval
    this._collisionCacheAccumulator = this._effectiveCollisionCacheRefreshInterval
    
    // ✨ Initialize camera state to default (pointer lock DISABLED)
    this.isControlEnabled = false
    this.renderer.domElement.style.cursor = 'default'
    this.crosshair.style.display = 'none'
    
    // ✨ Force exit pointer lock if somehow active (shouldn't happen at init)
    if (document.pointerLockElement === this.renderer.domElement) {
      try {
        document.exitPointerLock()
      } catch (err) {
        // ignore
      }
    }
    
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._boundOnPointerLockChange)
    document.removeEventListener('pointerlockerror', this._boundOnPointerLockError)
    window.removeEventListener('keydown', this._boundOnKeyDown)
    window.removeEventListener('keyup', this._boundOnKeyUp)
    this.renderer.domElement.removeEventListener('mousedown', this._boundOnMouseDown)
    this.renderer.domElement.removeEventListener('mouseup', this._boundOnMouseUp)
    this.renderer.domElement.removeEventListener('mousemove', this._boundOnMouseMove)
    this.renderer.domElement.removeEventListener('wheel', this._boundOnWheel)
    this.renderer.domElement.removeEventListener('contextmenu', this._boundOnContextMenu)
    window.removeEventListener('resize', this._boundOnResize)
    window.removeEventListener('blur', this._boundOnBlur)
    document.removeEventListener('focusin', this._boundOnFocusIn)
    document.removeEventListener('mousedown', this._boundOnDocumentMouseDown)
    
    // ✨ Clean up crosshair
    if (this.crosshair && this.crosshair.parentNode) {
      this.crosshair.parentNode.removeChild(this.crosshair)
    }
    
    // ✨ Clean up dithering materials
    this._removeDithering()
    this._cleanupDitheringCaches(true)
    this.ditheredMeshes.clear()
    this.originalMaterials.clear()
    this.ditherMaterials.clear()
    this._sectionCollidableCaches.clear()
    this._cachedCollidables = []
    
    // Note: UI cleanup is now handled by UIManager.dispose()
  }

  /**
   * Ép cập nhật lại cache va chạm ngay lập tức (dùng khi player pick/drop item)
   */
  forceRefreshCollisionCache() {
    this._refreshCollisionCache(true);
  }
}