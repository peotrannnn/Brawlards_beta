import * as THREE from "three"
import { getBallAssets } from "../assets/objects/BallFactory.js"
import { getBilliardTableAsset } from "../assets/objects/BilliardTable.js"
import { getPlayerAsset } from "../assets/objects/Player.js"
import { getGuideAsset } from "../assets/objects/Guide.js"
import { getGuyAsset } from "../assets/objects/Guy.js"
import { getDudeAsset } from "../assets/objects/Dude.js"
import { getDummyAsset } from "../assets/objects/Dummy.js"
import { getCompuneAsset } from "../assets/objects/Compune.js"
import { getEyeAsset } from "../assets/objects/eye.js"
import { getDoor0Asset, getDoor1Asset, getDoor2Asset } from "../assets/objects/DoorFactory.js"
import { getElevatorDoorAsset } from "../assets/objects/ElevatorDoor.js"
import { getVendingMachineAsset } from "../assets/objects/VendingMachine.js"
import { getCeilingFanAsset } from "../assets/objects/CeilingFan.js"
import { getCartonBoxAsset } from "../assets/objects/CartonBox.js"
import { getChestAsset } from "../assets/objects/Chest.js"
import { getFunHouseAsset, getHouseAsset } from "../assets/objects/House.js"
import { getBabyOilAsset } from "../assets/items/babyOil.js"
import { getLightStickAsset } from "../assets/items/lightStick.js"
import { getLightStickOffAsset } from "../assets/items/lightStickOff.js"
import { getSilverCoinAsset } from "../assets/items/silverCoin.js"
import { getM4A1Asset } from "../assets/items/M4A1.js"
import { UI_THEME } from "../ui/uiTheme.js"

// ==================== MAIN EXPORT ====================
export function createInspector(onBack) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"

  const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  previewRenderer.shadowMap.enabled = true
  previewRenderer.shadowMap.type = THREE.PCFShadowMap

  // Scene setup
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  // Camera
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
  let targetCameraPos = new THREE.Vector3()
  let currentCameraPos = new THREE.Vector3(0, 5, 8)
  let cameraEasing = 0.08
  let targetCameraDistance = 8
  let objectCenter = new THREE.Vector3()

  // Auto-rotation
  let autoRotateAngle = 0
  let autoRotateSpeed = 0.018

  // ==================== UTILITIES ====================
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

    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

    shapes.forEach((shape) => {
      const offset = shape.offset || [0, 0, 0]
      let halfX = 0.5, halfY = 0.5, halfZ = 0.5

      if (shape.type === 'box' && Array.isArray(shape.size)) {
        halfX = Math.abs(shape.size[0] || 1) * 0.5
        halfY = Math.abs(shape.size[1] || 1) * 0.5
        halfZ = Math.abs(shape.size[2] || 1) * 0.5
      } else if (shape.type === 'sphere') {
        const radius = Math.abs(shape.radius || 0.5)
        halfX = halfY = halfZ = radius
      } else if (shape.type === 'cylinder') {
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

  function frameObject(object) {
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
    } else if (object?.userData?.inspectorCenterMode === 'physics' && physicsBounds) {
      center = object.position.clone().add(physicsBounds.centerOffset)
      size = new THREE.Vector3(
        Math.max(size.x, physicsBounds.size.x),
        Math.max(size.y, physicsBounds.size.y),
        Math.max(size.z, physicsBounds.size.z)
      )
    }

    objectCenter.copy(center)

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraDistance *= 2.0
    targetCameraDistance = Math.max(cameraDistance, 5.0)
  }

  // ==================== LIGHTING ====================
  function setupDefaultLighting() {
    const lights = scene.children.filter(child => child.isLight)
    lights.forEach(light => scene.remove(light))
    scene.fog = null

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 2)
    dirLight.position.set(10, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    const d = 15
    dirLight.shadow.camera.left = -d
    dirLight.shadow.camera.right = d
    dirLight.shadow.camera.top = d
    dirLight.shadow.camera.bottom = -d
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 50
    scene.add(dirLight)

    const fillLight1 = new THREE.PointLight(0xffeedd, 0.5)
    fillLight1.position.set(5, 10, 5)
    scene.add(fillLight1)

    const fillLight2 = new THREE.PointLight(0xeeddff, 0.5)
    fillLight2.position.set(-5, 8, -5)
    scene.add(fillLight2)
  }

  // ==================== ASSETS ====================
  const ballAssets = getBallAssets(previewRenderer)
  const objectAssets = [
    getBilliardTableAsset(),
    getPlayerAsset(),
    getGuideAsset(),
    getGuyAsset(),
    getDudeAsset(),
    getDummyAsset(),
    getCompuneAsset(),
    getEyeAsset(),
    getDoor0Asset(),
    getDoor1Asset(),
    getDoor2Asset(),
    getElevatorDoorAsset(),
    getVendingMachineAsset(),
    getCeilingFanAsset(),
    getCartonBoxAsset(),
    getChestAsset(),
    getHouseAsset(),
    getFunHouseAsset(),
    getLightStickAsset(),
    getLightStickOffAsset(),
    getBabyOilAsset(),
    getSilverCoinAsset(),
    getM4A1Asset(),
    ...ballAssets
  ]

  let currentObject = null

  function styleCycleButton(button) {
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 8px 12px;
      border: 2px solid ${UI_THEME.terminal.borderBlue};
      background: linear-gradient(180deg, ${UI_THEME.terminal.accentBlue}, ${UI_THEME.terminal.borderBlue});
      color: ${UI_THEME.common.white};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      text-shadow: ${UI_THEME.terminal.textShadow};
      box-shadow: ${UI_THEME.terminal.buttonShadow};
      transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
    `
    button.onmouseover = () => {
      button.style.transform = 'translateY(-1px)'
      button.style.boxShadow = UI_THEME.terminal.buttonHoverShadow
      button.style.filter = 'brightness(1.04)'
    }
    button.onmouseout = () => {
      button.style.transform = 'translateY(0)'
      button.style.boxShadow = UI_THEME.terminal.buttonShadow
      button.style.filter = 'none'
    }
  }

  function spawnObjectAsset(asset) {
    if (currentObject && typeof currentObject.userData?.cleanup === "function") {
      currentObject.userData.cleanup()
    }
    if (currentObject) scene.remove(currentObject)
    setupDefaultLighting()
    currentObject = asset.factory()
    scene.add(currentObject)
    currentObject.userData.__pendingInspectorReframe = true
    autoRotateAngle = 0
    frameObject(currentObject)
    currentCameraPos.copy(targetCameraPos)
  }

  // ==================== UI ====================
  const container = document.createElement("div")
  container.classList.add("page-ui")
  container.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(14px, 3vw, 28px);
    box-sizing: border-box;
    background: ${UI_THEME.menu.overlayGradient};
  `
  document.body.appendChild(container)

  const inspectorWindow = document.createElement("div")
  inspectorWindow.style.cssText = `
    width: min(92vw, 620px);
    max-width: 620px;
    max-height: min(88vh, 760px);
    background: ${UI_THEME.terminal.darkBg};
    border: 2px solid ${UI_THEME.terminal.borderBlue};
    box-shadow: ${UI_THEME.terminal.panelShadow};
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `
  container.appendChild(inspectorWindow)

  const titleBar = document.createElement("div")
  titleBar.style.cssText = `
    position: relative;
    display: flex;
    align-items: stretch;
    background: ${UI_THEME.terminal.accentBlue};
    border-bottom: 2px solid ${UI_THEME.terminal.borderBlue};
    min-height: ${UI_THEME.windowChrome.titleBarHeight};
  `
  inspectorWindow.appendChild(titleBar)

  const title = document.createElement("div")
  title.textContent = "Objects"
  title.style.cssText = `
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
  `
  titleBar.appendChild(title)

  const closeButton = document.createElement("button")
  closeButton.type = "button"
  closeButton.textContent = "X"
  closeButton.setAttribute("aria-label", "Close inspector")
  closeButton.style.cssText = `
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
  `
  closeButton.onmouseover = () => {
    closeButton.style.background = UI_THEME.windowChrome.closeBackground
    closeButton.style.color = UI_THEME.windowChrome.closeText
    closeButton.style.boxShadow = UI_THEME.windowChrome.closeHoverShadow
    closeButton.style.filter = `brightness(${UI_THEME.windowChrome.closeHoverBrightness})`
  }
  closeButton.onmouseout = () => {
    closeButton.style.background = UI_THEME.windowChrome.closeBackground
    closeButton.style.color = UI_THEME.windowChrome.closeText
    closeButton.style.boxShadow = UI_THEME.windowChrome.closeShadow
    closeButton.style.filter = 'none'
  }
  closeButton.onclick = () => onBack()
  titleBar.appendChild(closeButton)

  const windowBody = document.createElement("div")
  windowBody.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
  `
  inspectorWindow.appendChild(windowBody)

  const previewFrame = document.createElement("div")
  previewFrame.style.cssText = `
    position: relative;
    width: 100%;
    min-height: 140px;
    height: min(42vh, 360px);
    background: ${UI_THEME.play.previewGradient};
    border: 1px solid ${UI_THEME.play.rowBorder};
    box-shadow: inset 0 0 16px ${UI_THEME.play.previewInsetGlow};
    overflow: hidden;
    flex: 0 0 auto;
  `
  windowBody.appendChild(previewFrame)

  const previewMount = document.createElement("div")
  previewMount.style.cssText = `position: absolute; inset: 0; pointer-events: none;`
  previewFrame.appendChild(previewMount)

  previewRenderer.domElement.style.display = 'block'
  previewRenderer.domElement.style.width = '100%'
  previewRenderer.domElement.style.height = '100%'
  previewMount.appendChild(previewRenderer.domElement)

  const objectGroup = document.createElement("div")
  objectGroup.style.cssText = `display: flex; flex-direction: column; gap: 10px; text-align: left; width: 100%;`
  windowBody.appendChild(objectGroup)

  const objectInfoCard = document.createElement("div")
  objectInfoCard.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: ${UI_THEME.play.rowBackground};
    border: 1px solid ${UI_THEME.play.rowBorder};
    box-shadow: inset 0 0 10px ${UI_THEME.play.rowInsetGlow};
  `
  objectGroup.appendChild(objectInfoCard)

  const objectName = document.createElement("div")
  objectName.style.cssText = `padding: 0; font-size: 13px; font-weight: bold;
    background: transparent; color: ${UI_THEME.common.success}; border: none; box-shadow: none; font-family: monospace;`
  objectInfoCard.appendChild(objectName)

  const objectDesc = document.createElement("div")
  objectDesc.style.cssText = `padding: 0; font-size: 12px; font-weight: normal;
    background: transparent; color: ${UI_THEME.common.textSubtle}; border: none; box-shadow: none; font-family: monospace; line-height: 1.55; white-space: normal; overflow-wrap: anywhere;`
  objectInfoCard.appendChild(objectDesc)

  const cycleControls = document.createElement("div")
  cycleControls.style.cssText = `
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  `
  objectGroup.appendChild(cycleControls)

  const prevButton = document.createElement("button")
  prevButton.type = "button"
  prevButton.textContent = "<"
  prevButton.setAttribute("aria-label", "Show previous object")
  styleCycleButton(prevButton)
  cycleControls.appendChild(prevButton)

  const nextButton = document.createElement("button")
  nextButton.type = "button"
  nextButton.textContent = ">"
  nextButton.setAttribute("aria-label", "Show next object")
  styleCycleButton(nextButton)
  cycleControls.appendChild(nextButton)

  let currentObjectIndex = 0

  function syncInspectorLayout() {
    const bodyStyles = window.getComputedStyle(windowBody)
    const titleHeight = titleBar.getBoundingClientRect().height || parseFloat(UI_THEME.windowChrome.titleBarHeight) || 42
    const paddingTop = parseFloat(bodyStyles.paddingTop) || 0
    const paddingBottom = parseFloat(bodyStyles.paddingBottom) || 0
    const paddingLeft = parseFloat(bodyStyles.paddingLeft) || 0
    const paddingRight = parseFloat(bodyStyles.paddingRight) || 0
    const gap = parseFloat(bodyStyles.rowGap || bodyStyles.gap) || 0
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxWindowWidth = Math.max(280, Math.min(620, viewportWidth - 32))
    const maxWindowHeight = Math.max(320, Math.min(760, viewportHeight - 32))

    inspectorWindow.style.width = `${maxWindowWidth}px`
    inspectorWindow.style.maxHeight = `${maxWindowHeight}px`

    const objectGroupHeight = objectGroup.getBoundingClientRect().height || 0
    const availableFrameWidth = Math.max(220, maxWindowWidth - paddingLeft - paddingRight - 4)
    const availableFrameHeight = Math.max(140, maxWindowHeight - titleHeight - paddingTop - paddingBottom - objectGroupHeight - gap - 4)
    const aspectRatio = 1.22
    const frameHeight = Math.max(140, Math.min(availableFrameHeight, availableFrameWidth / aspectRatio))

    previewFrame.style.height = `${Math.round(frameHeight)}px`
  }

  function showObjectAtIndex(index) {
    currentObjectIndex = (index + objectAssets.length) % objectAssets.length
    const asset = objectAssets[currentObjectIndex]
    objectName.textContent = asset.name
    objectDesc.textContent = asset.description || ""
    spawnObjectAsset(asset)
    syncInspectorLayout()
    resizePreviewRenderer()
  }

  function stepObject(direction) {
    showObjectAtIndex(currentObjectIndex + direction)
  }

  const handleKeyDown = (event) => {
    if (event.code === "ArrowLeft") {
      event.preventDefault()
      stepObject(-1)
    } else if (event.code === "ArrowRight") {
      event.preventDefault()
      stepObject(1)
    }
  }
  window.addEventListener("keydown", handleKeyDown)

  prevButton.onclick = () => {
    prevButton.blur()
    stepObject(-1)
  }
  nextButton.onclick = () => {
    nextButton.blur()
    stepObject(1)
  }

  showObjectAtIndex(0)

  // ==================== RESIZE ====================
  function resizePreviewRenderer() {
    const previewBounds = previewFrame.getBoundingClientRect()
    const width = Math.max(1, Math.round(previewBounds.width))
    const height = Math.max(1, Math.round(previewBounds.height))

    previewRenderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function onResize() {
    syncInspectorLayout()
    resizePreviewRenderer()
  }
  window.addEventListener("resize", onResize)
  syncInspectorLayout()
  resizePreviewRenderer()

  // ==================== ANIMATION LOOP ====================
  let animationId
  let lastTime = performance.now()

  function animate() {
    animationId = requestAnimationFrame(animate)
    const currentTime = performance.now()
    const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
    lastTime = currentTime

    if (currentObject?.userData?.__pendingInspectorReframe && hasRenderableMesh(currentObject)) {
      frameObject(currentObject)
      currentObject.userData.__pendingInspectorReframe = false
    }

    if (typeof currentObject?.userData?.update === 'function') {
      currentObject.userData.update(delta, currentTime * 0.001)
    }

    autoRotateAngle += autoRotateSpeed
    const camOffsetX = Math.cos(autoRotateAngle) * targetCameraDistance * 0.6
    const camOffsetY = targetCameraDistance * 0.25
    const camOffsetZ = Math.sin(autoRotateAngle) * targetCameraDistance * 0.8

    targetCameraPos.set(
      objectCenter.x + camOffsetX,
      objectCenter.y + camOffsetY,
      objectCenter.z + camOffsetZ
    )

    currentCameraPos.lerp(targetCameraPos, cameraEasing)
    camera.position.copy(currentCameraPos)
    camera.lookAt(objectCenter)
    previewRenderer.render(scene, camera)
  }

  animate()

  // ==================== CLEANUP ====================
  return function cleanup() {
    cancelAnimationFrame(animationId)
    if (currentObject && typeof currentObject.userData?.cleanup === "function") {
      currentObject.userData.cleanup()
    }
    if (currentObject) scene.remove(currentObject)
    window.removeEventListener("resize", onResize)
    window.removeEventListener("keydown", handleKeyDown)
    previewRenderer.dispose()
    container.remove()
    scene.clear()
  }
}