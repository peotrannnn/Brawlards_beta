import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { CompuneAI } from '../AI/compuneBot.js'
import { EyeBot } from '../AI/eyeBot.js'
import { SCENE1_COMPUNES } from '../assets/scenes/scene1Dialogs.js'
import { COLLISION_GROUPS, COLLISION_MASKS } from '../physics/physicsHelper.js'
import { createSweatEffect } from '../effects/particles/particle8.js'
import { applySection2UnderwaterFog } from '../assets/scenes/sections/section1_2.js'
import { ScreenMat } from '../utils/ScreenMat.js'
import { createLoadingOverlay } from '../utils/loadingOverlay.js'
import { getLightStickOffAsset } from '../assets/items/lightStickOff.js'
import { getBabyOilAsset } from '../assets/items/babyOil.js'
import { getSilverCoinAsset } from '../assets/items/silverCoin.js'
import { getDummyAsset } from '../assets/objects/Dummy.js'
import { getGuideAsset } from '../assets/objects/Guide.js'
import { withShadow } from '../effects/shadows/shadowConfig.js'
import { getPlayerAsset } from '../assets/objects/Player.js'
import {
  setTreeMaterialControllerBrightness,
  setTreeMaterialControllerOpacity,
  setTreeOpacity,
  updateBillboards
} from '../assets/objects/TreeBillboard.js'

const FLICKER_CONFIG = {
  offColor: "#666666",
  onColor: "#ffffff",
  offEmissiveIntensity: 0,
  onEmissiveIntensityMultiplier: 2.0
}

const WINDOW_CONFIG = {
  elevation: 11,
  height: 9
}

const SCENE1_CONFIG = {
  lightFlickerDuration: 2.0,
  ambientLightFlickerDuration: 1.0,
  baseAmbientIntensity: 0.2,
  phaseChangeIntensityReduction: 0.08,
  baseFogDensity: 0.002,
  phaseChangeFogIncrease: 0.0004,
  baseSunIntensity: 2500,
  waterSplashInterval: 0.6,
  waterSplashPosition: { x: 9.5, y: 4.3, z: 5.0 },
  guySpawnPosition: { x: 9.5, y: 2.15, z: 5.0 },
  waterSplashSpread: 1.2,
  waterSplashRandomY: 0.4,
  section2BubbleTrailMinSpeed: 0.55,
  section2BubbleTrailIntervalSlow: 0.16,
  section2BubbleTrailIntervalFast: 0.055,
  section2BubbleTrailWaterThreshold: 0.14,
  personHeight: 4,
  sunLightDimFactor: 0.9,
  sunLightMinIntensity: 50,
  sunLightBaseFar: 200,
  dudeFogMaxDistance: 18,
  dudeFogMinFar: 3,
  dudeFogStartDelay: 3.0,
  dudeFogResetDuration: 3.0,
  dudeFogTransitionDuration: 0.5,
  blackoutSunLightIntensity: 1250,
  blackoutAmbientIntensity: 0.18,
  vendingCollectDetectPadding: 1.2,
  vendingCollectDuration: 0.62,
  vendingCollectArcLift: 0.85,
  vendingFrontDepthFactor: 0.52,
  vendingSlotHeightMin: 0.9,
  vendingSlotHeightRatio: 0.2,
  vendingInsertRightOffset: 2,
  vendingInsertUpOffset: 10,
  vendingDropForwardExtra: 0.32,
  vendingDropLift: 0.38,
  cartonOpenDelay: 1.0,
  cartonOpenDuration: 0.8,
  chestOilApplyDuration: 1.5,
  chestLatchOpenDuration: 0.45,
  chestOpenDuration: 1.2,
  chestCollectScanIntervalSec: 1 / 15,
  vendingCollectScanIntervalSec: 1 / 18,
  sequenceSilverCoinSpawnHeight: 7,
  sequenceSilverCoinSpawnSpread: 0.7,
  sequenceSilverCoinMinSpinY: 6,
  sequenceSilverCoinMaxSpinY: 10,
  section3HouseScaleMinDistance: 8,
  section3HouseScaleMaxDistance: 56,
  section3HouseScaleNear: 2.4,
  section3HouseScaleFar: 0.1,
  section3HouseScaleSmoothSpeed: 6.0,
  section3HouseScaleUpdateInterval: 1 / 15,
  section3TreeScaleMinDistance: 7,
  section3TreeScaleMaxDistance: 52,
  section3TreeScaleNear: 1.7,
  section3TreeScaleFar: 0.42,
  section3TreeScaleSmoothSpeed: 6.0,
  section3TreeScaleUpdateInterval: 1 / 15,
  section3TreeBillboardUpdateInterval: 1 / 20,
  section3EdgeDarkStartRatio: 0.0,
  section3EdgeDarkMaxRatio: 0.5,
  section3EdgeDarkSmoothSpeed: 3.0,
  section3EdgeDarkMinMainLightFactor: 0.0,
  section3EdgeDarkMinAmbientIntensity: 0.0,
  section3EdgeDarkFogNearFactor: 0.35,
  section3EdgeDarkFogFarFactor: 0.08,
  section3EdgeTeleportCooldownSec: 0.85,
  section3EdgeTeleportHoldSec: 3.0,
  section3EdgePostTeleportDarkHoldSec: 3.0,
  section3EdgeRecoveryDurationSec: 5.0,
  section3EyeDescentDurationSec: 300.0
}

const SECTION_WARMUP_CONFIG = {
  overlayFrameBudgetMs: 4.5,
  backgroundFrameBudgetMs: 2.5,
  overlayMinVisibleMs: 900
}

const SECTION_STREAMING_CONFIG = {
  switchConfirmSec: 0.12,
  pendingTeleportMaxWaitSec: 6.0
}

export class Scene1Manager {
  constructor(sceneGroup, destroySystem = null, mainScene = null) {
    this.sceneGroup = sceneGroup
    this.mainScene = mainScene
    this.destroySystem = destroySystem
    
    // Spawning system dependencies
    this.spawner = null
    this.guyAsset = null
    this.dudeAsset = null
    this.world = null
    this.physicsMaterials = null
    this.syncList = null
    this.particleManager = null
    this.SIMULATION_CONFIG = null
    this.renderer = null
    
    this.flickerTimer = 0
    this.leakTimer = 0
    this.lightFlickerTimer = 0
    this.isLightFlickeringActive = false
    
    this.ambientLightFlickerTimer = 0
    this.isAmbientFlickering = false
    this.ambientLight = null
    this.baseAmbientIntensity = SCENE1_CONFIG.baseAmbientIntensity
    this.currentAmbientIntensity = SCENE1_CONFIG.baseAmbientIntensity
    this.phaseChangeIntensityReduction = SCENE1_CONFIG.phaseChangeIntensityReduction
    this.totalPhaseChanges = 0
    
    this.baseFogDensity = SCENE1_CONFIG.baseFogDensity
    this.currentFogDensity = SCENE1_CONFIG.baseFogDensity
    this.phaseChangeFogIncrease = SCENE1_CONFIG.phaseChangeFogIncrease
    
    this.guyFlickerTimers = new Map()
    this.ballEventFlickerTimer = 0  // Track ball event flickering (ball 7, reset)
    this.guyCount = 0
    this.lastGuyCount = 0
    
    this.hookedGuyAIs = new Set()
    
    this.sunLight = null
    this.baseSunIntensity = SCENE1_CONFIG.baseSunIntensity
    
    this.lightsInitialized = false
    
    // ✨ NEW: Elevator door system
    this.elevatorDoor = null
    this.elevatorDoorOpened = false
    this.elevatorDoorPhaseTriggered = false
    this.elevatorCountdownActive = false
    this.elevatorCountdownTimer = 0
    this.elevatorCountdownDuration = 30 // 30 seconds from 15 to 0 (down from 50)
    this.elevatorCountdownFinished = false // Flag to keep display at 0 after countdown completes
    this.elevatorFinalDisplayValue = null // Store 0 to display when countdown finishes
    this.elevatorDoorTouched = false // Flag to track if player touched open door (log once)
    
    // ✨ NEW: Game over system
    this.gameOver = false
    this.gameOverTime = 0  // Time when game ended
    this.gameStartTime = null  // Time when game started (for completion time tracking)
    this.gameOverReason = null  // 'elevator' or 'death'
    this.gameOverCallback = null  // Callback function to show game over screen
    this.gameOverCallbackTriggered = false  // Flag to ensure callback only called once
    
    // ✨ NEW: Sweat effects array (updated by update() method)
    this.activeSweatEffects = [] // Array of sweat effect objects
    
    this.personMesh = null
    this.riseProgress = 0
    this.isRetracting = false
    this.initialY = 0
    this.targetY = 0
    
    this.wElev = WINDOW_CONFIG.elevation
    this.wHeight = WINDOW_CONFIG.height
    
    // Blackout system (lights off when player falls)
    this.blackoutTimer = 0
    this.blackoutDuration = 3000  // 3 seconds in milliseconds
    this.isBlackoutActive = false
    this.section1CeilingLightsEnabled = true
    this.turnOffSection1CeilingAfterFlicker = false
    
    // Ball spawning system for scene 1
    this.playerSpawned = false
    this.sceneStartTime = 0
    this.compuneAI = null
    this.compuneAsset = null
    this.compuneMesh = null
    this.compuneSpawnedActivated = false // Flag to ensure ball spawning only activates once
    this.ballSpawnStartTime = 0
    this.lastBallBatchSpawnTime = 0
    this.ballsDestroyedThisBatch = 0
    this.ballSpawnSequence = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15] // ✨ All balls EXCEPT ball 8 (spawns separately at end)
    this.ballBatchIndex = 0
    this.currentBatchBalls = []
    this.ballSpawningActive = false
    this.allBallsSpawned = false
    this.ballAssets = {}
    this.currentBatchSpawningComplete = true // Track if current batch scheduling is done

    // ✨ NEW: Bowling ball system for batch spawning
    this.bowlingBallEntry = null // Current bowling ball (max 1 at a time)
    this.bowlingBallAsset = null
    this.bowlingBallAssetLoading = null
    this.pendingBowlingSpawnTimer = null
    this.pendingGuySpawnTimer = null
    this.pendingCompuneSpawnTimer = null
    this.pendingBallSpawnTimers = new Set()
    this.spawnBowlingBallChance = 0.25 // 25% chance to spawn bowling ball with non-first batch
    this.bowlingBallLifetimeMinMs = 60000
    this.bowlingBallLifetimeMaxMs = 90000

    // Penalty Dude flow for wrong ball order
    this.penaltyDudeActive = false
    this.penaltyDudeSpawnPending = false
    this.penaltyDudeTouchedPlayer = false

    // Dude touch teleport flow (Section 1 -> Section 2 hallway -> return elevator -> Section 1)
    this.section2ReturnElevator = null
    this.section1TeleportPosition = null
    this.section1TeleportQuaternion = null
    this.isInSection2Run = false
    this.teleportCooldown = 0
    this.section2DishLights = null
    this.section2PipeTunnels = null
    this.section2WaterSurfaces = null
    this.section2FloorMesh = null
    this.section2PipeInsideMap = new Map()
    this.section2SpawnedBall8Entries = []
    this.section2Ball8Asset = null
    this.section2Ball8AssetLoading = null
    this.section2ElevatorParts = null  // cached { doorPanel, glowPlane, envLight }
    this.section2ElevatorDisplayPanel = null
    this.section2PipeBall8DestroyedCount = 0
    this.section2PipeRewardSpawned = false
    this.section2PipeRewardEntry = null
    this.section2RunStartZ = -84
    this.section2UnderwaterBlend = 0
    this.section2IsUnderwater = false
    this.section2ReverseCurrentTimer = 0
    this.section2PipeWaterFxTimer = 0
    this.section3GrassLodUpdater = this.sceneGroup?.userData?.section3GrassLod || null
    this.section3TreeLodUpdater = this.sectionGroups?.section3?.userData?.section3TreeLod || null
    this.section3EyeSun = this.sectionGroups?.section3?.userData?.section3EyeSun || null
    this.section3EyeBot = null
    this.debugSection3PlayerEntry = null

    // Scene1 proximity fog and screen overlay effects
    this.baseFogColor = new THREE.Color(0xffffff)
    this.baseFogNear = 1
    this.screenMat = null
    this.dudeFogBlend = 0
    this.dudeFogSmoothedDistance = SCENE1_CONFIG.dudeFogMaxDistance
    this.dudeFogTargetBlend = 0
    this.dudeFogBlendAtDestroy = 0
    this.dudeFogActiveTimer = 0
    this.dudeFogResetTimer = 0
    this.hadDudeLastFrame = false

    // Vending machine coin collector system
    this.vendingMachineEntry = null
    this.vendingCoinCollectState = null
    this.vendingBabyOilAsset = null
    this._vendingCollectScanAccumulator = 0

    // Carton box interaction system
    this.cartonBoxEntry = null
    this.cartonBoxState = null
    this.cartonDummyAsset = null
    this.cartonDummyEntry = null

    // Chest interaction system
    this.chestEntry = null
    this.chestState = null

    // Reusable vectors for hot-path distance checks.
    this._tmpDudeTriggerWorldPos = new THREE.Vector3()
    this._tmpPlayerTriggerWorldPos = new THREE.Vector3()
    this.chestGuideAsset = null
    this.chestGuideEntry = null
    this.chestOilApplyState = null
    this._chestCollectScanAccumulator = 0

    this._tmpOrientedBoxDiff = new THREE.Vector3()
    this._tmpChestAnimPos = new THREE.Vector3()
    this._tmpChestAnimUp = new THREE.Vector3(0, 1, 0)
    this._tmpChestAnimQuat = new THREE.Quaternion()
    this._tmpVendingAnimPos = new THREE.Vector3()
    this._tmpVendingAnimQuat = new THREE.Quaternion()

    // Reward coin on ordered sequence system
    this.sequenceSilverCoinAsset = null
    this.correctOrderedBallsSinceLastCoin = 0
    this.orderedBallsPerSilverCoinReward = 4
    
    // ✨ NEW: Scoring system
    this.destroySequence = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 8] // ✨ Expected destroy order (ball 8 last)
    this.nextExpectedBallIndex = 0 // Index in destroySequence of next expected ball to destroy
    this.currentScore = 0 // Debug: log when correct destruction
    this.resetTimer = 0 // Timer for respawning after reset
    this.isResetActive = false // Flag if reset is in progress
    this.previousBallNames = new Set() // ✨ NEW: Track previous frame's balls to detect destruction
    this.currentBallNamesBuffer = new Set()
    this.currentBallNumberBuffer = new Map()
    this._tmpSection3FocusPos = new THREE.Vector3()
    this._tmpSection3EyeLookTarget = new THREE.Vector3()
    this._tmpSection3EyePlayerPos = new THREE.Vector3()
    this._tmpSection3HouseFocusPos = new THREE.Vector3()
    this._tmpSection3TreeFocusPos = new THREE.Vector3()
    this._tmpSection3PlatformCenter = new THREE.Vector3()
    this._section3DefaultFocusPos = new THREE.Vector3(0, 140, 0)
    this._section3HouseScaleRegistry = new Map()
    this._section3HouseScaleUpdateAccumulator = 0
    this._section3TreeScaleRegistry = new Map()
    this._section3TreeScaleUpdateAccumulator = 0
    this._section3TreeBillboardUpdateAccumulator = 0
    this.section3EdgeDarkness = 0
    this.section3EdgeTeleportCooldown = 0
    this.section3EdgeOverMaxTimer = 0
    this.section3EdgeDarkHoldTimer = 0
    this.section3EdgeRecoveryTimer = 0
    this.section3EdgeRecoveryStartDarkness = 0
    // Eye descent transition state (30s delay + 60s color transition)
    this.section3EyeDescentStartTime = -1 // Time when eye descent started
    this.section3EyeTransitionStartTime = -1 // Time when 30s delay ended (60s transition starts)
    this.section3EyeTransitionProgress = 0 // 0 to 1 for color transition
    this._section3PlatformBoundsCache = null
    this.sectionGroups = this.sceneGroup?.userData?.sectionGroups || null
    this.baseSceneBackground = null
    this.activeSectionId = null
    this.sectionWarmState = {
      section1: { ready: true, loading: false },
      section2: { ready: false, loading: false },
      section3: { ready: false, loading: false },
      section4: { ready: false, loading: false }
    }
    this.sectionWarmQueue = []
    this.activeSectionWarmJob = null
    this.sectionWarmOverlay = null
    this.sectionWarmOverlayTimer = null
    this._lastWarmupCamera = null
    this.pendingTeleportRequest = null
    this.pendingSectionId = null
    this.pendingSectionTimer = 0
    this.section2DoorLoadTriggered = false
    this._setSectionActive('section1')
    
    this._initializePersonMesh()
    this._setupSpawnCallback()
  }

  _setSectionActive(sectionId) {
    if (!this.sectionGroups) return
    if (this.activeSectionId === sectionId) return

    const section1 = this.sectionGroups.section1
    const section2 = this.sectionGroups.section2
    const section3 = this.sectionGroups.section3
    const section4 = this.sectionGroups.section4

    // Keep Section 1 visible as persistent global-light anchor, stream heavy sections.
    if (section1) section1.visible = true

    if (section2) section2.visible = sectionId === 'section2' || sectionId === 'section4'
    if (section4) section4.visible = sectionId === 'section2' || sectionId === 'section4'
    if (section3) section3.visible = sectionId === 'section3'

    // Force-refresh grass LOD immediately when entering section3 so blades appear right away.
    // Defer grass/tree LOD forceRefresh to the next frame so the teleport frame itself
    // doesn't carry both section visibility toggle + full LOD rebuild on the same tick.
    if (sectionId === 'section3' && (this.section3GrassLodUpdater || this.section3TreeLodUpdater)) {
      const grassUpdater = this.section3GrassLodUpdater
      const treeUpdater = this.section3TreeLodUpdater
      const defaultPos = this._section3DefaultFocusPos
      requestAnimationFrame(() => {
        const playerEntry = this.syncList?.find(e => e.name === 'Player' && e.mesh)
        const focusPos = playerEntry?.mesh?.position || defaultPos
        if (grassUpdater) grassUpdater.forceRefresh(focusPos)
        if (treeUpdater) treeUpdater.forceRefresh(focusPos)
      })
    }

    // Chỉ chấp nhận section1, section2, section3, section4
    const validSections = ['section1', 'section2', 'section3', 'section4'];
    this.activeSectionId = validSections.includes(sectionId) ? sectionId : 'section1';

    const cameraController = this._lastWarmupCamera?.userData?.cameraController;
    if (cameraController && typeof cameraController.setActiveSectionKey === 'function') {
      cameraController.setActiveSectionKey(this.activeSectionId);
    }

    // Switch per-section lighting (intensity, ambient, fog)
    if (this.lightsInitialized) {
      this._applySectionLighting(sectionId)
    }
  }

  _applySectionLighting(sectionId) {
    // Kill all section main lights first
    ;[this.section1Lighting, this.section2Lighting, this.section3Lighting].forEach(sl => {
      if (sl?.mainLight) sl.mainLight.intensity = 0
    })

    const lighting = this[`${sectionId}Lighting`] || null

    // Enable active section’s main light
    if (lighting?.mainLight) {
      lighting.mainLight.intensity = lighting.baseMainIntensity ?? lighting.mainLight.intensity
    }

    // Set ambient intensity for this section
    if (this.ambientLight && lighting?.ambientIntensity != null) {
      const base = lighting.ambientIntensity
      this.baseAmbientIntensity = base
      // Preserve accumulated phase degradation when in section1
      if (sectionId === 'section1') {
        this.currentAmbientIntensity = Math.max(
          0.1,
          base - (this.totalPhaseChanges * SCENE1_CONFIG.phaseChangeIntensityReduction)
        )
      } else {
        this.currentAmbientIntensity = base
      }
      this.ambientLight.intensity = this.currentAmbientIntensity
    }

    // Set fog for this section
    if (this.mainScene?.fog instanceof THREE.Fog && lighting?.fog) {
      if (lighting.fog.color != null) {
        this.mainScene.fog.color.set(lighting.fog.color)
        this.baseFogColor = this.mainScene.fog.color.clone()
      }
      if (lighting.fog.near != null) this.mainScene.fog.near = lighting.fog.near
      if (lighting.fog.far != null) this.mainScene.fog.far = lighting.fog.far
    }

    if (this.mainScene) {
      if (this.baseSceneBackground == null && this.mainScene.background instanceof THREE.Color) {
        this.baseSceneBackground = this.mainScene.background.clone()
      }

      if (lighting?.background != null) {
        if (this.mainScene.background instanceof THREE.Color) {
          this.mainScene.background.set(lighting.background)
        } else {
          this.mainScene.background = new THREE.Color(lighting.background)
        }
      } else if (this.baseSceneBackground) {
        if (this.mainScene.background instanceof THREE.Color) {
          this.mainScene.background.copy(this.baseSceneBackground)
        } else {
          this.mainScene.background = this.baseSceneBackground.clone()
        }
      }
    }
  }

  _resolvePlayerSection(playerEntry) {
    const p = playerEntry?.mesh?.position || playerEntry?.body?.position
    return this._resolveSectionFromPosition(p)
  }

  _resolveSectionFromPosition(p) {
    if (!p) return 'section1'

    if (p.y > 95) return 'section3'

    if (p.y > 25) {
      if (p.x > 18) return 'section4'
      return 'section2'
    }

    return 'section1'
  }

  _updateSectionStreaming(syncList, delta = 0) {
    if (!Array.isArray(syncList) || !this.sectionGroups) return

    const playerEntry = syncList.find(e => e.name === 'Player' && (e.mesh || e.body))
    if (!playerEntry) return

    const sectionId = this._resolvePlayerSection(playerEntry)
    if (sectionId === this.activeSectionId) {
      this.pendingSectionId = null
      this.pendingSectionTimer = 0
      return
    }

    if (this.pendingSectionId !== sectionId) {
      this.pendingSectionId = sectionId
      this.pendingSectionTimer = 0
      return
    }

    this.pendingSectionTimer += delta
    if (this.pendingSectionTimer >= SECTION_STREAMING_CONFIG.switchConfirmSec) {
      this.pendingSectionId = null
      this.pendingSectionTimer = 0
      this._setSectionActive(sectionId)
    }
  }

  _getSectionGroup(sectionId) {
    return this.sectionGroups?.[sectionId] || null
  }

  _enqueueSectionWarmup(sectionId, options = {}) {
    const state = this.sectionWarmState[sectionId]
    if (!state) return false

    const forceReload = !!options.forceReload
    const isHighPriority = options.priority === 'high'
    if (!forceReload && state.ready) {
      if (options.showReadyOverlay) {
        this._showSectionReadyOverlay(options.title || `Loading ${sectionId}`, sectionId)
      }
      return false
    }

    if (!forceReload && state.loading) {
      return false
    }

    const existingIndex = this.sectionWarmQueue.findIndex(job => job.sectionId === sectionId)
    const existingQueued = existingIndex !== -1
    if (existingQueued && !forceReload) {
      if (isHighPriority && existingIndex > 0) {
        const [job] = this.sectionWarmQueue.splice(existingIndex, 1)
        this.sectionWarmQueue.unshift(job)
      }
      return false
    }

    const warmJob = {
      sectionId,
      title: options.title || `Loading ${sectionId}`,
      forceReload,
      silent: !!options.silent
    }

    if (isHighPriority) {
      this.sectionWarmQueue.unshift(warmJob)
    } else {
      this.sectionWarmQueue.push(warmJob)
    }

    // Section 2 stream includes section4, so warm both to avoid first-frame hitches.
    if (sectionId === 'section2') {
      const section4State = this.sectionWarmState.section4
      const section4Queued = this.sectionWarmQueue.some(job => job.sectionId === 'section4')
      if (section4State && !section4State.ready && !section4State.loading && !section4Queued) {
        this.sectionWarmQueue.push({
          sectionId: 'section4',
          title: 'Loading Section 4',
          forceReload: false,
          silent: true
        })
      }
    }

    return true
  }

  _processPendingTeleport() {
    const request = this.pendingTeleportRequest
    if (!request) return

    const {
      playerEntry,
      targetPosition,
      options,
      destinationSection,
      queuedAtMs
    } = request

    if (!playerEntry?.body || !targetPosition) {
      this.pendingTeleportRequest = null
      return
    }

    const state = this.sectionWarmState[destinationSection]
    const elapsedSec = (performance.now() - queuedAtMs) / 1000
    const timedOut = elapsedSec >= SECTION_STREAMING_CONFIG.pendingTeleportMaxWaitSec

    if (state?.ready || timedOut) {
      this.pendingTeleportRequest = null
      this._teleportPlayerEntry(playerEntry, targetPosition, {
        ...options,
        skipSectionWarmupGate: true
      })
      return
    }

    if (!state?.loading) {
      this._enqueueSectionWarmup(destinationSection, {
        title: `Loading ${destinationSection}`,
        showReadyOverlay: true,
        priority: 'high'
      })
    }
  }

  _showSectionReadyOverlay(title, sectionId) {
    if (this.sectionWarmOverlayTimer !== null) {
      clearTimeout(this.sectionWarmOverlayTimer)
      this.sectionWarmOverlayTimer = null
    }

    if (this.sectionWarmOverlay) {
      this.sectionWarmOverlay.close()
      this.sectionWarmOverlay = null
    }

    this.sectionWarmOverlay = createLoadingOverlay(title)
    this.sectionWarmOverlay.update(1, sectionId)

    this.sectionWarmOverlayTimer = setTimeout(() => {
      if (this.sectionWarmOverlay) {
        this.sectionWarmOverlay.close()
        this.sectionWarmOverlay = null
      }
      this.sectionWarmOverlayTimer = null
    }, 420)
  }

  _startNextSectionWarmup() {
    if (this.activeSectionWarmJob || this.sectionWarmQueue.length === 0) return

    const job = this.sectionWarmQueue.shift()
    const state = this.sectionWarmState[job.sectionId]
    if (!state) return

    const group = this._getSectionGroup(job.sectionId)
    if (!group) {
      state.loading = false
      state.ready = true
      return
    }

    state.loading = true
    if (job.forceReload) {
      state.ready = false
    }

    const meshes = []
    const audioAssets = new Set()
    const physicsShapes = []
    const aiAssets = new Set()
    const navmeshAssets = new Set()
    const effectAssets = new Set()
    group.traverse(obj => {
      if (obj?.isMesh) meshes.push(obj)
      // Preload audio if mesh or object has userData.audioName
      if (obj?.userData?.audioName) audioAssets.add(obj.userData.audioName)
      // Preload physics shapes if present
      if (obj?.userData?.physics) physicsShapes.push(obj.userData.physics)
      // Preload AI if present
      if (obj?.userData?.aiName) aiAssets.add(obj.userData.aiName)
      // Preload navmesh if present
      if (obj?.userData?.navmeshName) navmeshAssets.add(obj.userData.navmeshName)
      // Preload effect if present
      if (obj?.userData?.effectName) effectAssets.add(obj.userData.effectName)
    })

    // Preload audio buffers for all found audio assets
    if (typeof window.AssetCache === 'object' && typeof window.AssetCache.preloadAudio === 'function') {
      audioAssets.forEach(audioName => {
        window.AssetCache.preloadAudio(audioName, `/public/music/${audioName}.mp3`).catch(()=>{})
      })
    }

    // Preload/init physics shapes (nếu có logic preload riêng, gọi ở đây)
    if (typeof window.PhysicsManager === 'object' && typeof window.PhysicsManager.preloadShape === 'function') {
      physicsShapes.forEach(shape => {
        window.PhysicsManager.preloadShape(shape)
      })
    }

    // Preload/init AI controllers if available
    if (typeof window.AIManager === 'object' && typeof window.AIManager.preloadAI === 'function') {
      aiAssets.forEach(aiName => {
        window.AIManager.preloadAI(aiName).catch(()=>{})
      })
    }

    // Preload/init navmesh if available
    if (typeof window.NavmeshManager === 'object' && typeof window.NavmeshManager.preloadNavmesh === 'function') {
      navmeshAssets.forEach(navmeshName => {
        window.NavmeshManager.preloadNavmesh(navmeshName).catch(()=>{})
      })
    }

    // Preload/init effects if available
    if (typeof window.EffectManager === 'object' && typeof window.EffectManager.preloadEffect === 'function') {
      effectAssets.forEach(effectName => {
        window.EffectManager.preloadEffect(effectName).catch(()=>{})
      })
    }

    const BATCH_SIZE = 10; // Số mesh xử lý mỗi frame (có thể điều chỉnh)
    const total = Math.max(1, meshes.length)
    let index = 0
    const warmStartTime = performance.now()
    const showOverlay = !job.silent
    const frameBudgetMs = showOverlay
      ? SECTION_WARMUP_CONFIG.overlayFrameBudgetMs
      : SECTION_WARMUP_CONFIG.backgroundFrameBudgetMs
    const minVisibleMs = showOverlay ? SECTION_WARMUP_CONFIG.overlayMinVisibleMs : 0

    if (showOverlay) {
      this.sectionWarmOverlay = createLoadingOverlay(job.title)
      this.sectionWarmOverlay.update(0, 'starting')
    } else {
      this.sectionWarmOverlay = null
    }
    this.activeSectionWarmJob = job

    const closeOverlayAndContinue = () => {
      if (this.sectionWarmOverlay) {
        this.sectionWarmOverlay.close()
        this.sectionWarmOverlay = null
      }
      this.activeSectionWarmJob = null
      this._startNextSectionWarmup()
    }

    const step = () => {
      const startTime = performance.now()
      let batchCount = 0;
      while (index < meshes.length && batchCount < BATCH_SIZE) {
        const mesh = meshes[index]
        index += 1
        batchCount++;

        mesh.updateMatrixWorld(true)

        const geometry = mesh.geometry
        if (geometry) {
          if (!geometry.boundingSphere && typeof geometry.computeBoundingSphere === 'function') {
            geometry.computeBoundingSphere()
          }
          if (!geometry.boundingBox && typeof geometry.computeBoundingBox === 'function') {
            geometry.computeBoundingBox()
          }
        }

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(mat => {
          if (!mat) return
          // Touch maps without forcing material recompilation on every warmup pass.
          if (mat.map) mat.map.needsUpdate = !!mat.map.needsUpdate
          if (mat.normalMap) mat.normalMap.needsUpdate = !!mat.normalMap.needsUpdate
          if (mat.bumpMap) mat.bumpMap.needsUpdate = !!mat.bumpMap.needsUpdate
          if (mat.emissiveMap) mat.emissiveMap.needsUpdate = !!mat.emissiveMap.needsUpdate
        })
      }

      const realProgress = index / total
      const elapsedMs = performance.now() - warmStartTime
      const timeProgress = Math.min(elapsedMs / minVisibleMs, 1)
      const progress = Math.max(realProgress, timeProgress * 0.9)

      if (this.sectionWarmOverlay) {
        this.sectionWarmOverlay.update(progress, job.sectionId)
      }

      if (index < meshes.length) {
        requestAnimationFrame(step)
        return
      }

      const compileAndFinalize = () => {
        state.ready = true
        state.loading = false

        if (this.sectionWarmOverlay) {
          const elapsedAfterCompile = performance.now() - warmStartTime
          this.sectionWarmOverlay.update(1, 'complete')
          const remainingVisibleMs = Math.max(0, minVisibleMs - elapsedAfterCompile)
          setTimeout(closeOverlayAndContinue, remainingVisibleMs + 120)
          return
        }

        this.activeSectionWarmJob = null
        this._startNextSectionWarmup()
      }

      const compileSceneForSection = async () => {

        if (!this.renderer || !this.mainScene || !this._lastWarmupCamera) {
          return
        }

        if (this.sectionWarmOverlay) {
          this.sectionWarmOverlay.update(0.95, 'compiling shaders')
        }

        const previousVisible = group.visible
        group.visible = true

        try {
          // Ensure all mesh materials are defined and valid before compiling
          let invalidMeshes = [];
          this.mainScene.traverse(obj => {
            if (obj.isMesh) {
              // Handle single material
              if (!obj.material || typeof obj.material !== 'object') {
                invalidMeshes.push(obj);
                obj.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
              } else if (Array.isArray(obj.material)) {
                // Handle array of materials
                let replaced = false;
                obj.material = obj.material.map((mat, idx) => {
                  if (!mat || typeof mat !== 'object' || typeof mat.isReady !== 'function') {
                    replaced = true;
                    invalidMeshes.push({ obj, idx });
                    return new THREE.MeshBasicMaterial({ color: 0xff00ff });
                  }
                  return mat;
                });
              }
            }
          });
          if (invalidMeshes.length > 0) {
            console.warn('[Scene1Manager] Invalid mesh materials found and replaced before compileAsync:', invalidMeshes);
          }
          // Defensive: Remove any undefined/invalid material controllers from Sets/arrays in userData
          if (this.mainScene && this.mainScene.userData) {
            for (const key of Object.keys(this.mainScene.userData)) {
              const val = this.mainScene.userData[key];
              if (val instanceof Set) {
                // Remove undefined/invalid
                for (const item of Array.from(val)) {
                  if (!item || typeof item.isReady !== 'function') {
                    val.delete(item);
                  }
                }
              } else if (Array.isArray(val)) {
                this.mainScene.userData[key] = val.filter(item => item && typeof item.isReady === 'function');
              }
            }
          }
          if (typeof this.renderer.compileAsync === 'function') {
            await this.renderer.compileAsync(this.mainScene, this._lastWarmupCamera)
          } else if (typeof this.renderer.compile === 'function') {
            this.renderer.compile(this.mainScene, this._lastWarmupCamera)
          }
        } catch (err) {
          console.error('[Scene1Manager] Error during compileAsync:', err);
        } finally {
          const activeSection = this.activeSectionId || 'section1'
          const shouldRemainVisible =
            job.sectionId === 'section1' ||
            (job.sectionId === 'section2' && (activeSection === 'section2' || activeSection === 'section4')) ||
            (job.sectionId === 'section4' && (activeSection === 'section2' || activeSection === 'section4')) ||
            (job.sectionId === 'section3' && activeSection === 'section3')
          group.visible = shouldRemainVisible
        }
      }

      compileSceneForSection().finally(compileAndFinalize)
      return
    }

    requestAnimationFrame(step)
  }

  /**
   * Initialize spawning system dependencies
   * Must be called before spawning can occur
   */
  initializeSpawning(spawner, guyAsset, world, physicsMaterials, syncList, particleManager, simulationConfig, renderer) {
    this.spawner = spawner
    this.guyAsset = guyAsset
    this.world = world
    this.physicsMaterials = physicsMaterials
    this.syncList = syncList
    this.particleManager = particleManager
    this.SIMULATION_CONFIG = simulationConfig
    this.renderer = renderer

    if (!this.screenMat) {
      this.screenMat = new ScreenMat(document.body)
    }

    // Warm heavy streamed sections in background while player is in section1.
    this._enqueueSectionWarmup('section2', { title: 'Preparing Section 2', silent: true })
    this._enqueueSectionWarmup('section3', { title: 'Preparing Section 3', silent: true })
  }

  /**
   * ✨ NEW: Set callback for when game ends
   * Callback signature: (reason, completionTime) where reason is 'elevator' or 'death'
   */
  setGameOverCallback(callback) {
    this.gameOverCallback = callback
  }

  /**
   * Debug: manually start the Section 1 elevator countdown (simulates score-15+guy condition).
   */
  startElevatorCountdown() {
    if (this.elevatorCountdownActive || this.elevatorCountdownFinished) return false
    this.elevatorCountdownActive = true
    this.elevatorCountdownTimer = 0
    this._enqueueSectionWarmup('section3', { title: 'Loading Section 3', showReadyOverlay: true })

    return true
  }

  /**
   * ✨ NEW: Get current completion time in seconds
   */
  getCompletionTime() {
    if (!this.gameStartTime) return 0
    return (Date.now() - this.gameStartTime) / 1000
  }

  /**
   * ✨ Spawn player at center of table for gameplay mode
   */
  spawnPlayer(playerAsset, mainScene) {
    if (!this.spawner || !playerAsset) {

      return null
    }

    // Get table dimensions to spawn player above its surface
    let spawnPos = new THREE.Vector3(0, 5, 0)  // Default position
    const table = this.sceneGroup.getObjectByName("Billiard Table")
    if (table && table.userData && table.userData.tableDimensions && table.userData.tableDimensions.topY) {
      // Spawn 4 units above table surface so player doesn't immediately fall
      spawnPos.y = table.userData.tableDimensions.topY + 1
    }

    // Spawn player at calculated position
    this.spawner({
      scene: mainScene,
      prefab: playerAsset,
      position: spawnPos,
      world: this.world,
      physicsMaterials: this.physicsMaterials,
      syncList: this.syncList,
      particleManager: this.particleManager
    })

    // Find spawned player in syncList and return it
    const playerEntry = this.syncList.find(e => e.name === 'Player')
    
    if (playerEntry) {
      this.playerSpawned = true
      this.sceneStartTime = Date.now()
      if (playerEntry.body) {
        this.section1TeleportPosition = playerEntry.body.position.clone()
        this.section1TeleportQuaternion = playerEntry.body.quaternion.clone()
      }
      
      // Create cue stick for player (same as SimulationTest does)
      if (playerEntry.mesh && playerEntry.mesh.userData.createCue) {
        playerEntry.mesh.userData.createCue()
        // Mark that player should have active cue
        playerEntry.mesh.userData.shouldHaveCue = true
      }
      
      this._initializeScene1Gameplay(playerEntry, mainScene)
    }
    
    return playerEntry || null
  }
  
  /**
   * Initialize scene1 gameplay: spawn compune and balls
   */
  _initializeScene1Gameplay(playerEntry, mainScene) {
    // Delay compune spawn by 20 seconds
    if (this.pendingCompuneSpawnTimer !== null) {
      clearTimeout(this.pendingCompuneSpawnTimer)
    }
    this.pendingCompuneSpawnTimer = setTimeout(() => {
      this.pendingCompuneSpawnTimer = null
      this._spawnCompuneCompanion(playerEntry, mainScene)
    }, 20000)
  }

  /**
   * Spawn compune companion at fixed location (not relative to player)
   */
  _spawnCompuneCompanion(playerEntry, mainScene) {
    // Import compune asset
    import('../assets/objects/Compune.js').then(module => {
      this.compuneAsset = module.getCompuneAsset()
      
      if (!this.compuneAsset) {

        return
      }
      
      // ✨ Fixed spawn position (not relative to player)
      // Player spawns at (0, 5, 0) above table center
      // Compune spawns higher and offset along table length
      const spawnPos = new THREE.Vector3(2.5, 10, 0)
      
      // Convert asset to prefab format that spawner expects
      const compunePrefab = {
        name: this.compuneAsset.name,
        type: 'dynamic',
        createMesh: (...args) => {
          const mesh = this.compuneAsset.factory(...args);
          // Thêm fake shadow config cho Compune
          mesh.userData.shadowConfig = { size: 1.2, opacity: 0.9, fadeRate: 0.4 };
          return mesh;
        },
        createBody: (physicsMaterials) => {
          if (!this.compuneAsset.physics) return null
          const body = new CANNON.Body({
            mass: this.compuneAsset.physics.mass || 1,
            shape: new CANNON.Sphere(this.compuneAsset.physics.radius || 0.5)
          })
          return body
        }
      }
      
      // Spawn compune using the spawner
      this.spawner({
        scene: mainScene,
        prefab: compunePrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })
      
      // Find compune in syncList and set up dialogue
      const compuneEntry = this.syncList.find(e => e.name === 'Compune')
      if (compuneEntry && compuneEntry.body && compuneEntry.mesh) {
        this.compuneMesh = compuneEntry.mesh
        
        // Create CompuneAI directly here so SimulationTest won't override with simulator dialogs
        if (!compuneEntry.body.userData) compuneEntry.body.userData = {}
        if (!compuneEntry.body.userData.compuneAI) {
          this.compuneAI = new CompuneAI(compuneEntry.mesh, compuneEntry.body, this.mainScene)
          compuneEntry.body.userData.compuneAI = this.compuneAI
          this._startCompuneDialogue()
        } else {
          this.compuneAI = compuneEntry.body.userData.compuneAI
          this._startCompuneDialogue()
        }
      }
      // Despawn happens when compuneAI.shouldDespawn becomes true (after 10s disconnected)
      // No setTimeout here - let update() handle it
    }).catch(err => {

    })
  }
  
  /**
   * Despawn compune from scene
   */
  _despawnCompune() {
    if (this.compuneMesh && this.mainScene) {
      // Remove mesh from scene
      this.mainScene.remove(this.compuneMesh)
    }
    
    // Remove from syncList
    if (this.compuneAI && this.compuneAI.body) {
      const index = this.syncList.findIndex(e => e.body === this.compuneAI.body)
      if (index !== -1) {
        const compuneEntry = this.syncList[index]
        // Remove physics body from world
        if (compuneEntry.body && this.world) {
          this.world.removeBody(compuneEntry.body)
        }
        this.syncList.splice(index, 1)
      }
    }
    
    // Clear references
    this.compuneMesh = null
    this.compuneAI = null
    
    // compune despawned
  }
  
  /**
   * Start compune dialogue sequence
   */
  _startCompuneDialogue() {
    // Use Scene1 dialogs instead of simulator dialogs
    const dialogueTexts = SCENE1_COMPUNES.compune_1
    
    if (this.compuneAI && this.compuneAI.setDialog && dialogueTexts && dialogueTexts.length > 0) {
      this.compuneAI.setDialog(dialogueTexts)
      // Don't show page here - let CompuneAI.update() handle it when player enters trigger zone
    }
  }

  /**
   * Setup spawn callback on destroySystem for when player falls below plane
   */
  _setupSpawnCallback() {
    if (!this.destroySystem) return

    this.destroySystem.setSpawnCallback((player) => {
      // Trigger blackout effect immediately when player falls
      this._triggerBlackout()
      
      // Spawn guy at water leak position when player falls - with 3 second delay
      if (!this.spawner || !this.guyAsset) {

        return
      }

      // Check if we haven't exceeded max objects
      if (this.syncList && this.SIMULATION_CONFIG) {
        const dynamicObjectCount = this.syncList.filter(e => e.type === 'dynamic').length
        if (dynamicObjectCount >= this.SIMULATION_CONFIG.maxObjectsInScene) {

          return
        }
      }

      // Delay spawn by 3 seconds
      if (this.pendingGuySpawnTimer !== null) {
        clearTimeout(this.pendingGuySpawnTimer)
      }

      this.pendingGuySpawnTimer = setTimeout(() => {
        this.pendingGuySpawnTimer = null
        // Check again if we can still spawn (conditions may have changed)
        if (this.syncList && this.SIMULATION_CONFIG) {
          const dynamicObjectCount = this.syncList.filter(e => e.type === 'dynamic').length
          if (dynamicObjectCount >= this.SIMULATION_CONFIG.maxObjectsInScene) {

            return
          }
        }

        // Spawn guy at water leak position
        const guySpawnPos = SCENE1_CONFIG.guySpawnPosition
        const spawnPos = new THREE.Vector3(guySpawnPos.x, guySpawnPos.y, guySpawnPos.z)
        
        try {
          this.spawner({
            scene: this.mainScene,
            prefab: this.guyAsset,
            position: spawnPos,
            world: this.world,
            physicsMaterials: this.physicsMaterials,
            syncList: this.syncList,
            particleManager: this.particleManager
          })
        } catch (e) {

        }
      }, 3000)  // 3 second delay
    })
  }

  /**
   * ✨ NEW: Setup enter key listener for rapid press detection
   * Triggers sweat effect on Compune if pressed too fast (<0.5s)
   */
  _triggerCompuneSweatEffect() {
    // ✨ IMPORTANT: Only trigger if Compune still exists, is active, and is not marked for despawn
    if (!this.compuneMesh || !this.compuneAI || !this.mainScene || this.compuneAI.shouldDespawn) {
      return
    }

    // Spawn sweat effect at Compune's position
    const sweatEffect = createSweatEffect(this.mainScene, this.compuneMesh.position.clone())
    this.activeSweatEffects.push(sweatEffect)
  }

  /**
   * ✨ NEW: Update all active sweat effects
   */
  _updateSweatEffects(delta) {
    // Update and remove finished effects
    for (let i = this.activeSweatEffects.length - 1; i >= 0; i--) {
      const effect = this.activeSweatEffects[i]
      effect.update(delta)
      
      if (effect.finished) {
        this.activeSweatEffects.splice(i, 1)
      }
    }
  }

  /**
   * Trigger blackout effect - lights turn off for 3 seconds
   * If already blacked out, extend the duration
   */
  _triggerBlackout() {
    if (this.isBlackoutActive) {
      // Already blackout, add more time (accumulate for multiple player falls)
      this.blackoutTimer += this.blackoutDuration
      console.debug('[Scene1Manager] Blackout extended, total duration:', this.blackoutTimer)
    } else {
      // Start new blackout
      this.isBlackoutActive = true
      this.blackoutTimer = this.blackoutDuration
      console.debug('[Scene1Manager] Blackout triggered, duration:', this.blackoutDuration)
    }
  }

  /**
   * Update blackout timer and manage blackout state
   */
  _updateBlackout(delta) {
    if (!this.isBlackoutActive) return

    // Delta is in seconds, convert to milliseconds
    const deltaMs = delta * 1000
    this.blackoutTimer -= deltaMs

    if (this.blackoutTimer <= 0) {
      this.isBlackoutActive = false
      this.blackoutTimer = 0
      // Restore section1 ceiling lights only if gameplay state allows them to be on.
      this._setSection1CeilingLightsState(this.section1CeilingLightsEnabled)
      console.debug('[Scene1Manager] Blackout ended')
    }
  }

  _hookGuyAIControllers(syncList) {
    if (!syncList) return
    syncList.forEach(entry => {
      if (entry.name === 'Guy' && entry.body && entry.body.userData && entry.body.userData.guyAI) {
        const guyAI = entry.body.userData.guyAI
        const guyMesh = entry.mesh
        if (!this.hookedGuyAIs.has(guyAI)) {
          guyAI.onPhaseChange = (newPhase, oldPhase, position) => {
            this.onGuyPhaseChange(newPhase, oldPhase, guyMesh)
          }
          this.hookedGuyAIs.add(guyAI)
        }
      }
    })
  }

  _initializePersonMesh() {
    this.personMesh = this.sceneGroup.getObjectByName("Person")
    if (this.personMesh) {
      this.initialY = this.wElev - 2
      this.targetY = this.initialY - 5
      this.personMesh.position.y = this.targetY
    }
  }

  update(delta, world, syncList, particleManager, camera = null) {
    // ✨ NEW: Track game start time on first update
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now()
    }
    
    // Don't update game logic if game is already over (not the first time)
    if (this.gameOver && this.gameOverCallbackTriggered) {
      return  // Already triggered, just skip
    }
    
    if (!this.lightsInitialized) {
      this._initializeLightsLazy()
    }

    if (camera) {
      this._lastWarmupCamera = camera
    }

    this._startNextSectionWarmup()
    this._processPendingTeleport()

    this._updateSectionStreaming(syncList, delta)
    
    this._updateWaterSplash(delta, particleManager)
    this._updateBlackout(delta)
    this._updateLightFlickerDuration(delta)
    if (this.activeSectionId === 'section1') {
      this._updateLightsFlicker()
      this._updateAmbientFlicker(delta, syncList)
      this._updateSunLightFlicker()
    } else if (this.lightsInitialized) {
      // Hard-restore this section's lighting every frame so no section1 state can bleed in.
      this._applySectionLighting(this.activeSectionId)
    }
    this._hookGuyAIControllers(syncList)
    this._updateGuyCount(syncList)
    this._updatePersonAnimation(delta, syncList)
    
    // ✨ NEW: Update scoring system to track ball destruction
    this._updateScoringSystem(syncList)
    
    // ✨ NEW: Update reset timer for ball sequence
    this._updateBallResetTimer(delta)
    
    // ✨ NEW: Update elevator door (trigger on phase 3, update display)
    this._updateElevatorDoor(delta, syncList)
    
    // ✨ NEW: Check for elevator door collision with player
    this._checkElevatorDoorCollision(syncList)
    
    // ✨ NEW: Update active sweat effects on Compune
    this._updateSweatEffects(delta)
    
    // Check if compune has been destroyed from syncList (DestroySystem removes it)
    // This is more reliable than checking shouldDespawn since DestroySystem can remove it early
    if (this.compuneAI && !this.compuneSpawnedActivated) {
      // Check if compune is still in syncList
      const compuneStillExists = syncList.some(e => e.name === 'Compune')
      
      if (!compuneStillExists) {
        this.ballSpawningActive = true
        this.ballSpawnStartTime = Date.now()
        this.lastBallBatchSpawnTime = Date.now()
        this.compuneSpawnedActivated = true // Only do this once
      }
    }
    
    this._updateBallSpawning(syncList)
    this._updateBowlingBallLifetime(syncList)
    this._updateTeleportCooldown(delta)
    this._handleDudeTouchTeleport(syncList)
    this._updateSection2ProximitySystems(syncList, delta, particleManager)
    this._updateSection3HouseDistanceScaling(syncList, delta)
    this._updateSection3TreeLod(syncList, delta, camera)
    this._updateSection3TreeDistanceScaling(syncList, delta)
    this._updateSection3GrassLod(syncList, delta, camera)
    this._updateSection3EyeBot(syncList, delta)
    this._updateSection3EyeTransition(syncList, delta, camera)
    this._updateSection3EyeTracking(syncList, camera)
    this._updateSection2ReturnElevator(syncList, delta)
    this._updateDudeFogAndPenaltyState(syncList, delta)
    this._updateSection3EdgeAtmosphere(syncList, delta)
    this._updateVendingMachineCollector(syncList, delta)
    this._updateCartonBoxInteraction(syncList, delta)
    this._updateChestInteraction(syncList, delta)
    
    // ✨ NEW: CHECK FOR GAME OVER AFTER ALL COLLISIONS (not before!)
    // This triggers callback the SAME frame collision is detected
    if (this.gameOver && this.gameOverCallback && !this.gameOverCallbackTriggered) {
      this.gameOverCallbackTriggered = true
      const completionTime = (Date.now() - this.gameStartTime) / 1000  // Convert to seconds
      this.gameOverCallback(this.gameOverReason, completionTime)
    }
  }

  _initializeLightsLazy() {
    if (this.mainScene && this.mainScene.fog && this.mainScene.fog instanceof THREE.Fog) {
      this.baseFogColor = this.mainScene.fog.color.clone()
      this.baseFogNear = this.mainScene.fog.near
    }

    if (this.mainScene) {
      this.mainScene.traverse(child => {
        if (child.isLight && child instanceof THREE.AmbientLight) {
          this.ambientLight = child
        }
      })
    }

    // Read per-section lighting descriptors — avoids grabbing wrong SpotLight by traverse order
    const sg = this.sectionGroups
    this.section1Lighting = sg?.section1?.userData?.sectionLighting || null
    this.section2Lighting = sg?.section2?.userData?.sectionLighting || null
    this.section3Lighting = sg?.section3?.userData?.sectionLighting || null

    // Bootstrap section1 refs from descriptor
    if (this.section1Lighting?.mainLight) {
      this.sunLight = this.section1Lighting.mainLight
      this.baseSunIntensity = this.section1Lighting.baseMainIntensity ?? this.sunLight.intensity
    }

    // Apply lighting for the currently active section
    this._applySectionLighting(this.activeSectionId || 'section1')

    if (!this.section3GrassLodUpdater && this.sceneGroup?.userData?.section3GrassLod) {
      this.section3GrassLodUpdater = this.sceneGroup.userData.section3GrassLod
    }

    if (!this.section3TreeLodUpdater && this.sectionGroups?.section3?.userData?.section3TreeLod) {
      this.section3TreeLodUpdater = this.sectionGroups.section3.userData.section3TreeLod
    }

    if (!this.section3EyeSun && this.sectionGroups?.section3?.userData?.section3EyeSun) {
      this.section3EyeSun = this.sectionGroups.section3.userData.section3EyeSun
    }

    this._ensureSection3EyeBot()

    this.lightsInitialized = true
  }

  _updateSection3GrassLod(syncList, delta, camera = null) {
    if (this.activeSectionId !== 'section3') return
    if (!this.section3GrassLodUpdater || !syncList) return

    if (camera && camera.position) {
      const p = camera.position
      this._tmpSection3FocusPos.set(p.x, p.y, p.z)
    } else {
      const playerEntry = syncList.find(e => e.name === 'Player' && e.mesh)
      if (!playerEntry?.mesh) return
      const p = playerEntry.mesh.position
      this._tmpSection3FocusPos.set(p.x, p.y, p.z)
    }

    this.section3GrassLodUpdater.updateFromFocus(this._tmpSection3FocusPos, delta)
  }

  _updateSection3TreeLod(syncList, delta, camera = null) {
    if (this.activeSectionId !== 'section3') return
    if (!this.section3TreeLodUpdater || !syncList) return

    if (camera && camera.position) {
      const p = camera.position
      this._tmpSection3FocusPos.set(p.x, p.y, p.z)
    } else {
      const playerEntry = syncList.find(e => e.name === 'Player' && e.mesh)
      if (!playerEntry?.mesh) return
      const p = playerEntry.mesh.position
      this._tmpSection3FocusPos.set(p.x, p.y, p.z)
    }

    this.section3TreeLodUpdater.updateFromFocus(this._tmpSection3FocusPos, delta)
  }

  _ensureSection3HouseScaleRegistry(syncList) {
    if (!Array.isArray(syncList)) return

    const staleEntries = []
    this._section3HouseScaleRegistry.forEach((_, entry) => {
      if (!entry || !syncList.includes(entry) || !entry.mesh || !entry.body || !entry.mesh.parent) {
        staleEntries.push(entry)
      }
    })
    staleEntries.forEach(entry => this._section3HouseScaleRegistry.delete(entry))

    for (const entry of syncList) {
      if (!entry?.mesh || !entry?.body) continue
      if (!entry.mesh.userData?.isSection3House) continue
      if (this._section3HouseScaleRegistry.has(entry)) continue

      const baseMeshScale = entry.mesh.scale?.x || 1
      const primaryShape = entry.body.shapes?.find(shape => shape?.halfExtents)
      if (!primaryShape?.halfExtents) continue

      const baseHalfExtents = primaryShape.halfExtents.clone()
      const baseBodyOffset = new THREE.Vector3(
        entry.body.position.x - entry.mesh.position.x,
        entry.body.position.y - entry.mesh.position.y,
        entry.body.position.z - entry.mesh.position.z
      )

      this._section3HouseScaleRegistry.set(entry, {
        baseMeshScale,
        currentScale: baseMeshScale,
        targetScale: baseMeshScale,
        primaryShape,
        baseHalfExtents,
        baseBodyOffset
      })
    }
  }

  _updateSection3HouseDistanceScaling(syncList, delta) {
    if (this.activeSectionId !== 'section3') return

    this._ensureSection3HouseScaleRegistry(syncList)
    if (this._section3HouseScaleRegistry.size === 0) return

    const playerEntry = syncList?.find(e => e.name === 'Player' && e.mesh)
    if (!playerEntry?.mesh) return
    const p = playerEntry.mesh.position
    this._tmpSection3HouseFocusPos.set(p.x, p.y, p.z)

    this._section3HouseScaleUpdateAccumulator += delta
    const shouldRefreshTargets = this._section3HouseScaleUpdateAccumulator >= SCENE1_CONFIG.section3HouseScaleUpdateInterval
    if (shouldRefreshTargets) {
      this._section3HouseScaleUpdateAccumulator = 0
    }

    const nearDistance = SCENE1_CONFIG.section3HouseScaleMinDistance
    const maxDistance = Math.max(nearDistance + 0.001, SCENE1_CONFIG.section3HouseScaleMaxDistance)
    const span = maxDistance - nearDistance
    const nearScale = SCENE1_CONFIG.section3HouseScaleNear
    const farScale = SCENE1_CONFIG.section3HouseScaleFar
    const smoothAlpha = Math.min(1, delta * SCENE1_CONFIG.section3HouseScaleSmoothSpeed)

    this._section3HouseScaleRegistry.forEach((data, entry) => {
      const mesh = entry.mesh
      const body = entry.body
      if (!mesh || !body || !data?.primaryShape) return

      if (shouldRefreshTargets) {
        const distance = mesh.position.distanceTo(this._tmpSection3HouseFocusPos)
        const t = THREE.MathUtils.clamp((distance - nearDistance) / span, 0, 1)
        data.targetScale = THREE.MathUtils.lerp(nearScale, farScale, t)
      }

      const nextScale = THREE.MathUtils.lerp(data.currentScale, data.targetScale, smoothAlpha)
      if (Math.abs(nextScale - data.currentScale) < 0.001) return

      data.currentScale = nextScale
      mesh.scale.setScalar(nextScale)

      data.primaryShape.halfExtents.set(
        data.baseHalfExtents.x * nextScale,
        data.baseHalfExtents.y * nextScale,
        data.baseHalfExtents.z * nextScale
      )

      if (typeof data.primaryShape.updateConvexPolyhedronRepresentation === 'function') {
        data.primaryShape.updateConvexPolyhedronRepresentation()
      }
      if (typeof data.primaryShape.updateBoundingSphereRadius === 'function') {
        data.primaryShape.updateBoundingSphereRadius()
      }

      body.position.set(
        mesh.position.x + (data.baseBodyOffset.x * nextScale),
        mesh.position.y + (data.baseBodyOffset.y * nextScale),
        mesh.position.z + (data.baseBodyOffset.z * nextScale)
      )
      if (typeof body.updateBoundingRadius === 'function') {
        body.updateBoundingRadius()
      }
      body.aabbNeedsUpdate = true
    })
  }

  _ensureSection3TreeScaleRegistry() {
    const trees = this.sectionGroups?.section3?.userData?.section3Trees || []
    const liveTrees = new Set(trees.filter((tree) => tree?.parent))
    const staleTrees = []

    this._section3TreeScaleRegistry.forEach((_, tree) => {
      if (!liveTrees.has(tree)) staleTrees.push(tree)
    })

    staleTrees.forEach((tree) => this._section3TreeScaleRegistry.delete(tree))

    for (const tree of trees) {
      if (!tree?.parent || this._section3TreeScaleRegistry.has(tree)) continue

      const baseScale = tree.scale?.x || 1
      this._section3TreeScaleRegistry.set(tree, {
        baseScale,
        currentScale: baseScale,
        targetScale: baseScale
      })
    }
  }

  _updateSection3TreeDistanceScaling(syncList, delta) {
    if (this.activeSectionId !== 'section3') return

    this._ensureSection3TreeScaleRegistry()
    if (this._section3TreeScaleRegistry.size === 0) return

    const playerEntry = syncList?.find((entry) => entry.name === 'Player' && entry.mesh)
    if (!playerEntry?.mesh) return
    const p = playerEntry.mesh.position
    this._tmpSection3TreeFocusPos.set(p.x, p.y, p.z)

    this._section3TreeScaleUpdateAccumulator += delta
    const shouldRefreshTargets = this._section3TreeScaleUpdateAccumulator >= SCENE1_CONFIG.section3TreeScaleUpdateInterval
    if (shouldRefreshTargets) {
      this._section3TreeScaleUpdateAccumulator = 0
    }

    const nearDistance = SCENE1_CONFIG.section3TreeScaleMinDistance
    const maxDistance = Math.max(nearDistance + 0.001, SCENE1_CONFIG.section3TreeScaleMaxDistance)
    const span = maxDistance - nearDistance
    const nearScale = SCENE1_CONFIG.section3TreeScaleNear
    const farScale = SCENE1_CONFIG.section3TreeScaleFar
    const smoothAlpha = Math.min(1, delta * SCENE1_CONFIG.section3TreeScaleSmoothSpeed)

    this._section3TreeScaleRegistry.forEach((data, tree) => {
      if (!tree?.parent || !tree.visible || !data) return

      if (shouldRefreshTargets) {
        const distance = tree.position.distanceTo(this._tmpSection3TreeFocusPos)
        const t = THREE.MathUtils.clamp((distance - nearDistance) / span, 0, 1)
        data.targetScale = data.baseScale * THREE.MathUtils.lerp(nearScale, farScale, t)
      }

      const nextScale = THREE.MathUtils.lerp(data.currentScale, data.targetScale, smoothAlpha)
      if (Math.abs(nextScale - data.currentScale) < 0.001) return

      data.currentScale = nextScale
      tree.scale.setScalar(nextScale)
    })
  }

  _findSyncEntryForMesh(syncList, mesh) {
    if (!mesh || !Array.isArray(syncList)) return null
    return syncList.find((entry) => entry?.mesh === mesh) || null
  }

  _ensureSection3EyeBot() {
    if (!this.section3EyeSun && this.sectionGroups?.section3?.userData?.section3EyeSun) {
      this.section3EyeSun = this.sectionGroups.section3.userData.section3EyeSun
    }

    if (!this.section3EyeSun?.parent) {
      this.section3EyeBot = null
      return null
    }

    if (this.section3EyeBot?.eyeMesh === this.section3EyeSun) {
      return this.section3EyeBot
    }

    const triggerMesh = this.section3EyeSun.getObjectByName('Section3 Eye Trigger') || this.section3EyeSun.userData?.triggerMesh || null
    this.section3EyeBot = new EyeBot(this.section3EyeSun, triggerMesh, {
      descentDurationSec: SCENE1_CONFIG.section3EyeDescentDurationSec
    })
    return this.section3EyeBot
  }

  _updateSection3EyeBot(syncList, delta) {
    const eyeBot = this._ensureSection3EyeBot()
    if (!eyeBot || !Array.isArray(syncList)) return

    const playerEntry = syncList.find((e) => e.name === 'Player' && e.mesh) || null
    const eyeEntry = this._findSyncEntryForMesh(syncList, eyeBot.eyeMesh)
    const triggerEntry = this._findSyncEntryForMesh(syncList, eyeBot.triggerMesh)

    const result = eyeBot.update(delta, {
      playerEntry,
      playerInSection3: this.activeSectionId === 'section3',
      eyeEntry,
      triggerEntry
    })

    if (result?.touchedPlayer && playerEntry && this.destroySystem?.destroyCharacter) {
      this.destroySystem.destroyCharacter(playerEntry)
    }
  }

  _updateSection3EyeTransition(syncList, delta, camera = null) {
    if (this.activeSectionId !== 'section3') {
      this.section3EyeDescentStartTime = -1
      this.section3EyeTransitionStartTime = -1
      this.section3EyeTransitionProgress = 0
      // Reset trees to invisible when leaving section
      const trees = this.sectionGroups?.section3?.userData?.section3Trees || []
      trees.forEach((tree) => {
        if (tree && tree.userData) {
          setTreeOpacity(tree, 0)
        }
      })
      // Reset house portal effects
      const section3 = this.sectionGroups?.section3
      if (section3) {
        // Reset grass platform and fog colors
        const platform = section3.getObjectByName('Section3 Platform')
        if (platform && platform.material) {
          platform.material.color.set('#67b935') // Reset to base grass color
        }
      }
      this._updateSection3TreeLighting(0, 0)
      // Reset fog and background colors (handled by section3 relighting)
      return
    }

    const eyeBot = this._ensureSection3EyeBot()
    if (!eyeBot || eyeBot._descentElapsed === undefined) return

    // Track eye descent start time
    if (this.section3EyeDescentStartTime < 0 && eyeBot._descentStarted) {
      this.section3EyeDescentStartTime = eyeBot._descentElapsed
    }

    // If eye hasn't started descending yet, reset everything
    if (!eyeBot._descentStarted) {
      this.section3EyeDescentStartTime = -1
      this.section3EyeTransitionStartTime = -1
      this.section3EyeTransitionProgress = 0
      // Reset trees to invisible
      const trees = this.sectionGroups?.section3?.userData?.section3Trees || []
      trees.forEach((tree) => {
        if (tree && tree.userData) {
          setTreeOpacity(tree, 0)
        }
      })
      return
    }

    // Calculate elapsed time since descent started
    const elapsedSinceDescent = eyeBot._descentElapsed
    const DELAY_TIME = 30 // 30 seconds delay
    const TRANSITION_DURATION = 60 // 60 seconds for color transition

    // Check if we should start the color transition (after 30s)
    if (this.section3EyeTransitionStartTime < 0 && elapsedSinceDescent >= DELAY_TIME) {
      this.section3EyeTransitionStartTime = elapsedSinceDescent
    }

    //Calculate transition progress (0 -> 1 over 60 seconds)
    if (this.section3EyeTransitionStartTime >= 0) {
      const elapsedSinceTransitionStart = elapsedSinceDescent - this.section3EyeTransitionStartTime
      this.section3EyeTransitionProgress = THREE.MathUtils.clamp(elapsedSinceTransitionStart / TRANSITION_DURATION, 0, 1)
    } else {
      this.section3EyeTransitionProgress = 0
    }

    // Apply transitions only if transition is active
    if (this.section3EyeTransitionProgress > 0) {
      this._applySection3EyeColorTransition(this.section3EyeTransitionProgress)
      this._updateSection3TreeOpacity(this.section3EyeTransitionProgress)
    }

    // Update tree billboarding to face camera
    if (camera) {
      this._section3TreeBillboardUpdateAccumulator += delta
      if (this._section3TreeBillboardUpdateAccumulator < SCENE1_CONFIG.section3TreeBillboardUpdateInterval) {
        return
      }
      this._section3TreeBillboardUpdateAccumulator = 0
      const trees = this.sectionGroups?.section3?.userData?.section3Trees || []
      updateBillboards(camera, trees)
    }
  }

  _applySection3EyeColorTransition(progress) {
    const section3Lighting = this.section3Lighting || null
    const colors = section3Lighting?.colors || {}

    // Get colors from config, fallback to defaults
    const grassBaseFrom = new THREE.Color(colors.grassBaseNormal ?? '#67b935')
    const grassBaseTo = new THREE.Color(colors.grassBaseTransitioned ?? '#c00000')
    const grassVividFrom = new THREE.Color(colors.grassVividNormal ?? '#89ff39')
    const grassVividTo = new THREE.Color(colors.grassVividTransitioned ?? '#ff4444')
    const grassSoilFrom = new THREE.Color(colors.grassSoilNormal ?? '#090542')
    const grassSoilTo = new THREE.Color(colors.grassSoilTransitioned ?? '#4a2020')
    const grassDeepSoilFrom = new THREE.Color(colors.grassDeepSoilNormal ?? '#13006a')
    const grassDeepSoilTo = new THREE.Color(colors.grassDeepSoilTransitioned ?? '#1a0a0a')
    
    const transitionedBaseColor = grassBaseFrom.clone().lerp(grassBaseTo, progress)
    const transitionedVividColor = grassVividFrom.clone().lerp(grassVividTo, progress)
    const transitionedSoilColor = grassSoilFrom.clone().lerp(grassSoilTo, progress)
    const transitionedDeepSoilColor = grassDeepSoilFrom.clone().lerp(grassDeepSoilTo, progress)

    // Fog color transition
    const fogColorFrom = new THREE.Color(colors.fogNormal ?? '#cfedff')
    const fogColorTo = new THREE.Color(colors.fogTransitioned ?? '#4a3d6d')
    const transitionedFogColor = fogColorFrom.clone().lerp(fogColorTo, progress)

    // Background color transition
    const bgColorFrom = new THREE.Color(colors.backgroundNormal ?? '#41a5e7')
    const bgColorTo = new THREE.Color(colors.backgroundTransitioned ?? '#000000')
    const transitionedBgColor = bgColorFrom.clone().lerp(bgColorTo, progress)

    // Update platform material colors if accessible
    const section3 = this.sectionGroups?.section3
    if (section3) {
      const platform = section3.getObjectByName('Section3 Platform')
      if (platform && platform.material) {
        platform.material.color.copy(transitionedBaseColor)
      }

      // Update grass layer material to transition color from platform
      section3.traverse((child) => {
        if (child.name === 'Section3 Grass Patches' && child.material) {
          // Grass layer transitions from base color during eye transition
          child.material.color.copy(transitionedBaseColor)
        }
      })
    }

    // Update fog
    if (this.mainScene?.fog instanceof THREE.Fog) {
      this.mainScene.fog.color.copy(transitionedFogColor)
    }

    // Update background
    if (this.mainScene) {
      if (this.mainScene.background instanceof THREE.Color) {
        this.mainScene.background.copy(transitionedBgColor)
      } else {
        this.mainScene.background = transitionedBgColor.clone()
      }
    }

    // Update renderer clear color to match transition
    if (this.renderer) {
      this.renderer.setClearColor(transitionedBgColor, 1.0)
    }

    // Ensure fog and background updates are visible
    if (this.mainScene?.fog) {
      this.mainScene.fog.far = 400 // Ensure fog is updated
    }

    // Sync descriptor colors so _updateSection3EdgeAtmosphere uses transitioned base colors.
    if (section3Lighting?.fog) {
      section3Lighting.fog.color = `#${transitionedFogColor.getHexString()}`
    }
    if (section3Lighting) {
      section3Lighting.background = `#${transitionedBgColor.getHexString()}`
    }
  }

  _updateSection3TreeOpacity(progress) {
    const section3 = this.sectionGroups?.section3
    const trees = section3?.userData?.section3Trees || []
    const controllers = section3?.userData?.section3TreeMaterialControllers || []
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1)

    controllers.forEach((controller) => {
      setTreeMaterialControllerOpacity(controller, clampedProgress)
    })

    const shouldBeVisible = clampedProgress > 0.001
    if (section3?.userData?.section3TreesVisible !== shouldBeVisible) {
      trees.forEach((tree) => {
        if (tree?.userData) {
          tree.userData.opacity = clampedProgress
          tree.visible = shouldBeVisible && tree.userData.section3LodVisible !== false
        }
      })
      if (section3?.userData) {
        section3.userData.section3TreesVisible = shouldBeVisible
      }
      return
    }

    trees.forEach((tree) => {
      if (tree?.userData) tree.userData.opacity = clampedProgress
    })
  }

  _updateSection3TreeLighting(transitionProgress = 0, edgeDarkness = 0) {
    const section3 = this.sectionGroups?.section3
    const trees = section3?.userData?.section3Trees || []
    const controllers = section3?.userData?.section3TreeMaterialControllers || []
    const transitionShade = THREE.MathUtils.lerp(1, 0.48, THREE.MathUtils.clamp(transitionProgress, 0, 1))
    const edgeShade = THREE.MathUtils.lerp(1, 0.18, THREE.MathUtils.clamp(edgeDarkness, 0, 1))
    const brightness = Math.max(0.08, transitionShade * edgeShade)

    controllers.forEach((controller) => {
      setTreeMaterialControllerBrightness(controller, brightness)
    })

    trees.forEach((tree) => {
      if (tree?.userData) {
        tree.userData.brightness = brightness
      }
    })
  }

  _updateSection3EyeTracking(syncList, camera = null) {
    if (this.activeSectionId !== 'section3') return

    if (!this.section3EyeSun && this.sectionGroups?.section3?.userData?.section3EyeSun) {
      this.section3EyeSun = this.sectionGroups.section3.userData.section3EyeSun
    }

    const eyeLookUpdater = this.section3EyeSun?.userData?.updateLookAt
    if (typeof eyeLookUpdater !== 'function') return

    if (camera?.position) {
      this._tmpSection3EyeLookTarget.set(camera.position.x, camera.position.y, camera.position.z)
      eyeLookUpdater(this._tmpSection3EyeLookTarget)
      return
    }

    const playerEntry = syncList?.find(e => e.name === 'Player' && e.mesh)
    if (!playerEntry?.mesh) return

    playerEntry.mesh.getWorldPosition(this._tmpSection3EyePlayerPos)
    eyeLookUpdater(this._tmpSection3EyePlayerPos)
  }

  _resolveSection3PlatformBounds() {
    const platform = this.sceneGroup?.getObjectByName('Section3 Platform')
    if (!platform) return null

    const cache = this._section3PlatformBoundsCache
    if (cache?.platform === platform) return cache

    const geometryRadius = platform.geometry?.parameters?.radius || 96
    const scaleRadius = Math.max(Math.abs(platform.scale?.x || 1), Math.abs(platform.scale?.z || 1))
    const radius = geometryRadius * scaleRadius

    const next = { platform, radius }
    this._section3PlatformBoundsCache = next
    return next
  }

  _updateSection3EdgeAtmosphere(syncList, delta) {
    if (this.activeSectionId !== 'section3') {
      this.section3EdgeDarkness = 0
      this.section3EdgeTeleportCooldown = 0
      this.section3EdgeOverMaxTimer = 0
      this.section3EdgeDarkHoldTimer = 0
      this.section3EdgeRecoveryTimer = 0
      this.section3EdgeRecoveryStartDarkness = 0
      this._updateSection3TreeLighting(0, 0)
      return
    }

    this.section3EdgeTeleportCooldown = Math.max(0, this.section3EdgeTeleportCooldown - delta)

    const playerEntry = syncList?.find(e => e.name === 'Player' && e.mesh)
    if (!playerEntry?.mesh) return

    const bounds = this._resolveSection3PlatformBounds()
    if (!bounds?.platform || !Number.isFinite(bounds.radius) || bounds.radius <= 0.001) return

    bounds.platform.getWorldPosition(this._tmpSection3PlatformCenter)
    const playerPos = playerEntry.mesh.position
    const dx = playerPos.x - this._tmpSection3PlatformCenter.x
    const dz = playerPos.z - this._tmpSection3PlatformCenter.z
    const distToCenter = Math.sqrt((dx * dx) + (dz * dz))

    const startRadius = bounds.radius * SCENE1_CONFIG.section3EdgeDarkStartRatio
    const maxRadius = bounds.radius * THREE.MathUtils.clamp(SCENE1_CONFIG.section3EdgeDarkMaxRatio, 0.01, 1)
    const radiusSpan = Math.max(0.001, maxRadius - startRadius)
    let edgeProgress = THREE.MathUtils.clamp((distToCenter - startRadius) / radiusSpan, 0, 1)

    if (edgeProgress >= 0.999) {
      this.section3EdgeOverMaxTimer += delta
    } else {
      this.section3EdgeOverMaxTimer = 0
    }

    const teleportHoldSec = Math.max(0.1, SCENE1_CONFIG.section3EdgeTeleportHoldSec)
    if (
      this.section3EdgeOverMaxTimer >= teleportHoldSec &&
      this.section3EdgeTeleportCooldown <= 0
    ) {
      const centerSpawn = this._getSection3CenterSpawnPosition(0.85)
      this._teleportPlayerEntry(playerEntry, centerSpawn, { withEffect: false })
      this.section3EdgeTeleportCooldown = Math.max(0.1, SCENE1_CONFIG.section3EdgeTeleportCooldownSec)
      this.section3EdgeOverMaxTimer = 0
      this.section3EdgeRecoveryStartDarkness = 1
      this.section3EdgeDarkness = 1
      this.section3EdgeDarkHoldTimer = Math.max(0.1, SCENE1_CONFIG.section3EdgePostTeleportDarkHoldSec)
      this.section3EdgeRecoveryTimer = Math.max(0.1, SCENE1_CONFIG.section3EdgeRecoveryDurationSec)
      // Start easing darkness down from current value after teleport instead of snapping.
      edgeProgress = 0
    }

    const smoothSpeed = Math.max(0.001, SCENE1_CONFIG.section3EdgeDarkSmoothSpeed)
    const smoothAlpha = Math.min(1, delta * smoothSpeed)

    if (this.section3EdgeDarkHoldTimer > 0) {
      this.section3EdgeDarkHoldTimer = Math.max(0, this.section3EdgeDarkHoldTimer - delta)
      this.section3EdgeDarkness = 1
    } else if (this.section3EdgeRecoveryTimer > 0) {
      const recoveryDuration = Math.max(0.1, SCENE1_CONFIG.section3EdgeRecoveryDurationSec)
      this.section3EdgeRecoveryTimer = Math.max(0, this.section3EdgeRecoveryTimer - delta)
      const recovered = THREE.MathUtils.clamp(1 - (this.section3EdgeRecoveryTimer / recoveryDuration), 0, 1)
      // Force a fixed-duration recovery curve after teleport: darkness -> current positional target in 5s.
      this.section3EdgeDarkness = THREE.MathUtils.lerp(this.section3EdgeRecoveryStartDarkness, edgeProgress, recovered)
    } else {
      this.section3EdgeDarkness = THREE.MathUtils.lerp(this.section3EdgeDarkness, edgeProgress, smoothAlpha)
    }

    // Linear darkness from center -> boundary (smoothed over time only).
    const darkness = this.section3EdgeDarkness

    const section3Lighting = this.section3Lighting || null
    const mainLight = section3Lighting?.mainLight || null
    const baseMainIntensity = section3Lighting?.baseMainIntensity ?? mainLight?.intensity
    if (mainLight && Number.isFinite(baseMainIntensity)) {
      const minFactor = THREE.MathUtils.clamp(SCENE1_CONFIG.section3EdgeDarkMinMainLightFactor, 0, 1)
      const target = baseMainIntensity * THREE.MathUtils.lerp(1, minFactor, darkness)
      mainLight.intensity = Math.max(0, target)
    }

    if (this.ambientLight && section3Lighting?.ambientIntensity != null) {
      const baseAmbient = section3Lighting.ambientIntensity
      const minAmbient = Math.max(0, SCENE1_CONFIG.section3EdgeDarkMinAmbientIntensity)
      const targetAmbient = THREE.MathUtils.lerp(baseAmbient, minAmbient, darkness)
      this.currentAmbientIntensity = targetAmbient
      this.ambientLight.intensity = targetAmbient
    }

    if (this.mainScene?.fog instanceof THREE.Fog) {
      const fog = this.mainScene.fog
      const fogCfg = section3Lighting?.fog || {}
      const baseNear = fogCfg.near ?? fog.near
      const baseFar = fogCfg.far ?? fog.far
      const nearFactor = THREE.MathUtils.clamp(SCENE1_CONFIG.section3EdgeDarkFogNearFactor, 0.05, 1)
      const farFactor = THREE.MathUtils.clamp(SCENE1_CONFIG.section3EdgeDarkFogFarFactor, 0.05, 1)

      fog.near = Math.max(0.05, THREE.MathUtils.lerp(baseNear, baseNear * nearFactor, darkness))
      fog.far = Math.max(fog.near + 1.5, THREE.MathUtils.lerp(baseFar, baseFar * farFactor, darkness))

      const colors = section3Lighting?.colors || {}
      const fogFrom = new THREE.Color(colors.fogNormal ?? '#cfedff')
      const fogTo = new THREE.Color(colors.fogTransitioned ?? '#4a3d6d')
      const transitionedFog = fogFrom.clone().lerp(fogTo, this.section3EyeTransitionProgress || 0)
      const baseFogColor = fogCfg.color ?? `#${transitionedFog.getHexString()}`
      fog.color.set(baseFogColor)
      fog.color.lerp(new THREE.Color('#000000'), darkness)
    }

    if (this.mainScene && section3Lighting?.background != null) {
      const colors = section3Lighting?.colors || {}
      const bgFrom = new THREE.Color(colors.backgroundNormal ?? '#41a5e7')
      const bgTo = new THREE.Color(colors.backgroundTransitioned ?? '#000000')
      const transitionedBg = bgFrom.clone().lerp(bgTo, this.section3EyeTransitionProgress || 0)
      const baseBackground = section3Lighting.background ?? `#${transitionedBg.getHexString()}`
      if (this.mainScene.background instanceof THREE.Color) {
        this.mainScene.background.set(baseBackground)
        this.mainScene.background.lerp(new THREE.Color('#000000'), darkness)
      } else {
        this.mainScene.background = new THREE.Color(baseBackground)
      }
    }

    this._updateSection3TreeLighting(this.section3EyeTransitionProgress || 0, darkness)
  }

  _updateAmbientFlicker(delta, syncList) {
    if (!this.ambientLight) {
      return
    }

    const timersToDelete = []
    this.guyFlickerTimers.forEach((remainingTime, guyMesh) => {
      remainingTime -= delta
      if (remainingTime <= 0) {
        timersToDelete.push(guyMesh)
      } else {
        this.guyFlickerTimers.set(guyMesh, remainingTime)
      }
    })
    timersToDelete.forEach(mesh => this.guyFlickerTimers.delete(mesh))
    
    // Update ball event flickering timer
    if (this.ballEventFlickerTimer > 0) {
      this.ballEventFlickerTimer -= delta
    }
    
    // Ambient flickering active if any guy is flickering or ball event is flickering
    this.isAmbientFlickering = this.guyFlickerTimers.size > 0 || this.ballEventFlickerTimer > 0
    
    // Ambient light remains steady - no flickering
    if (this.isBlackoutActive) {
      this.ambientLight.intensity = SCENE1_CONFIG.blackoutAmbientIntensity
    } else {
      // Keep ambient light at steady intensity regardless of emergency/phase changes
      this.ambientLight.intensity = this.currentAmbientIntensity
    }
    
    if (this.mainScene && this.mainScene.fog && this.mainScene.fog instanceof THREE.Fog) {
      const baseFar = SCENE1_CONFIG.sunLightBaseFar
      const reducedFar = baseFar - (this.totalPhaseChanges * 15)
      this.mainScene.fog.far = Math.max(5, reducedFar)
    }
  }

  _updateWaterSplash(delta, particleManager) {
    if (!particleManager) return
    
    this.leakTimer += delta
    if (this.leakTimer > SCENE1_CONFIG.waterSplashInterval) {
      const cfg = SCENE1_CONFIG.waterSplashPosition
      const baseX = cfg.x
      const baseY = cfg.y
      const baseZ = cfg.z
      
      const randomX = baseX + (Math.random() - 0.5) * SCENE1_CONFIG.waterSplashSpread
      const randomY = baseY + (Math.random() - 0.3) * SCENE1_CONFIG.waterSplashRandomY
      const randomZ = baseZ + (Math.random() - 0.5) * SCENE1_CONFIG.waterSplashSpread
      
      const spawnCount = Math.random() > 0.5 ? 3 : 2
      for (let i = 0; i < spawnCount; i++) {
        const offsetX = randomX + (Math.random() - 0.5) * 0.4
        const offsetY = randomY + (Math.random() - 0.5) * 0.3
        const offsetZ = randomZ + (Math.random() - 0.5) * 0.4
        particleManager.spawn('waterSplash', new THREE.Vector3(offsetX, offsetY, offsetZ))
      }
      
      this.leakTimer = 0
    }
  }

  _updateLightsFlicker() {
    const section1Group = this.sectionGroups?.section1 || null
    if (!section1Group) return

    // If blackout is active, turn off all section1 light fixtures completely
    if (this.isBlackoutActive) {
      this._setSection1CeilingLightsState(false)
      return
    }

    if (!this.isLightFlickeringActive) {
      // Keep deterministic state when not flickering.
      this._setSection1CeilingLightsState(this.section1CeilingLightsEnabled)
      return
    }

    section1Group.traverse(child => {
      if (!child.userData?.lightSource) return

      if (Math.random() > 0.4) {
        const rand = Math.random()
        let newIntensity = 0

        if (rand < 0.3) {
          newIntensity = 0
        } else if (rand < 0.6) {
          newIntensity = Math.random() * 0.5
        } else {
          newIntensity = 1.0 + (Math.random() - 0.5) * 1.5
        }

        child.userData.lightSource.intensity = newIntensity

        child.children.forEach(mesh => {
          if (mesh.isMesh && mesh.material?.emissive && mesh.material.emissive.getHex() > 0) {
            if (newIntensity < 0.1) {
              mesh.material.emissiveIntensity = FLICKER_CONFIG.offEmissiveIntensity
              mesh.material.color.set(FLICKER_CONFIG.offColor)
            } else {
              mesh.material.emissiveIntensity = newIntensity * FLICKER_CONFIG.onEmissiveIntensityMultiplier
              mesh.material.color.set(FLICKER_CONFIG.onColor)
            }
          }
        })
      }
    })
  }

  _updatePersonAnimation(delta, syncList) {
    if (!this.personMesh || !this.personMesh.userData.triggerShape || !syncList) {
      return
    }

    const personHeight = SCENE1_CONFIG.personHeight
    const hitboxCenterX = this.personMesh.position.x
    const hitboxCenterY = this.personMesh.position.y + personHeight / 2
    const hitboxCenterZ = this.personMesh.position.z
    const hitboxRadius = this.personMesh.userData.triggerShape.radius
    const hitboxRadiusSq = hitboxRadius * hitboxRadius

    let triggered = false
    for (const entry of syncList) {
      if (!entry?.mesh || !entry?.body || entry.body.mass <= 0) continue
      const dx = entry.mesh.position.x - hitboxCenterX
      const dy = entry.mesh.position.y - hitboxCenterY
      const dz = entry.mesh.position.z - hitboxCenterZ
      if ((dx * dx + dy * dy + dz * dz) < hitboxRadiusSq) {
        triggered = true
        break
      }
    }

    if (triggered) {
      if (!this.isRetracting) {
        this.isRetracting = true
        this.targetY = this.initialY - 5
        this.riseProgress = 0
      }
    } else {
      this.isRetracting = false
    }

    if (this.isRetracting) {
      const yDistance = this.targetY - this.personMesh.position.y
      if (Math.abs(yDistance) > 0.01) {
        this.personMesh.position.y += yDistance * 0.2
      } else {
        this.personMesh.position.y = this.targetY
      }
    } else {
      if (this.personMesh.position.y < this.initialY) {
        const riseDuration = 20
        this.riseProgress += delta
        const riseSpeed = (this.initialY - (this.initialY - 5)) / riseDuration
        const newY = (this.initialY - 5) + (riseSpeed * this.riseProgress)
        this.personMesh.position.y = Math.min(newY, this.initialY)
      }
    }
  }

  onGuyPhaseChange(newPhase, oldPhase, guyMesh) {
    // Guy effects on lighting are strictly section1-only.
    // If player has teleported to another section, ignore entirely.
    if (this.activeSectionId !== 'section1') return

    this._triggerFlickerLights()
    this.guyFlickerTimers.set(guyMesh, SCENE1_CONFIG.ambientLightFlickerDuration)

    this.totalPhaseChanges++
    this.currentAmbientIntensity = Math.max(
      0.1,
      this.baseAmbientIntensity - (this.totalPhaseChanges * this.phaseChangeIntensityReduction)
    )
    this.currentFogDensity = this.baseFogDensity + (this.totalPhaseChanges * this.phaseChangeFogIncrease)
  }

  _triggerFlickerLights() {
    this.isLightFlickeringActive = true
    this.lightFlickerTimer = 0
  }

  _setSection1CeilingLightsState(enabled) {
    const section1Group = this.sectionGroups?.section1 || null
    if (!section1Group) return

    section1Group.traverse(child => {
      if (!child.userData?.lightSource) return

      const light = child.userData.lightSource
      if (typeof child.userData.baseLightIntensity !== 'number') {
        child.userData.baseLightIntensity = light.intensity
      }

      light.intensity = enabled ? child.userData.baseLightIntensity : 0

      child.children.forEach(mesh => {
        if (!mesh.isMesh || !mesh.material?.emissive || mesh.material.emissive.getHex() <= 0) return
        if (enabled) {
          mesh.material.emissiveIntensity = FLICKER_CONFIG.onEmissiveIntensityMultiplier
          mesh.material.color.set(FLICKER_CONFIG.onColor)
        } else {
          mesh.material.emissiveIntensity = FLICKER_CONFIG.offEmissiveIntensity
          mesh.material.color.set(FLICKER_CONFIG.offColor)
        }
      })
    })
  }

  _updateSunLightFlicker() {
    if (!this.sunLight) {
      return
    }

    // If blackout is active, keep minimal sun light (light from window)
    if (this.isBlackoutActive) {
      this.sunLight.intensity = SCENE1_CONFIG.blackoutSunLightIntensity
      return
    }

    const reducedIntensity = this.baseSunIntensity * (SCENE1_CONFIG.sunLightDimFactor ** this.totalPhaseChanges)

    if (!this.isAmbientFlickering) {
      this.sunLight.intensity = reducedIntensity
      return
    }

    if (Math.random() > 0.5) {
      this.sunLight.intensity = SCENE1_CONFIG.sunLightMinIntensity
    } else {
      this.sunLight.intensity = reducedIntensity
    }
  }

  _updateGuyCount(syncList) {
    let count = 0
    for (const entry of syncList) {
      if (entry?.name === 'Guy' && entry.mesh) count++
    }
    this.guyCount = count

    if (this.lastGuyCount > 0 && this.guyCount === 0) {
      this._resetSceneEffects()
    }

    this.lastGuyCount = this.guyCount
  }

  _resetSceneEffects() {
    this.isLightFlickeringActive = false
    this.lightFlickerTimer = 0
    this.isAmbientFlickering = false
    this.guyFlickerTimers.clear()

    this.totalPhaseChanges = 0
    this.currentFogDensity = this.baseFogDensity

    // Re-apply section1 base lighting now that phase degradation is cleared
    if (this.lightsInitialized) {
      this._applySectionLighting(this.activeSectionId || 'section1')
    } else {
      if (this.ambientLight) this.ambientLight.intensity = this.baseAmbientIntensity
      if (this.sunLight) this.sunLight.intensity = this.baseSunIntensity
      if (this.mainScene?.fog instanceof THREE.Fog) {
        this.mainScene.fog.far = SCENE1_CONFIG.sunLightBaseFar
      }
    }
  }

  _updateLightFlickerDuration(delta) {
    if (!this.isLightFlickeringActive) return

    this.lightFlickerTimer += delta
    if (this.lightFlickerTimer >= SCENE1_CONFIG.lightFlickerDuration) {
      this.isLightFlickeringActive = false
      this.lightFlickerTimer = 0
      if (this.turnOffSection1CeilingAfterFlicker) {
        this.turnOffSection1CeilingAfterFlicker = false
        this.section1CeilingLightsEnabled = false
        this._setSection1CeilingLightsState(false)
      }
    }
  }

  /**
   * ✨ NEW: Track ball destruction and scoring system
   * Expects balls to be destroyed in sequence: 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 8
   * If correct order, increase score and log. If wrong order, reset all.
   */
  _updateScoringSystem(syncList) {
    // Reuse collections to reduce per-frame allocations.
    const currentBallNames = this.currentBallNamesBuffer
    const currentBallMap = this.currentBallNumberBuffer
    currentBallNames.clear()
    currentBallMap.clear()

    for (const entry of syncList) {
      if (entry.name && entry.name.startsWith('Ball ')) {
        currentBallNames.add(entry.name)
        if (entry.userData && typeof entry.userData.ballNumber === 'number') {
          currentBallMap.set(entry.name, entry.userData.ballNumber)
        }
      }
    }

    // Check if any balls were destroyed (in previousBallNames but not in currentBallNames)
    this.previousBallNames.forEach(ballName => {
      if (!currentBallNames.has(ballName)) {
        // This ball was destroyed!
        const ballNumber = currentBallMap.has(ballName) ? currentBallMap.get(ballName) : null
        
        // Find ball number from currentBatchBalls (in case it wasn't in map)
        if (ballNumber === null) {
          const destroyedBall = this.currentBatchBalls.find(b => b.name === ballName)
          if (destroyedBall && destroyedBall.userData && typeof destroyedBall.userData.ballNumber === 'number') {
            this._onBallDestroyed(destroyedBall.userData.ballNumber)
          } else {

          }
        } else {
          this._onBallDestroyed(ballNumber)
        }
      }
    })

    // Update previousBallNames for next frame
    // Swap buffers instead of allocating a new Set every frame.
    const tmp = this.previousBallNames
    this.previousBallNames = this.currentBallNamesBuffer
    this.currentBallNamesBuffer = tmp
  }

  /**
   * ✨ NEW: Called when a ball is destroyed
   * Check if it matches expected destroy sequence
   */
  _onBallDestroyed(ballNumber) {
    if (this.nextExpectedBallIndex >= this.destroySequence.length) {
      return
    }

    const expectedBall = this.destroySequence[this.nextExpectedBallIndex]
    
    if (ballNumber === expectedBall) {
      // ✨ CORRECT ORDER!
      this.currentScore++
      this.nextExpectedBallIndex++
      this._handleOrderedBallReward(ballNumber)
      
      // ✨ NEW: If ball 7 destroyed, trigger comprehensive flickering effect
      if (ballNumber === 7) {
        this._triggerFlickerLights()
        this.ballEventFlickerTimer = SCENE1_CONFIG.ambientLightFlickerDuration
      }
    } else {
      // ✨ WRONG ORDER - RESET!
      this.currentScore = 0
      this.nextExpectedBallIndex = 0
      this.correctOrderedBallsSinceLastCoin = 0
      
      // ✨ NEW: Trigger comprehensive flickering effect on reset
      // Ceiling lights flicker first, then remain off until spawn cycle is reset.
      this.turnOffSection1CeilingAfterFlicker = true
      this._triggerFlickerLights()
      this.ballEventFlickerTimer = SCENE1_CONFIG.ambientLightFlickerDuration

      // Spawn penalty Dude and pause spawn cycle until Dude despawns
      this._triggerPenaltyDudeSequence()
    }
  }

  _handleOrderedBallReward(ballNumber) {
    if (typeof ballNumber !== 'number') return

    this.correctOrderedBallsSinceLastCoin++

    if (this.correctOrderedBallsSinceLastCoin < this.orderedBallsPerSilverCoinReward) return

    this.correctOrderedBallsSinceLastCoin = 0
    this._spawnSequenceSilverCoin()
  }

  _getScene1TableSpawnPosition(heightOffset = SCENE1_CONFIG.sequenceSilverCoinSpawnHeight, spreadScale = SCENE1_CONFIG.sequenceSilverCoinSpawnSpread) {
    const tableWidth = 20
    const tableDepth = 11
    const halfW = (tableWidth * 0.5) * spreadScale
    const halfD = (tableDepth * 0.5) * spreadScale
    const x = (Math.random() * 2 - 1) * halfW
    const z = (Math.random() * 2 - 1) * halfD

    const table = this.sceneGroup?.getObjectByName('Billiard Table')
    let baseY = 0
    if (table?.userData?.tableDimensions?.topY) {
      baseY = table.userData.tableDimensions.topY
    }

    return new THREE.Vector3(x, baseY + heightOffset, z)
  }

  _spawnSequenceSilverCoin() {
    if (!this.spawner || !this.mainScene || !this.world || !this.syncList) return null

    if (!this.sequenceSilverCoinAsset) {
      this.sequenceSilverCoinAsset = getSilverCoinAsset()
    }

    const coinAsset = this.sequenceSilverCoinAsset
    if (!coinAsset?.physics) return null

    const spawnPos = this._getScene1TableSpawnPosition()

    const coinPrefab = {
      name: coinAsset.name,
      type: 'dynamic',
      spawnCategory: 'item',
      createMesh: () => {
        const mesh = coinAsset.factory()
        mesh.userData.shadowConfig = { size: 0.5, opacity: 0.65, fadeRate: 0.9 }
        return mesh
      },
      createBody: (physicsMaterials) => this._createDynamicBodyFromPhysicsDef(coinAsset.physics, physicsMaterials, { spawnCategory: 'item' })
    }

    const spawned = this.spawner({
      scene: this.mainScene,
      prefab: coinPrefab,
      position: spawnPos,
      world: this.world,
      physicsMaterials: this.physicsMaterials,
      syncList: this.syncList,
      particleManager: this.particleManager
    })

    if (spawned?.body) {
      spawned.body.userData = spawned.body.userData || {}
      spawned.body.userData.isCollectedItem = false
      spawned.body.userData.spawnedByScene1OrderedSequence = true
      const spinY = THREE.MathUtils.randFloat(SCENE1_CONFIG.sequenceSilverCoinMinSpinY, SCENE1_CONFIG.sequenceSilverCoinMaxSpinY)
      spawned.body.angularVelocity.set((Math.random() - 0.5) * 3, spinY, (Math.random() - 0.5) * 3)
    }

    return spawned || null
  }

  _triggerPenaltyDudeSequence() {
    if (this.penaltyDudeActive || this.penaltyDudeSpawnPending) return

    this.penaltyDudeActive = true
    this.penaltyDudeTouchedPlayer = false
    this.ballSpawningActive = false
    this.isResetActive = false
    this.resetTimer = 0

    // Clear all existing balls immediately
    const ballsToDestroy = this.syncList.filter(e => e && e.name && e.name.startsWith('Ball '))
    ballsToDestroy.forEach(ballEntry => {
      if (this.destroySystem) this.destroySystem.destroyObject(ballEntry)
    })

    this.currentBatchBalls = []
    this.previousBallNames.clear()

    this._spawnPenaltyDude()
  }

  _spawnPenaltyDude() {
    if (!this.spawner || !this.world || !this.mainScene) return
    this.penaltyDudeSpawnPending = true
    this._enqueueSectionWarmup('section2', { title: 'Loading Section 2', showReadyOverlay: true })

    const spawnWithAsset = (asset) => {
      if (!asset || !asset.physics) {
        this.penaltyDudeSpawnPending = false
        return
      }

      // Đảm bảo Dude luôn có fake shadow
      const dudePrefab = {
        name: asset.name,
        type: 'dynamic',
        createMesh: withShadow(asset.factory, 1.2, 0.9, 0.4),
        createBody: () => {
          const shape = asset.physics.shapes?.[0]
          const body = new CANNON.Body({
            mass: asset.physics.mass || 0.01,
            linearDamping: asset.physics.linearDamping ?? 0,
            angularDamping: asset.physics.angularDamping ?? 0.5,
            fixedRotation: !!asset.physics.fixedRotation,
          })
          body.addShape(new CANNON.Sphere(shape?.radius || 0.3))
          return body
        }
      }

      const p = SCENE1_CONFIG.guySpawnPosition
      const spawnPos = new THREE.Vector3(p.x, p.y, p.z)

      this.spawner({
        scene: this.mainScene,
        prefab: dudePrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })

      const spawnedPenaltyDude = [...this.syncList].reverse().find(e => e && e.name === 'Dude')
      if (spawnedPenaltyDude) {
        spawnedPenaltyDude.userData = spawnedPenaltyDude.userData || {}
        spawnedPenaltyDude.userData.isPenaltyDude = true
        if (spawnedPenaltyDude.body) {
          spawnedPenaltyDude.body.userData = spawnedPenaltyDude.body.userData || {}
          spawnedPenaltyDude.body.userData.isPenaltyDude = true
        }
      }

      this.penaltyDudeSpawnPending = false
    }

    if (this.dudeAsset) {
      spawnWithAsset(this.dudeAsset)
      return
    }

    import('../assets/objects/Dude.js').then(module => {
      this.dudeAsset = module.getDudeAsset()
      spawnWithAsset(this.dudeAsset)
    }).catch(err => {
      this.penaltyDudeSpawnPending = false
      this.penaltyDudeActive = false

    })
  }

  _isDudeTouchingPlayer(dudeEntry, playerEntry) {
    if (!dudeEntry?.mesh || !playerEntry?.mesh) return false

    const dudeSmallTrigger = dudeEntry.mesh.userData.smallTriggerZone || dudeEntry.mesh.children.find(c => c.name === 'TriggerZone_Small')
    const playerSmallTrigger = playerEntry.mesh.userData.smallTriggerZone || playerEntry.mesh.children.find(c => c.name === 'TriggerZone_Small')

    if (dudeSmallTrigger) dudeEntry.mesh.userData.smallTriggerZone = dudeSmallTrigger
    if (playerSmallTrigger) playerEntry.mesh.userData.smallTriggerZone = playerSmallTrigger

    dudeEntry.mesh.updateMatrixWorld(true)
    playerEntry.mesh.updateMatrixWorld(true)

    let dudePos = dudeEntry.mesh.position
    let dudeRadius = 0.5
    if (dudeSmallTrigger) {
      dudeSmallTrigger.getWorldPosition(this._tmpDudeTriggerWorldPos)
      dudePos = this._tmpDudeTriggerWorldPos
      dudeRadius = dudeSmallTrigger.geometry?.parameters?.radius || 1.5
    }

    let playerPos = playerEntry.mesh.position
    let playerRadius = 0.5
    if (playerSmallTrigger) {
      playerSmallTrigger.getWorldPosition(this._tmpPlayerTriggerWorldPos)
      playerPos = this._tmpPlayerTriggerWorldPos
      playerRadius = playerSmallTrigger.geometry?.parameters?.radius || 1.5
    }

    return dudePos.distanceTo(playerPos) < (dudeRadius + playerRadius)
  }

  _updateTeleportCooldown(delta) {
    if (this.teleportCooldown > 0) {
      this.teleportCooldown = Math.max(0, this.teleportCooldown - delta)
    }
  }

  _cacheSection1TeleportState(playerEntry) {
    if (!playerEntry?.body) return
    if (!this.section1TeleportPosition) {
      this.section1TeleportPosition = playerEntry.body.position.clone()
      this.section1TeleportQuaternion = playerEntry.body.quaternion.clone()
    }
  }

  _ensureScreenMat() {
    if (!this.screenMat) {
      this.screenMat = new ScreenMat(document.body)
    }
    return this.screenMat
  }

  _playTeleportScreenMat(durationMs = 4000) {
    const mat = this._ensureScreenMat()
    if (!mat) return
    mat.start(durationMs)
  }

  _getSection3CenterSpawnPosition(yOffset = 0.85) {
    // Lower spawn Y so player stands flush with ground (was +0.85)
    const section3Platform = this.sceneGroup?.getObjectByName('Section3 Platform')
    const spawnPos = section3Platform ? section3Platform.position.clone() : new THREE.Vector3(0, 140, 0)
    spawnPos.y += 0.1 // Just above ground to avoid clipping
    return spawnPos
  }

  _teleportPlayerEntry(playerEntry, targetPosition, options = {}) {
    if (!playerEntry?.body || !targetPosition) return

    const {
      withEffect = true,
      effectDurationMs = 4000,
      skipSectionWarmupGate = false
    } = options

    const destinationSection = this._resolveSectionFromPosition(targetPosition)

    if (!skipSectionWarmupGate) {
      const destinationState = this.sectionWarmState[destinationSection]
      if (destinationState && !destinationState.ready) {
        this._enqueueSectionWarmup(destinationSection, {
          title: `Loading ${destinationSection}`,
          showReadyOverlay: true,
          priority: 'high'
        })

        this.pendingTeleportRequest = {
          playerEntry,
          targetPosition: targetPosition.clone(),
          options: { withEffect, effectDurationMs },
          destinationSection,
          queuedAtMs: performance.now()
        }
        return
      }
    }

    // Switch streamed section immediately so destination geometry is visible
    // in the same frame as teleport instead of waiting until next update tick.
    this._setSectionActive(destinationSection)

    if (withEffect) {
      this._playTeleportScreenMat(effectDurationMs)
    }

    playerEntry.body.position.copy(targetPosition)
    playerEntry.body.velocity.set(0, 0, 0)
    playerEntry.body.angularVelocity.set(0, 0, 0)
    // Luôn reset về tư thế đứng bình thường để tránh bị lộn ngược sau teleport.
    playerEntry.body.quaternion.set(0, 0, 0, 1)

    if (playerEntry.mesh) {
      playerEntry.mesh.position.copy(playerEntry.body.position)
      playerEntry.mesh.quaternion.copy(playerEntry.body.quaternion)
    }

    this._teleportLoyalGuidesNearPlayer(playerEntry)
  }

  _teleportLoyalGuidesNearPlayer(playerEntry) {
    if (!playerEntry?.mesh || !Array.isArray(this.syncList)) return

    for (const entry of this.syncList) {
      if (!entry || entry === playerEntry) continue
      if (entry.name !== 'Guide' || !entry.body || !entry.mesh) continue

      const guideAI = entry.body.userData?.guideAI
      const isLoyalFollowState = !!(guideAI?.carried && guideAI?.loyalPlayerEntry === playerEntry)
      if (!isLoyalFollowState) continue

      const smallTrigger = entry.mesh.children.find(c => c.name === 'TriggerZone_Small')
      const smallRadius = smallTrigger?.geometry?.parameters?.radius || 1.5
      const teleportDistance = Math.max(1.15, smallRadius + 0.2)

      const offsetDir = new THREE.Vector3().subVectors(entry.mesh.position, playerEntry.mesh.position)
      offsetDir.y = 0
      if (offsetDir.lengthSq() < 0.0001) {
        const yaw = typeof guideAI?.bodyYaw === 'number' ? guideAI.bodyYaw : entry.mesh.rotation.y
        offsetDir.set(Math.sin(yaw), 0, Math.cos(yaw))
      }
      offsetDir.normalize()

      const targetPos = playerEntry.mesh.position.clone().addScaledVector(offsetDir, teleportDistance)
      targetPos.y = playerEntry.body.position.y

      entry.body.position.set(targetPos.x, targetPos.y, targetPos.z)
      entry.body.velocity.set(0, 0, 0)
      entry.body.angularVelocity.set(0, 0, 0)
      entry.body.aabbNeedsUpdate = true

      entry.mesh.position.copy(targetPos)

      if (typeof guideAI?.syncCarriedItem === 'function') {
        guideAI.syncCarriedItem(0)
      }
    }
  }

  _despawnEntry(entry) {
    if (!entry) return

    if (this.destroySystem && typeof this.destroySystem.destroyObject === 'function') {
      this.destroySystem.destroyObject(entry)
      return
    }

    if (entry.body && this.world) {
      this.world.removeBody(entry.body)
    }
    if (entry.mesh && this.mainScene) {
      this.mainScene.remove(entry.mesh)
    }
    if (this.syncList) {
      const idx = this.syncList.indexOf(entry)
      if (idx !== -1) this.syncList.splice(idx, 1)
    }
  }

  _ensureVendingMachineEntry() {
    if (this.vendingMachineEntry?.mesh?.parent) return this.vendingMachineEntry
    const vending = this._ensureStaticSceneObjectEntry('Vending Machine', 'vendingMachineEntry')
    if (!vending) {
      this.vendingMachineEntry = null
      return null
    }
    return vending
  }

  _ensureStaticSceneObjectEntry(objectName, entryKey) {
    const cached = entryKey ? this[entryKey] : null
    if (cached?.mesh?.parent) return cached

    const mesh = this.sceneGroup?.getObjectByName(objectName) || null
    if (!mesh) {
      if (entryKey) this[entryKey] = null
      return null
    }

    const entry = { mesh }
    if (entryKey) this[entryKey] = entry
    return entry
  }

  _getWorldShapeInfo(mesh, role = null) {
    const shapes = mesh?.userData?.physics?.shapes
    const shape = role
      ? shapes?.find((candidate) => candidate?.role === role)
      : shapes?.find((candidate) => !candidate?.isTrigger) || shapes?.[0]
    if (!mesh || !shape || !Array.isArray(shape.size)) return null

    const sx = Math.abs(shape.size[0] || 0)
    const sy = Math.abs(shape.size[1] || 0)
    const sz = Math.abs(shape.size[2] || 0)
    const scaleX = Math.abs(mesh.scale?.x || 1)
    const scaleY = Math.abs(mesh.scale?.y || 1)
    const scaleZ = Math.abs(mesh.scale?.z || 1)

    const halfX = (sx * scaleX) * 0.5
    const halfY = (sy * scaleY) * 0.5
    const halfZ = (sz * scaleZ) * 0.5

    const localOffset = shape.offset || [0, 0, 0]
    const center = mesh.position.clone().add(
      new THREE.Vector3(localOffset[0] || 0, localOffset[1] || 0, localOffset[2] || 0).applyQuaternion(mesh.quaternion)
    )
    const quat = mesh.quaternion.clone()
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat).normalize()
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat).normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat).normalize()

    return { mesh, shape, center, forward, up, right, halfX, halfY, halfZ }
  }

  _getWorldAggregateShapeInfo(mesh) {
    const shapes = mesh?.userData?.physics?.shapes
    if (!mesh || !Array.isArray(shapes)) return null

    const nonTriggerShapes = shapes.filter((shape) => shape && !shape.isTrigger)
    if (nonTriggerShapes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    for (const shape of nonTriggerShapes) {
      const offset = shape.offset || [0, 0, 0]
      let halfX = 0.5
      let halfY = 0.5
      let halfZ = 0.5

      if (shape.type === 'box' && Array.isArray(shape.size)) {
        halfX = Math.abs(shape.size[0] || 1) * 0.5
        halfY = Math.abs(shape.size[1] || 1) * 0.5
        halfZ = Math.abs(shape.size[2] || 1) * 0.5
      } else if (shape.type === 'sphere') {
        const radius = Math.abs(shape.radius || 0.5)
        halfX = radius
        halfY = radius
        halfZ = radius
      } else if (shape.type === 'cylinder') {
        const radius = Math.abs(shape.radius || shape.radiusTop || shape.radiusBottom || 0.5)
        const length = Math.abs(shape.length || shape.height || 1)
        halfX = radius
        halfY = length * 0.5
        halfZ = radius
      }

      minX = Math.min(minX, (offset[0] || 0) - halfX)
      minY = Math.min(minY, (offset[1] || 0) - halfY)
      minZ = Math.min(minZ, (offset[2] || 0) - halfZ)
      maxX = Math.max(maxX, (offset[0] || 0) + halfX)
      maxY = Math.max(maxY, (offset[1] || 0) + halfY)
      maxZ = Math.max(maxZ, (offset[2] || 0) + halfZ)
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null

    const scaleX = Math.abs(mesh.scale?.x || 1)
    const scaleY = Math.abs(mesh.scale?.y || 1)
    const scaleZ = Math.abs(mesh.scale?.z || 1)

    const centerOffset = new THREE.Vector3(
      ((minX + maxX) * 0.5) * scaleX,
      ((minY + maxY) * 0.5) * scaleY,
      ((minZ + maxZ) * 0.5) * scaleZ
    )

    const halfX = ((maxX - minX) * 0.5) * scaleX
    const halfY = ((maxY - minY) * 0.5) * scaleY
    const halfZ = ((maxZ - minZ) * 0.5) * scaleZ

    const center = mesh.position.clone().add(centerOffset.applyQuaternion(mesh.quaternion))
    const quat = mesh.quaternion.clone()
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat).normalize()
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat).normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat).normalize()

    return { mesh, shape: null, center, forward, up, right, halfX, halfY, halfZ }
  }

  _getVendingWorldShapeInfo(role = null) {
    const vending = this._ensureVendingMachineEntry()
    return this._getWorldShapeInfo(vending?.mesh, role)
  }

  _isPointInsideOrientedBox(point, boxInfo, padding = 0) {
    if (!point || !boxInfo) return false

    const diff = this._tmpOrientedBoxDiff.copy(point).sub(boxInfo.center)
    const localX = diff.dot(boxInfo.right)
    const localY = diff.dot(boxInfo.up)
    const localZ = diff.dot(boxInfo.forward)

    return (
      Math.abs(localX) <= boxInfo.halfX + padding &&
      Math.abs(localY) <= boxInfo.halfY + padding &&
      Math.abs(localZ) <= boxInfo.halfZ + padding
    )
  }

  _getVendingCollectTarget() {
    const info = this._getVendingWorldShapeInfo('blocking') || this._getVendingWorldShapeInfo()
    if (!info) return null

    const depth = info.halfZ * SCENE1_CONFIG.vendingFrontDepthFactor
    const slotHeight = Math.max(SCENE1_CONFIG.vendingSlotHeightMin, info.halfY * SCENE1_CONFIG.vendingSlotHeightRatio)
    const yFromCenter = -info.halfY + slotHeight

    const baseTarget = info.center.clone()
      .addScaledVector(info.forward, depth)
      .addScaledVector(info.up, yFromCenter)

    // Coin insertion point is slightly higher and right-shifted for better visual alignment.
    const target = baseTarget.clone()
      .addScaledVector(info.right, SCENE1_CONFIG.vendingInsertRightOffset)
      .addScaledVector(info.up, SCENE1_CONFIG.vendingInsertUpOffset)

    return { ...info, target, dropTarget: baseTarget }
  }

  _ensureCartonBoxEntry() {
    return this._ensureStaticSceneObjectEntry('Carton Box', 'cartonBoxEntry')
  }

  _ensureChestEntry() {
    return this._ensureStaticSceneObjectEntry('Chest', 'chestEntry')
  }

  _spawnDynamicSceneActor(asset, position, extraSetup = null, spawnCategory = 'gameObject') {
    if (!asset?.physics || !this.spawner || !this.mainScene || !this.world || !this.syncList) return null

    const prefab = {
      name: asset.name,
      type: 'dynamic',
      spawnCategory,
      createMesh: () => asset.factory(),
      createBody: (physicsMaterials) => this._createDynamicBodyFromPhysicsDef(asset.physics, physicsMaterials, { spawnCategory })
    }

    const spawned = this.spawner({
      scene: this.mainScene,
      prefab,
      position,
      world: this.world,
      physicsMaterials: this.physicsMaterials,
      syncList: this.syncList,
      particleManager: this.particleManager
    })

    if (spawned?.mesh) {
      spawned.mesh.userData = spawned.mesh.userData || {}
      if (!spawned.mesh.userData.shadowConfig) {
        if (asset.name === 'Guide' || asset.name === 'Dummy') {
          spawned.mesh.userData.shadowConfig = { size: 1.2, opacity: 0.9, fadeRate: 0.4 }
        } else {
          spawned.mesh.userData.shadowConfig = { size: 1.0, opacity: 0.6, fadeRate: 0.5 }
        }
      }
    }

    if (spawned?.body) {
      spawned.body.userData = spawned.body.userData || {}
      spawned.body.velocity.set(0, 0, 0)
      spawned.body.angularVelocity.set(0, 0, 0)
    }
    if (typeof extraSetup === 'function') extraSetup(spawned)
    return spawned || null
  }

  _spawnCartonDummy(cartonInfo) {
    if (this.cartonDummyEntry?.mesh?.parent) return this.cartonDummyEntry
    if (!this.cartonDummyAsset) this.cartonDummyAsset = getDummyAsset()

    const spawnPos = cartonInfo.center.clone()
      .addScaledVector(cartonInfo.up, -0.03)

    this.cartonDummyEntry = this._spawnDynamicSceneActor(this.cartonDummyAsset, spawnPos, (spawned) => {
      if (!spawned?.body) return
      spawned.body.angularDamping = 0.9
      spawned.body.linearDamping = 0.9
      spawned.body.velocity.set(0, 0.8, 0)
    })
    return this.cartonDummyEntry
  }

  _spawnChestGuide(chestInfo) {
    if (this.chestGuideEntry?.mesh?.parent) return this.chestGuideEntry
    if (!this.chestGuideAsset) this.chestGuideAsset = getGuideAsset()

    const spawnPos = chestInfo.center.clone()
      .addScaledVector(chestInfo.up, 0.02)

    this.chestGuideEntry = this._spawnDynamicSceneActor(this.chestGuideAsset, spawnPos, (spawned) => {
      if (!spawned?.body) return
      spawned.body.angularDamping = 0.9
      spawned.body.linearDamping = 0.9
      spawned.body.velocity.set(0, 0.8, 0)
    })
    return this.chestGuideEntry
  }

  _applyCartonBoxDoorPose(progress) {
    const cartonMesh = this.cartonBoxEntry?.mesh
    if (!cartonMesh) return

    const leftPivot = cartonMesh.getObjectByName('LeftFlapPivot')
    const rightPivot = cartonMesh.getObjectByName('RightFlapPivot')
    if (leftPivot) leftPivot.rotation.y = -progress * (Math.PI * 0.62)
    if (rightPivot) rightPivot.rotation.y = progress * (Math.PI * 0.62)
  }

  _applyChestLidPose(progress) {
    const chestMesh = this.chestEntry?.mesh
    if (!chestMesh) return

    const lidPivot = chestMesh.getObjectByName('LidPivot')
    if (lidPivot) lidPivot.rotation.y = -progress * (Math.PI * 0.72)
  }

  _applyChestLatchPose(progress) {
    const chestMesh = this.chestEntry?.mesh
    if (!chestMesh) return

    const latchBolt = chestMesh.getObjectByName('ChestLatchBolt')
    if (!latchBolt) return

    const closedX = latchBolt.userData?.closedX
    const retractedX = latchBolt.userData?.retractedX
    if (typeof closedX !== 'number' || typeof retractedX !== 'number') return

    latchBolt.position.x = THREE.MathUtils.lerp(closedX, retractedX, THREE.MathUtils.clamp(progress, 0, 1))
  }

  _getChestLatchTargetInfo(chestInfo) {
    if (!chestInfo) return null

    const chestMesh = this.chestEntry?.mesh
    const target = new THREE.Vector3()
    const keeperBlock = chestMesh?.getObjectByName('ChestLatchKeeperBlock')
    const doorBlock = chestMesh?.getObjectByName('ChestLatchDoorBlock')
    let surfaceDepth = 0

    if (keeperBlock) {
      keeperBlock.getWorldPosition(target)
      surfaceDepth = keeperBlock.geometry?.parameters?.depth || 0
    } else if (doorBlock) {
      doorBlock.getWorldPosition(target)
      surfaceDepth = doorBlock.geometry?.parameters?.depth || 0
    } else {
      target.copy(chestInfo.center)
        .addScaledVector(chestInfo.right, chestInfo.halfX * 0.92)
        .addScaledVector(chestInfo.forward, chestInfo.halfZ * 0.52)
      surfaceDepth = 0.2
    }

    target
      .addScaledVector(chestInfo.forward, (surfaceDepth * 0.5) + 0.12)
      .addScaledVector(chestInfo.up, 0.04)

    return {
      target,
      up: chestInfo.up.clone(),
      forward: chestInfo.forward.clone(),
      right: chestInfo.right.clone()
    }
  }

  _getAlignUpQuaternion(direction, fallbackQuaternion = null) {
    const dir = direction?.clone?.()
    if (!dir || dir.lengthSq() < 1e-6) {
      return fallbackQuaternion ? fallbackQuaternion.clone() : new THREE.Quaternion()
    }

    dir.normalize()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }

  _updateCartonBoxInteraction(syncList, delta) {
    const carton = this._ensureCartonBoxEntry()
    if (!carton?.mesh || !Array.isArray(syncList)) return

    if (!this.cartonBoxState) {
      this.cartonBoxState = {
        triggered: false,
        delayRemaining: SCENE1_CONFIG.cartonOpenDelay,
        openProgress: 0,
        isOpening: false,
        isOpen: false
      }
    }

    const state = this.cartonBoxState
    const aggregateInfo = this._getWorldAggregateShapeInfo(carton.mesh) || this._getWorldShapeInfo(carton.mesh)
    const triggerInfo = this._getWorldShapeInfo(carton.mesh, 'cartonTrigger') || aggregateInfo
    const playerEntry = syncList.find((entry) => entry.name === 'Player' && entry.mesh && entry.body)

    if (!state.triggered && playerEntry?.mesh && triggerInfo && this._isPointInsideOrientedBox(playerEntry.mesh.position, triggerInfo, 0.15)) {
      state.triggered = true
      state.delayRemaining = SCENE1_CONFIG.cartonOpenDelay
      this._spawnCartonDummy(aggregateInfo || triggerInfo)
    }

    if (state.triggered && !state.isOpening && !state.isOpen) {
      state.delayRemaining = Math.max(0, state.delayRemaining - delta)
      if (state.delayRemaining <= 0) {
        state.isOpening = true
      }
    }

    if (state.isOpening && !state.isOpen) {
      state.openProgress = Math.min(1, state.openProgress + (delta / SCENE1_CONFIG.cartonOpenDuration))
      this._applyCartonBoxDoorPose(state.openProgress)
      if (state.openProgress >= 1) {
        state.isOpen = true
        state.isOpening = false
      }
      return
    }

    this._applyCartonBoxDoorPose(state.openProgress)
  }

  _findTriggeredChestBabyOil(syncList, triggerInfo) {
    for (const entry of syncList) {
      if (!entry?.mesh || !entry?.body) continue
      if (entry.name !== 'Baby Oil' || entry.type !== 'dynamic') continue
      if (entry.body.userData?.isCollectedItem) continue
      if (entry.body.userData?.usedByChest) continue
      if (!this._isPointInsideOrientedBox(entry.mesh.position, triggerInfo, 0.2)) continue
      return entry
    }
    return null
  }

  _beginChestOilSequence(entry, chestInfo) {
    if (!entry?.body || !entry?.mesh || !chestInfo) return false

    entry.body.userData = entry.body.userData || {}
    entry.body.userData.usedByChest = true
    entry.body.userData.isCollectedItem = true
    entry.body.type = CANNON.Body.KINEMATIC
    entry.body.collisionResponse = false
    entry.body.collisionFilterMask = 0
    entry.body.velocity.set(0, 0, 0)
    entry.body.angularVelocity.set(0, 0, 0)

    const latchInfo = this._getChestLatchTargetInfo(chestInfo)
    if (!latchInfo) return false

    const approachPos = latchInfo.target.clone()
      .addScaledVector(latchInfo.up, 0.72)
      .addScaledVector(latchInfo.forward, 0.34)
      .addScaledVector(latchInfo.right, 0.24)

    const pourPos = latchInfo.target.clone()
      .addScaledVector(latchInfo.up, 0.48)
      .addScaledVector(latchInfo.forward, 0.24)
      .addScaledVector(latchInfo.right, 0.16)

    const approachQuat = this._getAlignUpQuaternion(
      latchInfo.target.clone().sub(approachPos),
      entry.mesh.quaternion
    )
    const pourQuat = this._getAlignUpQuaternion(
      latchInfo.target.clone().sub(pourPos),
      approachQuat
    )

    this.chestOilApplyState = {
      entry,
      elapsed: 0,
      duration: SCENE1_CONFIG.chestOilApplyDuration,
      startPos: entry.mesh.position.clone(),
      startQuat: entry.mesh.quaternion.clone(),
      approachPos,
      approachQuat,
      pourPos,
      pourQuat,
      latchTarget: latchInfo.target,
      originalType: entry.body.type,
      originalCollisionResponse: entry.body.collisionResponse,
      originalCollisionFilterMask: entry.body.collisionFilterMask
    }
    return true
  }

  _updateChestOilApplyAnimation(delta) {
    const applyState = this.chestOilApplyState
    if (!applyState) return 'idle'

    const entryAlive = !!(applyState.entry && this.syncList?.includes(applyState.entry) && applyState.entry.mesh && applyState.entry.body)
    if (!entryAlive) {
      this.chestOilApplyState = null
      return 'cancelled'
    }

    const entry = applyState.entry
    const body = entry.body
    const mesh = entry.mesh

    applyState.elapsed += delta
    const t = THREE.MathUtils.clamp(applyState.elapsed / Math.max(applyState.duration, 1e-4), 0, 1)
    const split = 0.58
    let pos
    let quat

    if (t < split) {
      const localT = THREE.MathUtils.smoothstep(t / split, 0, 1)
      pos = this._tmpChestAnimPos.copy(applyState.startPos).lerp(applyState.approachPos, localT)
      pos.y += Math.sin(localT * Math.PI) * 0.18
      quat = this._tmpChestAnimQuat.copy(applyState.startQuat).slerp(applyState.approachQuat, localT)
    } else {
      const localT = THREE.MathUtils.smoothstep((t - split) / (1 - split), 0, 1)
      pos = this._tmpChestAnimPos.copy(applyState.approachPos).lerp(applyState.pourPos, localT)
      pos.addScaledVector(this._tmpChestAnimUp, Math.sin(localT * Math.PI) * 0.06)
      quat = this._tmpChestAnimQuat.copy(applyState.approachQuat).slerp(applyState.pourQuat, localT)
    }

    body.position.set(pos.x, pos.y, pos.z)
    body.quaternion.set(quat.x, quat.y, quat.z, quat.w)
    body.aabbNeedsUpdate = true
    mesh.position.copy(pos)
    mesh.quaternion.copy(quat)

    if (t < 1) return 'running'

    const destroyPos = applyState.latchTarget.clone()
    this._despawnEntry(entry)
    this.chestOilApplyState = null

    if (this.particleManager?.spawn) {
      this.particleManager.spawn('smoke', destroyPos, { count: 3, size: 0.2 })
    }

    return 'completed'
  }

  _updateChestInteraction(syncList, delta) {
    const chest = this._ensureChestEntry()
    if (!chest?.mesh || !Array.isArray(syncList)) return

    if (!this.chestState) {
      this.chestState = {
        triggered: false,
        phase: 'idle',
        latchProgress: 0,
        openProgress: 0,
        isOpen: false
      }
    }

    const oilStatus = this._updateChestOilApplyAnimation(delta)

    const state = this.chestState
    const aggregateInfo = this._getWorldAggregateShapeInfo(chest.mesh) || this._getWorldShapeInfo(chest.mesh)
    const triggerInfo = this._getWorldShapeInfo(chest.mesh, 'chestTrigger') || aggregateInfo
    if (!triggerInfo) return

    if (!state.triggered) {
      this._chestCollectScanAccumulator += delta
      if (this._chestCollectScanAccumulator >= SCENE1_CONFIG.chestCollectScanIntervalSec) {
        this._chestCollectScanAccumulator = 0
        const babyOilEntry = this._findTriggeredChestBabyOil(syncList, triggerInfo)
        if (babyOilEntry && this._beginChestOilSequence(babyOilEntry, aggregateInfo || triggerInfo)) {
          state.triggered = true
          state.phase = 'oiling'
          this._spawnChestGuide(aggregateInfo || triggerInfo)
        }
      }
    }

    if (state.phase === 'oiling' && oilStatus === 'completed') {
      state.phase = 'unlocking'
    }

    if (state.phase === 'unlocking' && !state.isOpen) {
      state.latchProgress = Math.min(1, state.latchProgress + (delta / SCENE1_CONFIG.chestLatchOpenDuration))
      if (state.latchProgress >= 1) {
        state.phase = 'opening'
      }
    }

    if (state.phase === 'opening' && !state.isOpen) {
      state.openProgress = Math.min(1, state.openProgress + (delta / SCENE1_CONFIG.chestOpenDuration))
      this._applyChestLatchPose(state.latchProgress)
      this._applyChestLidPose(state.openProgress)
      if (state.openProgress >= 1) {
        state.isOpen = true
        state.phase = 'open'
      }
      return
    }

    this._applyChestLatchPose(state.latchProgress)
    this._applyChestLidPose(state.openProgress)
  }

  _findNearestCollectableSilverCoin(syncList, targetInfo) {
    if (!Array.isArray(syncList) || !targetInfo) return null

    const triggerInfo = this._getVendingWorldShapeInfo('coinTrigger') || targetInfo
    const detectPadding = triggerInfo?.shape?.role === 'coinTrigger'
      ? 0
      : SCENE1_CONFIG.vendingCollectDetectPadding

    let nearest = null
    let minDistSq = Infinity

    for (const entry of syncList) {
      if (!entry?.mesh || !entry?.body) continue
      if (entry.name !== 'Silver Coin') continue
      if (entry.type !== 'dynamic') continue
      if (entry.body.userData?.isCollectedItem) continue

      if (!this._isPointInsideOrientedBox(entry.mesh.position, triggerInfo, detectPadding)) continue

      const distSq = entry.mesh.position.distanceToSquared(targetInfo.target)
      if (distSq >= minDistSq) continue

      minDistSq = distSq
      nearest = entry
    }

    return nearest
  }

  _beginVendingCoinCollect(entry, targetInfo) {
    if (!entry?.body || !entry?.mesh || !targetInfo) return false

    const body = entry.body
    body.userData = body.userData || {}
    body.userData.isCollectedItem = true
    body.userData.lockedByVending = true

    this.vendingCoinCollectState = {
      entry,
      elapsed: 0,
      duration: SCENE1_CONFIG.vendingCollectDuration,
      arcLift: SCENE1_CONFIG.vendingCollectArcLift,
      startPos: entry.mesh.position.clone(),
      startQuat: entry.mesh.quaternion.clone(),
      targetPos: targetInfo.target.clone(),
      dropPos: (targetInfo.dropTarget || targetInfo.target).clone(),
      targetQuat: targetInfo.mesh.quaternion.clone(),
      originalType: body.type,
      originalCollisionResponse: body.collisionResponse,
      originalCollisionFilterMask: body.collisionFilterMask
    }

    return true
  }

  _updateVendingCoinCollectAnimation(delta) {
    const collectState = this.vendingCoinCollectState
    if (!collectState) return

    const entryStillAlive = !!(collectState.entry && this.syncList?.includes(collectState.entry) && collectState.entry.mesh && collectState.entry.body)
    if (!entryStillAlive) {
      this.vendingCoinCollectState = null
      return
    }

    const entry = collectState.entry
    const body = entry.body
    const mesh = entry.mesh

    collectState.elapsed += delta
    const t = THREE.MathUtils.clamp(collectState.elapsed / Math.max(collectState.duration, 1e-4), 0, 1)

    const curPos = this._tmpVendingAnimPos.copy(collectState.startPos).lerp(collectState.targetPos, t)
    curPos.y += Math.sin(t * Math.PI) * collectState.arcLift

    const curQuat = this._tmpVendingAnimQuat.copy(collectState.startQuat).slerp(collectState.targetQuat, t)

    body.type = CANNON.Body.KINEMATIC
    body.collisionResponse = false
    body.collisionFilterMask = 0
    body.velocity.set(0, 0, 0)
    body.angularVelocity.set(0, 0, 0)
    body.position.set(curPos.x, curPos.y, curPos.z)
    body.quaternion.set(curQuat.x, curQuat.y, curQuat.z, curQuat.w)
    body.aabbNeedsUpdate = true

    mesh.position.copy(curPos)
    mesh.quaternion.copy(curQuat)

    if (t < 1) return

    const destroyPos = collectState.targetPos.clone()
    const vendingDropOrigin = (collectState.dropPos || collectState.targetPos).clone()
    this._despawnEntry(entry)
    this.vendingCoinCollectState = null

    if (this.particleManager?.spawn) {
      this.particleManager.spawn('smoke', destroyPos.clone(), { count: 4, size: 0.35 })
    }

    this._spawnVendingBabyOil(vendingDropOrigin, collectState.targetQuat)
  }

  _getCollisionProfileForDynamicBody(physicsDef, spawnCategory = null) {
    const materialName = physicsDef?.material || 'default'

    if (spawnCategory === 'item' || materialName === 'item') {
      return {
        collisionFilterGroup: COLLISION_GROUPS.ITEM,
        collisionFilterMask: COLLISION_MASKS.ITEM,
        material: 'item'
      }
    }

    if (materialName === 'ball') {
      return {
        collisionFilterGroup: COLLISION_GROUPS.BALL,
        collisionFilterMask: COLLISION_MASKS.BALL,
        material: 'ball'
      }
    }

    return {
      collisionFilterGroup: COLLISION_GROUPS.PLAYER,
      collisionFilterMask: COLLISION_MASKS.PLAYER,
      material: materialName === 'player' ? 'player' : materialName
    }
  }

  _createDynamicBodyFromPhysicsDef(physicsDef, physicsMaterials, options = {}) {
    if (!physicsDef) return null

    const collisionProfile = this._getCollisionProfileForDynamicBody(physicsDef, options.spawnCategory)

    const body = new CANNON.Body({
      mass: physicsDef.mass || 0,
      material: physicsMaterials?.[collisionProfile.material] || physicsMaterials?.[physicsDef.material] || physicsMaterials?.default,
      linearDamping: physicsDef.linearDamping ?? 0.01,
      angularDamping: physicsDef.angularDamping ?? 0.01,
      fixedRotation: !!physicsDef.fixedRotation,
      collisionFilterGroup: collisionProfile.collisionFilterGroup,
      collisionFilterMask: collisionProfile.collisionFilterMask
    })
    body.userData = body.userData || {}
    body.userData.spawnCategory = options.spawnCategory || (collisionProfile.collisionFilterGroup === COLLISION_GROUPS.ITEM ? 'item' : 'gameObject')

    const shapes = Array.isArray(physicsDef.shapes) ? physicsDef.shapes : []
    for (const shapeDef of shapes) {
      if (!shapeDef || shapeDef.isTrigger) continue

      let shape = null
      if (shapeDef.type === 'box' && Array.isArray(shapeDef.size)) {
        const [sx, sy, sz] = shapeDef.size
        shape = new CANNON.Box(new CANNON.Vec3((sx || 1) * 0.5, (sy || 1) * 0.5, (sz || 1) * 0.5))
      } else if (shapeDef.type === 'sphere') {
        shape = new CANNON.Sphere(shapeDef.radius || 0.1)
      } else if (shapeDef.type === 'cylinder') {
        const radiusTop = shapeDef.radiusTop ?? shapeDef.radius ?? 0.1
        const radiusBottom = shapeDef.radiusBottom ?? shapeDef.radius ?? 0.1
        const height = shapeDef.height ?? shapeDef.length ?? 0.2
        shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 12)
      }

      if (!shape) continue

      const offset = shapeDef.offset || [0, 0, 0]
      const quat = new CANNON.Quaternion()
      const rot = shapeDef.rotation || [0, 0, 0]
      quat.setFromEuler(rot[0] || 0, rot[1] || 0, rot[2] || 0, 'XYZ')
      body.addShape(shape, new CANNON.Vec3(offset[0] || 0, offset[1] || 0, offset[2] || 0), quat)
    }

    return body
  }

  _spawnVendingBabyOil(slotWorldPos, vendingQuat) {
    if (!this.spawner || !this.mainScene || !this.world || !this.syncList) return null

    if (!this.vendingBabyOilAsset) {
      this.vendingBabyOilAsset = getBabyOilAsset()
    }
    const babyOilAsset = this.vendingBabyOilAsset
    if (!babyOilAsset?.physics) return null

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(vendingQuat).normalize()
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(vendingQuat).normalize()
    const spawnPos = slotWorldPos.clone()
      .addScaledVector(forward, SCENE1_CONFIG.vendingDropForwardExtra)
      .addScaledVector(up, SCENE1_CONFIG.vendingDropLift)

    const itemPrefab = {
      name: babyOilAsset.name,
      type: 'dynamic',
      spawnCategory: 'item',
      createMesh: () => {
        const mesh = babyOilAsset.factory()
        mesh.userData.shadowConfig = { size: 0.45, opacity: 0.72, fadeRate: 0.75 }
        return mesh
      },
      createBody: (physicsMaterials) => this._createDynamicBodyFromPhysicsDef(babyOilAsset.physics, physicsMaterials, { spawnCategory: 'item' })
    }

    const spawned = this.spawner({
      scene: this.mainScene,
      prefab: itemPrefab,
      position: spawnPos,
      world: this.world,
      physicsMaterials: this.physicsMaterials,
      syncList: this.syncList,
      particleManager: this.particleManager
    })

    if (spawned?.body) {
      spawned.body.userData = spawned.body.userData || {}
      spawned.body.userData.isCollectedItem = false
      const push = forward.clone().multiplyScalar(0.27)
      push.y += 0.19
      spawned.body.velocity.set(push.x, push.y, push.z)
      spawned.body.angularVelocity.set(0, 2.2, 0)
    }

    return spawned || null
  }

  _updateVendingMachineCollector(syncList, delta) {
    if (!Array.isArray(syncList) || syncList.length === 0) return
    if (!this.mainScene || !this.world || !this.spawner) return

    this._updateVendingCoinCollectAnimation(delta)
    if (this.vendingCoinCollectState) return

    this._vendingCollectScanAccumulator += delta
    if (this._vendingCollectScanAccumulator < SCENE1_CONFIG.vendingCollectScanIntervalSec) return
    this._vendingCollectScanAccumulator = 0

    const targetInfo = this._getVendingCollectTarget()
    if (!targetInfo) return

    const coinEntry = this._findNearestCollectableSilverCoin(syncList, targetInfo)
    if (!coinEntry) return

    this._beginVendingCoinCollect(coinEntry, targetInfo)
  }

  _cancelPendingBowlingSpawn() {
    if (this.pendingBowlingSpawnTimer !== null) {
      clearTimeout(this.pendingBowlingSpawnTimer)
      this.pendingBowlingSpawnTimer = null
    }
  }

  _cancelPendingBallSpawnTimers() {
    if (!this.pendingBallSpawnTimers || this.pendingBallSpawnTimers.size === 0) return
    this.pendingBallSpawnTimers.forEach((timerId) => clearTimeout(timerId))
    this.pendingBallSpawnTimers.clear()
  }

  _despawnBowlingBall(reason = '') {
    if (!this.bowlingBallEntry) return false

    this._despawnEntry(this.bowlingBallEntry)
    this.bowlingBallEntry = null
    return true
  }

  _handleDudeTouchTeleport(syncList) {
    if (!syncList || this.teleportCooldown > 0 || this.isInSection2Run) return

    const playerEntry = syncList.find(e => e.name === 'Player' && e.mesh && e.body)
    if (!playerEntry) return

    this._cacheSection1TeleportState(playerEntry)

    const dudes = syncList.filter(e => e.name === 'Dude' && e.mesh)
    for (const dude of dudes) {
      if (this._isDudeTouchingPlayer(dude, playerEntry)) {
        this._cancelPendingBowlingSpawn()
        this._despawnBowlingBall('player teleported to Section 2')
        this._despawnEntry(dude)
        const section2Spawn = new THREE.Vector3(0, 36.1, -84)
        // Teleport bình thường, không dùng cơ chế xoay thêm.
        this._teleportPlayerEntry(playerEntry, section2Spawn, { effectDurationMs: 6000 })
        this.isInSection2Run = true
        this.section2DoorLoadTriggered = false
        this.teleportCooldown = 1.0
        break
      }
    }
  }

  _updateSection2ReturnElevator(syncList, delta) {
    if (!this.isInSection2Run || !syncList) return

    if (!this.section2ReturnElevator) {
      this.section2ReturnElevator = this.sceneGroup.getObjectByName('Section2 Return Elevator')
    }
    if (!this.section2ReturnElevator) return

    const elevator = this.section2ReturnElevator
    const userData = elevator.userData || {}
    const openRadius = userData.openTriggerShape?.radius || 8.0
    const teleportRadius = userData.teleportTriggerShape?.radius || 2.4
    const openRadiusSq = openRadius * openRadius
    const teleportRadiusSq = teleportRadius * teleportRadius
    const animState = userData.animationState || { openProgress: 0, isOpen: false }
    const animCfg = userData.animationConfig || {}
    const duration = Math.max(0.001, animCfg.duration || 1.5)

    const playerEntry = syncList.find(e => e.name === 'Player' && e.mesh && e.body)
    const hasNearbyPlayer = !!playerEntry && playerEntry.mesh.position.distanceToSquared(elevator.position) < openRadiusSq
    const wasClosed = animState.openProgress <= 0.0001

    const step = delta / duration
    if (hasNearbyPlayer) {
      animState.openProgress = Math.min(1, animState.openProgress + step)
    } else {
      animState.openProgress = Math.max(0, animState.openProgress - step)
    }
    animState.isOpen = animState.openProgress >= 0.999
    userData.animationState = animState

    if (!this.section2DoorLoadTriggered && hasNearbyPlayer && wasClosed && animState.openProgress > 0) {
      this._enqueueSectionWarmup('section1', {
        title: 'Loading Section 1',
        forceReload: true
      })
      this.section2DoorLoadTriggered = true
    }

    if (!this.section2ElevatorParts) {
      this.section2ElevatorParts = {
        doorPanel: elevator.children.find(c => c.userData?.isDoorPanel) || null,
        glowPlane: elevator.children.find(c => c.userData?.isGlowPlane) || null,
        envLight: elevator.children.find(c => c.userData?.isEnvironmentLight) || null
      }
    }
    const { doorPanel, glowPlane, envLight: environmentLight } = this.section2ElevatorParts

    if (doorPanel) {
      const slideAxis = animCfg.slideAxis || 'x'
      const slideHalfWidth = animCfg.slideHalfWidth || (3.8 / 2)

      if (slideAxis === 'z') {
        doorPanel.scale.z = 1 - animState.openProgress
        doorPanel.position.z = -animState.openProgress * slideHalfWidth
      } else {
        doorPanel.scale.x = 1 - animState.openProgress
        doorPanel.position.x = -animState.openProgress * slideHalfWidth
      }

      if (doorPanel.material && 'opacity' in doorPanel.material) {
        doorPanel.material.opacity = 0.9 * (1 - animState.openProgress)
      }
    }
    if (glowPlane?.material) {
      glowPlane.material.emissiveIntensity = (animCfg.maxGlowIntensity || 5) * animState.openProgress
    }
    if (environmentLight) {
      environmentLight.intensity = (animCfg.maxEnvironmentLightIntensity || 800) * animState.openProgress
    }

    if (!this.section2ElevatorDisplayPanel) {
      elevator.traverseVisible(child => {
        if (!this.section2ElevatorDisplayPanel && child.userData && typeof child.userData.updateDisplay === 'function') {
          this.section2ElevatorDisplayPanel = child
        }
      })
    }

    const section2Score = this._getSection2PipeBall8DisplayScore()
    if (this.section2ElevatorDisplayPanel?.userData?.updateDisplay) {
      // Section 2 display: 00-05 with red->green interpolation at max 5.
      this.section2ElevatorDisplayPanel.userData.updateDisplay(section2Score, false, 5)
    }

    if (section2Score >= 5 && !this.section2PipeRewardSpawned) {
      const lastPipe = this.section2PipeTunnels?.reduce((best, pipe) => {
        if (!best) return pipe
        const bestIndex = best.userData?.pipeIndex || 0
        const pipeIndex = pipe?.userData?.pipeIndex || 0
        return pipeIndex > bestIndex ? pipe : best
      }, null)
      if (lastPipe) {
        this._spawnSection2PipeReward(lastPipe)
      }
    }

    if (!playerEntry || this.teleportCooldown > 0) return

    const distanceToDoorSq = playerEntry.mesh.position.distanceToSquared(elevator.position)
    if (animState.openProgress > 0.8 && distanceToDoorSq < teleportRadiusSq) {
      this._despawnSection2PipeBalls()
      if (this.section2PipeRewardEntry) {
        const rewardIsCollected = !!this.section2PipeRewardEntry.body?.userData?.isCollectedItem
        if (!rewardIsCollected) {
          this._despawnEntry(this.section2PipeRewardEntry)
        }
        this.section2PipeRewardEntry = null
      }

      const fallbackPos = new THREE.Vector3(0, 6, 0)
      const targetPos = this.section1TeleportPosition ? this.section1TeleportPosition.clone() : fallbackPos
  this._teleportPlayerEntry(playerEntry, targetPos, { effectDurationMs: 4000 })

      this.isInSection2Run = false
      this.section2PipeBall8DestroyedCount = 0
      this.section2PipeRewardSpawned = false
      if (this.section2ElevatorDisplayPanel?.userData?.updateDisplay) {
        this.section2ElevatorDisplayPanel.userData.updateDisplay(0, false, 5)
      }
      this.teleportCooldown = 1.0
    }
  }

  _getSection2PipeBall8DisplayScore() {
    return Math.min(5, Math.max(0, this.section2PipeBall8DestroyedCount))
  }

  _updateSection2PipeBall8Score(syncList) {
    if (!Array.isArray(syncList) || !this.section2SpawnedBall8Entries.length) return

    const previousCount = this.section2SpawnedBall8Entries.length
    this.section2SpawnedBall8Entries = this.section2SpawnedBall8Entries.filter(entry => syncList.includes(entry))
    const removedCount = Math.max(0, previousCount - this.section2SpawnedBall8Entries.length)
    if (removedCount <= 0) return

    this.section2PipeBall8DestroyedCount += removedCount
  }

  _spawnSection2PipeReward(pipeGroup) {
    if (!pipeGroup || this.section2PipeRewardSpawned || !this.spawner || !this.mainScene || !this.world || !this.syncList) return

    const lightStickOffAsset = getLightStickOffAsset()
    if (!lightStickOffAsset?.physics) return

    const rewardPrefab = {
      name: lightStickOffAsset.name,
      type: 'dynamic',
      createMesh: () => {
        const mesh = lightStickOffAsset.factory()
        mesh.userData.shadowConfig = { size: 0.6, opacity: 0.7, fadeRate: 0.8 }
        return mesh
      },
      createBody: (physicsMaterials) => {
        const body = new CANNON.Body({
          mass: lightStickOffAsset.physics.mass || 0,
          material: physicsMaterials?.item || undefined,
          linearDamping: lightStickOffAsset.physics.linearDamping ?? 0.01,
          angularDamping: lightStickOffAsset.physics.angularDamping ?? 0.01,
          fixedRotation: !!lightStickOffAsset.physics.fixedRotation,
          collisionFilterGroup: COLLISION_GROUPS.ITEM,
          collisionFilterMask: COLLISION_MASKS.ITEM
        })

        const shapeDef = lightStickOffAsset.physics.shapes?.[0]
        const radius = shapeDef?.radius || 0.06
        const length = shapeDef?.length || 0.5
        body.addShape(new CANNON.Cylinder(radius, radius, length, 8))
        return body
      }
    }

    const spawnPos = pipeGroup.position.clone()
    spawnPos.x += 1.2
    spawnPos.y += 0.4

    this.spawner({
      scene: this.mainScene,
      prefab: rewardPrefab,
      position: spawnPos,
      world: this.world,
      physicsMaterials: this.physicsMaterials,
      syncList: this.syncList,
      particleManager: this.particleManager
    })

    this.section2PipeRewardEntry = [...this.syncList].reverse().find(entry => entry?.name === 'Light Stick Off') || null
    this.section2PipeRewardSpawned = true
  }

  _ensureSection2ObjectsCached() {
    if (!this.sceneGroup) return

    if (!this.section2DishLights) {
      this.section2DishLights = []
      this.sceneGroup.traverse(child => {
        if (child.userData?.isSection2DishLight) {
          this.section2DishLights.push(child)
        }
      })
    }

    if (!this.section2PipeTunnels) {
      this.section2PipeTunnels = []
      this.sceneGroup.traverse(child => {
        if (child.userData?.isSection2PipeTunnel) {
          this.section2PipeTunnels.push(child)
        }
      })
    }

    if (!this.section2WaterSurfaces) {
      this.section2WaterSurfaces = []
      this.sceneGroup.traverse(child => {
        if (child.userData?.isSection2WaterSurface) {
          this.section2WaterSurfaces.push(child)
        }
      })
    }

    if (!this.section2FloorMesh) {
      this.section2FloorMesh = this.sceneGroup.getObjectByName('Section2 Floor') || null
    }
  }

  _isPlayerInsideSection2(playerEntry) {
    if (!playerEntry?.mesh) return false

    if (!this.section2FloorMesh || !this.section2FloorMesh.geometry?.parameters) {
      // Fallback bounds matching Section 2 defaults.
      const p = playerEntry.mesh.position
      return Math.abs(p.x) <= 5.2 && p.z >= -92 && p.z <= 92 && p.y >= 30 && p.y <= 52
    }

    const p = playerEntry.mesh.position
    const floorPos = this.section2FloorMesh.position
    const floorParams = this.section2FloorMesh.geometry.parameters
    const halfW = (floorParams.width || 8) / 2
    const halfD = (floorParams.depth || 180) / 2

    const inX = Math.abs(p.x - floorPos.x) <= (halfW + 1.2)
    const inZ = Math.abs(p.z - floorPos.z) <= (halfD + 1.2)
    const inY = p.y >= (floorPos.y - 5) && p.y <= (floorPos.y + 17)
    return inX && inZ && inY
  }

  _deactivateSection2Effects(dynamicEntries) {
    this.isInSection2Run = false
    this.section2IsUnderwater = false
    this.section2UnderwaterBlend = 0
    this.section2ReverseCurrentTimer = 0
    this.section2PipeWaterFxTimer = 0

    if (this.section2WaterSurfaces?.length) {
      for (const waterSurface of this.section2WaterSurfaces) {
        const baseY = waterSurface.userData?.baseY ?? waterSurface.position.y
        waterSurface.userData.currentRise = 0
        waterSurface.position.y = baseY
      }
    }

    this._resetSection2WaterPhysics(dynamicEntries)
    this._despawnSection2PipeBalls()
  }

  _getSection2WaterRiseCurve(progress) {
    const t = THREE.MathUtils.clamp(progress, 0, 1)
    const easeInQuad = t * t
    const easeInCubic = t * t * t
    // Blend 2 curves để giữ đoạn đầu rất chậm, gần cửa tăng dần nhanh hơn nhưng không quá gắt.
    return THREE.MathUtils.lerp(easeInQuad, easeInCubic, 0.55)
  }

  _resetSection2WaterPhysics(entries) {
    if (!entries?.length) return

    for (const entry of entries) {
      const body = entry?.body
      const userData = body?.userData
      if (!body || !userData) continue

      if (typeof userData.section2WaterBaseLinearDamping === 'number') {
        body.linearDamping = userData.section2WaterBaseLinearDamping
      }
      if (typeof userData.section2WaterBaseAngularDamping === 'number') {
        body.angularDamping = userData.section2WaterBaseAngularDamping
      }
      userData.section2WaterEffect = 0
      userData.isSection2WaterAffected = false
      userData.section2WaterRecoveryTime = 0
      userData.section2BubbleTrailTimer = 0
    }
  }

  _clampSection2BodyMotion(body, maxSpeed, maxAngularSpeed, maxFallSpeed = null) {
    if (!body) return

    const speed = body.velocity.length()
    if (speed > maxSpeed && speed > 0.0001) {
      body.velocity.scale(maxSpeed / speed, body.velocity)
    }

    if (typeof maxFallSpeed === 'number' && body.velocity.y < -maxFallSpeed) {
      body.velocity.y = -maxFallSpeed
    }

    const spin = body.angularVelocity.length()
    if (spin > maxAngularSpeed && spin > 0.0001) {
      body.angularVelocity.scale(maxAngularSpeed / spin, body.angularVelocity)
    }
  }

  _applySection2WaterPhysics(dynamicEntries, waterLevel, waterRiseCurve, delta, particleManager = null) {
    if (!dynamicEntries?.length) return

    const gravityAbs = Math.abs(this.world?.gravity?.y ?? 9.82)
    const dampingLerp = Math.min(1, delta * 6.2)
    const riseStrength = THREE.MathUtils.lerp(0.9, 1.15, waterRiseCurve)

    for (const entry of dynamicEntries) {
      const body = entry?.body
      if (!body || body.mass <= 0) continue

      body.userData = body.userData || {}
      const userData = body.userData
      if (typeof userData.section2WaterBaseLinearDamping !== 'number') {
        userData.section2WaterBaseLinearDamping = body.linearDamping
      }
      if (typeof userData.section2WaterBaseAngularDamping !== 'number') {
        userData.section2WaterBaseAngularDamping = body.angularDamping
      }

      const baseLinear = userData.section2WaterBaseLinearDamping
      const baseAngular = userData.section2WaterBaseAngularDamping

      // Xấp xỉ độ chìm dựa trên tâm body. Có offset nhỏ để hiệu ứng khởi động mượt khi vừa chạm nước.
      const submergeDepth = waterLevel - body.position.y + 0.14
      const submergeRatio = THREE.MathUtils.clamp(submergeDepth / 1.75, 0, 1)
      const prevWaterEffect = userData.section2WaterEffect || 0
      const waterEffect = THREE.MathUtils.clamp(submergeRatio * riseStrength, 0, 1)
      userData.section2WaterEffect = waterEffect
      userData.section2BubbleTrailTimer = Math.max(0, (userData.section2BubbleTrailTimer || 0) - delta)

      userData.section2WaterRecoveryTime = Math.max(0, (userData.section2WaterRecoveryTime || 0) - delta)
      if (prevWaterEffect > 0.12 && waterEffect < 0.02) {
        userData.section2WaterRecoveryTime = 3.0
      }
      const isInRecovery = userData.section2WaterRecoveryTime > 0

      if (waterEffect <= 0.0001) {
        if (isInRecovery) {
          const recoveryLerp = Math.min(1, delta * 8.5)
          const recoveryLinear = Math.max(baseLinear, 0.52)
          const recoveryAngular = Math.max(baseAngular, 0.84)
          body.linearDamping = THREE.MathUtils.lerp(body.linearDamping, recoveryLinear, recoveryLerp)
          body.angularDamping = THREE.MathUtils.lerp(body.angularDamping, recoveryAngular, recoveryLerp)
          this._clampSection2BodyMotion(body, 6.4, 10.5, 7.2)
        } else {
          body.linearDamping = THREE.MathUtils.lerp(body.linearDamping, baseLinear, dampingLerp)
          body.angularDamping = THREE.MathUtils.lerp(body.angularDamping, baseAngular, dampingLerp)
        }
        userData.isSection2WaterAffected = false
        continue
      }

      userData.isSection2WaterAffected = true

      const targetLinear = THREE.MathUtils.clamp(baseLinear + waterEffect * 0.78, baseLinear, 0.97)
      const targetAngular = THREE.MathUtils.clamp(baseAngular + waterEffect * 0.86, baseAngular, 0.98)
      body.linearDamping = THREE.MathUtils.lerp(body.linearDamping, targetLinear, dampingLerp)
      body.angularDamping = THREE.MathUtils.lerp(body.angularDamping, targetAngular, dampingLerp)

      // Scale vận tốc trực tiếp để cả object bị set velocity mỗi frame (AI/player) vẫn bị nước hãm lại.
      const dragPerSecond = THREE.MathUtils.lerp(0.35, 3.1, waterEffect)
      const dragScale = Math.max(0, 1 - dragPerSecond * delta)
      body.velocity.scale(dragScale, body.velocity)

      const angularDragPerSecond = THREE.MathUtils.lerp(0.5, 3.6, waterEffect)
      const angularDragScale = Math.max(0, 1 - angularDragPerSecond * delta)
      body.angularVelocity.scale(angularDragScale, body.angularVelocity)

      // Chặn tích lũy vận tốc/động năng khi vật lơ lửng lâu trong nước rồi rơi xuống nền.
      const maxSpeed = THREE.MathUtils.lerp(5.2, 3.2, waterEffect)
      const maxAngularSpeed = THREE.MathUtils.lerp(8.5, 4.2, waterEffect)
      const maxFallSpeed = THREE.MathUtils.lerp(6.6, 3.4, waterEffect)
      this._clampSection2BodyMotion(body, maxSpeed, maxAngularSpeed, maxFallSpeed)

      const movementSpeed = body.velocity.length()
      const bubbleThreshold = SCENE1_CONFIG.section2BubbleTrailWaterThreshold
      const minBubbleSpeed = SCENE1_CONFIG.section2BubbleTrailMinSpeed
      if (
        particleManager &&
        waterEffect >= bubbleThreshold &&
        movementSpeed > minBubbleSpeed &&
        userData.section2BubbleTrailTimer <= 0
      ) {
        const direction = new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z)
        if (direction.lengthSq() > 0.0001) {
          direction.normalize()
        }

        const spawnPos = new THREE.Vector3(
          body.position.x,
          body.position.y + 0.2,
          body.position.z
        ).addScaledVector(direction, -0.14)

        const speedNorm = THREE.MathUtils.clamp(movementSpeed / 4.4, 0, 1)
        const waterNorm = THREE.MathUtils.clamp((waterEffect - bubbleThreshold) / (1 - bubbleThreshold), 0, 1)
        const intervalBase = THREE.MathUtils.lerp(
          SCENE1_CONFIG.section2BubbleTrailIntervalSlow,
          SCENE1_CONFIG.section2BubbleTrailIntervalFast,
          speedNorm
        )
        const nextInterval = intervalBase * THREE.MathUtils.lerp(1.05, 0.72, waterNorm)

        particleManager.spawn('underwaterBubbleTrail', spawnPos, {
          direction,
          speed: movementSpeed,
          inheritVelocity: {
            x: body.velocity.x,
            y: body.velocity.y,
            z: body.velocity.z
          },
          count: movementSpeed > 2.6 ? 3 : 2,
          spread: THREE.MathUtils.lerp(0.13, 0.22, speedNorm)
        })

        userData.section2BubbleTrailTimer = nextInterval * (0.86 + Math.random() * 0.28)
      }

      // Diệt trôi nhẹ do rung/collision nhỏ khi vật gần đứng yên dưới nước.
      const horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z)
      if (submergeRatio > 0.35 && horizontalSpeed < 0.42) {
        body.velocity.x = 0
        body.velocity.z = 0
      }
      const spin = body.angularVelocity.length()
      if (submergeRatio > 0.35 && spin < 0.55) {
        body.angularVelocity.set(0, 0, 0)
      }

      // Giảm "trọng lượng hiệu dụng" bằng lực nổi, mạnh dần theo độ ngập và mức nước dâng.
      const buoyancyScale = waterEffect * 0.5
      if (buoyancyScale > 0) {
        // Chỉ đẩy nổi mạnh khi đang đi xuống để tránh tự tăng năng lượng và tự trôi lâu.
        const downwardSpeed = Math.max(0, -body.velocity.y)
        const downwardFactor = THREE.MathUtils.clamp(downwardSpeed / 2.2, 0, 1)
        const upwardForce = body.mass * gravityAbs * buoyancyScale * (0.12 + 0.88 * downwardFactor)
        if (upwardForce > 0.0001) {
          body.applyForce(new CANNON.Vec3(0, upwardForce, 0), body.position)
        }
      }
    }
  }

  _animateSection2WaterSurfaceTexture(waterSurface, delta) {
    const mat = waterSurface?.material
    const map = mat?.map
    const emissiveMap = mat?.emissiveMap
    const bumpMap = mat?.bumpMap
    if (!mat || !map) return

    const flow = waterSurface.userData.flowSpeed
    map.offset.x = (map.offset.x + flow.x * delta) % 1
    map.offset.y = (map.offset.y + flow.y * delta) % 1

    if (emissiveMap) {
      const detailFlow = waterSurface.userData.detailFlowSpeed
      emissiveMap.offset.x = (emissiveMap.offset.x + detailFlow.x * delta) % 1
      emissiveMap.offset.y = (emissiveMap.offset.y + detailFlow.y * delta) % 1
    }

    if (bumpMap) {
      const distortionFlow = waterSurface.userData.distortionFlowSpeed || waterSurface.userData.flowSpeed
      bumpMap.offset.x = (bumpMap.offset.x + distortionFlow.x * delta) % 1
      bumpMap.offset.y = (bumpMap.offset.y + distortionFlow.y * delta) % 1
    }

    waterSurface.userData.waveTime = (waterSurface.userData.waveTime || 0) + delta
    map.rotation = Math.sin(waterSurface.userData.waveTime * 0.48) * 0.082
    if (emissiveMap) {
      emissiveMap.rotation = Math.cos(waterSurface.userData.waveTime * 0.42) * 0.11
    }
    if (bumpMap) {
      bumpMap.rotation = Math.sin(waterSurface.userData.waveTime * 0.85) * 0.22
    }

    if ('emissiveIntensity' in mat) {
      const pulse = 0.42 + Math.sin(waterSurface.userData.waveTime * 1.2) * 0.14
      mat.emissiveIntensity = Math.max(0.24, pulse)
    }
  }

  _updateSection2Water(delta, playerEntry, dynamicEntries = null, particleManager = null) {
    if (!this.section2WaterSurfaces?.length) {
      this._resetSection2WaterPhysics(dynamicEntries)
      return
    }

    const hasPlayer = !!playerEntry?.mesh
    if (!this.section2ReturnElevator && this.sceneGroup) {
      this.section2ReturnElevator = this.sceneGroup.getObjectByName('Section2 Return Elevator')
    }

    let progressToGate = 0
    if (hasPlayer && this.section2ReturnElevator) {
      const gateZ = this.section2ReturnElevator.position.z
      const startZ = this.section2RunStartZ
      const denom = Math.max(0.001, gateZ - startZ)
      progressToGate = THREE.MathUtils.clamp((playerEntry.mesh.position.z - startZ) / denom, 0, 1)
    }
    const waterRiseProgress = this._getSection2WaterRiseCurve(progressToGate)

    const playerHeadY = hasPlayer ? (playerEntry.mesh.position.y + 0.95) : null
    let shouldEnterUnderwater = false
    let shouldExitUnderwater = false
    let highestWaterLevel = -Infinity

    for (const waterSurface of this.section2WaterSurfaces) {
      const mat = waterSurface.material
      const map = mat?.map
      if (!mat || !map) continue

      const baseY = waterSurface.userData?.baseY ?? waterSurface.position.y
      const maxRise = waterSurface.userData?.maxRise ?? 0.9
      const targetRise = waterRiseProgress * maxRise
      const riseLerp = Math.min(1, delta * 1.2)
      const currentRise = waterSurface.userData?.currentRise || 0
      const nextRise = THREE.MathUtils.lerp(currentRise, targetRise, riseLerp)
      waterSurface.userData.currentRise = nextRise
      waterSurface.position.y = baseY + nextRise
      highestWaterLevel = Math.max(highestWaterLevel, waterSurface.position.y)

      this._animateSection2WaterSurfaceTexture(waterSurface, delta)

      if (hasPlayer) {
        const waterLevel = waterSurface.position.y
        // Hysteresis để tránh nhấp nháy/kích sai khi player ở sát mặt nước.
        if (playerHeadY !== null) {
          if (playerHeadY < waterLevel - 0.06) {
            shouldEnterUnderwater = true
          }
          if (playerHeadY > waterLevel + 0.16) {
            shouldExitUnderwater = true
          }
        }
      }
    }

    if (hasPlayer) {
      if (this.section2IsUnderwater) {
        this.section2IsUnderwater = !shouldExitUnderwater
      } else if (shouldEnterUnderwater) {
        this.section2IsUnderwater = true
      }
    } else {
      this.section2IsUnderwater = false
    }

    const underwaterTarget = this.section2IsUnderwater ? 1 : 0

    const underwaterLerp = Math.min(1, delta * 5.8)
    this.section2UnderwaterBlend = THREE.MathUtils.lerp(this.section2UnderwaterBlend, underwaterTarget, underwaterLerp)

    if (isFinite(highestWaterLevel)) {
      this._applySection2WaterPhysics(dynamicEntries, highestWaterLevel, waterRiseProgress, delta, particleManager)
    } else {
      this._resetSection2WaterPhysics(dynamicEntries)
    }
  }

  _setDishLightEnabled(dishGroup, enabled) {
    dishGroup.userData.lightEnabled = enabled
    const pointLight = dishGroup.children.find(c => c.userData?.isDishPointLight)
    const dishMesh = dishGroup.children.find(c => c.userData?.isDishLightMesh)
    const basePointLightIntensity = dishGroup.userData?.basePointLightIntensity || 2.35
    const baseEmissiveIntensity = dishGroup.userData?.baseEmissiveIntensity || 1.6
    const lightColor = dishGroup.userData?.lightColor || '#ffe7bc'

    if (pointLight) {
      pointLight.color.set(lightColor)
      pointLight.intensity = enabled ? basePointLightIntensity : 0
    }
    if (dishMesh?.material) {
      dishMesh.material.emissive.set(lightColor)
      dishMesh.material.emissiveIntensity = enabled ? baseEmissiveIntensity : 0
      dishMesh.material.color.set(enabled ? '#f4f0de' : '#777777')
    }

    if (enabled) {
      dishGroup.userData.isFlickeringOff = false
      dishGroup.userData.flickerTimeRemaining = 0
    }
  }

  _updateSection2DishLightFlicker(lightGroup, delta) {
    const flickerTimeRemaining = lightGroup.userData.flickerTimeRemaining || 0
    if (flickerTimeRemaining <= 0) return false

    const pointLight = lightGroup.children.find(c => c.userData?.isDishPointLight)
    const dishMesh = lightGroup.children.find(c => c.userData?.isDishLightMesh)
    const basePointLightIntensity = lightGroup.userData?.basePointLightIntensity || 2.35
    const baseEmissiveIntensity = lightGroup.userData?.baseEmissiveIntensity || 1.6
    const flickerDuration = lightGroup.userData.flickerDuration || 1.0
    const flickerSeed = lightGroup.userData.flickerSeed || 1

    const nextRemaining = Math.max(0, flickerTimeRemaining - delta)
    lightGroup.userData.flickerTimeRemaining = nextRemaining

    const elapsed = flickerDuration - nextRemaining
    const fade = THREE.MathUtils.clamp(1 - (elapsed / Math.max(0.001, flickerDuration)), 0, 1)
    const signal =
      Math.sin(elapsed * 34 + flickerSeed) * 0.55 +
      Math.sin(elapsed * 79 + flickerSeed * 1.7) * 0.28 +
      Math.sin(elapsed * 123 + flickerSeed * 2.3) * 0.17
    const normalized = THREE.MathUtils.clamp((signal + 1) * 0.5, 0, 1)
    const burst = normalized > 0.56 ? 1 : (0.08 + normalized * 0.34)
    const intensityScale = burst * fade

    if (pointLight) {
      pointLight.intensity = basePointLightIntensity * intensityScale
    }
    if (dishMesh?.material) {
      dishMesh.material.emissiveIntensity = baseEmissiveIntensity * intensityScale
      dishMesh.material.color.lerpColors(
        new THREE.Color('#777777'),
        new THREE.Color('#f4f0de'),
        THREE.MathUtils.clamp(intensityScale * 1.1, 0, 1)
      )
    }

    if (nextRemaining === 0) {
      this._setDishLightEnabled(lightGroup, false)
      lightGroup.userData.wasNearby = true
      return false
    }

    return true
  }

  _updateSection2DishLights(dynamicEntries, delta) {
    if (!this.section2DishLights?.length) return

    for (const lightGroup of this.section2DishLights) {
      if (lightGroup.userData.isFlickeringOff) {
        this._updateSection2DishLightFlicker(lightGroup, delta)
        continue
      }



      const radius = lightGroup.userData?.triggerShape?.radius || 14
      const radiusSq = radius * radius
      const wasNearby = !!lightGroup.userData.wasNearby

      let isNearby = false
      for (const entry of dynamicEntries) {
        if (!entry.mesh) continue
        if (entry.mesh.position.distanceToSquared(lightGroup.position) < radiusSq) {
          isNearby = true
          break
        }
      }

      if (isNearby && !wasNearby) {
        lightGroup.userData.isFlickeringOff = true
        lightGroup.userData.flickerDuration = THREE.MathUtils.randFloat(0.5, 1.5)
        lightGroup.userData.flickerTimeRemaining = lightGroup.userData.flickerDuration
        lightGroup.userData.flickerSeed = Math.random() * Math.PI * 2
      }
      lightGroup.userData.wasNearby = isNearby
    }
  }

  _spawnBall8FromSection2Pipe(spawnPos) {
    if (!this.spawner || !this.world || !this.mainScene || !this.syncList) return

    const spawnWithAsset = (ballAsset) => {
      if (!ballAsset?.physics) return

      const ballPrefab = {
        name: ballAsset.name,
        type: 'dynamic',
        createMesh: () => {
          const mesh = ballAsset.factory()
          mesh.userData.shadowConfig = { size: 1.0, opacity: 0.6, fadeRate: 0.5 }
          return mesh
        },
        createBody: (physicsMaterials) => {
          const ballShape = ballAsset.physics.shapes?.[0]
          const radius = ballShape ? ballShape.radius : 0.25
          const body = new CANNON.Body({
            mass: ballAsset.physics.mass,
            collisionFilterGroup: COLLISION_GROUPS.BALL,
            collisionFilterMask: COLLISION_MASKS.BALL,
            material: physicsMaterials?.ball || undefined,
            linearDamping: ballAsset.physics.linearDamping || 0.1,
            angularDamping: ballAsset.physics.angularDamping || 0.8
          })
          body.addShape(new CANNON.Sphere(radius))
          return body
        }
      }

      this.spawner({
        scene: this.mainScene,
        prefab: ballPrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })

      const ballEntry = this._findLastSpawnedBall(this.syncList)
      if (ballEntry) {
        ballEntry.userData = ballEntry.userData || {}
        ballEntry.userData.ballNumber = 8
        ballEntry.userData.spawnedBySection2Pipe = true
        this.section2SpawnedBall8Entries.push(ballEntry)
      }
    }

    if (this.section2Ball8Asset) {
      spawnWithAsset(this.section2Ball8Asset)
      return
    }

    if (!this.section2Ball8AssetLoading) {
      this.section2Ball8AssetLoading = import('../assets/objects/BallFactory.js').then(module => {
        const assets = module.getBallAssets(this.renderer)
        this.section2Ball8Asset = assets.find(a => a.name === 'Ball 8') || null
      }).catch(err => {

      }).finally(() => {
        this.section2Ball8AssetLoading = null
      })
    }

    this.section2Ball8AssetLoading.then(() => {
      if (this.section2Ball8Asset) {
        spawnWithAsset(this.section2Ball8Asset)
      }
    })
  }

  _updateSection2PipeTriggers(playerEntry) {
    if (!playerEntry?.mesh || !this.section2PipeTunnels?.length) return

    this.section2PipeTunnels.forEach(pipeGroup => {
      const pipeId = pipeGroup.uuid
      const radius = pipeGroup.userData?.pipeTriggerShape?.radius || 20
      const radiusSq = radius * radius
      const isInside = playerEntry.mesh.position.distanceToSquared(pipeGroup.position) < radiusSq
      const wasInside = this.section2PipeInsideMap.get(pipeId) || false

      if (isInside && !wasInside) {
        const spawnPos = pipeGroup.position.clone()
        spawnPos.x += 1.2
        spawnPos.y += 0.4
        this._spawnBall8FromSection2Pipe(spawnPos)
      }

      this.section2PipeInsideMap.set(pipeId, isInside)
    })
  }

  _despawnSection2PipeBalls() {
    if (!this.section2SpawnedBall8Entries.length) return

    this.section2SpawnedBall8Entries.forEach(entry => {
      if (!entry) return
      this._despawnEntry(entry)
    })
    this.section2SpawnedBall8Entries = []
    this.section2PipeInsideMap.clear()
  }

  _updateSection2ReverseCurrentEffect(delta, particleManager) {
    if (!particleManager) return

    const isActive = this.isInSection2Run && this.section2IsUnderwater
    if (!isActive) {
      this.section2ReverseCurrentTimer = 0
      return
    }

    if (!this.section2WaterSurfaces?.length) return
    if (!this.section2ReturnElevator && this.sceneGroup) {
      this.section2ReturnElevator = this.sceneGroup.getObjectByName('Section2 Return Elevator')
    }
    if (!this.section2ReturnElevator) return

    this.section2ReverseCurrentTimer += delta
    const spawnInterval = 0.08
    if (this.section2ReverseCurrentTimer < spawnInterval) return
    this.section2ReverseCurrentTimer = 0

    const waterLevel = this.section2WaterSurfaces[0]?.position?.y ?? 36
    const elevatorPos = this.section2ReturnElevator.position
    const sourceZ = elevatorPos.z - 2.2

    // Band gần nguồn dày và rộng hơn; đi xa thì thưa dần.
    const flowBands = [
      { zStart: 0, zLength: 16, chance: 1.0, xSpread: 6.4, yDepth: 2.4, countMin: 10, countMax: 14, life: 1.7 },
      { zStart: 16, zLength: 26, chance: 0.78, xSpread: 5.8, yDepth: 2.1, countMin: 8, countMax: 11, life: 1.55 },
      { zStart: 42, zLength: 34, chance: 0.55, xSpread: 5.0, yDepth: 1.9, countMin: 6, countMax: 9, life: 1.35 },
      { zStart: 76, zLength: 44, chance: 0.32, xSpread: 4.2, yDepth: 1.6, countMin: 4, countMax: 7, life: 1.15 }
    ]

    flowBands.forEach((band, bandIndex) => {
      if (Math.random() > band.chance) return

      const spawnPos = new THREE.Vector3(
        (Math.random() - 0.5) * band.xSpread,
        (waterLevel - 0.15) - Math.random() * band.yDepth,
        sourceZ - band.zStart - Math.random() * band.zLength
      )

      const spawnCount = Math.floor(THREE.MathUtils.lerp(band.countMin, band.countMax, Math.random()))
      const speedBoost = Math.max(0, 1 - bandIndex * 0.12)

      particleManager.spawn('reverseCurrentFlow', spawnPos, {
        direction: new THREE.Vector3(0, 0, -1),
        spreadX: THREE.MathUtils.lerp(1.5, 0.85, bandIndex / Math.max(1, flowBands.length - 1)),
        spreadY: THREE.MathUtils.lerp(0.8, 0.35, bandIndex / Math.max(1, flowBands.length - 1)),
        spreadZ: THREE.MathUtils.lerp(1.05, 0.55, bandIndex / Math.max(1, flowBands.length - 1)),
        speedMin: 4.8 * speedBoost,
        speedMax: 8.6 * speedBoost,
        count: spawnCount,
        lifetime: band.life,
        color: 0x9fd6ff
      })
    })
  }

  _updateSection2PipeWaterEffects(delta, particleManager) {
    if (!particleManager || !this.section2PipeTunnels?.length || !this.section2WaterSurfaces?.length) return

    this.section2PipeWaterFxTimer += delta
    const spawnInterval = 0.16
    if (this.section2PipeWaterFxTimer < spawnInterval) return
    this.section2PipeWaterFxTimer = 0

    const waterLevel = this.section2WaterSurfaces[0]?.position?.y ?? 36

    this.section2PipeTunnels.forEach((pipeGroup, index) => {
      if (!pipeGroup) return

      const phaseGate = ((index * 0.37) + (performance.now() * 0.0015)) % 1
      if (phaseGate > 0.46) return

      const pipePos = pipeGroup.position
      const emitPos = new THREE.Vector3(
        pipePos.x + 0.68,
        pipePos.y + (Math.random() - 0.5) * 0.28,
        pipePos.z + (Math.random() - 0.5) * 0.58
      )

      const pipeMouthY = pipePos.y
      const isPipeSubmerged = waterLevel >= pipeMouthY - 0.04

      if (isPipeSubmerged) {
        particleManager.spawn('reverseCurrentFlow', emitPos, {
          direction: new THREE.Vector3(0, 0, -1),
          spreadX: 0.6,
          spreadY: 0.18,
          spreadZ: 0.42,
          speedMin: 4.2,
          speedMax: 6.8,
          count: 4,
          lifetime: 0.95,
          color: 0x93d1ff
        })
      } else {
        particleManager.spawn('pipeWaterDrip', emitPos, {
          targetY: waterLevel + 0.02,
          count: 4,
          lifetime: 1.0,
          color: 0x81cfff
        })
      }
    })
  }

  _updateSection2ProximitySystems(syncList, delta, particleManager = null) {
    if (!syncList) return

    const playerEntry = syncList.find(e => e.name === 'Player' && e.mesh && e.body)
    const playerInSection2 = this._isPlayerInsideSection2(playerEntry)

    if (!this.isInSection2Run || !playerInSection2) {
      // Only build the expensive dynamicEntries list when we actually need to clear active effects.
      if (this.section2IsUnderwater || this.section2UnderwaterBlend > 0.001) {
        const dynamicEntries = syncList.filter(entry => entry.body && entry.body.mass > 0 && entry.mesh)
        this._deactivateSection2Effects(dynamicEntries)
      }
      return
    }

    const dynamicEntries = syncList.filter(entry => entry.body && entry.body.mass > 0 && entry.mesh)
    this._ensureSection2ObjectsCached()

    this._updateSection2Water(delta, playerEntry, dynamicEntries, particleManager)
    this._updateSection2PipeWaterEffects(delta, particleManager)
    this._updateSection2ReverseCurrentEffect(delta, particleManager)

    this._updateSection2DishLights(dynamicEntries, delta)

    if (playerEntry) {
      this._updateSection2PipeTriggers(playerEntry)
    }

    this._updateSection2PipeBall8Score(syncList)
  }

  onPenaltyDudeTouchedPlayer() {
    if (this.penaltyDudeTouchedPlayer) return

    if (!this.screenMat) {
      this.screenMat = new ScreenMat(document.body)
    }

    this.penaltyDudeTouchedPlayer = true
    if (this.screenMat) {
      this.screenMat.start(6000, { lowCost: true })
    }
  }

  _updateDudeFogAndPenaltyState(syncList, delta) {
    if (!this.mainScene || !this.mainScene.fog || !(this.mainScene.fog instanceof THREE.Fog)) {
      if (this.screenMat) this.screenMat.update(delta)
      return
    }

    const fog = this.mainScene.fog
    if (!this.baseFogColor) this.baseFogColor = fog.color.clone()
    if (typeof this.baseFogNear !== 'number') this.baseFogNear = fog.near

    const players = syncList.filter(e => e.name === 'Player' && e.mesh)
    const dudes = syncList.filter(e => e.name === 'Dude' && e.mesh)
    const penaltyDudes = dudes.filter(d => d.userData?.isPenaltyDude || d.body?.userData?.isPenaltyDude)

    let nearestDudeDistance = Infinity
    for (const dude of dudes) {
      for (const player of players) {
        const d = dude.mesh.position.distanceTo(player.mesh.position)
        if (d < nearestDudeDistance) nearestDudeDistance = d
      }
    }

    const baseFar = Math.max(5, SCENE1_CONFIG.sunLightBaseFar - (this.totalPhaseChanges * 15))
    if (dudes.length > 0) {
      if (!this.hadDudeLastFrame) {
        this.dudeFogActiveTimer = 0
        this.dudeFogSmoothedDistance = SCENE1_CONFIG.dudeFogMaxDistance
      }

      this.hadDudeLastFrame = true
      this.dudeFogResetTimer = 0
      this.dudeFogActiveTimer += delta

      if (this.dudeFogActiveTimer >= SCENE1_CONFIG.dudeFogStartDelay && isFinite(nearestDudeDistance)) {
        const transitionDuration = Math.max(0.001, SCENE1_CONFIG.dudeFogTransitionDuration)
        const maxDistStep = delta / transitionDuration
        const targetDistance = THREE.MathUtils.clamp(nearestDudeDistance, 0, SCENE1_CONFIG.dudeFogMaxDistance)

        // Smooth distance first so teleport won't snap fog immediately.
        if (this.dudeFogSmoothedDistance < targetDistance) {
          this.dudeFogSmoothedDistance = Math.min(targetDistance, this.dudeFogSmoothedDistance + maxDistStep * SCENE1_CONFIG.dudeFogMaxDistance)
        } else {
          this.dudeFogSmoothedDistance = Math.max(targetDistance, this.dudeFogSmoothedDistance - maxDistStep * SCENE1_CONFIG.dudeFogMaxDistance)
        }

        this.dudeFogTargetBlend = 1 - THREE.MathUtils.clamp(this.dudeFogSmoothedDistance / SCENE1_CONFIG.dudeFogMaxDistance, 0, 1)

        // Then smooth blend toward target.
        const maxStep = delta / transitionDuration
        if (this.dudeFogBlend < this.dudeFogTargetBlend) {
          this.dudeFogBlend = Math.min(this.dudeFogTargetBlend, this.dudeFogBlend + maxStep)
        } else {
          this.dudeFogBlend = Math.max(this.dudeFogTargetBlend, this.dudeFogBlend - maxStep)
        }
      } else {
        this.dudeFogTargetBlend = 0
        this.dudeFogBlend = 0
      }
    } else {
      if (this.hadDudeLastFrame) {
        this.hadDudeLastFrame = false
        this.dudeFogBlendAtDestroy = this.dudeFogBlend
        this.dudeFogResetTimer = SCENE1_CONFIG.dudeFogResetDuration
      }

      this.dudeFogActiveTimer = 0
      this.dudeFogSmoothedDistance = SCENE1_CONFIG.dudeFogMaxDistance
      this.dudeFogTargetBlend = 0
      if (this.dudeFogResetTimer > 0) {
        this.dudeFogResetTimer = Math.max(0, this.dudeFogResetTimer - delta)
        const p = this.dudeFogResetTimer / SCENE1_CONFIG.dudeFogResetDuration
        this.dudeFogBlend = this.dudeFogBlendAtDestroy * p
      } else {
        this.dudeFogBlend = 0
      }
    }

    fog.color.copy(this.baseFogColor).lerp(new THREE.Color(0xffffff), this.dudeFogBlend)
    fog.near = this.baseFogNear
    fog.far = THREE.MathUtils.lerp(baseFar, SCENE1_CONFIG.dudeFogMinFar, this.dudeFogBlend)

    applySection2UnderwaterFog(fog, this.section2UnderwaterBlend)

    if (this.penaltyDudeActive) {
      const player = players[0] || null
      if (player) {
        // Người chơi bị Dude chạm sẽ xử lý bằng teleport rule ở _handleDudeTouchTeleport.
      }

      if (!this.penaltyDudeSpawnPending && penaltyDudes.length === 0) {
        this.penaltyDudeActive = false
        this.penaltyDudeTouchedPlayer = false

        // Resume ball spawn cycle only after Dude despawns
        this.ballBatchIndex = 0
        this.allBallsSpawned = false
        this.currentBatchBalls = []
        this.previousBallNames.clear()
        this.ballSpawningActive = true
        this.currentBatchSpawningComplete = true
        this.section1CeilingLightsEnabled = true
        this._setSection1CeilingLightsState(true)
      }
    }

    if (this.screenMat) this.screenMat.update(delta)
  }

  /**
   * ✨ NEW: Reset ball sequence after wrong destruction order
   * Despawn all current balls and respawn from ball 1
   */
  _triggerBallSequenceReset() {
    if (this.isResetActive) return
    
    this.isResetActive = true
    this.resetTimer = 3000 // 3 seconds in milliseconds
    
    // Despawn all balls in currentBatchBalls
    this.currentBatchBalls.forEach(ballEntry => {
      if (ballEntry && this.destroySystem) {
        this.destroySystem.destroyObject(ballEntry)
      }
    })
    
    // Despawn bowling ball if exists
    if (this.bowlingBallEntry && this.destroySystem) {
      this._despawnBowlingBall('ball sequence reset')
    }
    
    this.currentBatchBalls = []
  }

  /**
   * ✨ NEW: Update reset timer and respawn when ready
   */
  _updateBallResetTimer(delta) {
    if (!this.isResetActive) return
    
    this.resetTimer -= delta * 1000 // Convert delta to milliseconds
    
    if (this.resetTimer <= 0) {
      // Reset timer expired - respawn sequence
      this.isResetActive = false
      this.ballBatchIndex = 0
      this.allBallsSpawned = false
      this.ballSpawningActive = true
      this.section1CeilingLightsEnabled = true
      this._setSection1CeilingLightsState(true)
    }
  }

  /**
   * Reconcile bowling ball reference with syncList.
   * Bowling ball auto-despawns after lifetime and also clears reference when externally destroyed.
   */
  _updateBowlingBallLifetime(syncList) {
    if (!this.bowlingBallEntry) return

    const now = Date.now()
    const despawnAt = this.bowlingBallEntry.userData?.bowlingDespawnAt
    if (typeof despawnAt === 'number' && now >= despawnAt) {
      this._despawnBowlingBall('lifetime expired')
      return
    }
    
    // Check if bowling ball still exists in syncList
    const bowlingStillExists = syncList.includes(this.bowlingBallEntry)
    if (!bowlingStillExists) {
      this.bowlingBallEntry = null
      return
    }
  }

  disableFlickering() {
    this.sceneGroup.children.forEach(child => {
      if (child.userData) {
        child.userData.isFlickering = false
      }
    })
  }

  enableFlickering() {
    this.sceneGroup.children.forEach(child => {
      if (child.userData && child.userData.lightSource) {
        child.userData.isFlickering = true
      }
    })
  }

  setPersonVisible(visible) {
    if (this.personMesh) {
      this.personMesh.visible = visible
    }
  }

  /**
   * Update ball spawning system
   * Spawn next batch only when all balls in current batch have despawned
   */
  _updateBallSpawning(syncList) {
    // ✨ NEW: Don't spawn new balls if reset is active (waiting to respawn)
    if (this.isResetActive || this.penaltyDudeActive) {
      return
    }
    
    if (!this.ballSpawningActive) {
      return
    }

    // Wait for current batch spawning to be scheduled before checking for despaws
    if (!this.currentBatchSpawningComplete) {
      return
    }

    // Check if any balls from current batch still exist in syncList
    const remainingBalls = syncList.filter(e =>
      this.currentBatchBalls.some(b => b.name === e.name)
    )

    // Spawn next batch if:
    // 1. First batch (ballBatchIndex === 0 and currentBatchBalls is empty), OR
    // 2. All balls from current batch have despawned
    const shouldSpawnNext = (this.ballBatchIndex === 0 && this.currentBatchBalls.length === 0) || 
                           (this.currentBatchBalls.length > 0 && remainingBalls.length === 0)
    
    if (shouldSpawnNext) {
      if (this.ballBatchIndex < this.ballSpawnSequence.length) {
        // Still more balls to spawn in sequence
        this._spawnNextBallBatch(syncList)
      } else if (!this.allBallsSpawned) {
        // All regular balls spawned, spawn ball 8 immediately in front of player
        this._spawnBall8(syncList)
        this.allBallsSpawned = true
        this.ballSpawningActive = false
      }
    }
  }

  /**
   * Spawn next batch of 1-3 balls with weighted probabilities (0-5 seconds random delays)
   * Batting pool: 15% → 1 ball, 55% → 2 balls, 30% → 3 balls
   * After non-first batch: Small chance to spawn bowling ball companion
   */
  _spawnNextBallBatch(syncList) {
    if (this.ballBatchIndex >= this.ballSpawnSequence.length) return

    // Mark that we're scheduling spawns for this batch
    this.currentBatchSpawningComplete = false
    
    // Determine batch size with weighted probabilities
    const rand = Math.random()
    let batchSize
    if (rand < 0.15) {
      batchSize = 1  // 15%
    } else if (rand < 0.70) {  // 0.15 + 0.55 = 0.70
      batchSize = 2  // 55%
    } else {
      batchSize = 3  // 30%
    }
    
    this.currentBatchBalls = []
    const isBowlingBallBatch = this.ballBatchIndex > 0 && Math.random() < this.spawnBowlingBallChance && !this.bowlingBallEntry

    let maxBallDelay = 0

    for (let i = 0; i < batchSize && this.ballBatchIndex < this.ballSpawnSequence.length; i++) {
      const ballNumber = this.ballSpawnSequence[this.ballBatchIndex]
      // Random delay 0-5 seconds before spawning each ball
      const delay = Math.random() * 5000
      if (delay > maxBallDelay) maxBallDelay = delay
      const timerId = setTimeout(() => {
        this.pendingBallSpawnTimers.delete(timerId)
        this._spawnSingleBall(ballNumber, syncList)
      }, delay)
      this.pendingBallSpawnTimers.add(timerId)
      this.ballBatchIndex++
    }
    
    // Try to spawn bowling ball companion if conditions are met
    if (isBowlingBallBatch) {
      // Bowling must spawn after all balls in this batch, then wait +1 second.
      const bowlingDelay = maxBallDelay + 1000
      this._cancelPendingBowlingSpawn()
      this.pendingBowlingSpawnTimer = setTimeout(() => {
        this.pendingBowlingSpawnTimer = null
        this._spawnBowlingBall(syncList)
      }, bowlingDelay)
    }
    
    // Mark that all spawns for this batch have been scheduled
    this.currentBatchSpawningComplete = true
  }

  /**
   * Spawn a single ball by number
   */
  _spawnSingleBall(ballNumber, syncList) {
    import('../assets/objects/BallFactory.js').then(module => {
      const ballAssets = module.getBallAssets(this.renderer)
      
      if (!ballAssets || ballAssets.length === 0) {

        return
      }

      // Find asset for this ball number
      const ballAsset = ballAssets.find(a => a.name === `Ball ${ballNumber}`)
      
      if (!ballAsset) {

        return
      }

      // Calculate spawn position - slightly narrower area than typical simulator
      const tableWidth = 20
      const tableDepth = 11
      const shrinkFactor = 0.7 // Narrower spawn area
      const halfW = (tableWidth / 2) * shrinkFactor
      const halfD = (tableDepth / 2) * shrinkFactor
      const x = (Math.random() * 2 - 1) * halfW
      const z = (Math.random() * 2 - 1) * halfD
      
      // Get table top Y position
      const table = this.sceneGroup.getObjectByName("Billiard Table")
      let baseY = 0
      if (table && table.userData && table.userData.tableDimensions && table.userData.tableDimensions.topY) {
        baseY = table.userData.tableDimensions.topY
      }
      
      const spawnPos = new THREE.Vector3(x, baseY + 7, z)

      // Create ball asset object that matches prefab interface
      // Wrap factory to include shadow config for fake shadow system
      const ballPrefab = {
        name: ballAsset.name,
        type: 'dynamic',
        createMesh: () => {
          const mesh = ballAsset.factory()
          // Add shadow config for FakeShadowManager in SimulationTest
          mesh.userData.shadowConfig = { size: 1.0, opacity: 0.6, fadeRate: 0.5 }
          return mesh
        },
        createBody: (physicsMaterials) => {
          // Extract radius from physics shapes definition
          const ballShape = ballAsset.physics.shapes[0]
          const radius = ballShape ? ballShape.radius : 0.25
          
          const body = new CANNON.Body({
            mass: ballAsset.physics.mass,
            collisionFilterGroup: COLLISION_GROUPS.BALL,
            collisionFilterMask: COLLISION_MASKS.BALL,
            material: physicsMaterials?.ball || undefined,  // Use ball physics material
            linearDamping: ballAsset.physics.linearDamping || 0.1,
            angularDamping: ballAsset.physics.angularDamping || 0.8
          })
          body.addShape(new CANNON.Sphere(radius))
          return body
        }
      }

      // Spawn the ball
      this.spawner({
        scene: this.mainScene,
        prefab: ballPrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })

      // Track this ball
      const ballEntry = this._findLastSpawnedBall(syncList)
      if (ballEntry) {
        ballEntry.userData = ballEntry.userData || {}
        ballEntry.userData.ballNumber = ballNumber
        this.currentBatchBalls.push(ballEntry)
        
        // Apply random rotation to the ball
        this._applyRandomRotation(ballEntry)
      }
    }).catch(err => {

    })
  }

  /**
   * Spawn a bowling ball to accompany the ball batch
   * Max 1 bowling ball at a time; auto-despawns after 45-90 seconds
   */
  _spawnBowlingBall(syncList, overrideSpawnPos = null) {
    if (this.isInSection2Run || this.bowlingBallEntry) return

    import('../assets/objects/BallFactory.js').then(module => {
      if (this.isInSection2Run || this.bowlingBallEntry) return

      const ballAssets = module.getBallAssets(this.renderer)
      
      if (!ballAssets || ballAssets.length === 0) {

        return
      }

      // Find Bowling Ball asset from BallFactory
      const bowlingAsset = ballAssets.find(a => a.name === 'Bowling Ball')
      
      if (!bowlingAsset) {

        return
      }

      let spawnPos
      if (overrideSpawnPos) {
        spawnPos = overrideSpawnPos.clone()
      } else {
        // Calculate spawn position - slightly offset from regular spawn area
        const tableWidth = 20
        const tableDepth = 11
        const shrinkFactor = 0.7
        const halfW = (tableWidth / 2) * shrinkFactor
        const halfD = (tableDepth / 2) * shrinkFactor
        const x = (Math.random() * 2 - 1) * halfW * 0.6 // 60% of normal spread
        const z = (Math.random() * 2 - 1) * halfD * 0.6

        // Get table top Y position
        const table = this.sceneGroup.getObjectByName("Billiard Table")
        let baseY = 0
        if (table && table.userData && table.userData.tableDimensions && table.userData.tableDimensions.topY) {
          baseY = table.userData.tableDimensions.topY
        }

        spawnPos = new THREE.Vector3(x, baseY + 7, z)
      }

      // Create bowling ball prefab
      const bowlingPrefab = {
        name: 'BowlingBall_' + Date.now(), // Unique name to avoid conflicts
        type: 'dynamic',
        createMesh: () => {
          const mesh = bowlingAsset.factory()
          mesh.userData.shadowConfig = { size: 1.0, opacity: 0.6, fadeRate: 0.5 }
          mesh.userData.isBowlingBall = true // Mark as bowling ball for tracking
          return mesh
        },
        createBody: (physicsMaterials) => {
          const ballShape = bowlingAsset.physics.shapes[0]
          const radius = ballShape ? ballShape.radius : 0.6
          
          const body = new CANNON.Body({
            mass: bowlingAsset.physics.mass,
            collisionFilterGroup: COLLISION_GROUPS.BALL,
            collisionFilterMask: COLLISION_MASKS.BALL,
            material: physicsMaterials?.ball || undefined,
            linearDamping: bowlingAsset.physics.linearDamping || 0.15,
            angularDamping: bowlingAsset.physics.angularDamping || 0.15
          })
          body.addShape(new CANNON.Sphere(radius))
          return body
        }
      }

      // Spawn the bowling ball
      this.spawner({
        scene: this.mainScene,
        prefab: bowlingPrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })

      // Track this bowling ball
      const bowlingEntry = this._findLastSpawnedBall(syncList)
      if (bowlingEntry) {
        bowlingEntry.userData = bowlingEntry.userData || {}
        bowlingEntry.userData.isBowlingBall = true
        bowlingEntry.userData.ballNumber = 'BOWLING'
        const lifetimeRange = this.bowlingBallLifetimeMaxMs - this.bowlingBallLifetimeMinMs
        const lifeMs = this.bowlingBallLifetimeMinMs + Math.random() * lifetimeRange
        bowlingEntry.userData.bowlingDespawnAt = Date.now() + lifeMs
        this.bowlingBallEntry = bowlingEntry
        
        // Apply random rotation
        this._applyRandomRotation(bowlingEntry)
        // bowling ball spawned
      }
    }).catch(err => {
      console.error('[Scene1Manager] Error loading bowling ball assets:', err)
    })
  }

  /**
   * Spawn ball 8 in front of player
   */
  _spawnBall8(syncList) {
    import('../assets/objects/BallFactory.js').then(module => {
      const ballAssets = module.getBallAssets(this.renderer)
      
      if (!ballAssets || ballAssets.length === 0) {

        return
      }

      const ballAsset = ballAssets.find(a => a.name === 'Ball 8')
      
      if (!ballAsset) {

        return
      }

      // ✨ FIXED: Spawn ball 8 same way as other balls (random position on table)
      // Calculate spawn position - slightly narrower area like other balls
      const tableWidth = 20
      const tableDepth = 11
      const shrinkFactor = 0.7 // Narrower spawn area (same as _spawnSingleBall)
      const halfW = (tableWidth / 2) * shrinkFactor
      const halfD = (tableDepth / 2) * shrinkFactor
      const x = (Math.random() * 2 - 1) * halfW
      const z = (Math.random() * 2 - 1) * halfD
      
      // Get table top Y position
      const table = this.sceneGroup.getObjectByName("Billiard Table")
      let baseY = 0
      if (table && table.userData && table.userData.tableDimensions && table.userData.tableDimensions.topY) {
        baseY = table.userData.tableDimensions.topY
      }
      
      const spawnPos = new THREE.Vector3(x, baseY + 7, z)

      // Create ball prefab object
      // Wrap factory to include shadow config for fake shadow system
      const ballPrefab = {
        name: ballAsset.name,
        type: 'dynamic',
        createMesh: () => {
          const mesh = ballAsset.factory()
          // Add shadow config for FakeShadowManager in SimulationTest
          mesh.userData.shadowConfig = { size: 1.0, opacity: 0.6, fadeRate: 0.5 }
          return mesh
        },
        createBody: (physicsMaterials) => {
          // Extract radius from physics shapes definition
          const ballShape = ballAsset.physics.shapes[0]
          const radius = ballShape ? ballShape.radius : 0.25
          
          const body = new CANNON.Body({
            mass: ballAsset.physics.mass,
            shape: new CANNON.Sphere(radius)
          })
          return body
        }
      }

      // Spawn ball 8
      this.spawner({
        scene: this.mainScene,
        prefab: ballPrefab,
        position: spawnPos,
        world: this.world,
        physicsMaterials: this.physicsMaterials,
        syncList: this.syncList,
        particleManager: this.particleManager
      })

      // Find and apply random rotation to ball 8
      const ball8Entry = this._findLastSpawnedBall(this.syncList)
      if (ball8Entry) {
        // ✨ NEW: Set ballNumber for scoring system
        ball8Entry.userData = ball8Entry.userData || {}
        ball8Entry.userData.ballNumber = 8
        this._applyRandomRotation(ball8Entry)
        
        // ✨ CRITICAL: Add ball 8 to tracking so it can be detected when destroyed
        this.currentBatchBalls.push(ball8Entry)
      }


    }).catch(err => {
      console.error('[Scene1Manager] Error loading ball 8 asset:', err)
    })
  }

  /**
   * Find the last spawned ball in syncList
   */
  _findLastSpawnedBall(syncList) {
    for (let i = syncList.length - 1; i >= 0; i--) {
      const entry = syncList[i]
      if (entry.type === 'dynamic' && entry.name && entry.name.includes('Ball')) {
        return entry
      }
    }
    return null
  }

  /**
   * Apply random rotation to a ball's mesh and body
   * Gives visual/physical rotation when spawned
   */
  _applyRandomRotation(ballEntry) {
    if (!ballEntry) return
    
    // Random rotation using quaternion (smoother than Euler angles)
    const randomX = Math.random() * Math.PI * 2
    const randomY = Math.random() * Math.PI * 2
    const randomZ = Math.random() * Math.PI * 2
    
    // Apply rotation to mesh
    if (ballEntry.mesh) {
      ballEntry.mesh.rotation.set(randomX, randomY, randomZ)
    }
    
    // Apply angular velocity to physics body (optional - makes it spin)
    if (ballEntry.body) {
      // Random angular velocity on each axis
      const angularVelX = (Math.random() - 0.5) * 10
      const angularVelY = (Math.random() - 0.5) * 10
      const angularVelZ = (Math.random() - 0.5) * 10
      
      ballEntry.body.angularVelocity.set(angularVelX, angularVelY, angularVelZ)
    }
  }

  /**
   * ✨ Get the value to display on elevator (either currentScore or countdown value)
   */
  _getElevatorDisplayValue() {
    // If countdown finished, keep displaying 0
    if (this.elevatorCountdownFinished && this.elevatorFinalDisplayValue !== null) {
      return this.elevatorFinalDisplayValue
    }
    
    if (this.elevatorCountdownActive) {
      // During countdown: calculate value from 15 down to 0
      const progress = this.elevatorCountdownTimer / this.elevatorCountdownDuration // 0 to 1
      const countdownValue = Math.max(0, Math.round(15 * (1 - progress)))
      return countdownValue
    }
    return this.currentScore
  }

  /**
   * ✨ NEW: Update elevator door system
   * - Trigger opening when any guy reaches phase 4+
   * - Update display with current ball destruction count (0-14) or countdown (15-0)
   * - Start countdown when score reaches 15
   * - Animate door and interior light
   */
  _updateElevatorDoor(delta, syncList) {
    // Find elevator door if not already cached
    if (!this.elevatorDoor) {
      this.elevatorDoor = this.sceneGroup.getObjectByName('Elevator Door')
    }

    if (!this.elevatorDoor) {
      return
    }

    // ✨ NEW: Start countdown when score reaches 15 (no Guy required)
    if (this.currentScore >= 15 && !this.elevatorCountdownActive) {
      this.elevatorCountdownActive = true
      this.elevatorCountdownTimer = 0
      this._enqueueSectionWarmup('section3', { title: 'Loading Section 3', showReadyOverlay: true })
      console.log(`%c[Elevator] Score 15 reached! Starting 50-second countdown...`, 'color: #00ff88; font-weight: bold')
    }

    // ✨ NEW: Update countdown timer
    if (this.elevatorCountdownActive) {
      this.elevatorCountdownTimer += delta
      if (this.elevatorCountdownTimer >= this.elevatorCountdownDuration) {
        this.elevatorCountdownActive = false
        this.elevatorCountdownTimer = 0
        this.elevatorCountdownFinished = true // Mark as finished
        this.elevatorFinalDisplayValue = 0 // Keep displaying 0
        console.log(`%c[Elevator] Countdown complete! Opening door now...`, 'color: #ffff00; font-weight: bold')
        
        // ✨ FIXED: Open door only when countdown finishes
        if (this.elevatorDoor.userData.animationState) {
          this.elevatorDoor.userData.animationState.isOpening = true
          this.elevatorDoor.userData.animationState.openStartTime = Date.now()
        }
        console.log(`%c[Elevator] Door opening triggered! Countdown finished!`, 'color: #00ddff; font-weight: bold')
      }
    }

    // ✨ NEW: Update display with current score OR countdown value
    const displayValue = this._getElevatorDisplayValue()
    let displayMesh = null
    this.elevatorDoor.traverseVisible(child => {
      if (child.userData && typeof child.userData.updateDisplay === 'function') {
        displayMesh = child
      }
    })
    if (displayMesh && displayMesh.userData.updateDisplay) {
      // Pass countdown flag so display can color accordingly
      displayMesh.userData.updateDisplay(displayValue, this.elevatorCountdownActive)
    }

    // Update door animation directly on the cloned instance
    this._updateElevatorAnimation(delta)
  }

  /**
   * ✨ Update elevator door animation directly on the instance
   */
  _updateElevatorAnimation(delta) {
    if (!this.elevatorDoor || !this.elevatorDoor.userData.animationState) return

    const animState = this.elevatorDoor.userData.animationState
    if (!animState.isOpening) return

    const elapsed = Date.now() - animState.openStartTime
    const durationMs = 1.5 * 1000  // ELEVATOR_CONFIG.animationDuration = 1.5s
    animState.openProgress = Math.min(elapsed / durationMs, 1.0)

    // Find door panel and glow plane
    const doorPanel = this.elevatorDoor.children.find(c => c.userData.isDoorPanel)
    const glowPlane = this.elevatorDoor.children.find(c => c.userData.isGlowPlane)
    const environmentLight = this.elevatorDoor.children.find(c => c.userData.isEnvironmentLight)

    if (doorPanel) {
      // ✨ Ép chiều rộng cửa từ 1 → 0 về một bên (từ phải sang trái)
      doorPanel.scale.z = 1 - animState.openProgress
      // Adjust position to keep left edge fixed, compress from right
      doorPanel.position.z = -animState.openProgress * (3.8 / 2)  // doorWidth = 3.8
      // Also fade out door slightly
      doorPanel.material.opacity = 0.9 * (1 - animState.openProgress)
    }

    if (glowPlane) {
      // Increase glow intensity - glow plane emits light, doesn't cast it
      // Sáng dần từ 0 → 5 khi mở cửa
      glowPlane.material.emissiveIntensity = 5 * animState.openProgress
    }

    // ✨ NEW: Animate environment light (cast light onto surroundings when door opens)
    if (environmentLight) {
      const maxLightIntensity = 800 // ✨ Reduced from 2500 (less bright)
      environmentLight.intensity = maxLightIntensity * animState.openProgress
    }

    // Animation complete
    if (animState.openProgress >= 1.0) {
      animState.isOpening = false
      animState.isOpen = true
    }
  }

  /**
   * ✨ NEW: Check for collision between player and elevator door
   * Detects when player touches the open elevator door
   */
  _checkElevatorDoorCollision(syncList) {
    // Find elevator door if not cached
    if (!this.elevatorDoor) {
      this.elevatorDoor = this.sceneGroup.getObjectByName('Elevator Door')
    }

    if (!this.elevatorDoor) return

    // Check if door is open
    const animState = this.elevatorDoor.userData.animationState
    if (!animState || !animState.isOpen) return

    // Find player in syncList
    const playerEntry = syncList.find(e => e.name === 'Player')
    if (!playerEntry || !playerEntry.mesh) return

    // Get positions
    const playerPos = playerEntry.mesh.position
    const doorPos = this.elevatorDoor.position

    // Calculate distance between player and door center
    const distance = playerPos.distanceTo(doorPos)

    // Collision threshold (door dimensions: width 3.8, height 5.0, depth 0.2)
    // We use a generous collision radius of 3 units
    const collisionRadius = 3.0

    if (distance < collisionRadius && this.teleportCooldown <= 0) {
      const section3Spawn = this._getSection3CenterSpawnPosition(0.85)
      this._teleportPlayerEntry(playerEntry, section3Spawn, { effectDurationMs: 5000 })
      this.teleportCooldown = 1.0

      if (!this.elevatorDoorTouched) {
        this.elevatorDoorTouched = true
        console.log('[Scene1Manager] Section 1 elevator touched: teleported Player to Section 3 center spawn.')
      }

      // Previous completion flow kept for future reuse:
      // if (!this.gameOver) {
      //   this.gameOver = true
      //   this.gameOverReason = 'elevator'
      // }
    } else {
      // Reset flag when player moves away
      this.elevatorDoorTouched = false
    }
  }

  /**
   * ✨ NEW: Called when player is destroyed (despawned)
   */
  onPlayerDestroyed() {
    if (!this.gameOver) {
      this.gameOver = true
      this.gameOverReason = 'death'
    }
  }

  reset() {
    if (this.pendingGuySpawnTimer !== null) {
      clearTimeout(this.pendingGuySpawnTimer)
      this.pendingGuySpawnTimer = null
    }
    if (this.pendingCompuneSpawnTimer !== null) {
      clearTimeout(this.pendingCompuneSpawnTimer)
      this.pendingCompuneSpawnTimer = null
    }
    this._cancelPendingBallSpawnTimers()
    this._cancelPendingBowlingSpawn()
    this._resetSection2WaterPhysics(this.syncList)

    this.flickerTimer = 0
    this.leakTimer = 0
    this.riseProgress = 0
    this.isRetracting = false
    this.ambientLightFlickerTimer = 0
    this.isAmbientFlickering = false
    this.turnOffSection1CeilingAfterFlicker = false
    this.section1CeilingLightsEnabled = true
    this.guyFlickerTimers.clear()
    this.hookedGuyAIs.clear()
    this.totalPhaseChanges = 0
    this.currentAmbientIntensity = this.baseAmbientIntensity
    this.currentFogDensity = this.baseFogDensity
    
    // ✨ NEW: Reset game over state
    this.gameOver = false
    this.gameStartTime = null
    this.gameOverReason = null
    this.gameOverCallback = null
    this.gameOverCallbackTriggered = false
    
    // ✨ Reset elevator door state
    this.elevatorDoor = null
    this.elevatorDoorOpened = false
    this.elevatorDoorPhaseTriggered = false
    this.elevatorCountdownActive = false
    this.elevatorCountdownTimer = 0
    this.elevatorCountdownFinished = false
    this.elevatorFinalDisplayValue = null
    
    // Reset ball spawning state
    this.playerSpawned = false
    this.sceneStartTime = 0
    this.compuneAI = null
    this.compuneMesh = null
    this.ballSpawnStartTime = 0
    this.ballBatchIndex = 0
    this.currentBatchBalls = []
    this.ballSpawningActive = false
    this.allBallsSpawned = false
    this.currentBatchSpawningComplete = true
    this.bowlingBallEntry = null
    
    // ✨ NEW: Reset scoring system
    this.nextExpectedBallIndex = 0
    this.currentScore = 0
    this.resetTimer = 0
    this.isResetActive = false
    this.previousBallNames.clear()

    this.penaltyDudeActive = false
    this.penaltyDudeSpawnPending = false
    this.penaltyDudeTouchedPlayer = false
    this.section2ReturnElevator = null
    this.section1TeleportPosition = null
    this.section1TeleportQuaternion = null
    this.isInSection2Run = false
    this.teleportCooldown = 0
    this.section2DishLights = null
    this.section2PipeTunnels = null
    this.section2WaterSurfaces = null
    this.section2RunStartZ = -84
    this.section2UnderwaterBlend = 0
    this.section2IsUnderwater = false
    this.section2ReverseCurrentTimer = 0
    this.section2PipeWaterFxTimer = 0
    this.section2PipeInsideMap.clear()
    this.section2SpawnedBall8Entries = []
    this.sectionWarmQueue = []
    this.activeSectionWarmJob = null
    if (this.sectionWarmOverlayTimer !== null) {
      clearTimeout(this.sectionWarmOverlayTimer)
      this.sectionWarmOverlayTimer = null
    }
    if (this.sectionWarmOverlay) {
      this.sectionWarmOverlay.close()
      this.sectionWarmOverlay = null
    }
    this.section2DoorLoadTriggered = false
    if (this.debugSection3PlayerEntry) {
      this._despawnEntry(this.debugSection3PlayerEntry)
      this.debugSection3PlayerEntry = null
    }
    this.section2Ball8Asset = null
    this.section2Ball8AssetLoading = null
    this.section2ElevatorParts = null
    this.section2ElevatorDisplayPanel = null
    this.section2PipeBall8DestroyedCount = 0
    this.section2PipeRewardSpawned = false
    this.section2PipeRewardEntry = null
    this._section3HouseScaleRegistry.clear()
    this._section3HouseScaleUpdateAccumulator = 0
    this._section3TreeScaleRegistry.clear()
    this._section3TreeScaleUpdateAccumulator = 0
    this._section3TreeBillboardUpdateAccumulator = 0
    this.section3EdgeDarkness = 0
    this.section3EdgeTeleportCooldown = 0
    this.section3EdgeOverMaxTimer = 0
    this.section3EdgeDarkHoldTimer = 0
    this.section3EdgeRecoveryTimer = 0
    this.section3EdgeRecoveryStartDarkness = 0
    this._section3PlatformBoundsCache = null
    this.section3EyeBot = null
    this.dudeFogBlend = 0
    this.dudeFogSmoothedDistance = SCENE1_CONFIG.dudeFogMaxDistance
    this.dudeFogTargetBlend = 0
    this.dudeFogBlendAtDestroy = 0
    this.dudeFogActiveTimer = 0
    this.dudeFogResetTimer = 0
    this.hadDudeLastFrame = false
    this.vendingMachineEntry = null
    this.vendingCoinCollectState = null
    this.vendingBabyOilAsset = null
    this.cartonBoxEntry = null
    this.cartonBoxState = null
    this.cartonDummyAsset = null
    this.cartonDummyEntry = null
    this.chestEntry = null
    this.chestState = null
    this.chestGuideAsset = null
    this.chestGuideEntry = null
    this.chestOilApplyState = null
    this.sequenceSilverCoinAsset = null
    this.correctOrderedBallsSinceLastCoin = 0
    
    // ✨ NEW: Reset sweat effects
    this.activeSweatEffects = []
    this.lastEnterPressTime = 0

    if (this.particleManager?.clearTransientEffects) {
      this.particleManager.clearTransientEffects()
    }
    if (this.particleManager?.clearAllVeins) {
      this.particleManager.clearAllVeins()
    }
    if (this.particleManager?.clearAllItemArrows) {
      this.particleManager.clearAllItemArrows()
    }
    
    if (this.personMesh) {
      this.personMesh.position.y = this.targetY
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = this.baseAmbientIntensity
    }
    if (this.mainScene && this.mainScene.fog) {
      this.mainScene.fog.density = this.baseFogDensity
      this.mainScene.fog.near = this.baseFogNear
      if (this.baseFogColor) {
        this.mainScene.fog.color.copy(this.baseFogColor)
      }
    }

    if (this.screenMat) {
      this.screenMat.stop()
    }
  }
}
