import * as THREE from "three"
import * as CANNON from "cannon-es"
import { createAllGameObjects } from "../gameObjects/temp.js"
import { ThirdPersonCameraController } from "../camera/camera3rdPerson.js"
import { UIManager } from "../ui/UIManager.js"
import { GameOverScreen } from "../ui/GameOverScreen.js"
import { PauseMenuScreen } from "../ui/PauseMenuScreen.js"
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
import { spawnObject as spawnerSpawn, spawnRandom as spawnerSpawnRandom, randomPositionAboveTable } from "../utils/spawner.js"
import { PhysicsEventManager } from "../utils/physicsEventManager.js"
import { DestroySystem } from "../utils/destroy.js"
import { ParticleManager } from "../utils/particleManager.js"
import { sceneAssets } from "../assets/sceneAssets.js"
import { Scene1Manager } from "../sceneManager/Scene1Manager.js"

const SIMULATION_CONFIG = {
  fixedTimeStep: 1 / 60,
  spawnRateMs: 1200,
  maxObjectsInScene: 30,
  bowlingLifetimeMinMs: 45000,
  bowlingLifetimeMaxMs: 90000,
};

const RENDER_PERF_CONFIG = {
  maxDevicePixelRatio: 1.0, // Giảm DPI để giảm tải GPU
  minScale: 0.5,
  maxScale: 0.7, // Giảm internal render scale tối đa

  downshiftFps: 55,
  upshiftFps: 60,

  sampleWindowSec: 0.5, // Tăng thời gian lấy mẫu FPS để ổn định hơn
  adjustCooldownSec: 0.1, // Tăng cooldown để tránh nhấp nháy scale

  scaleStepDown: 0.15, // Giảm scale mạnh hơn khi tụt FPS
  scaleStepUp: 0.01, // Tăng scale chậm hơn khi FPS ổn

  startupDurationSec: 4.0, // Kéo dài thời gian khởi động để scale ổn định
  startupScale: 0.6,
  startupMaxScale: 0.7
}

export function startSimulationTest(renderer, onBack, gameplayMode = false, sceneIndex = 0) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  // Placeholder for cleanup function - will be defined later
  let cleanupFn = null

  // Back button (bottom-right corner, dark red style) - only show in simulator mode
  if (!gameplayMode) {
    const backButton = document.createElement("button")
    backButton.id = "simulationBackButton"
    backButton.innerText = "Back to Menu"
    backButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      background: #8b0000;
      color: #fff;
      border: 2px solid #5a0000;
      border-radius: 0;
      padding: 8px 16px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.4), inset 0 0 6px rgba(255, 0, 0, 0.2);
      transition: all 0.3s ease;
    `

    backButton.onmouseover = () => {
      backButton.style.boxShadow = `0 0 20px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 0, 0, 0.3)`
      backButton.style.transform = 'scale(1.05)'
    }
    backButton.onmouseout = () => {
      backButton.style.boxShadow = `0 0 12px rgba(255, 0, 0, 0.4), inset 0 0 6px rgba(255, 0, 0, 0.2)`
      backButton.style.transform = 'scale(1)'
    }

    // Call cleanup function when back button is clicked
    backButton.onclick = () => {
      if (cleanupFn) cleanupFn()
      onBack()
    }
    document.body.appendChild(backButton)
  }

  const fakeShadowManager = new FakeShadowManager(scene)

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
          shadows: true,
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
    }

    // Add Person Trigger to HitboxManager
    const personMesh = currentSceneGroup.getObjectByName("Person");
    if (personMesh && personMesh.userData.triggerShape) {
        const triggerDef = personMesh.userData.triggerShape;
        const shape = new CANNON.Sphere(triggerDef.radius);
        shape.collisionResponse = 0; // Make it a trigger

        const body = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.STATIC,
        });
        
        const personHeight = 4; // Should match scene1.js
        const bodyPosition = personMesh.position.clone().setY(personMesh.position.y + personHeight / 2);
        body.position.copy(bodyPosition);

        body.addShape(shape);
        world.addBody(body);

        syncList.push({
            body: body,
            mesh: null, // No mesh to sync
            name: 'PersonTrigger',
            type: 'static'
        });
    }

    if (cameraController.getTarget()) {
      cameraController.focus(currentSceneGroup)
    }

    // Initialize scene manager dựa trên scene type
    if (currentSceneManager) {
      currentSceneManager.reset()
      currentSceneManager = null
    }
    if (asset.name === "Pilot Room") {
      currentSceneManager = new Scene1Manager(currentSceneGroup, destroySystem, scene)
      
      // ✨ NEW: Only show GameOverScreen in gameplay mode (not in SimulationTest/Inspector)
      if (gameplayMode) {
        gameOverScreen = new GameOverScreen(asset.name, 0, onBack, cameraController)
        
        // Register callback with Scene1Manager for gameplay mode
        currentSceneManager.setGameOverCallback((reason, completionTime) => {
          isResumeRequested = false
          if (pauseMenuScreen && pauseMenuScreen.isVisible) {
            pauseMenuScreen.hide()
          }
          const sceneName = reason === 'elevator' ? `${asset.name} - COMPLETED` : `${asset.name} - FAILED`
          gameOverScreen.sceneName = sceneName
          gameOverScreen.completionTime = completionTime
          gameOverScreen.reason = reason  // ✨ Set reason for status message
          gameOverScreen.show()
        })
      }
      
      // Initialize scene manager's spawning system
      const guyAsset = objects.find(obj => obj.name === 'Guy')
      if (guyAsset) {
        currentSceneManager.initializeSpawning(
          spawnerSpawn,
          guyAsset,
          world,
          physicsMaterials,
          syncList,
          particleManager,
          SIMULATION_CONFIG,
          renderer
        )
      } else {
        console.warn('[SimulationTest] Guy asset not found, spawning disabled')
      }
      
      // Spawn test portal doors below the floor
      const door1Asset = objects.find(o => o.name === 'Door (Portal 1)')
      const door2Asset = objects.find(o => o.name === 'Door (Portal 2)')
      
      if (door1Asset && door2Asset) {
        // Door 1: Front gate (left side, below floor)
        const door1Mesh = door1Asset.createMesh()
        door1Mesh.position.set(-15, -2, 10)
        const door1Body = door1Asset.createBody(physicsMaterials)
        door1Body.position.copy(door1Mesh.position)
        scene.add(door1Mesh)
        world.addBody(door1Body)
        
        // Door 2: Rear door (right side, below floor)
        const door2Mesh = door2Asset.createMesh()
        door2Mesh.position.set(15, -2, 10)
        const door2Body = door2Asset.createBody(physicsMaterials)
        door2Body.position.copy(door2Mesh.position)
        scene.add(door2Mesh)
        world.addBody(door2Body)
        
        // Link the doors together
        door1Mesh.userData.linkedDoor = { mesh: door2Mesh }
        door2Mesh.userData.linkedDoor = { mesh: door1Mesh }
        
        // Add to syncList
        syncList.push({
          body: door1Body,
          mesh: door1Mesh,
          name: 'Door (Portal 1)',
          type: 'static'
        })
        syncList.push({
          body: door2Body,
          mesh: door2Mesh,
          name: 'Door (Portal 2)',
          type: 'static'
        })
        
        console.log('✓ Test portal doors spawned below floor')
      }
    }

    const tableObj = currentSceneGroup.getObjectByName("Billiard Table")
    
    if (tableObj && tableObj.userData && tableObj.userData.tableDimensions && tableObj.userData.tableDimensions.clothColor) {
      physicsEventManager.setTableColor(tableObj.userData.tableDimensions.clothColor);
    }

    destroySystem.setTable(tableObj)

    // ✨ Process physics for dynamic scene objects (like Elevator Door)
    // NOTE: Skip 'Billiard Table' since it's already handled by the code below (merged into root.userData.physics)
    currentSceneGroup.traverse((child) => {
      if (child === currentSceneGroup) return  // Skip root
      if (child.name === "Billiard Table") return  // Skip Billiard Table (handled by code below)
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
              (def.height || 0) * scaleY,
              16
            )
          }

          if (!shape) return

          const body = new CANNON.Body({
            mass: 0,
            material: physicsMaterials[def.material || phys.material] || physicsMaterials.default,
            collisionFilterGroup: COLLISION_GROUPS.STATIC,
            collisionFilterMask: COLLISION_MASKS.STATIC,
          })

          if (def.isTrigger) {
            body.collisionFilterMask = 0
            body.collisionResponse = false
            shape.collisionResponse = false
          }

          // Apply local offset in the object's rotated space so hitboxes follow object orientation.
          if (def.offset) {
            const worldOffset = new THREE.Vector3(
              (def.offset[0] || 0) * scaleX,
              (def.offset[1] || 0) * scaleY,
              (def.offset[2] || 0) * scaleZ
            ).applyQuaternion(childWorldQuaternion)

            body.position.set(
              childWorldPosition.x + worldOffset.x,
              childWorldPosition.y + worldOffset.y,
              childWorldPosition.z + worldOffset.z
            )
          } else {
            body.position.set(childWorldPosition.x, childWorldPosition.y, childWorldPosition.z)
          }
          
          // Body orientation follows object orientation unless an explicit override is provided.
          if (def.rotation) {
            body.quaternion.setFromEuler(...def.rotation)
          } else {
            body.quaternion.set(
              childWorldQuaternion.x,
              childWorldQuaternion.y,
              childWorldQuaternion.z,
              childWorldQuaternion.w
            )
          }

          body.addShape(shape)
          body.name = child.name || 'DynamicSceneObject'
          world.addBody(body)
          sceneBodies.push(body)

          syncList.push({
            body,
            mesh: child,
            type: def.isTrigger ? 'trigger' : 'static',
            name: child.name || 'scene_object',
            debugColor: def.debugColor || undefined
          })
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

        const body = new CANNON.Body({
          mass: 0,
          material: physicsMaterials[def.material || phys.material] || physicsMaterials.default,
          collisionFilterGroup: COLLISION_GROUPS.STATIC,
          collisionFilterMask: COLLISION_MASKS.STATIC,
        })

        if (def.isTrigger) {
          body.collisionFilterMask = 0
          body.collisionResponse = false
          shape.collisionResponse = false
        }
        
        if (def.material === 'rail') {
            body.collisionFilterGroup = COLLISION_GROUPS.RAIL;
            body.collisionFilterMask = COLLISION_MASKS.RAIL;
        }

        if (def.offset) body.position.set(...def.offset)
        if (def.rotation) body.quaternion.setFromEuler(...def.rotation)

        body.addShape(shape)
        body.name = asset.name || 'SceneObject' // Set body name for debugging
        world.addBody(body)
        sceneBodies.push(body)

        syncList.push({
          body,
          type: def.isTrigger ? 'trigger' : 'static',
          name: asset.name || 'scene',
          debugColor: def.debugColor || undefined
        })
        CollisionManager.addHitboxForObject(syncList[syncList.length - 1]);
      })
    }
    updateUIText();
  }

  const basePixelRatio = Math.min(window.devicePixelRatio || 1, RENDER_PERF_CONFIG.maxDevicePixelRatio)
  let renderScale = Math.max(
    RENDER_PERF_CONFIG.minScale,
    Math.min(RENDER_PERF_CONFIG.maxScale, RENDER_PERF_CONFIG.startupScale)
  )
  let currentPixelRatio = basePixelRatio
  let fpsAccumSec = 0
  let fpsFrameCount = 0
  let perfAdjustCooldownSec = 0
  let startupPerfTimer = 0

  const applyRenderResolution = (force = false) => {
    const nextPixelRatio = Math.max(
      0.5,
      Math.min(basePixelRatio, basePixelRatio * renderScale)
    )

    if (!force && Math.abs(nextPixelRatio - currentPixelRatio) < 0.01) {
      return
    }

    currentPixelRatio = nextPixelRatio
    renderer.setPixelRatio(currentPixelRatio)
    // Keep CSS size fullscreen; only internal resolution changes for performance.
    renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  renderer.domElement.style.width = '100vw'
  renderer.domElement.style.height = '100vh'
  renderer.domElement.style.display = 'block'

  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  applyRenderResolution(true)

  const cameraController = new ThirdPersonCameraController(renderer)
  const camera = cameraController.camera
  camera.userData = camera.userData || {}
  camera.userData.cameraController = cameraController
  const uiManager = new UIManager()
  uiManager.setCamera(camera)
  cameraController.setUIManager(uiManager)
  
  // ✨ Debug: Log initial camera state
  console.log('%c[SimulationTest] Camera initialized', 'color: #0099ff; font-weight: bold')
  console.log('  - isControlEnabled:', cameraController.isControlEnabled)
  console.log('  - Cursor style:', cameraController.renderer.domElement.style.cursor)
  console.log('  - Crosshair display:', cameraController.crosshair ? cameraController.crosshair.style.display : 'N/A')
  
  // ✨ Set scene for camera collision detection
  cameraController.setScene(scene)
  
  // Set gameplay mode - locks camera on player, disables spectator
  cameraController.setGameplayMode(gameplayMode)
  
  // ✨ Camera starts LOCKED in both Play and Simulator modes (hold C to unlock, release C to lock)
  cameraController.enableControl()

  const world = new CANNON.World()
  world.gravity.set(0, -9.82, 0)
  const physicsMaterials = setupContactMaterials(world)

  const playerMovement = new PlayerMovementController(camera, scene, physicsMaterials, renderer.domElement)
  const characterControllers = new Map()
  const guyAIControllers = new Map()
  const dudeAIControllers = new Map()
  const guideAIControllers = new Map()
  const dummyAIControllers = new Map()
  const ball8AIControllers = new Map()
  const bowlingAIControllers = new Map()
  const compuneAIControllers = new Map()

  let lightController = setupSceneLighting(scene, renderer, {
    fogType: 'none',
    fogColor: 0x111111,
    shadows: true,
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

  const sceneBodies = []

  let currentSceneGroup = null
  let currentSceneManager = null
  let lastTime = performance.now()

  const syncList = []
  const objects = createAllGameObjects(renderer)

  const destroySystem = new DestroySystem({ syncList, world, scene })

  const particleManager = new ParticleManager(scene)

  destroySystem.setParticleManager(particleManager)
  
  // Pass syncList and destroySystem to playerMovement for Ball 8 destruction on cue stroke
  playerMovement.setSyncListAndDestroySystem(syncList, destroySystem)
  
  // Pass particleManager to playerMovement for spawning effects
  playerMovement.setParticleManager(particleManager)

  const physicsEventManager = new PhysicsEventManager({ particleManager, syncList })

  let possessed = null

  destroySystem.setOnDestroy(entry => {
    if (entry?.name === 'Player' && typeof playerMovement.clearImpactEffects === 'function') {
      playerMovement.clearImpactEffects()
    }

    if (entry === possessed) {
      if (possessed.name === 'Player') {
        playerMovement.dropAllCarriedItems(false)
        playerMovement.removeCueBody()
        if (possessed.mesh && possessed.mesh.userData.removeCue) {
          possessed.mesh.userData.removeCue()
        }
        playerMovement.cueActive = false
        
        // ✨ NEW: Notify Scene1Manager that player was destroyed
        if (gameplayMode && currentSceneManager) {
          currentSceneManager.onPlayerDestroyed()
        }
      }
      possessed = null
      cameraController.clearFocus()
    }
    if (entry && entry.mesh) {
      fakeShadowManager.removeShadow(entry.mesh)
    }
    if (entry && entry.mesh) {
      const pos = entry.mesh.position.clone()
      if (!entry._destroyFxSpawned) {
        particleManager.spawn('smoke', pos)
      }
      if (typeof particleManager.clearVeinForOwner === 'function') {
        particleManager.clearVeinForOwner(entry.mesh)
      }
    }
    // Cleanup AI controllers when character/ball is destroyed
    if (guyAIControllers.has(entry)) {
      guyAIControllers.delete(entry)
    }
    if (dudeAIControllers.has(entry)) {
      dudeAIControllers.delete(entry)
    }
    if (guideAIControllers.has(entry)) {
      const guideAI = guideAIControllers.get(entry)
      if (guideAI && typeof guideAI.dispose === 'function') {
        guideAI.dispose()
      }
      guideAIControllers.delete(entry)
    }
    if (dummyAIControllers.has(entry)) {
      dummyAIControllers.delete(entry)
    }
    if (ball8AIControllers.has(entry)) {
      ball8AIControllers.delete(entry)
    }
    if (bowlingAIControllers.has(entry)) {
      const bowlingAI = bowlingAIControllers.get(entry)
      if (bowlingAI && typeof bowlingAI.dispose === 'function') {
        bowlingAI.dispose()
      }
      bowlingAIControllers.delete(entry)
    }
    if (compuneAIControllers.has(entry)) {
      const compuneAI = compuneAIControllers.get(entry)
      if (compuneAI && typeof compuneAI.cleanup === 'function') {
        compuneAI.cleanup()
      }
      compuneAIControllers.delete(entry)
    }
    CollisionManager.removeHitboxForObject(entry)
  })

  let animationId
  let gameOverScreen = null
  let pauseMenuScreen = null
  let isResumeRequested = false
  let resumeAttemptToken = 0

  function isGameOverUIVisible() {
    return !!(gameOverScreen && gameOverScreen.isVisible)
  }

  function isPauseMenuVisible() {
    return !!(pauseMenuScreen && pauseMenuScreen.isVisible)
  }

  function stopPlayerMovementForPause() {
    playerMovement.disableInput()
    if (possessed && possessed.body) {
      possessed.body.velocity.set(0, possessed.body.velocity.y, 0)
    }
  }

  function enterPauseMenu() {
    isResumeRequested = false
    stopPlayerMovementForPause()
    if (pauseMenuScreen && !pauseMenuScreen.isVisible) {
      pauseMenuScreen.show()
    }

    if (document.pointerLockElement === renderer.domElement) {
      try {
        document.exitPointerLock()
      } catch (err) {
        console.warn('[PauseMenu] Failed to exit pointer lock:', err)
      }
    }
  }

  function focusGameCanvas() {
    if (document.activeElement && document.activeElement !== document.body && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur()
    }
    renderer.domElement.setAttribute('tabindex', '0')
    renderer.domElement.focus({ preventScroll: true })
  }

  function lockCameraFromPauseResume() {
    isResumeRequested = true
    const attemptToken = ++resumeAttemptToken

    if (document.pointerLockElement === renderer.domElement) {
      isResumeRequested = false
      if (pauseMenuScreen && pauseMenuScreen.isVisible) {
        pauseMenuScreen.hide()
      }
      playerMovement.enableInput()
      return
    }

    const recoverPauseIfUnlocked = () => {
      if (attemptToken !== resumeAttemptToken) return
      if (!gameplayMode || isGameOverUIVisible()) return
      if (document.pointerLockElement === renderer.domElement) return
      enterPauseMenu()
    }

    // Fallback for browsers that fail pointer lock silently (no rejection callback).
    window.setTimeout(() => {
      if (attemptToken !== resumeAttemptToken) return
      if (!isResumeRequested) return
      if (document.pointerLockElement === renderer.domElement) return
      recoverPauseIfUnlocked()
    }, 300)

    try {
      const lockPromise = renderer.domElement.requestPointerLock()
      if (lockPromise && typeof lockPromise.catch === 'function') {
        lockPromise.catch((err) => {
          console.warn('[PauseMenu] Pointer lock request rejected:', err)
          recoverPauseIfUnlocked()
        })
      }
    } catch (err) {
      console.warn('[PauseMenu] Pointer lock request failed:', err)
      recoverPauseIfUnlocked()
    }
  }

  if (gameplayMode) {
    pauseMenuScreen = new PauseMenuScreen(
      () => {
        if (isGameOverUIVisible()) return
        lockCameraFromPauseResume()
      },
      () => {
        console.log('[PauseMenu] Settings placeholder clicked')
      },
      () => {
        if (cleanupFn) cleanupFn()
        onBack()
      }
    )
  }

  CollisionManager.init({ scene, syncList, sceneObjects: [] });

  const hitboxText = document.createElement("div")
  hitboxText.style.position = "absolute"
  hitboxText.style.bottom = "20px"
  hitboxText.style.left = "20px"
  hitboxText.style.color = "white"
  hitboxText.style.backgroundColor = "rgba(0,0,0,0.5)"
  hitboxText.style.padding = "5px 10px"
  hitboxText.style.borderRadius = "5px"
  hitboxText.style.fontFamily = "Arial"
  hitboxText.style.whiteSpace = "pre"
  hitboxText.style.zIndex = "1000"
  // ✨ Only show hitbox display UI in simulator (not in gameplay mode)
  hitboxText.style.display = gameplayMode ? "none" : "block"
  hitboxText.textContent = "Display: Normal (P) | Spawn: R (1.2s, max 30 objs)\nSpectator: WASD + Space/Shift"
  document.body.appendChild(hitboxText)

  function updateUIText() {
    const modeStr = CollisionManager.getVisibilityStateString()
    if (gameplayMode) {
      hitboxText.textContent = `Display: ${modeStr} (P)`
    } else {
      hitboxText.textContent = `Display: ${modeStr} (P) | Spawn: R (1.2s, max 30 objs)\nSpectator: WASD + Space/Shift`
    }
  }

  const scenes = sceneAssets
  if (scenes.length) {
    const loadIndex = gameplayMode ? Math.min(sceneIndex, scenes.length - 1) : 0
    spawnSceneAsset(scenes[loadIndex])
    CollisionManager.setSceneObjects(currentSceneGroup)
    updateUIText()
  }

  const dynamicPrefabs = objects.filter(o => o.type === "dynamic")
  const spawnableDynamicPrefabs = dynamicPrefabs.filter(o => o.excludeFromSimulationSpawn !== true)

  // Auto-spawn player in gameplay mode
  if (gameplayMode && currentSceneGroup) {
    setTimeout(() => {
      const playerAsset = dynamicPrefabs.find(o => o.name === 'Player')
      if (playerAsset && currentSceneManager) {
        // ✨ Use Scene1Manager to spawn player at proper position
        const playerEntry = currentSceneManager.spawnPlayer(playerAsset, scene)
        
        if (playerEntry && playerEntry.mesh) {
          possessed = playerEntry
          playerEntry.mesh.userData.createCue && playerEntry.mesh.userData.createCue()
          playerMovement.cueActive = true
          playerMovement.enableInput()  // ✨ Re-enable input for player control
          cameraController.focus(playerEntry.mesh)
          // ✨ Camera starts unlocked - user presses C to lock it
        }
      }
    }, 100)
  }


  function spawnRandom() {
    const dynamicObjectCount = syncList.filter(e => e.type === 'dynamic').length
    if (dynamicObjectCount >= SIMULATION_CONFIG.maxObjectsInScene) {
      return
    }

    let baseY = 0
    const table = currentSceneGroup.getObjectByName("Billiard Table")
    if (table && table.userData && table.userData.tableDimensions) {
      baseY = table.userData.tableDimensions.topY || 0
    }

    spawnerSpawnRandom({
      scene,
      dynamicPrefabs: spawnableDynamicPrefabs,
      world,
      physicsMaterials,
      syncList,
      particleManager,
      height: 12,
      baseY
    })
  }

  const container = document.createElement("div")
  container.classList.add("page-ui")
  container.style.position = "absolute"
  container.style.top = "20px"
  container.style.left = "20px"
  container.style.zIndex = "1000"
  container.style.display = gameplayMode ? "none" : "flex"
  container.style.gap = "10px"
  document.body.appendChild(container)

  // ✨ Scene dropdown removed - simulator always loads Pilot Room by default

  const select = document.createElement("select")
  select.style.padding = "8px"
  select.style.fontSize = "16px"
  select.style.backgroundColor = "#333"
  select.style.color = "white"
  select.style.border = "1px solid #666"
  select.style.borderRadius = "4px"
  select.style.minWidth = "150px"

  const defaultOption = document.createElement("option")
  defaultOption.textContent = "Spawn Specific Object"
  defaultOption.value = ""
  select.appendChild(defaultOption)

  spawnableDynamicPrefabs.forEach((asset, index) => {
    const option = document.createElement("option")
    option.value = index
    option.textContent = asset.name || `Object ${index}`
    select.appendChild(option)
  })

  select.addEventListener("focus", () => {
    if (!gameplayMode) {
      playerMovement.disableInput()  // ✨ Disable input while dropdown is open
      playerMovement.resetKeys()
    }
  })

  container.appendChild(select)

  function spawnSelected(index) {
    const prefab = spawnableDynamicPrefabs[index]
    if (!prefab) return
    const pos = randomPositionAboveTable(8)
    spawnerSpawn({scene, prefab, position: pos, world, physicsMaterials, syncList, particleManager})
  }

  select.addEventListener("change", () => {
    if (select.value === "") return
    spawnSelected(Number(select.value))
    select.value = ""
    select.blur()
    playerMovement.enableInput()  // ✨ Re-enable input when dropdown closes
  })

  // ✨ Scene selection removed - Pilot Room always loaded by default

  let spawnIntervalId = null

  function startSpawning() {
    if (spawnIntervalId !== null) return
    // Don't auto-spawn in gameplay mode
    if (gameplayMode) return
    spawnIntervalId = setInterval(() => {
      if (!possessed) spawnRandom()
    }, SIMULATION_CONFIG.spawnRateMs)
  }

  function stopSpawning() {
    if (spawnIntervalId !== null) {
      clearInterval(spawnIntervalId)
      spawnIntervalId = null
    }
  }

  function onKeyDown(e) {
    if (e.target === select) {
      return;
    }

    // Disable spectator controls in gameplay mode
    if (gameplayMode) {
      if (isPauseMenuVisible()) {
        if (e.code === "Escape") {
          e.preventDefault()
        }
        return
      }

      if (e.code === "Escape") {
        e.preventDefault()
        if (isGameOverUIVisible()) {
          return
        }
        // ESC only opens pause UI and shows cursor.
        enterPauseMenu()
        return
      }

      // Ignore all non-Escape keys in gameplay-level key handler.
      return
    }

    if (e.code === "KeyR" && !possessed) {
      startSpawning()
    }
    // L key only works in simulator: start Section 1 elevator countdown
    if (e.code === "KeyL" && !gameplayMode) {
      if (!e.repeat && currentSceneManager && typeof currentSceneManager.startElevatorCountdown === 'function') {
        currentSceneManager.startElevatorCountdown()
      }
      return
    }
    // ✨ P key only works in simulator, not in gameplay mode
    if (e.code === "KeyP" && !gameplayMode) {
      CollisionManager.cycleVisibilityMode()
      updateUIText()
    }
    if (e.code === "Escape" && !gameplayMode) {
      // ✨ Synchronized with gameplay mode: just disable input + exit pointer lock
      // Keep possessed object so _handleMovement keeps zeroing velocity each frame
      playerMovement.disableInput()
      if (possessed && possessed.body) {
        possessed.body.velocity.set(0, possessed.body.velocity.y, 0)
      }
      cameraController.disableControlOnly()
    }
  }

  function onKeyUp(e) {
    if (e.code === "KeyR") {
      stopSpawning()
    }
    // ✨ PlayerMovementController._onKeyUp handles WASD key releases automatically
  }

  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)

  // ✨ Catch pointer lock exit to prevent ghost movement
  // Browser may swallow Escape keydown during pointer lock, so onKeyDown(Escape) never fires.
  // This handler reliably detects pointer lock exit regardless of how it happened.
  function onPointerLockChange() {
    const locked = document.pointerLockElement === renderer.domElement

    if (gameplayMode && locked) {
      if (isResumeRequested) {
        isResumeRequested = false
        resumeAttemptToken++
        if (pauseMenuScreen && pauseMenuScreen.isVisible) {
          pauseMenuScreen.hide()
        }
        focusGameCanvas()
        playerMovement.enableInput()
        return
      }

      if (isPauseMenuVisible()) {
        // Pause menu must never keep camera locked.
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
      if (isResumeRequested) {
        // Wait for current resume attempt result (success or timeout recovery).
        stopPlayerMovementForPause()
        return
      }

      // Always keep gameplay paused while camera is unlocked.
      if (!isGameOverUIVisible() && !isPauseMenuVisible()) {
        if (isResumeRequested) {
          isResumeRequested = false
        }
        enterPauseMenu()
      } else if (!isGameOverUIVisible()) {
        if (isResumeRequested) {
          isResumeRequested = false
        }
        stopPlayerMovementForPause()
      }
    } else if (locked) {
      // Pointer lock regained (user clicked to resume) → re-enable input
      playerMovement.enableInput()
    }
  }
  document.addEventListener("pointerlockchange", onPointerLockChange)

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  function onClick(event) {
    // Gameplay mode is locked to player possession only.
    if (gameplayMode) return

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
        if (possessed.mesh.userData.removeCue) {
          possessed.mesh.userData.removeCue()
        }
        playerMovement.cueActive = false
      }
      if (entry) {
        possessed = entry
        playerMovement.enableInput()  // ✨ Re-enable input when possessing new object
        if (possessed.name === 'Player') {
          playerMovement.cueActive = true
          if (possessed.mesh.userData.createCue) {
            possessed.mesh.userData.createCue()
          }
        }
        cameraController.focus(entry.mesh)
      }
    }
  }

  renderer.domElement.addEventListener("click", onClick)

  function onResize() {
    applyRenderResolution(true)
  }
  window.addEventListener("resize", onResize)

  function updateAdaptiveRenderResolution(rawDelta) {
    if (!Number.isFinite(rawDelta) || rawDelta <= 0) return

    startupPerfTimer += rawDelta

    fpsAccumSec += rawDelta
    fpsFrameCount += 1
    perfAdjustCooldownSec = Math.max(0, perfAdjustCooldownSec - rawDelta)

    const inStartupWindow = startupPerfTimer < RENDER_PERF_CONFIG.startupDurationSec
    const scaleCap = inStartupWindow
      ? Math.min(RENDER_PERF_CONFIG.maxScale, RENDER_PERF_CONFIG.startupMaxScale)
      : RENDER_PERF_CONFIG.maxScale

    if (renderScale > scaleCap) {
      renderScale = scaleCap
      applyRenderResolution()
    }

    if (fpsAccumSec < RENDER_PERF_CONFIG.sampleWindowSec) return

    const fps = fpsFrameCount / fpsAccumSec
    fpsAccumSec = 0
    fpsFrameCount = 0

    if (perfAdjustCooldownSec > 0) return

    if (fps < RENDER_PERF_CONFIG.downshiftFps && renderScale > RENDER_PERF_CONFIG.minScale) {
      renderScale = Math.max(RENDER_PERF_CONFIG.minScale, renderScale - RENDER_PERF_CONFIG.scaleStepDown)
      perfAdjustCooldownSec = RENDER_PERF_CONFIG.adjustCooldownSec
      applyRenderResolution()
      return
    }

    if (fps > RENDER_PERF_CONFIG.upshiftFps && renderScale < scaleCap) {
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
      if (entry.body.userData.bowlingSpawnOrder == null) {
        entry.body.userData.bowlingSpawnOrder = performance.now()
      }
    })

    bowlingEntries.sort((a, b) => {
      const aOrder = a.body?.userData?.bowlingSpawnOrder ?? 0
      const bOrder = b.body?.userData?.bowlingSpawnOrder ?? 0
      return aOrder - bOrder
    })

    // Keep newest bowling ball, remove all older ones.
    const outdatedEntries = bowlingEntries.slice(0, -1)
    outdatedEntries.forEach(entry => destroySystem.destroyObject(entry))
  }

  function cleanupPlayerChargeUI() {
    if (playerMovement.isCharging()) {
      playerMovement.cancelCharge()
    }
    uiManager.hidePlayerUI()
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    const currentTime = performance.now()
    const rawDelta = (currentTime - lastTime) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTime = currentTime
    updateAdaptiveRenderResolution(rawDelta)

    // ✨ Update GameOverScreen timer and auto-return (must be before early return)
    if (gameOverScreen && gameplayMode) {
      gameOverScreen.update(delta)
    }

    // ✨ NEW: Stop all updates if game is over in gameplay mode
    if (gameplayMode && currentSceneManager && currentSceneManager.gameOver) {
      cleanupPlayerChargeUI()
      // Still render, but don't update physics, AI, or player movement
      renderer.render(scene, cameraController.camera)
      return
    }

    if (gameplayMode && isPauseMenuVisible() && !isGameOverUIVisible()) {
      cleanupPlayerChargeUI()
      renderer.render(scene, cameraController.camera)
      return
    }

    if (!hasPlayerCameraAttachment()) {
      cleanupPlayerChargeUI()
    }

    if (possessed) {
      playerMovement.update(possessed.body, possessed.mesh, cameraController)
      
      if (possessed.name === "Player" && hasPlayerCameraAttachment()) {
        if (playerMovement.isCharging()) {
          if (playerMovement.cueBody && !playerMovement.cueBody.userData?.hitboxAdded) {
            CollisionManager.addHitboxForObject({ 
              body: playerMovement.cueBody, 
              name: 'Cue', 
              type: 'kinematic' 
            })
            if (!playerMovement.cueBody.userData) playerMovement.cueBody.userData = {}
            playerMovement.cueBody.userData.hitboxAdded = true
          }
          if (playerMovement.forceBody && !playerMovement.forceBody.userData?.hitboxAdded) {
            CollisionManager.addHitboxForObject({ 
              body: playerMovement.forceBody, 
              name: 'Force', 
              type: 'trigger' 
            })
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
        uiManager.updateChargeIndicator(false)
        uiManager.updateChargeLine(false)
        uiManager.updatePowerBar(false)
      }
    }

    enforceSingleBowlingBall()

    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body || entry.name === 'Player' || entry.type !== 'dynamic' || entry.body.userData?.physicsEventRegistered === undefined) {
        return
      }
      if (entry.name.includes('Ball')) return

      const characterName = entry.name
      if (!characterControllers.has(characterName)) {
        characterControllers.set(characterName, new CharacterController(camera))
      }
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
        if (targetYaw !== null) {
          charController.setBodyYaw(entry.mesh, targetYaw)
          entry.mesh.rotation.y = targetYaw
        }
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

        if (result && result.targetYaw !== null) {
          charController.setBodyYaw(entry.mesh, result.targetYaw)
          entry.mesh.rotation.y = result.targetYaw
        }

        if (result && result.opacity !== undefined) {
          entry.mesh.traverse((child) => {
            if (child.material) {
              child.material.transparent = true
              child.material.opacity = result.opacity
            }
          })
        }

        if (result && result.touchedPlayer && currentSceneManager && typeof currentSceneManager.onPenaltyDudeTouchedPlayer === 'function') {
          currentSceneManager.onPenaltyDudeTouchedPlayer()
        }

        if (result && result.shouldDespawn) {
          destroySystem.destroyCharacter(entry)
          return
        }
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
        if (result && result.targetYaw !== null) {
          charController.setBodyYaw(entry.mesh, result.targetYaw)
          entry.mesh.rotation.y = result.targetYaw
        }

        if (result && result.touchedGuy && result.touchedGuy !== entry) {
          destroySystem.destroyCharacter(result.touchedGuy)
        }

        // Guide AI movement should drive leg gait like controlled movement.
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
        if (result && result.targetYaw !== null) {
          charController.setBodyYaw(entry.mesh, result.targetYaw)
          entry.mesh.rotation.y = result.targetYaw
        }

        // Dummy AI movement should drive leg gait like controlled movement.
        charController.updateWalkAnimation(entry.mesh, entry.body, delta, 1.0)
      }

      // Keep carried stick attached even when Guide is currently possessed.
      if (characterName === 'Guide' && entry === possessed && guideAIControllers.has(entry)) {
        const guideAI = guideAIControllers.get(entry)
        if (guideAI && typeof guideAI.syncCarriedItem === 'function') {
          guideAI.syncCarriedItem(delta)
        }
      }

      // Ball 8 AI logic
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

      // Compune AI logic
      if (characterName === 'Compune') {
        // Check if CompuneAI was already created by Scene1Manager (for Scene1 compunes)
        // If not, create it with simulator dialog (for simulator compunes)
        let compuneAI = entry.body.userData?.compuneAI
        if (!compuneAI) {
          // Scene1Manager didn't create it, so use simulator dialog
          compuneAI = new CompuneAI(entry.mesh, entry.body, scene)
          compuneAI.setDialog(SIMULATOR_COMPUNES.default)  // "Hello world!"
          if (!entry.body.userData) entry.body.userData = {}
          entry.body.userData.compuneAI = compuneAI
        }
        compuneAIControllers.set(entry, compuneAI)
        compuneAI.update(delta, syncList)

        // Despawn is handled by DestroySystem.checkCharacterDestroyConditions()
        // when compuneAI.state === 'disconnecting' for 10+ seconds
      }
    })

    // Update Ball 8 AI separately since balls are excluded from main character loop
    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body || entry.name !== 'Ball 8') {
        return
      }

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

    // Update Bowling Ball AI separately
    syncList.forEach(entry => {
      if (!entry.mesh || !entry.body) return
      if (!isBowlingEntry(entry)) return

      if (!entry.body.userData) entry.body.userData = {}
      entry.body.userData.isBowlingBall = true
      if (entry.body.userData.bowlingSpawnOrder == null) {
        entry.body.userData.bowlingSpawnOrder = performance.now()
      }
      if (entry.body.userData.bowlingDespawnAt == null) {
        const lifeRange = SIMULATION_CONFIG.bowlingLifetimeMaxMs - SIMULATION_CONFIG.bowlingLifetimeMinMs
        const lifeMs = SIMULATION_CONFIG.bowlingLifetimeMinMs + Math.random() * lifeRange
        entry.body.userData.bowlingDespawnAt = Date.now() + lifeMs
      }
      if (Date.now() >= entry.body.userData.bowlingDespawnAt) {
        destroySystem.destroyObject(entry)
        return
      }

      if (entry.mesh?.userData) {
        entry.mesh.userData.isBowlingBall = true
      }

      if (!bowlingAIControllers.has(entry)) {
        const bowlingAI = new BowlingAI(entry.mesh, entry.body)
        bowlingAIControllers.set(entry, bowlingAI)
        entry.body.userData.bowlingAI = bowlingAI
      }

      const bowlingAI = bowlingAIControllers.get(entry)
      const result = bowlingAI.update(delta, syncList, entry)

      if (typeof particleManager.setVeinState === 'function') {
        const isAngry = typeof bowlingAI.getAngryState === 'function' ? bowlingAI.getAngryState() : false
        particleManager.setVeinState(entry.mesh, isAngry, { offsetY: 0.95 })
      }

      if (result && result.targetYaw !== null) {
        entry.mesh.rotation.y = result.targetYaw
      }

      if (result && result.touchedTarget && result.touchedTarget !== entry) {
        const target = result.touchedTarget
        const targetName = target.name || ''
        const isCharacter = ['Player', 'Guy', 'Dude', 'Compune'].includes(targetName)
        if (isCharacter && typeof destroySystem.destroyCharacter === 'function') {
          destroySystem.destroyCharacter(target)
        } else {
          destroySystem.destroyObject(target)
        }
      }
    })

    physicsEventManager.reset();

    world.step(SIMULATION_CONFIG.fixedTimeStep, delta, 3)

    bowlingAIControllers.forEach((bowlingAI, entry) => {
      if (!entry || !syncList.includes(entry)) return
      if (!bowlingAI || typeof bowlingAI.consumeLandingShockwave !== 'function') return

      const shockwavePos = bowlingAI.consumeLandingShockwave()
      if (shockwavePos) {
        particleManager.spawn('particle13', shockwavePos)
      }
    })

    syncList.forEach(pair => {
      const shouldSyncTransform = pair.type === 'dynamic' || pair.type === 'kinematic'
      if (pair.body && pair.mesh && shouldSyncTransform) {
        pair.mesh.position.copy(pair.body.position)
        const isCharacter = ['Player', 'Guy', 'Dude', 'Guide', 'Dummy', 'Compune'].includes(pair.name)
        if (!isCharacter) {
          pair.mesh.quaternion.copy(pair.body.quaternion)
        }
      }
      if (pair.body) {
        if (!pair.body.userData) {
          pair.body.userData = {}
        }
        if (!pair.body.userData.physicsEventRegistered) {
          const isDynamicCharacter = ['Player', 'Guy', 'Dude', 'Guide', 'Dummy', 'Compune'].includes(pair.name)
          if (pair.name && (pair.name.includes('Ball') || isDynamicCharacter)) {
            physicsEventManager.registerBody(pair.body)
            pair.body.userData.physicsEventRegistered = true
          }
        }
      }
    })

    if (possessed && possessed.name === 'Player') {
      playerMovement.syncCarriedItemsPosition(delta, possessed.mesh)
    }

    syncList.forEach(entry => {
      if (entry.type === 'dynamic' && entry.mesh && entry.mesh.userData.shadowConfig) {
        if (!entry.mesh.userData.hasFakeShadow) {
          const config = entry.mesh.userData.shadowConfig
          fakeShadowManager.addShadow(entry.mesh, config)
          entry.mesh.userData.hasFakeShadow = true
        }
      }
    })

    fakeShadowManager.update()
    CollisionManager.update()
    destroySystem.update()
    particleManager.update(delta)
    
    // Update scene manager (handles ball spawning, compune despawn, etc)
    if (currentSceneManager) {
      currentSceneManager.update(delta, world, syncList, particleManager, camera)
    }

    syncList.forEach(entry => {
      if (entry.mesh && entry.mesh.userData && typeof entry.mesh.userData.update === 'function') {
        entry.mesh.userData.update(delta, particleManager)
      }
    })

    cameraController.update(delta)
    renderer.render(scene, camera)
  }

  animate()

  cleanupFn = function cleanup() {
    const simBackBtn = document.getElementById("simulationBackButton")
    if (simBackBtn) simBackBtn.remove()
    
    cancelAnimationFrame(animationId)
    window.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("keyup", onKeyUp)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("pointerlockchange", onPointerLockChange)
    renderer.domElement.removeEventListener("click", onClick)
    select.remove()
    hitboxText.remove()
    if (cameraController.dispose) cameraController.dispose()
    
    // Cleanup compunes
    compuneAIControllers.forEach(compuneAI => compuneAI.cleanup())
    compuneAIControllers.clear()
    dudeAIControllers.clear()
    dummyAIControllers.clear()
    
    CollisionManager.dispose()

    // Cleanup scene manager
    if (currentSceneManager) {
      currentSceneManager.reset()
      currentSceneManager = null
    }

    // Cleanup UI manager
    if (uiManager) {
      uiManager.dispose()
    }

    if (pauseMenuScreen) {
      pauseMenuScreen.destroy()
      pauseMenuScreen = null
    }

    fakeShadowManager.clearAll()
    
    syncList.forEach(pair => {
      if (pair.body) world.removeBody(pair.body)
      if (pair.mesh) scene.remove(pair.mesh)

    })
    scene.clear()
  }

  return cleanupFn
}