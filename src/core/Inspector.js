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
import { getCartonBoxAsset } from "../assets/objects/CartonBox.js"
import { getChestAsset } from "../assets/objects/Chest.js"
import { getHouseAsset } from "../assets/objects/House.js"
import { getBabyOilAsset } from "../assets/items/babyOil.js"
import { getLightStickAsset } from "../assets/items/lightStick.js"
import { getLightStickOffAsset } from "../assets/items/lightStickOff.js"
import { getSilverCoinAsset } from "../assets/items/silverCoin.js"

// ==================== CONFIGURATION ====================
const IT_STYLE = {
  colors: {
    darkBg: '#0a1a3d',
    accentBlue: '#0066FF',
    neonGreen: '#00FF00',
    darkAccent: '#001a4d',
    borderBlue: '#004399'
  }
}

// ==================== MAIN EXPORT ====================
export function createInspector(renderer, onBack) {
  document.body.style.margin = "0"
  document.body.style.overflow = "hidden"

  // Back button
  const backButton = document.createElement("button")
  backButton.id = "inspectorBackButton"
  backButton.innerText = "Back to Menu"
  backButton.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 10000;
    background: #8b0000; color: #fff; border: 2px solid #5a0000;
    border-radius: 0; padding: 8px 16px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-weight: bold; font-size: 10px; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer;
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
  backButton.onclick = () => onBack()
  document.body.appendChild(backButton)

  // Scene setup
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

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
  const ballAssets = getBallAssets(renderer)
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
    getCartonBoxAsset(),
    getChestAsset(),
    getHouseAsset(),
    getLightStickAsset(),
    getLightStickOffAsset(),
    getBabyOilAsset(),
    getSilverCoinAsset(),
    ...ballAssets
  ]

  let currentObject = null
  let currentLightingController = null

  function spawnObjectAsset(asset) {
    if (currentLightingController) currentLightingController = null
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
    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 1000; display: flex; flex-direction: column; gap: 10px;
    text-align: center;
  `
  document.body.appendChild(container)

  const objectGroup = document.createElement("div")
  objectGroup.style.cssText = `display: flex; flex-direction: column; gap: 4px;`
  container.appendChild(objectGroup)

  const objectLabel = document.createElement("label")
  objectLabel.textContent = "[OBJECT] ← → to cycle"
  Object.assign(objectLabel.style, {
    fontSize: "11px", color: "#888", fontWeight: "normal",
    fontFamily: "monospace", letterSpacing: "0.5px"
  })
  objectGroup.appendChild(objectLabel)

  const objectName = document.createElement("div")
  objectName.style.cssText = `padding: 6px 10px; font-size: 13px; font-weight: bold;
    background: transparent; color: #0f0; border: none; font-family: monospace;`
  objectGroup.appendChild(objectName)

  const objectDesc = document.createElement("div")
  objectDesc.style.cssText = `padding: 6px 10px; font-size: 12px; font-weight: normal;
    background: transparent; color: #ccc; border: none; font-family: monospace;`
  objectGroup.appendChild(objectDesc)

  let currentObjectIndex = 0

  // Set initial UI values
  const firstAsset = objectAssets[0]
  objectName.textContent = firstAsset.name
  objectDesc.textContent = firstAsset.description || ""

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

  spawnObjectAsset(objectAssets[0])

  // ==================== RESIZE ====================
  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }
  window.addEventListener("resize", onResize)

  // ==================== ANIMATION LOOP ====================
  let animationId
  let lastTime = performance.now()
  let frameCount = 0

  function animate() {
    animationId = requestAnimationFrame(animate)
    const currentTime = performance.now()
    const delta = Math.min((currentTime - lastTime) / 1000, 0.1)
    frameCount++
    if (currentTime - lastTime >= 1000) {
      frameCount = 0
    }
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
    renderer.render(scene, camera)
  }

  animate()

  // ==================== CLEANUP ====================
  return function cleanup() {
    const inspectorBackBtn = document.getElementById("inspectorBackButton")
    if (inspectorBackBtn) inspectorBackBtn.remove()
    cancelAnimationFrame(animationId)
    if (currentObject) scene.remove(currentObject)
    if (currentLightingController) currentLightingController = null
    window.removeEventListener("resize", onResize)
    container.remove()
    scene.clear()
  }
}