// src/core/Inspector.js
import * as THREE from "three"
import { getBallAssets } from "../assets/objects/BallFactory.js"
import { getBilliardTableAsset } from "../assets/objects/BilliardTable.js"
import { getPlayerAsset } from "../assets/objects/Player.js"
import { getGuideAsset } from "../assets/objects/Guide.js"
import { getGuyAsset } from "../assets/objects/Guy.js"
import { getDudeAsset } from "../assets/objects/Dude.js"
import { getDummyAsset } from "../assets/objects/Dummy.js"
import { getCompuneAsset } from "../assets/objects/Compune.js"
import { getDoor0Asset, getDoor1Asset, getDoor2Asset } from "../assets/objects/DoorFactory.js"
import { getElevatorDoorAsset } from "../assets/objects/ElevatorDoor.js"
import { getVendingMachineAsset } from "../assets/objects/VendingMachine.js"
import { getCartonBoxAsset } from "../assets/objects/CartonBox.js"
import { getChestAsset } from "../assets/objects/Chest.js"
import { getBabyOilAsset } from "../assets/items/babyOil.js"
import { getLightStickAsset } from "../assets/items/lightStick.js"
import { getLightStickOffAsset } from "../assets/items/lightStickOff.js"
import { getSilverCoinAsset } from "../assets/items/silverCoin.js"

// ==================== IT-STYLE SHARED CONFIG ====================
const IT_STYLE_COLORS = {
  darkBg: '#0a1a3d',
  accentBlue: '#0066FF',
  neonGreen: '#00FF00',
  darkAccent: '#001a4d',
  borderBlue: '#004399'
}

function applyITStyle(element, type = 'box') {
  if (type === 'button') {
    element.style.cssText = `
      background: ${IT_STYLE_COLORS.accentBlue};
      color: #000;
      border: 2px solid ${IT_STYLE_COLORS.borderBlue};
      border-radius: 0;
      padding: 12px 24px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 0 15px rgba(0, 102, 255, 0.5), inset 0 0 8px rgba(0, 255, 0, 0.2);
      transition: all 0.3s ease;
    `
    element.onmouseover = () => {
      element.style.boxShadow = `0 0 25px rgba(0, 102, 255, 0.8), inset 0 0 12px rgba(0, 255, 0, 0.4)`
      element.style.transform = 'scale(1.05)'
    }
    element.onmouseout = () => {
      element.style.boxShadow = `0 0 15px rgba(0, 102, 255, 0.5), inset 0 0 8px rgba(0, 255, 0, 0.2)`
      element.style.transform = 'scale(1)'
    }
  }
}

export function createInspector(renderer, onBack) {

  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"

  // Back button (bottom-right corner, dark red style)
  const backButton = document.createElement("button")
  backButton.id = "inspectorBackButton"
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
  backButton.onclick = () => {
    onBack()
  }
  document.body.appendChild(backButton)

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  renderer.setSize(window.innerWidth, window.innerHeight)
  // Tối ưu: Giới hạn pixel ratio
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  
  // Cấu hình ShadowMap chuẩn để tránh cảnh báo deprecated
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  // ✨ AUTO CAMERA SYSTEM - Tự động frame object
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  
  // Camera animation state
  let targetCameraPos = new THREE.Vector3()
  let currentCameraPos = new THREE.Vector3(0, 5, 8)
  let cameraEasing = 0.08
  let targetCameraDistance = 8  // ✨ Zoom distance (adjustable by mouse wheel)
  let objectCenter = new THREE.Vector3()  // Center of current object

  // ✨ Auto-rotation state
  let autoRotateAngle = 0
  let autoRotateSpeed = 0.018  // radians per frame (faster rotation)

  function hasRenderableMesh(object) {
    let found = false
    object.traverse((child) => {
      if (found) return
      if (child.isMesh && !child.userData?.isTriggerBox) {
        found = true
      }
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
      centerOffset: new THREE.Vector3(
        (minX + maxX) * 0.5,
        (minY + maxY) * 0.5,
        (minZ + maxZ) * 0.5
      )
    }
  }

  function frameObject(object) {
    // ✨ Tính bounding box CHỈ từ visible meshes (skip trigger boxes)
    const box = new THREE.Box3()
    let hasMesh = false
    object.traverse((child) => {
      // Chỉ tính mesh và bỏ qua trigger boxes
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

      // Keep camera distance large enough for both mesh and collider extents.
      size = new THREE.Vector3(
        Math.max(size.x, physicsBounds.size.x),
        Math.max(size.y, physicsBounds.size.y),
        Math.max(size.z, physicsBounds.size.z)
      )
    }

    objectCenter.copy(center)

    // ✨ Adaptive zoom: tính distance dựa trên object size
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180) // convert to radians

    // Distance từ vFOV và size
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraDistance *= 2.0 // Tăng padding để camera không gần vật quá

    targetCameraDistance = Math.max(cameraDistance, 5.0)  // Tăng minimum distance lên 5.0
    // ✨ BỎ autoRotateAngle = 0 để animation xoay không reset khi chuyển vật
  }

  // Lighting mặc định cho object assets
  function setupDefaultLighting() {
    // Xóa hết lights cũ
    const lights = scene.children.filter(child => child.isLight);
    lights.forEach(light => scene.remove(light));
    scene.fog = null;

    // Thêm lighting mặc định
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

    // Thêm một số point light để object không bị tối
    const fillLight1 = new THREE.PointLight(0xffeedd, 0.5)
    fillLight1.position.set(5, 10, 5)
    scene.add(fillLight1)

    const fillLight2 = new THREE.PointLight(0xeeddff, 0.5)
    fillLight2.position.set(-5, 8, -5)
    scene.add(fillLight2)
  }

  // ======================
  // ASSETS
  // ======================

  const ballAssets = getBallAssets(renderer)
  const tableAsset = getBilliardTableAsset()
  const playerAsset = getPlayerAsset()
  const guideAsset = getGuideAsset()
  const guyAsset = getGuyAsset()
  const dudeAsset = getDudeAsset()
  const dummyAsset = getDummyAsset()
  const compuneAsset = getCompuneAsset()
  const door0Asset = getDoor0Asset()
  const door1Asset = getDoor1Asset()
  const door2Asset = getDoor2Asset()
  const elevatorDoorAsset = getElevatorDoorAsset()
  const vendingMachineAsset = getVendingMachineAsset()
  const cartonBoxAsset = getCartonBoxAsset()
  const chestAsset = getChestAsset()
  const babyOilAsset = getBabyOilAsset()
  const lightStickAsset = getLightStickAsset()
  const lightStickOffAsset = getLightStickOffAsset()
  const silverCoinAsset = getSilverCoinAsset()
  
  // Danh sách object assets (bàn, player, balls, doors, thang máy)
  const objectAssets = [
    tableAsset,
    playerAsset,
    guideAsset,
    guyAsset,
    dudeAsset,
    dummyAsset,
    compuneAsset,
    door0Asset,
    door1Asset,
    door2Asset,
    elevatorDoorAsset,
    vendingMachineAsset,
    cartonBoxAsset,
    chestAsset,
    lightStickAsset,
    lightStickOffAsset,
    babyOilAsset,
    silverCoinAsset,
    ...ballAssets
  ]

  let currentObject = null
  let currentLightingController = null
  let currentLightingType = 'default'

  function spawnObjectAsset(asset) {
    currentLightingType = 'default'
    
    // Clear lighting controller cũ
    if (currentLightingController) {
      currentLightingController = null
    }

    if (currentObject) {
      scene.remove(currentObject)
      currentObject = null
    }

    // Setup lighting mặc định
    setupDefaultLighting()

    // Tạo object mới
    currentObject = asset.factory()
    scene.add(currentObject)
    currentObject.userData.__pendingInspectorReframe = true

    // ✨ Reset camera animation state khi spawn object mới
    autoRotateAngle = 0
    
    // ✨ Auto frame camera
    frameObject(currentObject)
    
    // ✨ Snap camera immediately to avoid lerp from old position
    currentCameraPos.copy(targetCameraPos)
  }

  // ======================
  // UI - OBJECT SELECTION ONLY
  // ======================

  // Top-left container (controls)
  const container = document.createElement("div")
  container.classList.add("page-ui")
  container.style.position = "absolute"
  container.style.bottom = "80px"  // Thấp xuống phía dưới màn hình
  container.style.left = "50%"
  container.style.transform = "translateX(-50%)"  // Căn giữa
  container.style.zIndex = "1000"
  container.style.display = "flex"
  container.style.flexDirection = "column"
  container.style.gap = "10px"
  container.style.textAlign = "center"  // Text căn giữa
  document.body.appendChild(container)

  // ✨ Helper function để tạo simple label với style giống main.js
  function createLabel(text, fontSize = "14px", fontWeight = "normal") {
    const label = document.createElement("div")
    label.textContent = text
    label.style.padding = "6px 10px"
    label.style.fontSize = fontSize
    label.style.fontWeight = fontWeight
    label.style.backgroundColor = "transparent"
    label.style.color = "#ccc"
    label.style.border = "none"
    label.style.borderRadius = "0px"
    label.style.fontFamily = "monospace"
    return label
  }

  // Xóa cái createStyledButton function cũ vì không cần hover effects

  // ✨ Object selection UI ONLY (simplified style giống main.js)
  const objectGroup = document.createElement("div")
  objectGroup.style.display = "flex"
  objectGroup.style.flexDirection = "column"
  objectGroup.style.gap = "4px"
  container.appendChild(objectGroup)

  const objectLabel = document.createElement("label")
  objectLabel.textContent = "[OBJECT] ← → to cycle"
  Object.assign(objectLabel.style, {
    fontSize: "11px",
    color: "#888",
    fontWeight: "normal",
    fontFamily: "monospace",
    letterSpacing: "0.5px"
  })
  objectGroup.appendChild(objectLabel)

  // Object name + description display
  const objectName = createLabel(objectAssets[0].name, "13px", "bold")
  const objectDesc = createLabel(objectAssets[0].description || "")
  let currentObjectIndex = 0
  objectName.style.color = "#0f0"
  objectGroup.appendChild(objectName)
  objectGroup.appendChild(objectDesc)

  // ✨ Arrow keys to cycle objects
  window.addEventListener("keydown", (event) => {
    if (document.activeElement !== document.body) return
    
    if (event.code === "ArrowLeft") {
      event.preventDefault()
      currentObjectIndex = (currentObjectIndex - 1 + objectAssets.length) % objectAssets.length
      const asset = objectAssets[currentObjectIndex]
      objectName.textContent = asset.name
      objectDesc.textContent = asset.description || ""
      spawnObjectAsset(asset)
    } else if (event.code === "ArrowRight") {
      event.preventDefault()
      currentObjectIndex = (currentObjectIndex + 1) % objectAssets.length
      const asset = objectAssets[currentObjectIndex]
      objectName.textContent = asset.name
      objectDesc.textContent = asset.description || ""
      spawnObjectAsset(asset)
    }
  })

  // ✨ Mouse wheel zoom removed - auto-framing handles it

  spawnObjectAsset(objectAssets[0])

  // Setup default lighting ban đầu
  setupDefaultLighting()

  // ======================
  // RESIZE
  // ======================

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }

  window.addEventListener("resize", onResize)

  // ======================
  // LOOP
  // ======================

  let animationId
  let lastTime = performance.now()
  let frameCount = 0

  function animate() {

    animationId = requestAnimationFrame(animate)

    const currentTime = performance.now()
    const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
    frameCount++

    // Tính FPS mỗi giây
    if (currentTime - lastTime >= 1000) {
      const fps = frameCount
      console.log(`FPS: ${fps}`)
      frameCount = 0
    }
    lastTime = currentTime

    if (currentObject?.userData?.__pendingInspectorReframe && hasRenderableMesh(currentObject)) {
      frameObject(currentObject)
      currentObject.userData.__pendingInspectorReframe = false
    }

    // ✨ Auto-rotate camera around object
    autoRotateAngle += autoRotateSpeed
    
    // Calculate camera position: orbit around object center (lower view angle)
    const camOffsetX = Math.cos(autoRotateAngle) * targetCameraDistance * 0.6
    const camOffsetY = targetCameraDistance * 0.25  // Thấp hơn (hơi cao hơn ngang hàng)
    const camOffsetZ = Math.sin(autoRotateAngle) * targetCameraDistance * 0.8
    
    targetCameraPos.set(
      objectCenter.x + camOffsetX,
      objectCenter.y + camOffsetY,
      objectCenter.z + camOffsetZ
    )

    // Smooth camera animation
    currentCameraPos.lerp(targetCameraPos, cameraEasing)
    camera.position.copy(currentCameraPos)
    
    // Always look at object center
    camera.lookAt(objectCenter)

    renderer.render(scene, camera)
  }

  animate()

  return onBack  // Return callback để main.js xử lý exit


  // ======================
  // CLEANUP
  // ======================

  return function cleanup() {
    const inspectorBackBtn = document.getElementById("inspectorBackButton")
    if (inspectorBackBtn) inspectorBackBtn.remove()

    cancelAnimationFrame(animationId)

    if (currentObject) {
      scene.remove(currentObject)
      currentObject = null
    }

    if (currentLightingController) {
      currentLightingController = null
    }

    window.removeEventListener("resize", onResize)

    container.remove()

    scene.clear()
  }
}