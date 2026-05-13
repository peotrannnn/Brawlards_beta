// --- GLOBAL CLEANUP FOR UI AND STATE ---
function cleanupAllUIAndState() {
  try {
    if (window.uiManager && typeof window.uiManager.dispose === 'function') window.uiManager.dispose();
  } catch {}
  try {
    if (typeof controlGuideUI !== 'undefined' && controlGuideUI && typeof controlGuideUI.cleanup === 'function') controlGuideUI.cleanup();
  } catch {}
  try {
    if (typeof compuneAIControllers !== 'undefined') compuneAIControllers?.forEach(compuneAI => compuneAI.cleanup?.());
    compuneAIControllers?.clear?.();
  } catch {}
  try {
    if (typeof guideAIControllers !== 'undefined') guideAIControllers?.forEach(guideAI => guideAI.dispose?.());
    guideAIControllers?.clear?.();
  } catch {}
  try {
    if (typeof bowlingAIControllers !== 'undefined') bowlingAIControllers?.forEach(ai => ai.dispose?.());
    bowlingAIControllers?.clear?.();
  } catch {}
  try {
    if (typeof pauseMenuScreen !== 'undefined' && pauseMenuScreen && typeof pauseMenuScreen.destroy === 'function') pauseMenuScreen.destroy();
  } catch {}
  try {
    if (typeof gameOverScreen !== 'undefined' && gameOverScreen && typeof gameOverScreen.destroy === 'function') gameOverScreen.destroy();
  } catch {}
  try {
    if (typeof settingsMenuScreen !== 'undefined' && settingsMenuScreen && typeof settingsMenuScreen.destroy === 'function') settingsMenuScreen.destroy();
  } catch {}
  try {
    if (typeof deathWisdomOverlay !== 'undefined' && deathWisdomOverlay && typeof deathWisdomOverlay.hide === 'function') deathWisdomOverlay.hide();
  } catch {}
  // Remove any stray overlays
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.settings-screen-overlay, .pause-menu-overlay, .gameover-screen-overlay, .control-guide-ui, .compune-dialog-ui, .death-wisdom-overlay').forEach(el => el.remove());
  }
}
// --- PRELOAD & COMPILE SCREEN MAT (hiệu ứng chuyển cảnh) ---
let screenMatMesh = null;
if (typeof createScreenMatMesh === 'function') {
  screenMatMesh = createScreenMatMesh();
  screenMatMesh.visible = false;
  scene.add(screenMatMesh);
  // Render ẩn 1 frame để ép compile shader
  renderer.render(scene, cameraController.camera);
  scene.remove(screenMatMesh);
}
// Đảm bảo screen mat đã được warmup trước khi teleport
if (typeof createScreenMatMesh === 'function' && !screenMatMesh) {
  screenMatMesh = createScreenMatMesh();
  screenMatMesh.visible = false;
  scene.add(screenMatMesh);
  renderer.render(scene, cameraController.camera);
  scene.remove(screenMatMesh);
}
import * as THREE from "three"
import * as CANNON from "cannon-es"
import { createAllGameObjects } from "../gameObjects/temp.js"
import { ThirdPersonCameraController } from "../camera/camera3rdPerson.js"
import { UIManager } from "../ui/UIManager.js"
import { ControlGuideUI } from "../ui/ControlGuideUI.js"
import { SCENE1_CONTROL_GUIDES } from "../assets/scenes/scene1Dialogs.js"
import { GameOverScreen } from "../ui/GameOverScreen.js"
import { DeathWisdomOverlay } from "../ui/DeathWisdomOverlay.js"
import { PauseMenuScreen } from "../ui/PauseMenuScreen.js"
import { createSettingsScreen } from "../ui/SettingsMenuScreen.js"
import { UI_THEME } from "../ui/uiTheme.js"
import { PlayerMovementController } from "../playerMovement/playerMovement.js"
import { CharacterController } from "../playerMovement/characterController.js"
import { GuyAI } from "../AI/guyBot.js"
import { DudeAI } from "../AI/dudeBot.js"
import { GuideAI } from "../AI/guideBot.js"
import { DummyAI } from "../AI/dummyBot.js"
import { Ball8AI } from "../AI/ball8Bot.js"
import { BowlingAI } from "../AI/bowlingBot.js"
import { CompuneAI } from "../AI/compuneBot.js"
import { SIMULATOR_COMPUNES } from "../assets/scenes/simulatorDialogs.js"
import { setupContactMaterials, COLLISION_GROUPS, COLLISION_MASKS } from "../physics/physicsHelper.js"
import { setupSceneLighting, FakeShadowManager } from "../lights/createLights.js"
import { CollisionManager } from "../utils/collisionManager.js"
import { spawnObject as spawnerSpawn, spawnRandom as spawnerSpawnRandom, randomPositionAboveTable, clearAllObjectPools } from "../utils/spawner.js"
import { PhysicsEventManager } from "../utils/physicsEventManager.js"
import { DestroySystem } from "../utils/destroy.js"
import { ParticleManager } from "../utils/particleManager.js"
import { sceneAssets } from "../assets/sceneAssets.js"
import { Scene1Manager } from "../sceneManager/Scene1Manager.js"
import { musicPlayer } from "../music/MusicPlayer.js"
import { playSound3 } from "../sounds/sound3.js"
import { primeSound2Audio } from "../sounds/sound2.js"
import { primeSound3Audio } from "../sounds/sound3.js"
import { primeSound4Audio } from "../sounds/sound4.js"
import { primeSound6Audio } from "../sounds/sound6.js"
import { primeSound7Audio } from "../sounds/sound7.js"
import { primeSound8Audio } from "../sounds/sound8.js"
import { primeSound9Audio } from "../sounds/sound9.js"
import { primeSound12Audio } from "../sounds/sound12.js"
import { primeSound13Audio } from "../sounds/sound13.js"
import { primeSound14Audio } from "../sounds/sound14.js"
import { primePipeSoundAudio } from "../sounds/pipeSound.js"
import { getGraphicsQualityProfile } from "./graphicsQuality.js"
import { settingsManager } from "./SettingsManager.js"

// ==================== CONFIGURATION ====================
const SIMULATION_CONFIG = {
  fixedTimeStep: 1 / 60,
  maxSubSteps: 5,
  solverIterations: 12,
  spawnRateMs: 1200,
  maxObjectsInScene: 30,
  bowlingLifetimeMinMs: 45000,
  bowlingLifetimeMaxMs: 90000,
  floorGuardProbeAbove: 0.7,
  floorGuardProbeBelow: 2.2,
  floorGuardRecoveryDrop: 0.8,
  floorGuardRecoveryHorizontalDrift: 0.75,
}

const RENDER_PERF_CONFIG = {
  maxDevicePixelRatio: 2.0,
  minScale: 0.25,
  maxScale: 1.0,
  downshiftFps: 25,
  upshiftFps: 35,
  sampleWindowSec: 1.0,
  adjustCooldownSec: 0.1,
  scaleStepDown: 0.2,
  scaleStepUp: 0.1,
  startupDurationSec: 2.0,
  startupScale: 0.8,
  startupMaxScale: 1.0
}

const DEATH_WISDOM_DIALOG_DELAY_MS = 5000

// ==================== MAIN EXPORT ====================
export function startSimulationTest(renderer, onBack, gameplayMode = false, sceneIndex = 0, options = {}) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"
  if (!gameplayMode) {
    void musicPlayer.requestSilence({ fadeOutSec: 1.1 })
  }
  let basePixelRatio = Math.min(window.devicePixelRatio || 1, RENDER_PERF_CONFIG.maxDevicePixelRatio)
  // ==================== CONTROL GUIDE UI ====================
  const controlGuideUI = new ControlGuideUI()
  let controlGuideState = { phase: 0 }

  // Synchronize with global settings
  const syncWithSettings = (settings) => {
    const qualityProfile = getGraphicsQualityProfile(settings.quality || 'high')
    const allowShadows = Boolean(settings.shadows) && qualityProfile.allowShadows

    // 1. Shadows
    renderer.shadowMap.enabled = allowShadows
    if (lightController && typeof lightController.toggleShadows === 'function') {
      lightController.toggleShadows(allowShadows)
    }
    if (lightController && typeof lightController.updateShadowSettings === 'function') {
      lightController.updateShadowSettings({ mapSize: qualityProfile.shadowMapSize })
    }
    if (fakeShadowManager && typeof fakeShadowManager.setEnabled === 'function') {
      fakeShadowManager.setEnabled(qualityProfile.allowFakeShadows !== false)
      if (qualityProfile.allowFakeShadows !== false) {
        syncList.forEach(entry => {
          if (entry?.type === 'dynamic' && entry.mesh && entry.mesh.userData?.shadowConfig) {
            fakeShadowManager.addShadow(entry.mesh, entry.mesh.userData.shadowConfig)
          }
        })
      }
    }
    if (particleManager && typeof particleManager.applyQualityProfile === 'function') {
      particleManager.applyQualityProfile(qualityProfile)
    }

    // 2. Resolution / Quality presets
    RENDER_PERF_CONFIG.maxDevicePixelRatio = qualityProfile.maxDevicePixelRatio
    RENDER_PERF_CONFIG.minScale = qualityProfile.gameplayMinScale
    RENDER_PERF_CONFIG.maxScale = qualityProfile.gameplayMaxScale
    RENDER_PERF_CONFIG.startupScale = qualityProfile.gameplayStartupScale
    RENDER_PERF_CONFIG.startupMaxScale = qualityProfile.gameplayStartupMaxScale
    basePixelRatio = Math.min(window.devicePixelRatio || 1, RENDER_PERF_CONFIG.maxDevicePixelRatio)

    if (typeof renderScale !== 'undefined') {
      const clampedCurrentScale = Math.max(RENDER_PERF_CONFIG.minScale, Math.min(RENDER_PERF_CONFIG.maxScale, renderScale))
      renderScale = qualityProfile.gameplayMaxScale < clampedCurrentScale
        ? qualityProfile.gameplayMaxScale
        : Math.max(clampedCurrentScale, qualityProfile.gameplayStartupScale)
      if (typeof applyRenderResolution === 'function') applyRenderResolution(true)
    }
  }

  // ==================== PERFORMANCE OVERLAY (Simulation only) ====================
  let perfOverlay = null
  let lastPerfStats = {
    // --- Simulation config ---
    fixedTimeStep: SIMULATION_CONFIG.fixedTimeStep,
    spawnRateMs: SIMULATION_CONFIG.spawnRateMs,
    maxObjects: SIMULATION_CONFIG.maxObjectsInScene,
    bowlingLifeMin: SIMULATION_CONFIG.bowlingLifetimeMinMs,
    bowlingLifeMax: SIMULATION_CONFIG.bowlingLifetimeMaxMs,
    // --- Render config ---
    maxDevicePixelRatio: RENDER_PERF_CONFIG.maxDevicePixelRatio,
    minScaleCfg: RENDER_PERF_CONFIG.minScale,
    maxScaleCfg: RENDER_PERF_CONFIG.maxScale,
    downshiftFps: RENDER_PERF_CONFIG.downshiftFps,
    upshiftFps: RENDER_PERF_CONFIG.upshiftFps,
    scaleStepDown: RENDER_PERF_CONFIG.scaleStepDown,
    scaleStepUp: RENDER_PERF_CONFIG.scaleStepUp,
    // --- Scene/asset ---
    sceneName: '--',
    assetName: '--',
    prefabCount: '--',
    dynamicPrefabCount: '--',
    staticPrefabCount: '--',
    kinematicPrefabCount: '--',
    // --- Object counts ---
    syncDynamic: '--',
    syncStatic: '--',
    syncKinematic: '--',
    sceneBodies: '--',
    // --- UI state ---
    helpVisible: '--',
    spawnMenuVisible: '--',
    pauseMenuVisible: '--',
    gameOverVisible: '--',
    // --- System state ---
    particleCount: '--',
    shadowCount: '--',
    physicsEventCount: '--',
    // --- Table info ---
    tableColor: '--',
    tableSize: '--',
    // --- Portal/trigger ---
    portalCount: '--',
    triggerCount: '--',
    // --- Player ---
    playerAlive: '--',
    playerTime: '--',
    playerSpawn: '--',
    playerDestroy: '--',
    // --- Light/fog/camera ---
    fogType: '--',
    lightCount: '--',
    shadowMapSize: '--',
    cameraDist: '--',
    spectator: '--',
    section: '--',
    phase: '--',
    moveState: '--',
    pointerLock: '--',
    controlEnabled: '--',
    aiGuy: '--',
    aiDude: '--',
    aiGuide: '--',
    aiDummy: '--',
    aiBall8: '--',
    aiBowling: '--',
    aiCompune: '--',
    sectionKey: '--',
    phaseGuy: '--',
    lastEvent: '--',
    fps: '--',
    frameTime: '--',
    objectCount: '--',
    drawCalls: '--',
    triangles: '--',
    geometries: '--',
    textures: '--',
    jsHeap: '--',
    jsHeapUsed: '--',
    jsHeapTotal: '--',
    devicePixelRatio: '--',
    renderScale: '--',
    startupPerfTimer: '--',
    perfAdjustCooldownSec: '--',
    minScale: '--',
    maxScale: '--',
    sampleWindowSec: '--',
    adjustCooldownSec: '--',
    cameraPos: '--',
    cameraTarget: '--',
    possessed: '--',
    worldBodies: '--',
    memoryJS: '--',
    memoryTotal: '--',
    memoryUsed: '--',
    time: '--',
    userAgent: '--',
    platform: '--',
    screen: '--',
    window: '--',
    location: '--',
    url: '--',
    // Thêm các trường khác nếu cần
  }
  if (!gameplayMode) {
    perfOverlay = document.createElement('div')
    perfOverlay.id = 'simulationPerfOverlay'
    perfOverlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 220px;
      max-width: 520px;
      background: ${UI_THEME.controlGuide.background};
      border: 2px solid ${UI_THEME.controlGuide.border};
      border-radius: 0;
      color: ${UI_THEME.controlGuide.text};
      font-size: 9.5px;
      font-family: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: 300;
      z-index: 10001;
      box-shadow: ${UI_THEME.controlGuide.shadow};
      pointer-events: none;
      user-select: none;
      text-align: left;
      letter-spacing: 0.5px;
      line-height: 1.18;
      padding: 6px 10px 6px 10px;
      white-space: normal;
      word-break: break-all;
      margin: 0;
    `
    perfOverlay.innerText = 'FPS: --';
    document.body.appendChild(perfOverlay)
  }
  let shootDialogShown = false
  let itemDialogShown = false

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)
  let cleanupFn = null

  // Back button
  if (!gameplayMode) {
    const backButton = document.createElement("button")
    backButton.id = "simulationBackButton"
    backButton.innerText = "Back to Menu"
    backButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      background: ${UI_THEME.dangerButton.background};
      color: ${UI_THEME.dangerButton.text};
      border: 2px solid ${UI_THEME.dangerButton.border};
      border-radius: 0;
      padding: 8px 16px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: ${UI_THEME.dangerButton.shadow};
      transition: all 0.3s ease;
    `
    backButton.onmouseover = () => {
      backButton.style.boxShadow = UI_THEME.dangerButton.hoverShadow
      backButton.style.transform = 'scale(1.05)'
    }
    backButton.onmouseout = () => {
      backButton.style.boxShadow = UI_THEME.dangerButton.shadow
      backButton.style.transform = 'scale(1)'
    }
    backButton.onclick = () => {
      if (cleanupFn) cleanupFn();
      cleanupAllUIAndState();
      onBack();
    }
    document.body.appendChild(backButton)
  }

  const fakeShadowManager = new FakeShadowManager(scene)

  // ==================== SCENE ASSET SPAWNER ====================
  function spawnSceneAsset(asset) {
    if (particleManager && typeof particleManager.clearAllVeins === 'function') {
      particleManager.clearAllVeins()
    }

    const previousEntries = [...syncList]
    previousEntries.forEach(entry => {
      CollisionManager.removeHitboxForObject(entry)
    })

    syncList.forEach(entry => {
      if (entry.body) world.removeBody(entry.body)
      scene.remove(entry.mesh)
    })
    syncList.length = 0
    characterControllers.clear()
    guyAIControllers.clear()
    dudeAIControllers.clear()
    guideAIControllers.forEach(guideAI => {
      if (guideAI && typeof guideAI.dispose === 'function') guideAI.dispose()
    })
    guideAIControllers.clear()
    dummyAIControllers.clear()
    ball8AIControllers.clear()
    bowlingAIControllers.forEach(ai => {
      if (ai && typeof ai.dispose === 'function') ai.dispose()
    })
    bowlingAIControllers.clear()
    compuneAIControllers.forEach(compuneAI => compuneAI.cleanup())
    compuneAIControllers.clear()
    destroySystem.resetCharacterDestroyState()
    fakeShadowManager.clearAll()

    sceneBodies.forEach(b => world.removeBody(b))
    sceneBodies.length = 0

    const oldLights = scene.children.filter(c => c.isLight)
    oldLights.forEach(l => scene.remove(l))
    scene.fog = null

    if (currentSceneGroup) scene.remove(currentSceneGroup)

    currentSceneGroup = asset.factory()
    scene.add(currentSceneGroup)
    particleManager.setGroundObjects(currentSceneGroup.children)
    fakeShadowManager.setGroundObjects(currentSceneGroup.children)

    if (currentSceneGroup.userData.applyLighting) {
      try {
        lightController = currentSceneGroup.userData.applyLighting(scene, renderer)
      } catch (err) {
        console.error('Error applying scene lighting:', err)
        lightController = setupSceneLighting(scene, renderer, {
          fogType: 'none',
          fogColor: 0x111111,
          shadows: settingsManager.get('shadows'),
          shadowMapSize: 2048,
          shadowBias: -0.0001,
          directionalLight: {
            color: 0xfff5d1,
            intensity: 2.5,
            position: [15, 25, 15],
            castShadow: true,
          },
          pointLights: [],
          spotLights: [],
          helpers: false,
        })
      }
      syncWithSettings(settingsManager.getAll())
    }

    // Person trigger
    const personMesh = currentSceneGroup.getObjectByName("Person")
    if (personMesh && personMesh.userData.triggerShape) {
      const triggerDef = personMesh.userData.triggerShape
      const shape = new CANNON.Sphere(triggerDef.radius)
      shape.collisionResponse = 0
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC })
      const personHeight = 4
      const bodyPosition = personMesh.position.clone().setY(personMesh.position.y + personHeight / 2)
      body.position.copy(bodyPosition)
      body.addShape(shape)
      world.addBody(body)
      syncList.push({ body, mesh: null, name: 'PersonTrigger', type: 'static' })
    }

    if (cameraController.getTarget()) {
      cameraController.focus(currentSceneGroup)
    }

    // Scene manager init
    if (currentSceneManager) {
      currentSceneManager.reset()
      currentSceneManager = null
    }

    if (asset.name === "Pilot Room") {
      currentSceneManager = new Scene1Manager(currentSceneGroup, destroySystem, scene)

      const sceneMusicCallbacks = {
        onSectionChange: (sectionId, musicOptions = {}) => {
          if (!currentSceneManager) return
          void musicPlayer.requestSection(sectionId, musicOptions)
        },
        onGuySpawned: () => {
          void musicPlayer.requestGuy({ immediate: true })
        },
        onGuyCleared: (sectionId) => {
          if (!currentSceneManager || currentSceneManager.gameOver) return
          void musicPlayer.requestSection(sectionId, { immediate: false })
        },
        onBlackout: () => {
          void musicPlayer.requestSilence({ fadeOutSec: 1.2 })
        },
      }

      if (gameplayMode) {
        gameOverScreen = new GameOverScreen(asset.name, 0, onBack, cameraController)
        currentSceneManager.setGameOverCallback(async (reason, completionTime, detail) => {
          isDeathFlowPending = true
          isResumeRequested = false
          if (pauseMenuScreen && pauseMenuScreen.isVisible) {
            pauseMenuScreen.hide()
          }
          const clickOverlay = document.getElementById('simClickResumeOverlay')
          if (clickOverlay) clickOverlay.style.display = 'none'
          compuneAIControllers.forEach(compuneAI => {
            if (compuneAI?.closeDialog) compuneAI.closeDialog()
          })
          if (cameraController?.disableControl) {
            cameraController.disableControl()
          }
          if (reason !== 'elevator') {
            void musicPlayer.requestSilence({ fadeOutSec: 0.2 })
          }
          const resolvedDetail = detail || (reason === 'elevator' ? 'elevator_clean' : 'default')
          await new Promise(resolve => window.setTimeout(resolve, DEATH_WISDOM_DIALOG_DELAY_MS))
          await ensureDeathWisdomOverlay().present({ endingDetail: resolvedDetail })
          const sceneName = reason === 'elevator' ? `${asset.name} - COMPLETED` : `${asset.name} - FAILED`
          gameOverScreen.sceneName = sceneName
          gameOverScreen.completionTime = completionTime
          gameOverScreen.reason = reason
          gameOverScreen.show()
          // Ensure all UI is cleaned up after game over
          cleanupAllUIAndState();
          // --- Ensure cleanup on window unload (safety net) ---
          if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', cleanupAllUIAndState);
          }
        })
        // Ensure main game elevator logic is NOT in simulation mode
        if (typeof currentSceneManager.setSimulationMode === 'function') {
          currentSceneManager.setSimulationMode(false)
        }
        if (typeof currentSceneManager.setMusicCallbacks === 'function') {
          currentSceneManager.setMusicCallbacks(sceneMusicCallbacks)
        }
      } else {
        // Simulation mode: allow elevator to open with L key
        if (typeof currentSceneManager.setSimulationMode === 'function') {
          currentSceneManager.setSimulationMode(true)
        }
        if (typeof currentSceneManager.setMusicCallbacks === 'function') {
          currentSceneManager.setMusicCallbacks(sceneMusicCallbacks)
        }
      }

      const guyAsset = objects.find(obj => obj.name === 'Guy')
      if (guyAsset) {
        currentSceneManager.initializeSpawning(
          (args) => spawnerSpawn({ ...args, fakeShadowManager, listenerPosition: camera.position }),
          guyAsset, world, physicsMaterials, syncList,
          particleManager, SIMULATION_CONFIG, renderer
        )
      }

      // Portal doors
      const door1Asset = objects.find(o => o.name === 'Door (Portal 1)')
      const door2Asset = objects.find(o => o.name === 'Door (Portal 2)')

      if (door1Asset && door2Asset) {
        const door1Mesh = door1Asset.createMesh()
        door1Mesh.position.set(-15, -2, 10)
        const door1Body = door1Asset.createBody(physicsMaterials)
        door1Body.position.copy(door1Mesh.position)
        scene.add(door1Mesh)
        world.addBody(door1Body)

        const door2Mesh = door2Asset.createMesh()
        door2Mesh.position.set(15, -2, 10)
        const door2Body = door2Asset.createBody(physicsMaterials)
        door2Body.position.copy(door2Mesh.position)
        scene.add(door2Mesh)
        world.addBody(door2Body)

        door1Mesh.userData.linkedDoor = { mesh: door2Mesh }
        door2Mesh.userData.linkedDoor = { mesh: door1Mesh }

        syncList.push({ body: door1Body, mesh: door1Mesh, name: 'Door (Portal 1)', type: 'static' })
        syncList.push({ body: door2Body, mesh: door2Mesh, name: 'Door (Portal 2)', type: 'static' })
      }
    }

    const tableObj = currentSceneGroup.getObjectByName("Billiard Table")
    if (tableObj && tableObj.userData && tableObj.userData.tableDimensions && tableObj.userData.tableDimensions.clothColor) {
      physicsEventManager.setTableColor(tableObj.userData.tableDimensions.clothColor)
    }
    destroySystem.setTable(tableObj)

    // Process physics for dynamic scene objects
    currentSceneGroup.traverse((child) => {
      if (child === currentSceneGroup) return
      if (child.name === "Billiard Table") return
      if (child.userData && child.userData.physics && child.userData.physics.shapes) {
        const phys = child.userData.physics
        const scaleX = Math.abs(child.scale?.x || 1)
        const scaleY = Math.abs(child.scale?.y || 1)
        const scaleZ = Math.abs(child.scale?.z || 1)
        const radialScale = Math.max(scaleX, scaleZ)
        const childWorldPosition = new THREE.Vector3()
        const childWorldQuaternion = new THREE.Quaternion()
        child.getWorldPosition(childWorldPosition)
        child.getWorldQuaternion(childWorldQuaternion)

        phys.shapes.forEach(def => {
          let shape
          if (def.type === 'box') {
            const [sx, sy, sz] = def.size
            shape = new CANNON.Box(new CANNON.Vec3((sx * scaleX) / 2, (sy * scaleY) / 2, (sz * scaleZ) / 2))
          } else if (def.type === 'sphere') {
            shape = new CANNON.Sphere((def.radius || 0) * Math.max(scaleX, scaleY, scaleZ))
          } else if (def.type === 'cylinder') {
            shape = new CANNON.Cylinder(
              (def.radiusTop || 0) * radialScale,
              (def.radiusBottom || 0) * radialScale,
              (def.height || 0) * scaleY, 16
            )
          }
          if (!shape) return

          const shapeSurfaceAudioType = def.surfaceAudioType || child.userData?.surfaceAudioType || phys.surfaceAudioType || null
          shape.userData = {
            role: def.role,
            surfaceAudioType: shapeSurfaceAudioType,
            material: def.material || phys.material,
          }

          const body = new CANNON.Body({
            mass: 0,
            material: physicsMaterials[def.material || phys.material] || physicsMaterials.default,
            collisionFilterGroup: COLLISION_GROUPS.STATIC,
            collisionFilterMask: COLLISION_MASKS.STATIC,
          })
          body.userData = body.userData || {}
          body.userData.surfaceAudioType = shapeSurfaceAudioType
          body.userData.surfaceAudioTypesByShapeIndex = []

          if (def.isTrigger) {
            body.collisionFilterMask = 0
            body.collisionResponse = false
            shape.collisionResponse = false
          }

          if (def.offset) {
            const worldOffset = new THREE.Vector3(
              (def.offset[0] || 0) * scaleX,
              (def.offset[1] || 0) * scaleY,
              (def.offset[2] || 0) * scaleZ
            ).applyQuaternion(childWorldQuaternion)
            body.position.set(childWorldPosition.x + worldOffset.x, childWorldPosition.y + worldOffset.y, childWorldPosition.z + worldOffset.z)
          } else {
            body.position.set(childWorldPosition.x, childWorldPosition.y, childWorldPosition.z)
          }

          if (def.rotation) {
            body.quaternion.setFromEuler(...def.rotation)
          } else {
            body.quaternion.set(childWorldQuaternion.x, childWorldQuaternion.y, childWorldQuaternion.z, childWorldQuaternion.w)
          }

          body.addShape(shape)
          body.userData.surfaceAudioTypesByShapeIndex[body.shapes.length - 1] = shapeSurfaceAudioType
          body.name = child.name || 'DynamicSceneObject'
          world.addBody(body)
          sceneBodies.push(body)
          syncList.push({ body, mesh: child, type: def.isTrigger ? 'trigger' : 'static', name: child.name || 'scene_object', debugColor: def.debugColor || undefined })
          CollisionManager.addHitboxForObject(syncList[syncList.length - 1])
        })
      }
    })

    const phys = currentSceneGroup.userData.physics
    if (phys && phys.shapes) {
      phys.shapes.forEach(def => {
        let shape
        if (def.type === 'box') {
          const [sx, sy, sz] = def.size
          shape = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2))
        } else if (def.type === 'sphere') {
          shape = new CANNON.Sphere(def.radius)
        } else if (def.type === 'cylinder') {
          shape = new CANNON.Cylinder(def.radiusTop, def.radiusBottom, def.height, 16)
        }
        if (!shape) return

        const shapeSurfaceAudioType = def.surfaceAudioType || phys.surfaceAudioType || currentSceneGroup.userData?.surfaceAudioType || null
        shape.userData = {
          role: def.role,
          surfaceAudioType: shapeSurfaceAudioType,
          material: def.material || phys.material,
        }

        const body = new CANNON.Body({
          mass: 0,
          material: physicsMaterials[def.material || phys.material] || physicsMaterials.default,
          collisionFilterGroup: COLLISION_GROUPS.STATIC,
          collisionFilterMask: COLLISION_MASKS.STATIC,
        })
        body.userData = body.userData || {}
        body.userData.surfaceAudioType = shapeSurfaceAudioType
        body.userData.surfaceAudioTypesByShapeIndex = []

        if (def.isTrigger) {
          body.collisionFilterMask = 0
          body.collisionResponse = false
          shape.collisionResponse = false
        }

        if (def.material === 'rail') {
          body.collisionFilterGroup = COLLISION_GROUPS.RAIL
          body.collisionFilterMask = COLLISION_MASKS.RAIL
        }

        if (def.offset) body.position.set(...def.offset)
        if (def.rotation) body.quaternion.setFromEuler(...def.rotation)

        body.addShape(shape)
        body.userData.surfaceAudioTypesByShapeIndex[body.shapes.length - 1] = shapeSurfaceAudioType
        body.name = asset.name || 'SceneObject'
        world.addBody(body)
        sceneBodies.push(body)
        syncList.push({ body, type: def.isTrigger ? 'trigger' : 'static', name: asset.name || 'scene', debugColor: def.debugColor || undefined })
        CollisionManager.addHitboxForObject(syncList[syncList.length - 1])
      })
    }
  }

  // ==================== RENDER SETUP ====================
  let renderScale = Math.max(RENDER_PERF_CONFIG.minScale, Math.min(RENDER_PERF_CONFIG.maxScale, RENDER_PERF_CONFIG.startupScale))
  let currentPixelRatio = basePixelRatio
  let fpsAccumSec = 0, fpsFrameCount = 0, perfAdjustCooldownSec = 0, startupPerfTimer = 0

  const applyRenderResolution = (force = false) => {
    const clampedScale = Math.max(RENDER_PERF_CONFIG.minScale, Math.min(RENDER_PERF_CONFIG.maxScale, renderScale))
    const nextPixelRatio = Math.min(basePixelRatio, basePixelRatio * clampedScale)
    if (!force && Math.abs(nextPixelRatio - currentPixelRatio) < 0.01) return
    currentPixelRatio = nextPixelRatio
    renderer.setPixelRatio(currentPixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  renderer.domElement.style.width = '100vw'
  renderer.domElement.style.height = '100vh'
  renderer.domElement.style.display = 'block'
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  applyRenderResolution(true)

  // ==================== CAMERA & UI ====================
  const cameraController = new ThirdPersonCameraController(renderer)
  const camera = cameraController.camera
  camera.userData = camera.userData || {}
  camera.userData.cameraController = cameraController
  const uiManager = new UIManager()
  uiManager.setCamera(camera)
  cameraController.setUIManager(uiManager)
  cameraController.setScene(scene)
  cameraController.setGameplayMode(gameplayMode)
  cameraController.enableControl()
  if (typeof window !== 'undefined') {
    window.uiManager = uiManager
  }

  // ==================== PHYSICS ====================
  const world = new CANNON.World()
  world.gravity.set(0, -9.82, 0)
  world.solver.iterations = SIMULATION_CONFIG.solverIterations
  const physicsMaterials = setupContactMaterials(world)

  // ==================== CONTROLLERS & AI ====================
  const playerMovement = new PlayerMovementController(camera, scene, physicsMaterials, renderer.domElement, null, null, cameraController)
  const characterControllers = new Map()
  const guyAIControllers = new Map()
  const dudeAIControllers = new Map()
  const guideAIControllers = new Map()
  const dummyAIControllers = new Map()
  const ball8AIControllers = new Map()
  const bowlingAIControllers = new Map()
  const compuneAIControllers = new Map()

  // ==================== CONTROL GUIDE TRIGGERS ====================
  // (Moved to after _activeTimeouts declaration)

  // Patch playerMovement._collectItem để hiển thị dialog item khi nhặt lần đầu
  const origCollectItem = playerMovement._collectItem?.bind(playerMovement);
  if (origCollectItem) {
    playerMovement._collectItem = function (entry, mesh) {
      if (gameplayMode && !itemDialogShown && controlGuideState.phase < 4) {
        itemDialogShown = true;
        setTimeout(() => {
          controlGuideUI.showDialog(SCENE1_CONTROL_GUIDES.item, 10);
          controlGuideState.phase = 4;
        }, 0);
      }
      return origCollectItem(entry, mesh);
    };
  }

  const initialGraphicsQuality = getGraphicsQualityProfile(settingsManager.get('quality'))
  let lightController = setupSceneLighting(scene, renderer, {
    fogType: 'none', fogColor: 0x111111, shadows: settingsManager.get('shadows') && initialGraphicsQuality.allowShadows, shadowMapSize: initialGraphicsQuality.shadowMapSize, shadowBias: -0.0001,
    directionalLight: { color: 0xfff5d1, intensity: 2.5, position: [15, 25, 15], castShadow: true },
    pointLights: [], spotLights: [], helpers: false,
  })

  const sceneBodies = []
  let currentSceneGroup = null
  let currentSceneManager = null
  let lastTime = performance.now()
  const syncList = []
  const objects = createAllGameObjects(renderer, {
    playerCustomization: options.playerCustomization
  })
  const guyCloneAsset = objects.find(obj => obj.name === 'Guy') || null
  const destroySystem = new DestroySystem({ syncList, world, scene, listenerPositionProvider: () => camera.position })
  const particleManager = new ParticleManager(scene)
  particleManager.applyQualityProfile(getGraphicsQualityProfile(settingsManager.get('quality')))
  destroySystem.setParticleManager(particleManager)
  playerMovement.setUIManager(uiManager)
  playerMovement.setSyncListAndDestroySystem(syncList, destroySystem)
  playerMovement.setParticleManager(particleManager)
  const physicsEventManager = new PhysicsEventManager({ particleManager, syncList, listenerPositionProvider: () => camera.position })

  // Initial sync
  syncWithSettings(settingsManager.getAll())

  // Listen for changes
  settingsManager.onChange(syncWithSettings)

  let possessed = null
  uiManager.setScreenMatProvider(() => (
    currentSceneManager && typeof currentSceneManager._ensureScreenMat === 'function'
      ? currentSceneManager._ensureScreenMat()
      : null
  ))
  uiManager.setPlayerPositionProvider(() => possessed?.body?.position || possessed?.mesh?.position || null)
  const floorGuardRayFrom = new CANNON.Vec3()
  const floorGuardRayTo = new CANNON.Vec3()
  const floorGuardHit = new CANNON.RaycastResult()
  const floorGuardCollisionMask = COLLISION_GROUPS.STATIC | COLLISION_GROUPS.RAIL

  function syncDynamicBodyInterpolation(body) {
    if (!body) return

    if (body.previousPosition) body.previousPosition.copy(body.position)
    if (body.interpolatedPosition) body.interpolatedPosition.copy(body.position)
    if (body.previousQuaternion) body.previousQuaternion.copy(body.quaternion)
    if (body.interpolatedQuaternion) body.interpolatedQuaternion.copy(body.quaternion)
  }

  function isFloorGuardCandidate(entry) {
    const body = entry?.body
    if (!entry || !body || body.mass <= 0) return false
    if (entry.type !== 'dynamic' || body.type !== CANNON.Body.DYNAMIC) return false
    if (entry.name === 'Player') return false
    if (entry.name && entry.name.includes('Ball')) return false
    if (body.userData?.isCueBody || body.userData?.isForceBody) return false
    return true
  }

  function updateDynamicBodyFloorGuard(entry) {
    if (!isFloorGuardCandidate(entry)) return

    const body = entry.body
    body.userData = body.userData || {}
    const userData = body.userData
    const radius = Math.max(0.12, body.boundingRadius || 0.2)
    const probeAbove = Math.max(SIMULATION_CONFIG.floorGuardProbeAbove, radius * 2.2)
    const probeBelow = Math.max(SIMULATION_CONFIG.floorGuardProbeBelow, radius * 5.5)
    const sinkTolerance = Math.max(0.12, radius * 0.45)
    const supportHeight = Math.max(0.18, radius * 1.05)
    const recoveryDrop = Math.max(SIMULATION_CONFIG.floorGuardRecoveryDrop, radius * 2.2)
    const recoveryHorizontalDrift = Math.max(SIMULATION_CONFIG.floorGuardRecoveryHorizontalDrift, radius * 3.2)

    floorGuardRayFrom.set(body.position.x, body.position.y + probeAbove, body.position.z)
    floorGuardRayTo.set(body.position.x, body.position.y - probeBelow, body.position.z)
    floorGuardHit.reset()

    const hasGroundHit = world.raycastClosest(
      floorGuardRayFrom,
      floorGuardRayTo,
      {
        collisionFilterMask: floorGuardCollisionMask,
        skipBackfaces: true
      },
      floorGuardHit
    ) && floorGuardHit.hasHit

    if (hasGroundHit) {
      const groundY = floorGuardHit.hitPointWorld.y
      userData.floorGuardLastGroundY = groundY

      const isWithinSupportBand = body.position.y >= groundY - sinkTolerance
        && body.position.y <= groundY + supportHeight

      if (isWithinSupportBand) {
        if (!userData.floorGuardLastSafePosition) {
          userData.floorGuardLastSafePosition = new CANNON.Vec3(body.position.x, body.position.y, body.position.z)
        }
        userData.floorGuardLastSafePosition.copy(body.position)
        userData.floorGuardArmed = true
        return
      }
    }

    const safePos = userData.floorGuardLastSafePosition
    if (userData.floorGuardArmed !== true || !safePos) return

    const dx = body.position.x - safePos.x
    const dz = body.position.z - safePos.z
    const fellTooFar = body.position.y < safePos.y - recoveryDrop
    const stayedNearLastSafe = (dx * dx) + (dz * dz) <= recoveryHorizontalDrift * recoveryHorizontalDrift
    if (!fellTooFar || !stayedNearLastSafe) return

    body.position.copy(safePos)
    if (typeof userData.floorGuardLastGroundY === 'number') {
      body.position.y = Math.max(body.position.y, userData.floorGuardLastGroundY + Math.max(0.08, radius * 0.55))
    }

    if (body.velocity.y < 0) body.velocity.y = 0
    body.velocity.x *= 0.35
    body.velocity.z *= 0.35
    body.angularVelocity.scale(0.2, body.angularVelocity)
    body.force.set(0, 0, 0)
    body.torque.set(0, 0, 0)
    body.aabbNeedsUpdate = true
    if (typeof body.wakeUp === 'function') body.wakeUp()
    syncDynamicBodyInterpolation(body)

    if (entry.mesh) {
      entry.mesh.position.copy(body.position)
      entry.mesh.quaternion.copy(body.quaternion)
    }

    userData.floorGuardLastSafePosition.copy(body.position)
  }

  function spawnDeathCloneFromAsset(asset, cloneName, position, rotationQuaternion = null, cloneTags = {}) {
    if (!position || !asset?.createMesh || !asset?.createBody) return null

    const normalizedCloneTags = {
      ...cloneTags,
      isDeathClone: true,
    }

    const prefab = {
      name: cloneName,
      type: 'static',
      allowMultipleInstances: true,
      createMesh: () => {
        const mesh = asset.createMesh()
        mesh.name = cloneName
        mesh.userData = mesh.userData || {}
        if (typeof mesh.userData.removeCue === 'function') {
          mesh.userData.removeCue()
        }
        Object.assign(mesh.userData, normalizedCloneTags)
        return mesh
      },
      createBody: (materials) => {
        const body = asset.createBody(materials)
        if (!body) return body

        body.name = cloneName
        body.type = CANNON.Body.STATIC
        body.mass = 0
        body.updateMassProperties()
        body.velocity.set(0, 0, 0)
        body.angularVelocity.set(0, 0, 0)
        body.userData = body.userData || {}
        Object.assign(body.userData, normalizedCloneTags)
        return body
      }
    }

    const cloneEntry = spawnerSpawn({
      scene,
      prefab,
      position: position.clone(),
      world,
      physicsMaterials,
      syncList,
      particleManager: null,
      fakeShadowManager,
      listenerPosition: camera.position
    })

    if (!cloneEntry) return null

    cloneEntry.userData = cloneEntry.userData || {}
    Object.assign(cloneEntry.userData, normalizedCloneTags)
    if (cloneEntry.mesh?.userData && typeof cloneEntry.mesh.userData.removeCue === 'function') {
      cloneEntry.mesh.userData.removeCue()
    }
    if (rotationQuaternion && cloneEntry.mesh) {
      cloneEntry.mesh.quaternion.copy(rotationQuaternion)
      cloneEntry.mesh.updateMatrixWorld(true)
    }
    if (rotationQuaternion && cloneEntry.body) {
      cloneEntry.body.quaternion.copy(rotationQuaternion)
      cloneEntry.body.previousQuaternion?.copy(cloneEntry.body.quaternion)
      cloneEntry.body.interpolatedQuaternion?.copy(cloneEntry.body.quaternion)
      cloneEntry.body.aabbNeedsUpdate = true
    }
    if (cloneEntry.mesh?.userData) {
      Object.assign(cloneEntry.mesh.userData, normalizedCloneTags)
    }
    if (cloneEntry.body?.userData) {
      Object.assign(cloneEntry.body.userData, normalizedCloneTags)
    }

    return cloneEntry
  }

  function spawnGuyDeathClone(position, rotationQuaternion = null) {
    return spawnDeathCloneFromAsset(guyCloneAsset, 'Guy Clone', position, rotationQuaternion, {
      isGuyClone: true,
    })
  }

  function spawnInvisibleDeathCameraAnchor(position, rotationQuaternion = null) {
    if (!position) return null

    const anchorMesh = new THREE.Object3D()
    anchorMesh.name = 'Death Camera Anchor'
    anchorMesh.visible = false
    anchorMesh.userData = {
      isDeathClone: true,
      isInvisibleDeathClone: true,
    }
    anchorMesh.position.copy(position)
    if (rotationQuaternion) {
      anchorMesh.quaternion.copy(rotationQuaternion)
    }
    anchorMesh.updateMatrixWorld(true)
    scene.add(anchorMesh)

    const anchorEntry = {
      mesh: anchorMesh,
      body: null,
      type: 'static',
      name: 'Death Camera Anchor',
      userData: {
        isDeathClone: true,
        isInvisibleDeathClone: true,
      }
    }
    syncList.push(anchorEntry)
    return anchorEntry
  }

  // ==================== DESTROY HANDLER ====================
  destroySystem.setOnDestroy(entry => {
    if (entry?.name === 'Player' && typeof playerMovement.clearImpactEffects === 'function') {
      playerMovement.clearImpactEffects()
    }
    if (entry === possessed) {
      if (possessed.name === 'Player') {
        const wasKilledByGuy = !!entry?.body?.userData?.killedByGuy
        const deathCause = entry?.body?.userData?.deathCause || null
        const pendingDestroyGameOverReason = gameplayMode && currentSceneManager
          ? (currentSceneManager.pendingPlayerDestroyGameOverReason || null)
          : null
        const shouldSpawnDeathCameraTarget = pendingDestroyGameOverReason !== 'elevator'
        const deathClonePosition = entry?.mesh?.position?.clone?.() || null
        const deathCloneRotation = entry?.mesh?.quaternion?.clone?.() || null
        if (entry?.body?.userData) {
          delete entry.body.userData.deathCause
          delete entry.body.userData.killedByGuy
        }
        playerMovement.dropAllCarriedItems(false)
        playerMovement.removeCueBody()
        if (possessed.mesh && possessed.mesh.userData.removeCue) {
          possessed.mesh.userData.removeCue()
        }
        playerMovement.cueActive = false
        let deathCloneEntry = null
        playerMovement.disableInput()
        if (shouldSpawnDeathCameraTarget && deathClonePosition) {
          deathCloneEntry = wasKilledByGuy
            ? (spawnGuyDeathClone(deathClonePosition, deathCloneRotation) || spawnInvisibleDeathCameraAnchor(deathClonePosition, deathCloneRotation))
            : spawnInvisibleDeathCameraAnchor(deathClonePosition, deathCloneRotation)
        }
        if (deathCloneEntry?.mesh) {
          possessed = deathCloneEntry
          cameraController.focus(deathCloneEntry.mesh)
        } else {
          possessed = null
          cameraController.clearFocus()
        }
        if (gameplayMode && currentSceneManager) {
          currentSceneManager.gameOverDetail = deathCause || currentSceneManager.gameOverDetail || 'default'
          currentSceneManager.onPlayerDestroyed()
        }
      } else {
        possessed = null
        cameraController.clearFocus()
      }
    }
    if (entry && entry.mesh) {
      fakeShadowManager.removeShadow(entry.mesh)
      const pos = entry.mesh.position.clone()
      if (!entry._destroyFxSpawned) {
        particleManager.spawn('smoke', pos)
        playSound3({
          sourcePosition: pos,
          listenerPosition: camera.position,
        })
      }
      if (typeof particleManager.clearVeinForOwner === 'function') {
        particleManager.clearVeinForOwner(entry.mesh)
      }
    }
    guyAIControllers.delete(entry)
    dudeAIControllers.delete(entry)
    if (guideAIControllers.has(entry)) {
      const guideAI = guideAIControllers.get(entry)
      if (guideAI && typeof guideAI.dispose === 'function') guideAI.dispose()
      guideAIControllers.delete(entry)
    }
    dummyAIControllers.delete(entry)
    ball8AIControllers.delete(entry)
    if (bowlingAIControllers.has(entry)) {
      const bowlingAI = bowlingAIControllers.get(entry)
      if (bowlingAI && typeof bowlingAI.dispose === 'function') bowlingAI.dispose()
      bowlingAIControllers.delete(entry)
    }
    if (compuneAIControllers.has(entry)) {
      const compuneAI = compuneAIControllers.get(entry)
      if (compuneAI && typeof compuneAI.cleanup === 'function') compuneAI.cleanup()
      compuneAIControllers.delete(entry)
    }
    // Show shoot dialog when Compune is destroyed (only once, after look dialog)
    if (entry?.name === 'Compune' && gameplayMode && !shootDialogShown && controlGuideState.phase >= 2) {
      shootDialogShown = true
      setTimeout(() => {
        controlGuideUI.showDialog(SCENE1_CONTROL_GUIDES.shoot, 10)
        controlGuideState.phase = 3
      }, 0)
    }
    CollisionManager.removeHitboxForObject(entry)
  })

  // ==================== PAUSE & GAME OVER ====================
  let animationId
  let gameOverScreen = null
  let deathWisdomOverlay = null
  let pauseMenuScreen = null
  let isDeathFlowPending = false
  let isResumeRequested = false
  let resumeAttemptToken = 0

  function ensureDeathWisdomOverlay() {
    if (!deathWisdomOverlay) {
      deathWisdomOverlay = new DeathWisdomOverlay()
    }
    return deathWisdomOverlay
  }

  function isGameOverUIVisible() { return !!(gameOverScreen && gameOverScreen.isVisible) }
  function isDeathWisdomVisible() { return !!(deathWisdomOverlay && deathWisdomOverlay.isVisible) }
  function isDeathFlowActive() { return isDeathFlowPending || isDeathWisdomVisible() || isGameOverUIVisible() }
  function isTeleportTransitionActive() {
    return !!(currentSceneManager && typeof currentSceneManager.isTeleportTransitionActive === 'function' && currentSceneManager.isTeleportTransitionActive())
  }
  function isPauseMenuVisible() { return !!(pauseMenuScreen && pauseMenuScreen.isVisible) }
  function isSettingsVisible() { return !!document.getElementById('settingsScreen') }
  function isGameplayModalVisible() { return isPauseMenuVisible() || isSettingsVisible() }
  function stopPlayerMovementForPause() {
    playerMovement.disableInput()
    if (possessed && possessed.body) {
      possessed.body.velocity.set(0, possessed.body.velocity.y, 0)
    }
  }
  function focusGameCanvas() {
    if (document.activeElement && document.activeElement !== document.body && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }
    renderer.domElement.setAttribute('tabindex', '0')
    renderer.domElement.focus({ preventScroll: true })
  }

  function enterPauseMenu() {
    if (isDeathFlowActive()) return
    if (isTeleportTransitionActive()) return
    isResumeRequested = false
    stopPlayerMovementForPause()
    if (pauseMenuScreen && !pauseMenuScreen.isVisible) {
      pauseMenuScreen.show()
    }
    if (document.pointerLockElement === renderer.domElement) {
      try { document.exitPointerLock() } catch (err) { }
    }
  }

  function lockCameraFromPauseResume(fromEscape = false) {
    isResumeRequested = true
    const attemptToken = ++resumeAttemptToken

    // Ensure menu is hidden immediately
    if (pauseMenuScreen && pauseMenuScreen.isVisible) pauseMenuScreen.hide()

    // Focus the canvas
    focusGameCanvas()

    if (fromEscape) {
      const overlay = document.getElementById('simClickResumeOverlay');
      if (overlay) overlay.style.display = 'flex';
    } else {
      if (cameraController) {
        cameraController.enableControl()
      } else if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock()
      }
    }

    playerMovement.enableInput()
  }

  // Remove pointerLockResumeOverlay if present (for safety)
  const resumeOverlay = document.getElementById('pointerLockResumeOverlay')
  if (resumeOverlay && resumeOverlay.parentNode) resumeOverlay.parentNode.removeChild(resumeOverlay)

  if (gameplayMode) {
    pauseMenuScreen = new PauseMenuScreen(
      () => { if (!isGameOverUIVisible()) lockCameraFromPauseResume() },
      () => {
        // onSettings
        stopPlayerMovementForPause()
        createSettingsScreen(() => {
          // When settings screen is closed, show pause menu again
          if (pauseMenuScreen && !pauseMenuScreen.isVisible) {
            pauseMenuScreen.show();
          }
        }, gameplayMode);
      },
      () => {
        if (pauseMenuScreen) { pauseMenuScreen.destroy(); pauseMenuScreen = null }
        if (typeof cleanupFn === 'function') cleanupFn()
        if (typeof onBack === 'function') onBack()
      }
    )
  }

  CollisionManager.init({ scene, syncList, sceneObjects: [] })

  // ==================== CLICK TO RESUME OVERLAY (Common for all modes) ====================
  const clickResumeOverlay = document.createElement('div')
  clickResumeOverlay.id = 'simClickResumeOverlay'
  clickResumeOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: ${UI_THEME.simulation.clickResumeOverlay}; backdrop-filter: blur(2px);
    display: none; justify-content: center; align-items: center;
    z-index: 20000; pointer-events: auto; cursor: pointer;
  `
  const popupContent = document.createElement('div');
  popupContent.style.cssText = `
    background: ${UI_THEME.simulation.clickResumeBoxBackground};
    border: 2px solid ${UI_THEME.simulation.clickResumeBoxBorder};
    padding: 16px 32px;
    color: ${UI_THEME.simulation.clickResumeBoxText};
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
    box-shadow: ${UI_THEME.simulation.clickResumeBoxShadow};
    text-align: center;
    animation: pulseResume 2s infinite ease-in-out;
    letter-spacing: 2px;
  `;
  popupContent.textContent = 'CLICK TO RESUME';

  if (!document.getElementById('pulse-resume-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-resume-style';
    style.innerHTML = `
      @keyframes pulseResume {
        0% { transform: scale(1); box-shadow: 0 0 20px ${UI_THEME.simulation.clickResumePulseMin}; }
        50% { transform: scale(1.02); box-shadow: 0 0 40px ${UI_THEME.simulation.clickResumePulseMax}; }
        100% { transform: scale(1); box-shadow: 0 0 20px ${UI_THEME.simulation.clickResumePulseMin}; }
      }
    `;
    document.head.appendChild(style);
  }

  clickResumeOverlay.appendChild(popupContent);
  document.body.appendChild(clickResumeOverlay)

  clickResumeOverlay.addEventListener('mousedown', () => {
    lockCameraFromPauseResume(false)
  })

  // ==================== UI WINDOWS (SIMULATOR MODE) ====================
  if (!gameplayMode) {
    // Help window
    const helpWindow = document.createElement('div')
    helpWindow.id = 'simHelpWindow'
    helpWindow.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: ${UI_THEME.simulation.helpOverlayBackground}; display: flex; flex-direction: column;
      justify-content: center; align-items: center; z-index: 20001;
      opacity: 1; transition: opacity 0.25s; font-family: monospace;
      pointer-events: auto;
    `
    const helpBox = document.createElement('div')
    helpBox.style.cssText = `
      background: ${UI_THEME.simulation.helpBoxBackground}; border: 2px solid ${UI_THEME.simulation.helpBoxBorder}; width: min(420px, 96vw);
      overflow: hidden;
    `
    const helpTitleBar = document.createElement('div')
    helpTitleBar.style.cssText = `
      background: ${UI_THEME.simulation.helpTitleBackground}; color: ${UI_THEME.simulation.helpTitleText}; padding: 6px 12px; font-weight: bold;
      border-bottom: 2px solid ${UI_THEME.simulation.helpTitleBorder}; font-size: 11px; letter-spacing: 1px;
      text-transform: uppercase;
    `
    helpTitleBar.textContent = '> SPECTATOR_HELP.exe'
    const helpContent = document.createElement('div')
    helpContent.style.cssText = `
      padding: 24px 22px; text-align: left; color: ${UI_THEME.simulation.helpContentText}; font-size: 13px;
      line-height: 1.7; user-select: text;
    `
    helpContent.innerHTML = `
      <div style="font-size:17px;font-weight:bold;margin-bottom:10px;">SPECTATOR CONTROLS</div>
      <div>W A S D + Mouse + Space/Shift — Move<br>Scroll — Zoom<br>Hold C — Show Mouse Cursor<br>
      Press C — Lock Camera<br>ESC — Release Cursor<br>L — Force Open Elevator<br>P — Change Visual Mode</div>
      <div style="font-size:17px;font-weight:bold;margin:18px 0 10px;">OBJECT CONTROL</div>
      <div>Click object to control it.<br>If object is player: W A S D + Mouse + Space — Move & Look<br>
      Scroll — Adjust View Angle<br>Hold E — Charge Shot<br>Release E — Shoot<br>Q — Swap Items<br>Z — Drop Item</div>
      <div style="margin-top:18px;">Press H to hide/show this window.<br>Press G to show/hide spawn menu.</div>
    `
    helpBox.appendChild(helpTitleBar)
    helpBox.appendChild(helpContent)
    helpWindow.appendChild(helpBox)
    document.body.appendChild(helpWindow)

    const helpHint = document.createElement('div')
    helpHint.id = 'simHelpHint'
    helpHint.innerHTML = '<b>H</b>'
    helpHint.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; z-index: 20002;
      background: ${UI_THEME.simulation.helpHintBackground}; color: ${UI_THEME.simulation.helpHintText}; border: 2px solid ${UI_THEME.simulation.helpHintBorder};
      padding: 8px 16px; font-family: monospace; font-weight: bold;
      font-size: 13px; opacity: 0; pointer-events: none;
    `
    document.body.appendChild(helpHint)


    const spawnHint = document.createElement('div')
    spawnHint.id = 'simSpawnHint'
    spawnHint.innerHTML = '<b>G</b>'
    spawnHint.style.cssText = `
      position: fixed; top: 20px; left: 20px; z-index: 20002;
      background: ${UI_THEME.simulation.spawnHintBackground}; color: ${UI_THEME.simulation.spawnHintText}; border: 2px solid ${UI_THEME.simulation.spawnHintBorder};
      padding: 8px 16px; font-family: monospace; font-weight: bold;
      font-size: 13px; opacity: 1; pointer-events: auto;
    `
    document.body.appendChild(spawnHint)

    // Spawn window
    const spawnWindow = document.createElement('div')
    spawnWindow.id = 'simSpawnWindow'
    spawnWindow.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: ${UI_THEME.simulation.helpOverlayBackground}; display: flex; justify-content: center;
      align-items: center; z-index: 20003; opacity: 0; pointer-events: none;
      transition: opacity 0.22s; font-family: monospace;
    `
    const spawnBox = document.createElement('div')
    spawnBox.style.cssText = `
      background: ${UI_THEME.simulation.spawnBoxBackground}; border: 2px solid ${UI_THEME.simulation.spawnBoxBorder}; width: min(340px, 92vw);
      max-height: 420px; overflow: hidden; display: flex; flex-direction: column;
    `
    const spawnTitleBar = document.createElement('div')
    spawnTitleBar.style.cssText = `
      background: ${UI_THEME.simulation.spawnTitleBackground}; color: ${UI_THEME.simulation.spawnTitleText}; padding: 6px 12px; font-weight: bold;
      border-bottom: 2px solid ${UI_THEME.simulation.spawnTitleBorder}; font-size: 11px; letter-spacing: 1px;
      text-transform: uppercase;
    `
    spawnTitleBar.textContent = '> SPAWN_OBJECTS.exe'
    const spawnListArea = document.createElement('div')
    spawnListArea.style.cssText = `
      overflow-y: auto; max-height: 340px; min-height: 120px;
      display: flex; flex-direction: column; scrollbar-width: none;
    `
    spawnListArea.classList.add('no-scrollbar')
    const style = document.createElement('style')
    style.innerHTML = `.no-scrollbar::-webkit-scrollbar { display: none; }`
    document.head.appendChild(style)
    spawnBox.appendChild(spawnTitleBar)
    spawnBox.appendChild(spawnListArea)
    spawnWindow.appendChild(spawnBox)
    document.body.appendChild(spawnWindow)

    let spawnMenuVisible = false
    let spawnMenuIndex = 0
    let helpVisible = true

    function updateSpawnMenuList() {
      spawnListArea.innerHTML = ''
      spawnableDynamicPrefabs.forEach((asset, idx) => {
        const item = document.createElement('div')
        item.textContent = asset.name || `Object ${idx}`
        item.style.cssText = `
          padding: 10px 18px;
          background: ${idx === spawnMenuIndex ? UI_THEME.simulation.spawnSelectedBackground : UI_THEME.common.transparent};
          color: ${idx === spawnMenuIndex ? UI_THEME.simulation.spawnSelectedText : UI_THEME.simulation.spawnItemText};
          cursor: pointer; font-weight: ${idx === spawnMenuIndex ? 'bold' : 'normal'};
          border-bottom: 1px solid ${UI_THEME.simulation.spawnItemBorder}; user-select: none; font-size: 15px;
        `
        item.onmouseenter = () => {
          spawnMenuIndex = idx
          Array.from(spawnListArea.children).forEach((el, i) => {
            el.style.background = i === spawnMenuIndex ? UI_THEME.simulation.spawnSelectedBackground : UI_THEME.common.transparent
            el.style.color = i === spawnMenuIndex ? UI_THEME.simulation.spawnSelectedText : UI_THEME.simulation.spawnItemText
            el.style.fontWeight = i === spawnMenuIndex ? 'bold' : 'normal'
          })
        }
        item.onclick = (e) => {
          e.stopPropagation()
          spawnMenuIndex = idx
          spawnSelected(idx)
          setSpawnMenuVisible(false)
          if (typeof playerMovement?.resetKeys === 'function') playerMovement.resetKeys()
          if (typeof playerMovement?.enableInput === 'function') playerMovement.enableInput()
          if (renderer.domElement && typeof renderer.domElement.focus === 'function') {
            renderer.domElement.setAttribute('tabindex', '0')
            renderer.domElement.focus({ preventScroll: true })
          }
        }
        if (idx === spawnMenuIndex) {
          setTimeout(() => item.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0)
        }
        spawnListArea.appendChild(item)
      })
    }

    function setSpawnMenuVisible(visible) {
      spawnMenuVisible = visible
      spawnWindow.style.opacity = visible ? '1' : '0'
      spawnWindow.style.pointerEvents = visible ? 'auto' : 'none'
      spawnHint.style.opacity = visible ? '1' : (helpVisible ? '0' : '1')
      spawnHint.style.pointerEvents = visible ? 'auto' : (helpVisible ? 'none' : 'auto')
      if (visible) {
        updateSpawnMenuList()
        setTimeout(() => spawnWindow.focus(), 0)
      }
    }

    function setHelpVisible(visible) {
      helpVisible = visible
      helpWindow.style.opacity = visible ? '1' : '0'
      helpWindow.style.pointerEvents = visible ? 'auto' : 'none'
      helpHint.style.opacity = visible ? '0' : '1'
      helpHint.style.pointerEvents = visible ? 'none' : 'auto'
      if (!spawnMenuVisible) {
        spawnHint.style.opacity = visible ? '0' : '1'
        spawnHint.style.pointerEvents = visible ? 'none' : 'auto'
      }
    }

    setHelpVisible(true)

    window.addEventListener('keydown', (e) => {
      if (!spawnMenuVisible && e.code === 'KeyG' && !e.repeat) {
        setSpawnMenuVisible(true)
        spawnMenuIndex = 0
        updateSpawnMenuList()
        e.preventDefault()
      } else if (spawnMenuVisible && e.code === 'KeyG' && !e.repeat) {
        setSpawnMenuVisible(false)
        e.preventDefault()
      } else if (spawnMenuVisible && e.code === 'ArrowDown') {
        spawnMenuIndex = (spawnMenuIndex + 1) % spawnableDynamicPrefabs.length
        updateSpawnMenuList()
        e.preventDefault()
      } else if (spawnMenuVisible && e.code === 'ArrowUp') {
        spawnMenuIndex = (spawnMenuIndex - 1 + spawnableDynamicPrefabs.length) % spawnableDynamicPrefabs.length
        updateSpawnMenuList()
        e.preventDefault()
      } else if (spawnMenuVisible && e.code === 'Enter') {
        spawnSelected(spawnMenuIndex)
        setSpawnMenuVisible(false)
        e.preventDefault()
      } else if (spawnMenuVisible && e.code === 'Escape') {
        setSpawnMenuVisible(false)
        e.preventDefault()
      } else if (e.code === 'KeyH') {
        setHelpVisible(!helpVisible)
      }
    })

    document.addEventListener('mousedown', (e) => {
      if (spawnMenuVisible && !spawnWindow.contains(e.target) && e.target !== spawnHint) {
        setSpawnMenuVisible(false)
      }
    })
  }

  // ==================== SCENE LOAD ====================
  const scenes = sceneAssets
  if (scenes.length) {
    const loadIndex = gameplayMode ? Math.min(sceneIndex, scenes.length - 1) : 0
    spawnSceneAsset(scenes[loadIndex])
    CollisionManager.setSceneObjects(currentSceneGroup)
  }


  const dynamicPrefabs = objects.filter(o => o.type === "dynamic")
  const spawnableDynamicPrefabs = dynamicPrefabs.filter(o => o.excludeFromSimulationSpawn !== true)
  const _activeTimeouts = new Set()
  const _activeIntervals = new Set()

  // ==================== DIALOG GAMEPLAY ====================
  if (gameplayMode) {
    // Dialog 1: WASD + Space, after 3 seconds
    const timeoutMove = setTimeout(() => {
      if (controlGuideState.phase === 0) {
        controlGuideUI.showDialog(SCENE1_CONTROL_GUIDES.move, 10)
        controlGuideState.phase = 1
      }
    }, 3000)
    _activeTimeouts.add(timeoutMove)

    // Dialog 2: Mouse + Scroll, after 13 seconds
    const timeoutLook = setTimeout(() => {
      if (controlGuideState.phase === 1) {
        controlGuideUI.showDialog(SCENE1_CONTROL_GUIDES.look, 10)
        controlGuideState.phase = 2
      }
    }, 13000)
    _activeTimeouts.add(timeoutLook)
  }

  // Auto-spawn player
  if (gameplayMode && currentSceneGroup) {
    const timeoutId = setTimeout(() => {
      const playerAsset = dynamicPrefabs.find(o => o.name === 'Player')
      if (playerAsset && currentSceneManager) {
        const playerEntry = currentSceneManager.spawnPlayer(playerAsset, scene)
        if (playerEntry && playerEntry.mesh) {
          possessed = playerEntry
          playerEntry.mesh.userData.createCue && playerEntry.mesh.userData.createCue()
          playerMovement.cueActive = true
          playerMovement.enableInput()
          cameraController.focus(playerEntry.mesh)
          // Hiện HP bar ngay khi possess player (auto-spawn)
          if (possessed.name === 'Player') {
            uiManager.showHPBar(true)
            uiManager.updateHPBar(possessed.hp, possessed.maxHP)
          }
        }
      }
      _activeTimeouts.delete(timeoutId)
    }, 100)
    _activeTimeouts.add(timeoutId)
  }

  // ==================== SPAWN FUNCTIONS ====================
  function spawnRandom() {
    const dynamicObjectCount = syncList.filter(e => e.type === 'dynamic').length
    if (dynamicObjectCount >= SIMULATION_CONFIG.maxObjectsInScene) return
    let baseY = 0
    const table = currentSceneGroup.getObjectByName("Billiard Table")
    if (table && table.userData && table.userData.tableDimensions) {
      baseY = table.userData.tableDimensions.topY || 0
    }
    spawnerSpawnRandom({ scene, dynamicPrefabs: spawnableDynamicPrefabs, world, physicsMaterials, syncList, particleManager, height: 12, baseY, fakeShadowManager, listenerPosition: camera.position })
  }

  function spawnSelected(index) {
    const prefab = spawnableDynamicPrefabs[index]
    if (!prefab) return
    const pos = randomPositionAboveTable(8)
    spawnerSpawn({ scene, prefab, position: pos, world, physicsMaterials, syncList, particleManager, fakeShadowManager, listenerPosition: camera.position })
  }

  let spawnIntervalId = null
  function startSpawning() {
    if (spawnIntervalId !== null || gameplayMode) return
    spawnIntervalId = setInterval(() => { if (!possessed) spawnRandom() }, SIMULATION_CONFIG.spawnRateMs)
    _activeIntervals.add(spawnIntervalId)
  }
  function stopSpawning() {
    if (spawnIntervalId) {
      clearInterval(spawnIntervalId)
      _activeIntervals.delete(spawnIntervalId)
      spawnIntervalId = null
    }
  }

  // ==================== INPUT HANDLERS ====================
  function onKeyDown(e) {
    primeSound2Audio()
    primeSound3Audio()
    primeSound4Audio()
    primeSound6Audio()
    primeSound7Audio()
    primeSound8Audio()
    primeSound9Audio()
    primeSound12Audio()
    primeSound13Audio()
    primeSound14Audio()
    primePipeSoundAudio()

    if (gameplayMode) {
      if (e.code === "Escape") {
        e.preventDefault()
        if (isDeathFlowActive()) return
        if (isTeleportTransitionActive()) return
        if (isSettingsVisible()) return
        if (isPauseMenuVisible()) {
          lockCameraFromPauseResume(true) // fromEscape = true
        } else {
          enterPauseMenu()
        }
      }
      return
    }

    if (e.code === "KeyR" && !possessed) startSpawning()
    if (e.code === "KeyL" && !gameplayMode && !e.repeat && currentSceneManager && typeof currentSceneManager.startElevatorCountdown === 'function') {
      currentSceneManager.startElevatorCountdown()
    }
    if (e.code === "KeyF" && !gameplayMode && !e.repeat && currentSceneManager && typeof currentSceneManager.debugForceSection1CeilingFanDrop === 'function') {
      currentSceneManager.debugForceSection1CeilingFanDrop()
      e.preventDefault()
    }
    if (e.code === "KeyP" && !gameplayMode) CollisionManager.cycleVisibilityMode()
    if (e.code === "Escape" && !gameplayMode) {
      playerMovement.disableInput()
      if (possessed && possessed.body) possessed.body.velocity.set(0, possessed.body.velocity.y, 0)
      cameraController.disableControlOnly()
    }
  }

  function onKeyUp(e) {
    if (e.code === "KeyR") stopSpawning()
  }

  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)

  // ==================== POINTER LOCK ====================
  function onPointerLockChange() {
    const locked = document.pointerLockElement === renderer.domElement
    if (locked) {
      const overlay = document.getElementById('simClickResumeOverlay');
      if (overlay) overlay.style.display = 'none';
    }
    if (gameplayMode && locked) {
      if (isResumeRequested) {
        isResumeRequested = false
        resumeAttemptToken++
        if (pauseMenuScreen && pauseMenuScreen.isVisible) pauseMenuScreen.hide()
        focusGameCanvas()
        playerMovement.enableInput()
        return
      }
      if (isGameplayModalVisible()) {
        cameraController.disableControlOnly()
        stopPlayerMovementForPause()
        return
      }
      isResumeRequested = false
      resumeAttemptToken++
      focusGameCanvas()
      playerMovement.enableInput()
      return
    }
    if (gameplayMode && !locked) {
      if (isDeathFlowActive()) {
        isResumeRequested = false
        return
      }
      if (isTeleportTransitionActive()) {
        isResumeRequested = false
        const overlay = document.getElementById('simClickResumeOverlay');
        if (overlay) overlay.style.display = 'none';
        return
      }
      if (isResumeRequested) {
        stopPlayerMovementForPause()
        return
      }
      if (!isGameOverUIVisible() && !isGameplayModalVisible()) {
        if (isResumeRequested) isResumeRequested = false
        enterPauseMenu()
      } else if (!isGameOverUIVisible()) {
        if (isResumeRequested) isResumeRequested = false
        stopPlayerMovementForPause()
      }
    } else if (locked) {
      playerMovement.enableInput()
    }
  }
  document.addEventListener("pointerlockchange", onPointerLockChange)

  document.addEventListener("pointerlockerror", () => {
    if (gameplayMode && !isDeathFlowActive() && !isTeleportTransitionActive() && !isGameplayModalVisible()) {
      const overlay = document.getElementById('simClickResumeOverlay');
      if (overlay) overlay.style.display = 'flex';
    }
  })

  // ==================== CLICK TO POSSESS ====================
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  function onClick(event) {
    if (gameplayMode) {
      // If we are not locked, and no menus are visible, click to lock pointer
      if (document.pointerLockElement !== renderer.domElement && !isGameplayModalVisible() && !isDeathFlowActive() && !isTeleportTransitionActive()) {
        lockCameraFromPauseResume(false)
      }
      return
    }
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const meshes = syncList.filter(item => item.type === "dynamic").map(item => item.mesh)
    const intersects = raycaster.intersectObjects(meshes, true)
    const validIntersects = intersects.filter(hit => !hit.object.userData?.isTriggerBox)
    if (validIntersects.length > 0) {
      let root = validIntersects[0].object
      while (root.parent && !meshes.includes(root)) root = root.parent
      const entry = syncList.find(e => e.mesh === root)
      if (possessed && possessed.name === 'Player' && possessed !== entry) {
        playerMovement.removeCueBody()
        if (possessed.mesh.userData.removeCue) possessed.mesh.userData.removeCue()
        playerMovement.cueActive = false
      }
      if (entry) {
        possessed = entry
        playerMovement.enableInput()
        if (possessed.name === 'Player') {
          playerMovement.cueActive = true
          if (possessed.mesh.userData.createCue) possessed.mesh.userData.createCue()
          // Hiện HP bar ngay khi possess player (click)
          if (possessed.name === 'Player') {
            uiManager.showHPBar(true)
            uiManager.updateHPBar(possessed.hp, possessed.maxHP)
          }
        }
        cameraController.focus(entry.mesh)
      }
    }
  }

  renderer.domElement.addEventListener("click", onClick)

  // ==================== RESIZE HANDLER ====================
  function onResize() { applyRenderResolution(true) }
  window.addEventListener("resize", onResize)

  // ==================== PERFORMANCE OPTIMIZATION ====================
  function updateAdaptiveRenderResolution(rawDelta) {
    if (!Number.isFinite(rawDelta) || rawDelta <= 0) return
    startupPerfTimer += rawDelta
    fpsAccumSec += rawDelta
    fpsFrameCount += 1
    perfAdjustCooldownSec = Math.max(0, perfAdjustCooldownSec - rawDelta)
    const inStartupWindow = startupPerfTimer < RENDER_PERF_CONFIG.startupDurationSec
    const scaleCap = inStartupWindow ? Math.min(RENDER_PERF_CONFIG.maxScale, RENDER_PERF_CONFIG.startupMaxScale) : RENDER_PERF_CONFIG.maxScale
    if (renderScale > scaleCap) { renderScale = scaleCap; applyRenderResolution() }
    if (fpsAccumSec < RENDER_PERF_CONFIG.sampleWindowSec) return
    const fps = fpsFrameCount / fpsAccumSec
    // Cập nhật thông tin hiệu năng nếu ở chế độ Simulation
    if (perfOverlay) {
      lastPerfStats.fps = Math.round(fps)
    }
    fpsAccumSec = 0
    fpsFrameCount = 0
    if (perfAdjustCooldownSec > 0) return
    if (fps < RENDER_PERF_CONFIG.downshiftFps && renderScale > RENDER_PERF_CONFIG.minScale) {
      renderScale = Math.max(RENDER_PERF_CONFIG.minScale, renderScale - RENDER_PERF_CONFIG.scaleStepDown)
      perfAdjustCooldownSec = RENDER_PERF_CONFIG.adjustCooldownSec
      applyRenderResolution()
    } else if (fps > RENDER_PERF_CONFIG.upshiftFps && renderScale < scaleCap) {
      renderScale = Math.min(scaleCap, renderScale + RENDER_PERF_CONFIG.scaleStepUp)
      perfAdjustCooldownSec = RENDER_PERF_CONFIG.adjustCooldownSec
      applyRenderResolution()
    }
  }

  function hasPlayerCameraAttachment() {
    const cameraTarget = cameraController.getTarget ? cameraController.getTarget() : null
    return !!(possessed && possessed.name === 'Player' && cameraTarget && cameraTarget === possessed.mesh)
  }

  function isBowlingEntry(entry) {
    if (!entry) return false
    const entryName = typeof entry.name === 'string' ? entry.name : ''
    if (entryName === 'Bowling Ball' || entryName.startsWith('BowlingBall_')) return true
    if (entry.userData?.isBowlingBall) return true
    if (entry.mesh?.userData?.isBowlingBall) return true
    if (entry.body?.userData?.isBowlingBall) return true
    return false
  }

  function enforceSingleBowlingBall() {
    const bowlingEntries = syncList.filter(isBowlingEntry)
    if (bowlingEntries.length <= 1) return
    bowlingEntries.forEach(entry => {
      if (!entry.body) return
      if (!entry.body.userData) entry.body.userData = {}
      if (entry.body.userData.bowlingSpawnOrder == null) entry.body.userData.bowlingSpawnOrder = performance.now()
    })
    bowlingEntries.sort((a, b) => (a.body?.userData?.bowlingSpawnOrder ?? 0) - (b.body?.userData?.bowlingSpawnOrder ?? 0))
    bowlingEntries.slice(0, -1).forEach(entry => destroySystem.destroyObject(entry))
  }

  function cleanupPlayerChargeUI() {
    if (playerMovement.isCharging()) playerMovement.cancelCharge()
    uiManager.hidePlayerUI()
  }

  // ==================== ANIMATION LOOP ====================
  function animate() {
    // --- Scene/asset ---
    lastPerfStats.sceneName = currentSceneManager && currentSceneManager.sceneName ? currentSceneManager.sceneName : (typeof currentSceneGroup?.name === 'string' ? currentSceneGroup.name : '--')
    lastPerfStats.assetName = currentSceneGroup && currentSceneGroup.name ? currentSceneGroup.name : '--'
    lastPerfStats.prefabCount = Array.isArray(objects) ? objects.length : '--'
    lastPerfStats.dynamicPrefabCount = Array.isArray(objects) ? objects.filter(o => o.type === 'dynamic').length : '--'
    lastPerfStats.staticPrefabCount = Array.isArray(objects) ? objects.filter(o => o.type === 'static').length : '--'
    lastPerfStats.kinematicPrefabCount = Array.isArray(objects) ? objects.filter(o => o.type === 'kinematic').length : '--'
    // --- Object counts ---
    lastPerfStats.syncDynamic = syncList ? syncList.filter(e => e.type === 'dynamic').length : '--'
    lastPerfStats.syncStatic = syncList ? syncList.filter(e => e.type === 'static').length : '--'
    lastPerfStats.syncKinematic = syncList ? syncList.filter(e => e.type === 'kinematic').length : '--'
    lastPerfStats.sceneBodies = Array.isArray(sceneBodies) ? sceneBodies.length : '--'
    // --- UI state ---
    lastPerfStats.helpVisible = typeof helpVisible !== 'undefined' ? helpVisible : '--'
    lastPerfStats.spawnMenuVisible = typeof spawnMenuVisible !== 'undefined' ? spawnMenuVisible : '--'
    lastPerfStats.pauseMenuVisible = typeof pauseMenuScreen !== 'undefined' && pauseMenuScreen && pauseMenuScreen.isVisible ? 'ON' : 'OFF'
    lastPerfStats.gameOverVisible = typeof gameOverScreen !== 'undefined' && gameOverScreen && gameOverScreen.isVisible ? 'ON' : 'OFF'
    // --- System state ---
    lastPerfStats.particleCount = particleManager && typeof particleManager.countAll === 'function' ? particleManager.countAll() : '--'
    lastPerfStats.shadowCount = fakeShadowManager && typeof fakeShadowManager.countAll === 'function' ? fakeShadowManager.countAll() : '--'
    lastPerfStats.physicsEventCount = physicsEventManager && typeof physicsEventManager.countAll === 'function' ? physicsEventManager.countAll() : '--'
    // --- Table info ---
    if (typeof currentSceneGroup?.getObjectByName === 'function') {
      const tableObj = currentSceneGroup.getObjectByName('Billiard Table')
      if (tableObj && tableObj.userData && tableObj.userData.tableDimensions) {
        lastPerfStats.tableColor = tableObj.userData.tableDimensions.clothColor || '--'
        lastPerfStats.tableSize = `${tableObj.userData.tableDimensions.width || ''}x${tableObj.userData.tableDimensions.length || ''}`
      }
    }
    // --- Portal/trigger ---
    lastPerfStats.portalCount = syncList ? syncList.filter(e => e.name && e.name.includes('Portal')).length : '--'
    lastPerfStats.triggerCount = syncList ? syncList.filter(e => e.name && e.name.includes('Trigger')).length : '--'
    // --- Player ---
    lastPerfStats.playerAlive = possessed && possessed.name === 'Player' ? 'YES' : 'NO'
    lastPerfStats.playerTime = possessed && possessed.name === 'Player' && possessed.body && possessed.body.timeAlive ? possessed.body.timeAlive.toFixed(2) : '--'
    lastPerfStats.playerSpawn = typeof playerMovement?.spawnCount !== 'undefined' ? playerMovement.spawnCount : '--'
    lastPerfStats.playerDestroy = typeof playerMovement?.destroyCount !== 'undefined' ? playerMovement.destroyCount : '--'
    // --- Light/fog/camera ---
    lastPerfStats.fogType = scene && scene.fog ? (scene.fog.name || 'fog') : 'none'
    lastPerfStats.lightCount = scene && scene.children ? scene.children.filter(c => c.isLight).length : '--'
    lastPerfStats.shadowMapSize = renderer && renderer.shadowMap ? renderer.shadowMap.width : '--'
    lastPerfStats.cameraDist = cameraController && cameraController.distance ? cameraController.distance.toFixed(2) : '--'
    lastPerfStats.spectator = cameraController && cameraController.isSpectator ? 'ON' : 'OFF'
    // Section/phase: luôn đồng bộ section với sectionKey (camera)
    if (cameraController && cameraController._activeSectionKey) {
      const validSections = ['section1', 'section2', 'section3', 'section4'];
      controlGuideState.section = validSections.includes(cameraController._activeSectionKey)
        ? cameraController._activeSectionKey
        : 'section1';
    } else {
      controlGuideState.section = 'section1';
    }
    lastPerfStats.section = controlGuideState.section;
    lastPerfStats.phase = typeof controlGuideState !== 'undefined' && controlGuideState.phase !== undefined ? controlGuideState.phase : '--';
    // Khi load scene mới, chỉ giữ lại section đang active, giải phóng mesh/object các section khác
    // (giả sử mỗi section là một group con của currentSceneGroup, tên dạng 'section1', 'section2', ...)
    let activeSectionKey = (cameraController && ['section1', 'section2', 'section3', 'section4'].includes(cameraController._activeSectionKey))
      ? cameraController._activeSectionKey
      : 'section1';
    if (typeof currentSceneGroup?.children === 'object') {
      currentSceneGroup.children.forEach(child => {
        if (child.name && child.name.startsWith('section')) {
          child.visible = (child.name === activeSectionKey);
          // Nếu không phải section active thì giải phóng mesh/material
          if (child.name !== activeSectionKey) {
            child.traverse(obj => {
              if (obj.geometry) { obj.geometry.dispose && obj.geometry.dispose(); obj.geometry = null; }
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(mat => mat && mat.dispose && mat.dispose());
                else obj.material.dispose && obj.material.dispose();
                // Patch: assign fallback invisible material instead of null
                obj.material = new THREE.MeshBasicMaterial({ visible: false, color: 0x000000 });
              }
            });
          }
        }
      });
    }
    // Input state
    if (cameraController && cameraController.moveState) {
      lastPerfStats.moveState = Object.entries(cameraController.moveState).filter(([k, v]) => v).map(([k]) => k[0].toUpperCase()).join('') || '-'
    }
    lastPerfStats.pointerLock = document.pointerLockElement ? 'ON' : 'OFF'
    lastPerfStats.controlEnabled = cameraController && cameraController.isControlEnabled ? 'ON' : 'OFF'
    // AI counts
    lastPerfStats.aiGuy = guyAIControllers ? guyAIControllers.size : '--'
    lastPerfStats.aiDude = dudeAIControllers ? dudeAIControllers.size : '--'
    lastPerfStats.aiGuide = guideAIControllers ? guideAIControllers.size : '--'
    lastPerfStats.aiDummy = dummyAIControllers ? dummyAIControllers.size : '--'
    lastPerfStats.aiBall8 = ball8AIControllers ? ball8AIControllers.size : '--'
    lastPerfStats.aiBowling = bowlingAIControllers ? bowlingAIControllers.size : '--'
    lastPerfStats.aiCompune = compuneAIControllers ? compuneAIControllers.size : '--'
    // Section key (camera)
    lastPerfStats.sectionKey = (cameraController && ['section1', 'section2', 'section3', 'section4'].includes(cameraController._activeSectionKey))
      ? cameraController._activeSectionKey
      : 'section1';
    // Phase AI (guy)
    let phaseGuy = '--';
    if (guyAIControllers && guyAIControllers.size > 0) {
      for (const ai of guyAIControllers.values()) {
        if (ai.currentPhase !== undefined) { phaseGuy = ai.currentPhase; break; }
      }
    }
    lastPerfStats.phaseGuy = phaseGuy
    // Last event (simple: lấy sự kiện keydown gần nhất)
    if (window._lastSimEvent) lastPerfStats.lastEvent = window._lastSimEvent
    animationId = requestAnimationFrame(animate)
    const currentTime = performance.now()
    const rawDelta = (currentTime - lastTime) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTime = currentTime
    updateAdaptiveRenderResolution(rawDelta)
    // Cập nhật các thông số hiệu năng khác
    if (perfOverlay) {
      lastPerfStats.frameTime = (rawDelta * 1000).toFixed(1)
      lastPerfStats.objectCount = syncList ? syncList.length : '--'
      if (renderer && renderer.info) {
        const info = renderer.info
        lastPerfStats.drawCalls = info.render.calls
        lastPerfStats.triangles = info.render.triangles
        lastPerfStats.geometries = info.memory.geometries
        lastPerfStats.textures = info.memory.textures
      }
      if (window.performance && performance.memory) {
        const mem = performance.memory
        lastPerfStats.jsHeap = (mem.usedJSHeapSize / 1048576).toFixed(1) + ' / ' + (mem.totalJSHeapSize / 1048576).toFixed(1) + ' MB'
        lastPerfStats.jsHeapUsed = (mem.usedJSHeapSize / 1048576).toFixed(1) + ' MB'
        lastPerfStats.jsHeapTotal = (mem.totalJSHeapSize / 1048576).toFixed(1) + ' MB'
      } else {
        lastPerfStats.jsHeap = '--'
        lastPerfStats.jsHeapUsed = '--'
        lastPerfStats.jsHeapTotal = '--'
      }
      lastPerfStats.devicePixelRatio = window.devicePixelRatio
      lastPerfStats.renderScale = typeof renderScale !== 'undefined' ? renderScale.toFixed(3) : '--'
      lastPerfStats.startupPerfTimer = typeof startupPerfTimer !== 'undefined' ? startupPerfTimer.toFixed(2) : '--'
      lastPerfStats.perfAdjustCooldownSec = typeof perfAdjustCooldownSec !== 'undefined' ? perfAdjustCooldownSec.toFixed(2) : '--'
      lastPerfStats.minScale = RENDER_PERF_CONFIG.minScale
      lastPerfStats.maxScale = RENDER_PERF_CONFIG.maxScale
      lastPerfStats.sampleWindowSec = RENDER_PERF_CONFIG.sampleWindowSec
      lastPerfStats.adjustCooldownSec = RENDER_PERF_CONFIG.adjustCooldownSec
      if (cameraController && cameraController.camera) {
        const c = cameraController.camera
        lastPerfStats.cameraPos = c.position ? `${c.position.x.toFixed(2)},${c.position.y.toFixed(2)},${c.position.z.toFixed(2)}` : '--'
        lastPerfStats.cameraTarget = cameraController.getTarget ? cameraController.getTarget() : '--'
      }
      lastPerfStats.possessed = possessed && possessed.name ? possessed.name : '--'
      lastPerfStats.worldBodies = world && world.bodies ? world.bodies.length : '--'
      lastPerfStats.time = new Date().toLocaleTimeString()
      lastPerfStats.userAgent = navigator.userAgent
      lastPerfStats.platform = navigator.platform
      lastPerfStats.screen = `${window.screen.width}x${window.screen.height}`
      lastPerfStats.window = `${window.innerWidth}x${window.innerHeight}`
      lastPerfStats.location = window.location ? window.location.href : '--'
      lastPerfStats.url = document.URL
      // Trình bày thông tin theo hàng ngang, cách nhau bằng dấu phẩy, tự động xuống dòng khi tràn lề
      // Ping đo bằng fetch tới một endpoint đơn giản (nếu cần, có thể đo mỗi N frame)
      // Đo ping bằng endpoint luôn trả về 200 (/, hoặc 1 file nhỏ chắc chắn tồn tại)
      if (!window._simPing || window._simPing.lastCheck + 2000 < Date.now()) {
        window._simPing = { lastCheck: Date.now(), value: '--' };
        const start = Date.now();
        // Use index.html (always exists on Vite/GitHub Pages) to avoid 404
        fetch(window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/index.html'), { method: 'HEAD', cache: 'no-store' })
          .then(() => { window._simPing.value = (Date.now() - start) + 'ms'; window._simPing.lastCheck = Date.now(); })
          .catch(() => { window._simPing.value = '--'; window._simPing.lastCheck = Date.now(); });
      }
      // Xác định "tốn tài nguyên nhất" (heap, drawCalls, triangles)
      let heavy = 'Draw:' + lastPerfStats.drawCalls + ', Tri:' + lastPerfStats.triangles + ', Heap:' + lastPerfStats.jsHeap;
      // Overlay chỉ giữ lại các trường cần thiết
      const infoArr = [
        `FPS:${lastPerfStats.fps}`,
        `Ping:${window._simPing ? window._simPing.value : '--'}`,
        `Section:${lastPerfStats.section}`,
        `Heavy:${heavy}`
      ];
      perfOverlay.innerText = infoArr.join(', ');
    }

    if (gameOverScreen && gameplayMode) gameOverScreen.update(delta)
    if (gameplayMode && isGameOverUIVisible()) {
      cleanupPlayerChargeUI()
      renderer.render(scene, cameraController.camera)
      return
    }
    if (gameplayMode && isGameplayModalVisible() && !isGameOverUIVisible()) {
      cleanupPlayerChargeUI()
      renderer.render(scene, cameraController.camera)
      return
    }
    if (!hasPlayerCameraAttachment()) cleanupPlayerChargeUI()

    if (possessed && possessed.name === 'Player' && possessed.body && possessed.mesh) {
      playerMovement.update(possessed.body, possessed.mesh, cameraController)

      // --- HP Regen Logic ---
      if (!possessed._lastDamageTime) possessed._lastDamageTime = performance.now();
      if (!possessed._lastRegenTime) possessed._lastRegenTime = performance.now();
      // Nếu vừa nhận sát thương ở nơi khác, hãy cập nhật _lastDamageTime ở đó!
      // Tự động hồi máu nếu đủ điều kiện
      const now = performance.now();
      if (possessed.hp > 0) {
        // Nếu đã đủ 10s không nhận sát thương
        if (now - possessed._lastDamageTime > 10000 && possessed.hp < possessed.maxHP) {
          if (now - possessed._lastRegenTime > 1000) {
            possessed.hp = Math.min(possessed.maxHP, possessed.hp + 1);
            possessed._lastRegenTime = now;
          }
        } else {
          // Nếu vừa nhận sát thương, reset timer hồi máu
          possessed._lastRegenTime = now;
        }
      }

      // HP BAR UI: luôn hiện khi nhập vào player (dù hp = 0)
      if (possessed.name === "Player" && hasPlayerCameraAttachment()) {
        uiManager.showHPBar(true)
        uiManager.updateHPBar(possessed.hp, possessed.maxHP)
        if (playerMovement.isCharging()) {
          if (playerMovement.cueBody && !playerMovement.cueBody.userData?.hitboxAdded) {
            CollisionManager.addHitboxForObject({ body: playerMovement.cueBody, name: 'Cue', type: 'kinematic' })
            if (!playerMovement.cueBody.userData) playerMovement.cueBody.userData = {}
            playerMovement.cueBody.userData.hitboxAdded = true
          }
          if (playerMovement.forceBody && !playerMovement.forceBody.userData?.hitboxAdded) {
            CollisionManager.addHitboxForObject({ body: playerMovement.forceBody, name: 'Force', type: 'trigger' })
            if (!playerMovement.forceBody.userData) playerMovement.forceBody.userData = {}
            playerMovement.forceBody.userData.hitboxAdded = true
          }
          const chargeAmount = playerMovement.getChargeAmount()
          const currentTipPos = playerMovement.getCueTipPosition(possessed.mesh)
          const originalTipPos = playerMovement.getOriginalCueTipPosition(possessed.mesh)
          uiManager.updateChargeIndicator(true, originalTipPos, camera)
          uiManager.updateChargeLine(true, currentTipPos, originalTipPos, camera)
          uiManager.updatePowerBar(true, chargeAmount)
        } else {
          uiManager.updateChargeIndicator(false)
          uiManager.updateChargeLine(false)
          uiManager.updatePowerBar(false)
        }
      } else {
        uiManager.showHPBar(false)
        uiManager.updateChargeIndicator(false)
        uiManager.updateChargeLine(false)
        uiManager.updatePowerBar(false)
      }
    }

    enforceSingleBowlingBall()

    // Character & AI updates
    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body || entry.name === 'Player' || entry.type !== 'dynamic' || entry.body.userData?.physicsEventRegistered === undefined) return
      if (entry.name.includes('Ball')) return

      const characterName = entry.name
      if (!characterControllers.has(characterName)) characterControllers.set(characterName, new CharacterController(camera))
      const charController = characterControllers.get(characterName)

      if (entry === possessed) {
        charController.updatePossessedMode(entry.mesh, entry.body)
      } else if (characterName !== 'Guy' && characterName !== 'Dude') {
        charController.updateIdleMode(entry.mesh, entry.body)
      }

      if (characterName === 'Guy' && entry !== possessed) {
        if (!guyAIControllers.has(entry)) {
          const guyAI = new GuyAI(entry.mesh, entry.body, scene)
          guyAIControllers.set(entry, guyAI)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.guyAI = guyAI
        }
        const guyAI = guyAIControllers.get(entry)
        const targetYaw = guyAI.update(delta, syncList)
        if (targetYaw !== null) { charController.setBodyYaw(entry.mesh, targetYaw); entry.mesh.rotation.y = targetYaw }
      }

      if (characterName === 'Dude' && entry !== possessed) {
        if (!dudeAIControllers.has(entry)) {
          const dudeAI = new DudeAI(entry.mesh, entry.body, scene)
          dudeAIControllers.set(entry, dudeAI)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.dudeAI = dudeAI
        }
        const dudeAI = dudeAIControllers.get(entry)
        const result = dudeAI.update(delta, syncList, camera, possessed)
        if (result && result.targetYaw !== null) { charController.setBodyYaw(entry.mesh, result.targetYaw); entry.mesh.rotation.y = result.targetYaw }
        if (result && result.opacity !== undefined) {
          entry.mesh.traverse(child => { if (child.material) { child.material.transparent = true; child.material.opacity = result.opacity } })
        }
        if (result && result.touchedPlayer && currentSceneManager && typeof currentSceneManager.onPenaltyDudeTouchedPlayer === 'function') {
          currentSceneManager.onPenaltyDudeTouchedPlayer()
        }
        if (result && result.shouldDespawn) { destroySystem.destroyCharacter(entry); return }
      }

      if (characterName === 'Guide' && entry !== possessed) {
        if (!guideAIControllers.has(entry)) {
          const guideAI = new GuideAI(entry.mesh, entry.body)
          guideAIControllers.set(entry, guideAI)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.guideAI = guideAI
        }
        const guideAI = guideAIControllers.get(entry)
        const result = guideAI.update(delta, syncList)
        if (result && result.targetYaw !== null) { charController.setBodyYaw(entry.mesh, result.targetYaw); entry.mesh.rotation.y = result.targetYaw }
        if (result && result.touchedGuy && result.touchedGuy !== entry) destroySystem.destroyCharacter(result.touchedGuy)
        charController.updateWalkAnimation(entry.mesh, entry.body, delta, 1.0)
      }

      if (characterName === 'Dummy' && entry !== possessed) {
        if (!dummyAIControllers.has(entry)) {
          const dummyAI = new DummyAI(entry.mesh, entry.body, scene, camera)
          dummyAIControllers.set(entry, dummyAI)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.dummyAI = dummyAI
        }
        const dummyAI = dummyAIControllers.get(entry)
        const result = dummyAI.update(delta, syncList)
        if (result && result.targetYaw !== null) { charController.setBodyYaw(entry.mesh, result.targetYaw); entry.mesh.rotation.y = result.targetYaw }
        charController.updateWalkAnimation(entry.mesh, entry.body, delta, 1.0)
      }

      if (characterName === 'Guide' && entry === possessed && guideAIControllers.has(entry)) {
        const guideAI = guideAIControllers.get(entry)
        if (guideAI && typeof guideAI.syncCarriedItem === 'function') guideAI.syncCarriedItem(delta)
      }

      if (characterName === 'Ball 8') {
        if (!ball8AIControllers.has(entry)) {
          const ball8AI = new Ball8AI(entry.mesh, entry.body, scene, camera, particleManager)
          ball8AIControllers.set(entry, ball8AI)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.ball8AI = ball8AI
        }
        const ball8AI = ball8AIControllers.get(entry)
        ball8AI.update(delta, syncList)
      }

      if (characterName === 'Compune') {
        let compuneAI = entry.body.userData?.compuneAI
        if (!compuneAI) {
          compuneAI = new CompuneAI(entry.mesh, entry.body, scene)
          compuneAI.setDialog(SIMULATOR_COMPUNES.default)
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.compuneAI = compuneAI
        }
        compuneAIControllers.set(entry, compuneAI)
        if (gameplayMode && (isDeathFlowActive() || (currentSceneManager && currentSceneManager.gameOver))) {
          if (typeof compuneAI.closeDialog === 'function') compuneAI.closeDialog()
        } else {
          compuneAI.update(delta, syncList)
        }
      }
    })

    // Ball 8 AI separate loop
    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body || entry.name !== 'Ball 8') return
      if (!ball8AIControllers.has(entry)) {
        const ball8AI = new Ball8AI(entry.mesh, entry.body, scene, camera, particleManager)
        ball8AIControllers.set(entry, ball8AI)
        if (!entry.body.userData) entry.body.userData = {}
        entry.body.userData.ball8AI = ball8AI
      }
      const ball8AI = ball8AIControllers.get(entry)
      ball8AI.update(delta, syncList)
      if (typeof particleManager.setVeinState === 'function') {
        const isAngry = typeof ball8AI.getAngryState === 'function' ? ball8AI.getAngryState() : false
        particleManager.setVeinState(entry.mesh, isAngry, { offsetY: 0.9 })
      }
    })

    // Bowling AI
    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body) return
      if (!isBowlingEntry(entry)) return
      if (!entry.body.userData) entry.body.userData = {}
      entry.body.userData.isBowlingBall = true
      if (entry.body.userData.bowlingSpawnOrder == null) entry.body.userData.bowlingSpawnOrder = performance.now()
      if (entry.body.userData.bowlingDespawnAt == null) {
        const lifeRange = SIMULATION_CONFIG.bowlingLifetimeMaxMs - SIMULATION_CONFIG.bowlingLifetimeMinMs
        const lifeMs = SIMULATION_CONFIG.bowlingLifetimeMinMs + Math.random() * lifeRange
        entry.body.userData.bowlingDespawnAt = Date.now() + lifeMs
      }
      if (Date.now() >= entry.body.userData.bowlingDespawnAt) { destroySystem.destroyObject(entry); return }
      if (entry.mesh?.userData) entry.mesh.userData.isBowlingBall = true
      if (!bowlingAIControllers.has(entry)) {
        const bowlingAI = new BowlingAI(entry.mesh, entry.body)
        bowlingAIControllers.set(entry, bowlingAI)
        entry.body.userData.bowlingAI = bowlingAI
      }
      const bowlingAI = bowlingAIControllers.get(entry)
      const result = bowlingAI.update(delta, syncList, entry, cameraController)
      if (typeof particleManager.setVeinState === 'function') {
        const isAngry = typeof bowlingAI.getAngryState === 'function' ? bowlingAI.getAngryState() : false
        particleManager.setVeinState(entry.mesh, isAngry, { offsetY: 0.95 })
      }
      if (result && result.targetYaw !== null) entry.mesh.rotation.y = result.targetYaw
      if (result && result.touchedTarget && result.touchedTarget !== entry) {
        const target = result.touchedTarget
        const targetName = target.name || ''
        // ĐÃ XOÁ: Không destroy player ngay khi bị bowling ball chạm, chỉ trừ máu qua destroy.js
      }
    })

    physicsEventManager.reset()
    world.step(SIMULATION_CONFIG.fixedTimeStep, delta, SIMULATION_CONFIG.maxSubSteps)

    syncList.forEach(entry => {
      updateDynamicBodyFloorGuard(entry)
    })

    bowlingAIControllers.forEach((bowlingAI, entry) => {
      if (!entry || !syncList.includes(entry)) return
      if (!bowlingAI || typeof bowlingAI.consumeLandingShockwave !== 'function') return
      const shockwavePos = bowlingAI.consumeLandingShockwave()
      if (shockwavePos) particleManager.spawn('particle13', shockwavePos)
    })

    syncList.forEach(pair => {
      const shouldSyncTransform = pair.type === 'dynamic' || pair.type === 'kinematic'
      if (pair.body && pair.mesh && shouldSyncTransform) {
        pair.mesh.position.copy(pair.body.position)
        const isCharacter = ['Player', 'Guy', 'Dude', 'Guide', 'Dummy', 'Compune'].includes(pair.name)
        if (!isCharacter) pair.mesh.quaternion.copy(pair.body.quaternion)
      }
      if (pair.body && !pair.body.userData) pair.body.userData = {}
      if (pair.body && !pair.body.userData.physicsEventRegistered) {
        const isPlayer = pair.name === 'Player'
        const isDynamicCharacter = ['Guy', 'Dude', 'Guide', 'Dummy', 'Compune'].includes(pair.name)
        const isBall = !!(pair.name && pair.name.includes('Ball'))
        const shouldRegisterPhysicsEvents = pair.type === 'dynamic'
          && !isPlayer
          && !pair.body.userData?.isCueBody
          && !pair.body.userData?.isForceBody
        if (shouldRegisterPhysicsEvents) {
          pair.body.userData.physicsEventMode = (isBall || isDynamicCharacter) ? 'full' : 'landing-only'
          physicsEventManager.registerBody(pair.body)
          pair.body.userData.physicsEventRegistered = true
        }
      }
    })

    if (possessed && possessed.name === 'Player') playerMovement.syncCarriedItemsPosition(delta, possessed.mesh)

    syncList.forEach(entry => {
      if (entry.type === 'dynamic' && entry.mesh && entry.mesh.userData.shadowConfig && !entry.mesh.userData.hasFakeShadow) {
        fakeShadowManager.addShadow(entry.mesh, entry.mesh.userData.shadowConfig)
        entry.mesh.userData.hasFakeShadow = true
      }
    })

    fakeShadowManager.update()
    CollisionManager.update()
    destroySystem.update()
    particleManager.update(delta)
    if (currentSceneManager) currentSceneManager.update(delta, world, syncList, particleManager, camera)
    syncList.forEach(entry => {
      if (entry.mesh && entry.mesh.userData && typeof entry.mesh.userData.update === 'function') {
        entry.mesh.userData.update(delta, particleManager)
      }
    })

    cameraController.update(delta)
    renderer.render(scene, camera)
  }

  animate()

  // ==================== CLEANUP ====================
  cleanupFn = function cleanup() {
    controlGuideUI.cleanup()
    // Xóa overlay hiệu năng nếu có
    if (perfOverlay && perfOverlay.parentNode) perfOverlay.parentNode.removeChild(perfOverlay)
    const simBackBtn = document.getElementById("simulationBackButton")
    if (simBackBtn) simBackBtn.remove()
    cancelAnimationFrame(animationId)
    _activeTimeouts.forEach(id => clearTimeout(id))
    _activeTimeouts.clear()
    _activeIntervals.forEach(id => clearInterval(id))
    _activeIntervals.clear()
    window.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("keyup", onKeyUp)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("pointerlockchange", onPointerLockChange)
    renderer.domElement.removeEventListener("click", onClick)
    const helpWindow = document.getElementById('simHelpWindow')
    if (helpWindow && helpWindow.parentNode) helpWindow.parentNode.removeChild(helpWindow)
    const helpHint = document.getElementById('simHelpHint')
    if (helpHint && helpHint.parentNode) helpHint.parentNode.removeChild(helpHint)
    const spawnWindow = document.getElementById('simSpawnWindow')
    if (spawnWindow && spawnWindow.parentNode) spawnWindow.parentNode.removeChild(spawnWindow)
    const spawnHint = document.getElementById('simSpawnHint')
    if (spawnHint && spawnHint.parentNode) spawnHint.parentNode.removeChild(spawnHint)
    const clickOverlay = document.getElementById('simClickResumeOverlay')
    if (clickOverlay && clickOverlay.parentNode) clickOverlay.parentNode.removeChild(clickOverlay)
    isDeathFlowPending = false
    if (cameraController.dispose) cameraController.dispose()
    compuneAIControllers.forEach(compuneAI => compuneAI.cleanup())
    compuneAIControllers.clear()
    dudeAIControllers.clear()
    dummyAIControllers.clear()
    CollisionManager.dispose()
    if (currentSceneManager) { currentSceneManager.reset(); currentSceneManager = null }
    if (typeof window !== 'undefined' && window.uiManager === uiManager) {
      delete window.uiManager
    }
    if (uiManager) uiManager.dispose()
    if (deathWisdomOverlay) { deathWisdomOverlay.destroy(); deathWisdomOverlay = null }
    if (pauseMenuScreen) { pauseMenuScreen.destroy(); pauseMenuScreen = null }
    fakeShadowManager.clearAll()
    if (particleManager && typeof particleManager.clearTransientEffects === 'function') particleManager.clearTransientEffects()
    syncList.forEach(pair => {
      if (pair.body) world.removeBody(pair.body)
      if (pair.mesh) {
        if (pair.mesh.geometry && typeof pair.mesh.geometry.dispose === 'function') pair.mesh.geometry.dispose()
        if (pair.mesh.material) {
          if (Array.isArray(pair.mesh.material)) pair.mesh.material.forEach(mat => mat && typeof mat.dispose === 'function' && mat.dispose())
          else if (typeof pair.mesh.material.dispose === 'function') pair.mesh.material.dispose()
        }
        scene.remove(pair.mesh)
      }
    })
    clearAllObjectPools()
    scene.clear()
  }
  return cleanupFn
}