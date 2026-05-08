import * as THREE from "three"
import { sceneAssets } from "../assets/sceneAssets.js"
import { startSimulationTest } from "./SimulationTest.js"
import { IT_STYLE } from "../main.js"
import { preloadCoreAssets } from "../assets/preloadAssets.js"
import { runWithLoadingOverlay } from "../utils/loadingOverlay.js"
import { DEFAULT_PLAYER_CUSTOMIZATION, PLAYER_EAR_TYPES, normalizePlayerCustomization } from "../utils/playerCustomization.js"
import { getPlayerAsset } from "../assets/objects/Player.js"

const PLAYER_CUSTOMIZATION_STORAGE_KEY = "brawlards.playerCustomization"

function loadStoredPlayerCustomization() {
  try {
    const rawValue = window.localStorage.getItem(PLAYER_CUSTOMIZATION_STORAGE_KEY)
    if (!rawValue) return normalizePlayerCustomization(DEFAULT_PLAYER_CUSTOMIZATION)

    return normalizePlayerCustomization(JSON.parse(rawValue))
  } catch (error) {
    console.warn("Failed to load player customization:", error)
    return normalizePlayerCustomization(DEFAULT_PLAYER_CUSTOMIZATION)
  }
}

function saveStoredPlayerCustomization(customization) {
  try {
    window.localStorage.setItem(
      PLAYER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify(normalizePlayerCustomization(customization))
    )
  } catch (error) {
    console.warn("Failed to save player customization:", error)
  }
}

export function startPlay(renderer, onBack) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"

  // Background overlay (black)
  const background = document.createElement("div")
  background.id = "playBackground"
  background.style.position = "fixed"
  background.style.top = "0"
  background.style.left = "0"
  background.style.width = "100%"
  background.style.height = "100%"
  background.style.backgroundColor = "#111111"
  background.style.zIndex = "99"
  document.body.appendChild(background)

  // Clear renderer scene (remove inspector meshes)
  renderer.clear()
  renderer.setClearColor(0x111111)
  renderer.render(new THREE.Scene(), new THREE.Camera())

  // Back button (bottom-right, IT style - dark red)
  const backButton = document.createElement("button")
  backButton.id = "playBackButton"
  backButton.innerText = "Back to Menu"
  IT_STYLE.applyToElement(backButton, 'backButton')
  backButton.style.position = "fixed"
  backButton.style.bottom = "20px"
  backButton.style.right = "20px"
  backButton.style.zIndex = "10000"

  backButton.onclick = () => {
    cleanup()
    onBack()
  }

  document.body.appendChild(backButton)

  // Scene selection UI (center of screen, fixed position)
  const container = document.createElement("div")
  container.id = "playContainer"
  container.classList.add("page-ui")
  container.style.position = "fixed"
  container.style.top = "50%"
  container.style.left = "50%"
  container.style.transform = "translate(-50%, -50%)"
  container.style.zIndex = "1000"
  container.style.display = "flex"
  container.style.flexDirection = "column"
  container.style.gap = "10px"
  container.style.textAlign = "center"
  document.body.appendChild(container)

  // Helper function for labels (IT box style)
  function createLabel(text, fontSize = "14px", fontWeight = "normal", color = "#ccc", withFrame = true) {
    const label = document.createElement("div")
    label.textContent = text
    label.style.padding = "10px"
    label.style.fontSize = fontSize
    label.style.fontWeight = fontWeight
    label.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    label.style.color = color
    if (withFrame) {
      label.style.backgroundColor = IT_STYLE.colors.darkBg
      label.style.border = `1px solid ${IT_STYLE.colors.accentBlue}`
      label.style.borderRadius = "0px"
      label.style.boxShadow = `0 0 10px rgba(0, 102, 255, 0.4), inset 0 0 5px rgba(0, 102, 255, 0.2)`
    }
    return label
  }

  // Scene group
  const sceneGroup = document.createElement("div")
  sceneGroup.style.display = "flex"
  sceneGroup.style.flexDirection = "column"
  sceneGroup.style.gap = "4px"
  container.appendChild(sceneGroup)

  // Scene name (green) + description
  const sceneName = createLabel(sceneAssets[0].name, "13px", "bold", "#0f0", false)
  const sceneDesc = createLabel(sceneAssets[0].description || "", "12px", "normal", "#ccc", false)
  let currentSceneIndex = 0
  let playerCustomization = loadStoredPlayerCustomization()
  let isCustomizationOpen = false
  sceneGroup.appendChild(sceneName)
  sceneGroup.appendChild(sceneDesc)

  const customizationPanel = document.createElement("div")
  customizationPanel.style.display = "flex"
  customizationPanel.style.flexDirection = "column"
  customizationPanel.style.gap = "8px"
  customizationPanel.style.marginTop = "10px"
  customizationPanel.style.padding = "10px"
  customizationPanel.style.backgroundColor = IT_STYLE.colors.darkBg
  customizationPanel.style.border = `1px solid ${IT_STYLE.colors.accentBlue}`
  customizationPanel.style.boxShadow = "0 0 10px rgba(0, 102, 255, 0.25), inset 0 0 4px rgba(0, 102, 255, 0.18)"
  sceneGroup.appendChild(customizationPanel)

  const customizationToggle = document.createElement("button")
  customizationToggle.innerText = "Customize Player"
  IT_STYLE.applyToElement(customizationToggle, "button")
  customizationToggle.style.marginTop = "0"
  customizationPanel.appendChild(customizationToggle)

  const customizationContent = document.createElement("div")
  customizationContent.style.display = "none"
  customizationContent.style.gridTemplateColumns = "minmax(260px, 320px) 260px"
  customizationContent.style.gap = "14px"
  customizationContent.style.alignItems = "start"
  customizationPanel.appendChild(customizationContent)

  const controlsColumn = document.createElement("div")
  controlsColumn.style.display = "flex"
  controlsColumn.style.flexDirection = "column"
  controlsColumn.style.gap = "8px"
  customizationContent.appendChild(controlsColumn)

  const previewColumn = document.createElement("div")
  previewColumn.style.display = "flex"
  previewColumn.style.flexDirection = "column"
  previewColumn.style.gap = "8px"
  previewColumn.style.alignItems = "center"
  customizationContent.appendChild(previewColumn)

  const customizationTitle = createLabel("Player Customization", "12px", "bold", "#9ad1ff", false)
  customizationTitle.style.padding = "0"
  controlsColumn.appendChild(customizationTitle)

  const previewFrame = document.createElement("div")
  previewFrame.style.width = "260px"
  previewFrame.style.height = "260px"
  previewFrame.style.position = "relative"
  previewFrame.style.background = "radial-gradient(circle at 35% 25%, rgba(30, 75, 150, 0.32), rgba(8, 13, 22, 0.96) 70%)"
  previewFrame.style.border = `1px solid ${IT_STYLE.colors.accentBlue}`
  previewFrame.style.boxShadow = "0 0 16px rgba(0, 102, 255, 0.28), inset 0 0 12px rgba(0, 102, 255, 0.14)"
  previewFrame.style.overflow = "hidden"
  previewColumn.appendChild(previewFrame)

  const previewMount = document.createElement("div")
  previewMount.style.position = "absolute"
  previewMount.style.inset = "0"
  previewMount.style.display = "block"
  previewFrame.appendChild(previewMount)

  const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  previewRenderer.shadowMap.enabled = true
  previewRenderer.shadowMap.type = THREE.PCFShadowMap
  previewRenderer.domElement.style.display = "block"
  previewRenderer.domElement.style.width = "100%"
  previewRenderer.domElement.style.height = "100%"
  previewMount.appendChild(previewRenderer.domElement)

  const previewScene = new THREE.Scene()
  previewScene.background = new THREE.Color(0x111111)
  const previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  const previewTargetCameraPos = new THREE.Vector3()
  const previewCurrentCameraPos = new THREE.Vector3(0, 5, 8)
  const previewObjectCenter = new THREE.Vector3()
  let previewTargetCameraDistance = 8
  let previewAutoRotateAngle = 0
  let previewObject = null
  let previewAnimationId = null

  function hasRenderableMesh(object) {
    let found = false
    object.traverse((child) => {
      if (found) return
      if (child.isMesh && !child.userData?.isTriggerBox) found = true
    })
    return found
  }

  function getPhysicsBoundsData(object) {
    const shapes = object?.userData?.physics?.shapes
    if (!Array.isArray(shapes) || shapes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    shapes.forEach((shape) => {
      const offset = shape.offset || [0, 0, 0]
      let halfX = 0.5
      let halfY = 0.5
      let halfZ = 0.5

      if (shape.type === "box" && Array.isArray(shape.size)) {
        halfX = Math.abs(shape.size[0] || 1) * 0.5
        halfY = Math.abs(shape.size[1] || 1) * 0.5
        halfZ = Math.abs(shape.size[2] || 1) * 0.5
      } else if (shape.type === "sphere") {
        const radius = Math.abs(shape.radius || 0.5)
        halfX = radius
        halfY = radius
        halfZ = radius
      } else if (shape.type === "cylinder") {
        const radius = Math.abs(shape.radius || 0.5)
        const length = Math.abs(shape.length || 1)
        halfX = radius
        halfY = length * 0.5
        halfZ = radius
      }

      minX = Math.min(minX, offset[0] - halfX)
      minY = Math.min(minY, offset[1] - halfY)
      minZ = Math.min(minZ, offset[2] - halfZ)
      maxX = Math.max(maxX, offset[0] + halfX)
      maxY = Math.max(maxY, offset[1] + halfY)
      maxZ = Math.max(maxZ, offset[2] + halfZ)
    })

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null

    return {
      size: new THREE.Vector3(maxX - minX, maxY - minY, maxZ - minZ),
      centerOffset: new THREE.Vector3((minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5)
    }
  }

  function framePreviewObject(object) {
    const box = new THREE.Box3()
    let hasMesh = false
    object.traverse((child) => {
      if (child.isMesh && !child.userData?.isTriggerBox) {
        hasMesh = true
        box.expandByObject(child)
      }
    })

    let size = box.getSize(new THREE.Vector3())
    let center = box.getCenter(new THREE.Vector3())
    const physicsBounds = getPhysicsBoundsData(object)

    if (!hasMesh || box.isEmpty() || Math.max(size.x, size.y, size.z) < 0.01) {
      if (physicsBounds) {
        size = physicsBounds.size
        center = object.position.clone().add(physicsBounds.centerOffset)
      }
    } else if (object?.userData?.inspectorCenterMode === "physics" && physicsBounds) {
      center = object.position.clone().add(physicsBounds.centerOffset)
      size = new THREE.Vector3(
        Math.max(size.x, physicsBounds.size.x),
        Math.max(size.y, physicsBounds.size.y),
        Math.max(size.z, physicsBounds.size.z)
      )
    }

    previewObjectCenter.set(center.x, center.y, center.z)
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = previewCamera.fov * (Math.PI / 180)
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraDistance *= 1.9
    previewTargetCameraDistance = Math.max(cameraDistance, 4.6)
  }

  function setupPreviewLighting() {
    const lights = previewScene.children.filter((child) => child.isLight)
    lights.forEach((light) => previewScene.remove(light))

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    previewScene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 2)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    const shadowDistance = 15
    dirLight.shadow.camera.left = -shadowDistance
    dirLight.shadow.camera.right = shadowDistance
    dirLight.shadow.camera.top = shadowDistance
    dirLight.shadow.camera.bottom = -shadowDistance
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 50
    previewScene.add(dirLight)

    const fillLight1 = new THREE.PointLight(0xffeedd, 0.5)
    fillLight1.position.set(5, 10, 5)
    previewScene.add(fillLight1)

    const fillLight2 = new THREE.PointLight(0xeeddff, 0.5)
    fillLight2.position.set(-5, 8, -5)
    previewScene.add(fillLight2)
  }

  function resizePreviewRenderer() {
    const width = Math.max(1, previewMount.clientWidth)
    const height = Math.max(1, previewMount.clientHeight)
    previewRenderer.setSize(width, height, false)
    previewCamera.aspect = width / height
    previewCamera.updateProjectionMatrix()
  }

  function spawnPreviewPlayer() {
    if (previewObject) {
      previewScene.remove(previewObject)
      if (typeof previewObject.userData?.cleanup === "function") {
        previewObject.userData.cleanup()
      }
    }

    previewObject = getPlayerAsset(playerCustomization).factory()
    previewObject.userData.__pendingPreviewReframe = true
    previewScene.add(previewObject)
    previewAutoRotateAngle = 0
    framePreviewObject(previewObject)
    previewCurrentCameraPos.copy(previewTargetCameraPos)
  }

  function renderPreview() {
    previewAnimationId = window.requestAnimationFrame(renderPreview)
    if (!isCustomizationOpen) return

    resizePreviewRenderer()

    if (previewObject?.userData?.__pendingPreviewReframe && hasRenderableMesh(previewObject)) {
      framePreviewObject(previewObject)
      previewObject.userData.__pendingPreviewReframe = false
    }

    if (typeof previewObject?.userData?.update === "function") {
      previewObject.userData.update(1 / 60, performance.now() * 0.001)
    }

    previewAutoRotateAngle += 0.018
    const camOffsetX = Math.cos(previewAutoRotateAngle) * previewTargetCameraDistance * 0.6
    const camOffsetY = previewTargetCameraDistance * 0.18
    const camOffsetZ = Math.sin(previewAutoRotateAngle) * previewTargetCameraDistance * 0.72

    previewTargetCameraPos.set(
      previewObjectCenter.x + camOffsetX,
      previewObjectCenter.y + camOffsetY,
      previewObjectCenter.z + camOffsetZ
    )

    previewCurrentCameraPos.lerp(previewTargetCameraPos, 0.08)
    previewCamera.position.copy(previewCurrentCameraPos)
    previewCamera.lookAt(previewObjectCenter)
    previewRenderer.render(previewScene, previewCamera)
  }

  setupPreviewLighting()
  resizePreviewRenderer()
  spawnPreviewPlayer()
  renderPreview()

  function syncCustomizationVisibility() {
    customizationContent.style.display = isCustomizationOpen ? "grid" : "none"
    customizationToggle.innerText = isCustomizationOpen ? "Hide Customization" : "Customize Player"
    if (isCustomizationOpen) {
      resizePreviewRenderer()
      spawnPreviewPlayer()
    }
  }

  customizationToggle.addEventListener("click", () => {
    isCustomizationOpen = !isCustomizationOpen
    syncCustomizationVisibility()
  })

  function createCustomizeRow(labelText) {
    const row = document.createElement("label")
    row.style.display = "grid"
    row.style.gridTemplateColumns = "120px 1fr"
    row.style.alignItems = "center"
    row.style.gap = "8px"
    row.style.color = "#d9e8ff"
    row.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    row.style.fontSize = "11px"

    const label = document.createElement("span")
    label.textContent = labelText
    row.appendChild(label)

    const controlWrap = document.createElement("div")
    controlWrap.style.display = "flex"
    controlWrap.style.alignItems = "center"
    controlWrap.style.justifyContent = "flex-end"
    controlWrap.style.gap = "8px"
    row.appendChild(controlWrap)

    controlsColumn.appendChild(row)
    return controlWrap
  }

  function styleInput(input) {
    input.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    input.style.fontSize = "11px"
    input.style.border = `1px solid ${IT_STYLE.colors.accentBlue}`
    input.style.backgroundColor = "#090f18"
    input.style.color = "#eaf4ff"
    input.style.padding = "4px 6px"
    input.style.minHeight = "28px"
    return input
  }

  const bodyColorWrap = createCustomizeRow("Body Color")
  const bodyColorInput = styleInput(document.createElement("input"))
  bodyColorInput.type = "color"
  bodyColorInput.value = playerCustomization.bodyColor
  bodyColorInput.style.width = "56px"
  bodyColorInput.style.padding = "2px"
  bodyColorWrap.appendChild(bodyColorInput)

  const eyeColorWrap = createCustomizeRow("Eye Color")
  const eyeColorInput = styleInput(document.createElement("input"))
  eyeColorInput.type = "color"
  eyeColorInput.value = playerCustomization.eyeColor
  eyeColorInput.style.width = "56px"
  eyeColorInput.style.padding = "2px"
  eyeColorWrap.appendChild(eyeColorInput)

  const earTypeWrap = createCustomizeRow("Ear Shape")
  const earTypeSelect = styleInput(document.createElement("select"))
  const roundEarOption = document.createElement("option")
  roundEarOption.value = PLAYER_EAR_TYPES.ROUND
  roundEarOption.textContent = "Round"
  earTypeSelect.appendChild(roundEarOption)
  const pointyEarOption = document.createElement("option")
  pointyEarOption.value = PLAYER_EAR_TYPES.POINTY
  pointyEarOption.textContent = "Pointy"
  earTypeSelect.appendChild(pointyEarOption)
  earTypeSelect.value = playerCustomization.earType
  earTypeWrap.appendChild(earTypeSelect)

  const socksWrap = createCustomizeRow("Socks")
  const socksToggle = document.createElement("input")
  socksToggle.type = "checkbox"
  socksToggle.checked = playerCustomization.socksEnabled
  socksWrap.appendChild(socksToggle)

  const sockColorWrap = createCustomizeRow("Sock Color")
  const sockColorInput = styleInput(document.createElement("input"))
  sockColorInput.type = "color"
  sockColorInput.value = playerCustomization.sockColor
  sockColorInput.style.width = "56px"
  sockColorInput.style.padding = "2px"
  sockColorWrap.appendChild(sockColorInput)

  const resetWrap = createCustomizeRow("Reset")
  const resetButton = document.createElement("button")
  resetButton.innerText = "Default"
  IT_STYLE.applyToElement(resetButton, "button")
  resetButton.style.minWidth = "110px"
  resetWrap.appendChild(resetButton)

  function syncCustomizationUI() {
    sockColorInput.disabled = !playerCustomization.socksEnabled
    sockColorInput.style.opacity = playerCustomization.socksEnabled ? "1" : "0.5"
  }

  function updateCustomization(patch = {}) {
    playerCustomization = normalizePlayerCustomization({
      ...playerCustomization,
      ...patch
    })
    saveStoredPlayerCustomization(playerCustomization)
    syncCustomizationUI()
    spawnPreviewPlayer()
  }

  bodyColorInput.addEventListener("input", () => {
    updateCustomization({ bodyColor: bodyColorInput.value })
  })

  eyeColorInput.addEventListener("input", () => {
    updateCustomization({ eyeColor: eyeColorInput.value })
  })

  earTypeSelect.addEventListener("change", () => {
    updateCustomization({ earType: earTypeSelect.value })
  })

  socksToggle.addEventListener("change", () => {
    updateCustomization({ socksEnabled: socksToggle.checked })
  })

  sockColorInput.addEventListener("input", () => {
    updateCustomization({ sockColor: sockColorInput.value })
  })

  resetButton.addEventListener("click", () => {
    playerCustomization = normalizePlayerCustomization(DEFAULT_PLAYER_CUSTOMIZATION)
    bodyColorInput.value = playerCustomization.bodyColor
    eyeColorInput.value = playerCustomization.eyeColor
    earTypeSelect.value = playerCustomization.earType
    socksToggle.checked = playerCustomization.socksEnabled
    sockColorInput.value = playerCustomization.sockColor
    saveStoredPlayerCustomization(playerCustomization)
    syncCustomizationUI()
    spawnPreviewPlayer()
  })

  syncCustomizationUI()
  syncCustomizationVisibility()

  // Start Game button (IT style)
  const playGameBtn = document.createElement("button")
  playGameBtn.innerText = "Start Game"
  IT_STYLE.applyToElement(playGameBtn, 'button')
  playGameBtn.style.marginTop = "10px"

  playGameBtn.onclick = () => {
    startGameplay(currentSceneIndex)
  }

  sceneGroup.appendChild(playGameBtn)

  // Arrow keys: Enter to start game
  const keyDownHandler = (event) => {
    if (document.activeElement !== document.body) return

    if (event.code === "Enter") {
      event.preventDefault()
      startGameplay(currentSceneIndex)
    }
  }

  window.addEventListener("keydown", keyDownHandler)

  let gameplayCleanup = null
  let isStartingGame = false

  async function startGameplay(sceneIndex) {
    if (isStartingGame) return
    isStartingGame = true

    try {
      await runWithLoadingOverlay(
        (updateProgress) => preloadCoreAssets(updateProgress),
        { title: 'Loading Start Game' }
      )

      cleanup()
      gameplayCleanup = startSimulationTest(renderer, () => {
        // ✨ IMPORTANT: Call cleanup from SimulationTest first, then return to main menu
        if (gameplayCleanup) {
          gameplayCleanup()
        }
        onBack()
      }, true, sceneIndex, {
        playerCustomization
      })
    } catch (error) {
      console.error('Failed to preload gameplay assets:', error)
    } finally {
      isStartingGame = false
    }
  }

  function cleanup() {
    window.removeEventListener("keydown", keyDownHandler)
    window.cancelAnimationFrame(previewAnimationId)
    previewRenderer.dispose()

    if (previewObject && typeof previewObject.userData?.cleanup === "function") {
      previewObject.userData.cleanup()
    }

    const bg = document.getElementById("playBackground")
    if (bg) bg.remove()

    const btn = document.getElementById("playBackButton")
    if (btn) btn.remove()

    const cont = document.getElementById("playContainer")
    if (cont) cont.remove()
  }

  return cleanup
}
