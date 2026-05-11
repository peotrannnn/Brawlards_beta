import * as THREE from "three"
import { sceneAssets } from "../assets/sceneAssets.js"
import { startSimulationTest } from "./SimulationTest.js"
import { preloadCoreAssets } from "../assets/preloadAssets.js"
import { runWithLoadingOverlay } from "../utils/loadingOverlay.js"
import { DEFAULT_PLAYER_CUSTOMIZATION, PLAYER_EAR_TYPES, normalizePlayerCustomization } from "../utils/playerCustomization.js"
import { getPlayerAsset } from "../assets/objects/Player.js"
import { IT_STYLE, UI_THEME } from "../ui/uiTheme.js"

const PLAYER_CUSTOMIZATION_STORAGE_KEY = "brawlards.playerCustomization"
const PLAY_CUSTOMIZATION_STYLE_ID = "play-customization-style"

function ensurePlayCustomizationStyles() {
  if (document.getElementById(PLAY_CUSTOMIZATION_STYLE_ID)) return

  const style = document.createElement("style")
  style.id = PLAY_CUSTOMIZATION_STYLE_ID
  style.textContent = `
    .play-selection-window {
      display: flex;
      flex-direction: column;
      width: fit-content;
      max-width: 92vw;
      max-height: min(88vh, 760px);
      background: ${IT_STYLE.colors.darkBg};
      border: 2px solid ${IT_STYLE.colors.borderBlue};
      box-shadow: ${UI_THEME.terminal.panelShadow};
      overflow: hidden;
      text-align: left;
    }
    .play-selection-titlebar {
      position: relative;
      display: flex;
      align-items: stretch;
      background: ${IT_STYLE.colors.accentBlue};
      border-bottom: 2px solid ${IT_STYLE.colors.borderBlue};
      min-height: ${UI_THEME.windowChrome.titleBarHeight};
    }
    .play-selection-title {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: ${UI_THEME.windowChrome.titleBarHeight};
      color: ${UI_THEME.common.white};
      padding: 0 ${UI_THEME.windowChrome.titleRightPadding} 0 ${UI_THEME.windowChrome.titleLeftPadding};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: ${UI_THEME.windowChrome.titleFontSize};
      letter-spacing: 1px;
      text-transform: uppercase;
      text-align: center;
      text-shadow: ${UI_THEME.terminal.textShadow};
    }
    .play-selection-close {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${UI_THEME.windowChrome.closeWidth};
      min-width: ${UI_THEME.windowChrome.closeWidth};
      height: 100%;
      border: none;
      border-left: 2px solid ${UI_THEME.windowChrome.closeBorder};
      background: ${UI_THEME.windowChrome.closeBackground};
      color: ${UI_THEME.windowChrome.closeText};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: ${UI_THEME.windowChrome.closeFontSize};
      font-weight: bold;
      line-height: 1;
      cursor: pointer;
      text-shadow: ${UI_THEME.terminal.textShadow};
      box-shadow: ${UI_THEME.windowChrome.closeShadow};
      transition: box-shadow 0.2s ease, filter 0.2s ease;
    }
    .play-selection-close:hover {
      background: ${UI_THEME.windowChrome.closeBackground};
      color: ${UI_THEME.windowChrome.closeText};
      box-shadow: ${UI_THEME.windowChrome.closeHoverShadow};
      filter: brightness(${UI_THEME.windowChrome.closeHoverBrightness});
    }
    .play-selection-close:focus-visible {
      outline: 2px solid ${IT_STYLE.colors.borderBlue};
      outline-offset: -2px;
    }
    .play-selection-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      align-items: stretch;
      max-height: calc(min(88vh, 760px) - ${UI_THEME.windowChrome.titleBarHeight});
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: ${UI_THEME.scrollbar.firefoxThumb} ${UI_THEME.scrollbar.firefoxTrack};
    }
    .play-selection-content::-webkit-scrollbar {
      width: ${UI_THEME.scrollbar.width};
    }
    .play-selection-content::-webkit-scrollbar-track {
      background: ${UI_THEME.scrollbar.trackPattern}, ${UI_THEME.scrollbar.trackBackground};
      border-left: 1px solid ${UI_THEME.scrollbar.trackBorder};
      box-shadow: ${UI_THEME.scrollbar.trackInset};
    }
    .play-selection-content::-webkit-scrollbar-thumb {
      background: ${UI_THEME.scrollbar.thumbPattern}, ${UI_THEME.scrollbar.thumbBackground};
      border: 1px solid ${UI_THEME.scrollbar.thumbBorder};
      box-shadow: ${UI_THEME.scrollbar.thumbShadow};
      min-height: 34px;
    }
    .play-selection-content::-webkit-scrollbar-thumb:hover {
      background: ${UI_THEME.scrollbar.thumbPattern}, ${UI_THEME.scrollbar.thumbHoverBackground};
      box-shadow: ${UI_THEME.scrollbar.thumbHoverShadow};
    }
    .play-scene-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      text-align: center;
    }
    .play-customization-panel {
      --play-customization-preview-size: min(180px, 24vh);
      width: min(92vw, 248px);
      max-width: 92vw;
      max-height: 100%;
      min-height: 0;
      margin-top: 0;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      text-align: left;
      transition: width 0.24s ease;
    }
    .play-customization-panel--expanded {
      width: min(92vw, 408px);
    }
    .play-customization-window {
      width: 100%;
      max-height: 100%;
      background: ${IT_STYLE.colors.darkBg};
      border: 2px solid ${IT_STYLE.colors.borderBlue};
      box-shadow: ${UI_THEME.play.panelShadow};
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .play-customization-menu {
      display: flex;
      flex-direction: column;
    }
    .play-customization-menu-button {
      width: 100%;
      border: none;
      border-bottom: 1px solid ${IT_STYLE.colors.borderBlue};
      background: transparent;
      color: ${IT_STYLE.colors.neonGreen};
      padding: 14px 20px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      font-weight: normal;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease, padding-left 0.2s ease, box-shadow 0.2s ease;
    }
    .play-customization-menu-button:hover {
      background: ${IT_STYLE.colors.accentGlowSoft};
      color: ${UI_THEME.common.white};
      padding-left: 28px;
    }
    .play-customization-menu-button--active {
      background: ${IT_STYLE.colors.accentBlue};
      color: ${UI_THEME.common.white};
      font-weight: bold;
      padding-left: 28px;
      box-shadow: ${UI_THEME.terminal.selectedInsetShadow};
    }
    .play-customization-menu-button--play {
      border-bottom: none;
      background: linear-gradient(180deg, ${IT_STYLE.colors.accentBlue}, ${IT_STYLE.colors.borderBlue});
      color: ${UI_THEME.common.white};
      font-weight: bold;
      text-align: left;
      box-shadow: inset 0 0 12px ${IT_STYLE.colors.accentGlowSoft};
    }
    .play-customization-menu-button--play:hover {
      background: linear-gradient(180deg, ${IT_STYLE.colors.borderBlue}, ${IT_STYLE.colors.accentBlue});
      color: ${UI_THEME.common.white};
      padding-left: 28px;
      filter: brightness(1.05);
    }
    .play-customization-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
      padding: 12px;
      border-top: 1px solid ${IT_STYLE.colors.borderBlue};
    }
    .play-customization-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: auto;
      max-width: 100%;
      padding: 9px 14px;
      border: 2px solid ${IT_STYLE.colors.borderBlue};
      background: linear-gradient(180deg, ${IT_STYLE.colors.accentBlue}, ${IT_STYLE.colors.borderBlue});
      color: ${UI_THEME.common.white};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      text-shadow: ${UI_THEME.terminal.textShadow};
      box-shadow: 0 0 15px ${IT_STYLE.colors.accentGlow}, inset 0 0 8px ${IT_STYLE.colors.accentGlowSoft};
      transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
    }
    .play-customization-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 22px ${IT_STYLE.colors.accentGlowStrong}, inset 0 0 12px ${IT_STYLE.colors.accentGlowSoft};
      filter: brightness(1.04);
    }
    .play-customization-button--reset {
      background: ${UI_THEME.settings.resetGradient};
      border-color: ${UI_THEME.settings.resetBorder};
      color: ${UI_THEME.settings.resetText};
      box-shadow: ${UI_THEME.settings.resetShadow};
    }
    .play-customization-button--reset:hover {
      box-shadow: ${UI_THEME.settings.resetHoverShadow};
    }
    .play-customization-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(148px, var(--play-customization-preview-size));
      gap: 10px;
      align-items: stretch;
      min-height: 0;
    }
    .play-customization-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .play-customization-controls-column {
      height: var(--play-customization-preview-size);
      max-height: var(--play-customization-preview-size);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: ${UI_THEME.scrollbar.firefoxThumb} ${UI_THEME.scrollbar.firefoxTrack};
      padding-right: 2px;
    }
    .play-customization-controls-column::-webkit-scrollbar {
      width: ${UI_THEME.scrollbar.width};
    }
    .play-customization-controls-column::-webkit-scrollbar-track {
      background: ${UI_THEME.scrollbar.trackPattern}, ${UI_THEME.scrollbar.trackBackground};
      border-left: 1px solid ${UI_THEME.scrollbar.trackBorder};
      box-shadow: ${UI_THEME.scrollbar.trackInset};
    }
    .play-customization-controls-column::-webkit-scrollbar-thumb {
      background: ${UI_THEME.scrollbar.thumbPattern}, ${UI_THEME.scrollbar.thumbBackground};
      border: 1px solid ${UI_THEME.scrollbar.thumbBorder};
      box-shadow: ${UI_THEME.scrollbar.thumbShadow};
      min-height: 34px;
    }
    .play-customization-controls-column::-webkit-scrollbar-thumb:hover {
      background: ${UI_THEME.scrollbar.thumbPattern}, ${UI_THEME.scrollbar.thumbHoverBackground};
      box-shadow: ${UI_THEME.scrollbar.thumbHoverShadow};
    }
    .play-customization-preview-column {
      align-items: center;
      justify-content: flex-start;
      order: 0;
    }
    .play-customization-preview-frame {
      width: min(var(--play-customization-preview-size), 100%);
      aspect-ratio: 1;
      position: relative;
      margin: 0 auto;
      background: ${UI_THEME.play.previewGradient};
      border: 1px solid ${IT_STYLE.colors.borderBlue};
      box-shadow: 0 0 16px ${IT_STYLE.colors.accentGlowSoft}, inset 0 0 12px ${UI_THEME.play.previewInsetGlow};
      overflow: hidden;
    }
    .play-customization-row {
      display: grid;
      grid-template-columns: 1fr;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: ${UI_THEME.play.rowBackground};
      border: 1px solid ${UI_THEME.play.rowBorder};
      box-shadow: inset 0 0 10px ${UI_THEME.play.rowInsetGlow};
    }
    .play-customization-row-label {
      color: ${IT_STYLE.colors.neonGreen};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .play-customization-control-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
    }
    .play-customization-input {
      box-sizing: border-box;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      border: 1px solid ${IT_STYLE.colors.borderBlue};
      background: ${UI_THEME.play.inputBackground};
      color: ${UI_THEME.play.inputText};
      padding: 6px 8px;
      min-height: 30px;
      max-width: 100%;
      box-shadow: inset 0 0 8px ${IT_STYLE.colors.accentGlowSoft};
    }
    .play-customization-color-input {
      width: 58px;
      padding: 2px;
      min-height: 30px;
    }
    .play-customization-select {
      width: 100%;
      min-width: 0;
    }
    .play-customization-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${IT_STYLE.colors.accentBlue};
    }
    @media (max-width: 720px) {
      .play-customization-panel--expanded {
        width: min(92vw, 360px);
      }
      .play-customization-window {
        width: 100%;
      }
      .play-customization-content {
        grid-template-columns: 1fr;
      }
      .play-customization-controls-column {
        height: auto;
        max-height: 260px;
      }
      .play-customization-preview-column {
        order: -1;
      }
    }
    @media (max-height: 760px) {
      .play-selection-window {
        max-height: 92vh;
      }
      .play-selection-content {
        max-height: calc(92vh - ${UI_THEME.windowChrome.titleBarHeight});
      }
      .play-customization-panel {
        --play-customization-preview-size: min(164px, 22vh);
      }
    }
  `
  document.head.appendChild(style)
}

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

export function startPlay(renderer, onBack, options = {}) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"
  ensurePlayCustomizationStyles()

  const { preserveMenuBackground = false, onStartGameplay = null } = options

  // Background overlay
  const background = document.createElement("div")
  background.id = "playBackground"
  background.style.position = "fixed"
  background.style.top = "0"
  background.style.left = "0"
  background.style.width = "100%"
  background.style.height = "100%"
  background.style.background = preserveMenuBackground ? UI_THEME.menu.overlayGradient : UI_THEME.play.pageBackground
  background.style.zIndex = "99"
  background.style.pointerEvents = "none"
  document.body.appendChild(background)

  if (!preserveMenuBackground) {
    renderer.clear()
    renderer.setClearColor(0x111111)
    renderer.render(new THREE.Scene(), new THREE.Camera())
  }

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
  container.style.alignItems = "center"
  document.body.appendChild(container)

  const selectionWindow = document.createElement("div")
  selectionWindow.className = "play-selection-window"
  container.appendChild(selectionWindow)

  const selectionTitleBar = document.createElement("div")
  selectionTitleBar.className = "play-selection-titlebar"
  selectionWindow.appendChild(selectionTitleBar)

  const selectionTitle = document.createElement("div")
  selectionTitle.className = "play-selection-title"
  selectionTitle.textContent = "Play"
  selectionTitleBar.appendChild(selectionTitle)

  const closeButton = document.createElement("button")
  closeButton.type = "button"
  closeButton.className = "play-selection-close"
  closeButton.textContent = "X"
  closeButton.setAttribute("aria-label", "Close play menu")
  selectionTitleBar.appendChild(closeButton)

  const selectionContent = document.createElement("div")
  selectionContent.className = "play-selection-content"
  selectionWindow.appendChild(selectionContent)

  // Helper function for labels (IT box style)
  function createLabel(text, fontSize = "14px", fontWeight = "normal", color = UI_THEME.play.labelDefault, withFrame = true) {
    const label = document.createElement("div")
    label.textContent = text
    label.style.padding = "10px"
    label.style.fontSize = fontSize
    label.style.fontWeight = fontWeight
    label.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    label.style.color = color
    if (withFrame) {
      label.style.backgroundColor = IT_STYLE.colors.darkBg
      label.style.border = `1px solid ${IT_STYLE.colors.borderBlue}`
      label.style.borderRadius = "0px"
      label.style.boxShadow = UI_THEME.terminal.compactShadow
    }
    return label
  }

  // Scene group
  const sceneGroup = document.createElement("div")
  sceneGroup.className = "play-scene-group"
  selectionContent.appendChild(sceneGroup)

  // Scene name (green) + description
  const sceneName = createLabel(sceneAssets[0].name, "13px", "bold", UI_THEME.play.labelActive, false)
  const sceneDesc = createLabel(sceneAssets[0].description || "", "12px", "normal", UI_THEME.play.labelDefault, false)
  let currentSceneIndex = 0
  let playerCustomization = loadStoredPlayerCustomization()
  let isCustomizationOpen = false
  sceneGroup.appendChild(sceneName)
  sceneGroup.appendChild(sceneDesc)

  const customizationPanel = document.createElement("div")
  customizationPanel.className = "play-customization-panel"
  selectionContent.appendChild(customizationPanel)

  const customizationWindow = document.createElement("div")
  customizationWindow.className = "play-customization-window"
  customizationPanel.appendChild(customizationWindow)

  const customizationMenu = document.createElement("div")
  customizationMenu.className = "play-customization-menu"
  customizationWindow.appendChild(customizationMenu)

  const customizationToggle = document.createElement("button")
  customizationToggle.innerText = "Customize Player"
  customizationToggle.className = "play-customization-menu-button"
  customizationMenu.appendChild(customizationToggle)

  const customizationBody = document.createElement("div")
  customizationBody.className = "play-customization-body"
  customizationBody.style.display = "none"
  customizationWindow.appendChild(customizationBody)

  const playGameBtn = document.createElement("button")
  playGameBtn.type = "button"
  playGameBtn.innerText = "Start Game"
  playGameBtn.className = "play-customization-menu-button play-customization-menu-button--play"
  customizationWindow.appendChild(playGameBtn)

  const customizationContent = document.createElement("div")
  customizationContent.style.display = "grid"
  customizationContent.className = "play-customization-content"
  customizationBody.appendChild(customizationContent)

  const controlsColumn = document.createElement("div")
  controlsColumn.className = "play-customization-column play-customization-controls-column"
  customizationContent.appendChild(controlsColumn)

  const previewColumn = document.createElement("div")
  previewColumn.className = "play-customization-column play-customization-preview-column"
  customizationContent.appendChild(previewColumn)

  const previewFrame = document.createElement("div")
  previewFrame.className = "play-customization-preview-frame"
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
    customizationBody.style.display = isCustomizationOpen ? "flex" : "none"
    customizationPanel.classList.toggle("play-customization-panel--expanded", isCustomizationOpen)
    customizationToggle.innerText = isCustomizationOpen ? "Hide Customization" : "Customize Player"
    customizationToggle.classList.toggle("play-customization-menu-button--active", isCustomizationOpen)
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
    row.className = "play-customization-row"

    const label = document.createElement("span")
    label.textContent = labelText
    label.className = "play-customization-row-label"
    row.appendChild(label)

    const controlWrap = document.createElement("div")
    controlWrap.className = "play-customization-control-wrap"
    row.appendChild(controlWrap)

    controlsColumn.appendChild(row)
    return controlWrap
  }

  function styleInput(input, extraClassName = "") {
    input.className = `play-customization-input ${extraClassName}`.trim()
    return input
  }

  const bodyColorWrap = createCustomizeRow("Body Color")
  const bodyColorInput = styleInput(document.createElement("input"), "play-customization-color-input")
  bodyColorInput.type = "color"
  bodyColorInput.value = playerCustomization.bodyColor
  bodyColorWrap.appendChild(bodyColorInput)

  const eyeColorWrap = createCustomizeRow("Eye Color")
  const eyeColorInput = styleInput(document.createElement("input"), "play-customization-color-input")
  eyeColorInput.type = "color"
  eyeColorInput.value = playerCustomization.eyeColor
  eyeColorWrap.appendChild(eyeColorInput)

  const earTypeWrap = createCustomizeRow("Ear Shape")
  const earTypeSelect = styleInput(document.createElement("select"), "play-customization-select")
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
  socksToggle.className = "play-customization-checkbox"
  socksWrap.appendChild(socksToggle)

  const sockColorWrap = createCustomizeRow("Sock Color")
  const sockColorInput = styleInput(document.createElement("input"), "play-customization-color-input")
  sockColorInput.type = "color"
  sockColorInput.value = playerCustomization.sockColor
  sockColorWrap.appendChild(sockColorInput)

  const resetWrap = createCustomizeRow("Reset")
  const resetButton = document.createElement("button")
  resetButton.innerText = "Default"
  resetButton.className = "play-customization-button play-customization-button--reset"
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

  closeButton.onclick = () => {
    cleanup()
    onBack()
  }

  playGameBtn.onclick = () => {
    startGameplay(currentSceneIndex)
  }

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
      gameplayCleanup = await runWithLoadingOverlay(
        async (updateProgress) => {
          await preloadCoreAssets(updateProgress)

          if (typeof onStartGameplay === "function") {
            onStartGameplay()
          }
          cleanup()
          return startSimulationTest(renderer, () => {
            // ✨ IMPORTANT: Call cleanup from SimulationTest first, then return to main menu
            if (gameplayCleanup) {
              gameplayCleanup()
            }
            onBack()
          }, true, sceneIndex, {
            playerCustomization
          })
        },
        { title: 'Loading Start Game', minimumVisibleMs: 260 }
      )
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

    const cont = document.getElementById("playContainer")
    if (cont) cont.remove()
  }

  return cleanup
}
