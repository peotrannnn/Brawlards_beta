import * as THREE from 'three'

const ELEVATOR_CONFIG = {
  doorWidth: 3.8,      // ✨ Tăng từ 3.5
  doorHeight: 5.0,     // ✨ Tăng từ 4.5
  doorDepth: 0.2,
  posX: 29.5,  // Tường bên phải
  posY: 2.5,   // ✨ Điều chỉnh cho đáy = Y(0) (doorHeight/2 = 5.0/2)
  posZ: 0,     // Center (ngang với cửa sổ)
  animationDuration: 1.5,  // 1.5 giây
  lightIntensity: 5,  // ✨ Tăng từ 3
  environmentLightIntensity: 800,  // ✨ Reduced: Less bright emit light
  environmentLightDistance: 40,     // ✨ NEW: Khoảng ảnh hưởng ánh sáng
  frameColor: "#3d3d3d",    // Xám tối metallic
  frameMetalness: 0.6,
  frameRoughness: 0.4,
  glowColor: "#ffffff",     // Ánh sáng trắng bên trong
  displayWidth: 1.3,        // ✨ Giảm xuống vừa chữ số (2 chữ x 0.65)
  displayHeight: 1.3,       // ✨ Chiều cao bằng chiều rộng
  displayPosY: 4.15,        // ✨ Tính lại = doorHeight/2 + 0.65 = 2.5 + 1.65
  displayBgColor: "#000000", // Đen thuần
  displayBgEmissive: "#000000",
  displayBgEmissiveIntensity: 0.1,
  ledSegmentColor: "#ff0000", // Đỏ mặc định
  ledSegmentEmissiveIntensity: 0.8
}

/**
 * Create a single elevator door instance
 * Returns a THREE.Group with animation state and methods
 */
function createElevatorDoor() {
  const doorGroup = new THREE.Group()
  doorGroup.name = 'Elevator Door'

  // =====================================================
  // 1. CỬA THANG MÁY (DOOR FRAME + GLASS)
  // =====================================================
  
  // Door frame (xám metallic)
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: ELEVATOR_CONFIG.frameColor,
    metalness: ELEVATOR_CONFIG.frameMetalness,
    roughness: ELEVATOR_CONFIG.frameRoughness
  })

  // Frame border (4 cạnh)
  const frameThickness = 0.15
  
  // Top frame
  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, frameThickness, ELEVATOR_CONFIG.doorWidth + 2*frameThickness),
    frameMaterial
  )
  frameTop.position.y = ELEVATOR_CONFIG.doorHeight / 2 + frameThickness / 2
  frameTop.castShadow = true
  frameTop.receiveShadow = true
  doorGroup.add(frameTop)

  // Bottom frame
  const frameBottom = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, frameThickness, ELEVATOR_CONFIG.doorWidth + 2*frameThickness),
    frameMaterial
  )
  frameBottom.position.y = -ELEVATOR_CONFIG.doorHeight / 2 - frameThickness / 2
  frameBottom.castShadow = true
  frameBottom.receiveShadow = true
  doorGroup.add(frameBottom)

  // Left frame
  const frameLeft = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, frameThickness),
    frameMaterial
  )
  frameLeft.position.z = -ELEVATOR_CONFIG.doorWidth / 2 - frameThickness / 2
  frameLeft.castShadow = true
  frameLeft.receiveShadow = true
  doorGroup.add(frameLeft)

  // Right frame
  const frameRight = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, frameThickness),
    frameMaterial
  )
  frameRight.position.z = ELEVATOR_CONFIG.doorWidth / 2 + frameThickness / 2
  frameRight.castShadow = true
  frameRight.receiveShadow = true
  doorGroup.add(frameRight)

  // Door panel (opaque gray metallic)
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.3,
    roughness: 0.2,
    transparent: false,
    opacity: 1.0
  })

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, ELEVATOR_CONFIG.doorWidth),
    doorMaterial
  )
  doorPanel.position.x = 0  // ✨ Flush with wall surface
  doorPanel.position.z = 0
  doorPanel.userData.isDoorPanel = true // Mark for animation
  doorPanel.castShadow = true
  doorPanel.receiveShadow = true
  doorGroup.add(doorPanel)

  // Interior glow plane (khi cửa mở, từ này sáng ra)
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: ELEVATOR_CONFIG.glowColor,
    emissive: ELEVATOR_CONFIG.glowColor,
    emissiveIntensity: 0,  // Sẽ animate từ 0 → ELEVATOR_CONFIG.lightIntensity
    metalness: 0,
    roughness: 0.8
  })

  const glowPlane = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, ELEVATOR_CONFIG.doorHeight, ELEVATOR_CONFIG.doorWidth),
    glowMaterial
  )
  glowPlane.position.x = 0  // ✨ Giữa khung, không trồi ra ngoài
  glowPlane.position.y = 0  // ✨ Giữa cao cửa
  glowPlane.position.z = 0  // ✨ Giữa rộng cửa
  glowPlane.userData.isGlowPlane = true // Mark for animation
  doorGroup.add(glowPlane)

  // ✨ PointLight emit sáng lên môi trường khi cửa mở (intensity animate từ 0 → max)
  const environmentLight = new THREE.PointLight(
    ELEVATOR_CONFIG.glowColor,  // Màu trắng
    0,  // Bắt đầu 0 khi đóng
    ELEVATOR_CONFIG.environmentLightDistance  // Bán kính ảnh hưởng
  )
  environmentLight.position.set(0, 0, 0)  // Ở giữa cửa
  environmentLight.castShadow = false
  environmentLight.userData.isEnvironmentLight = true
  doorGroup.add(environmentLight)


  // =====================================================
  // 2. BẢNG SỐ ĐIỆN TỬ LED (TRÊN CỬA)
  // =====================================================

  // Display background (đen, có emissive)
  const displayBgMaterial = new THREE.MeshStandardMaterial({
    color: ELEVATOR_CONFIG.displayBgColor,
    emissive: ELEVATOR_CONFIG.displayBgEmissive,
    emissiveIntensity: ELEVATOR_CONFIG.displayBgEmissiveIntensity,
    metalness: 0.1,
    roughness: 0.9
  })

  const displayBg = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth * 0.5, ELEVATOR_CONFIG.displayHeight, ELEVATOR_CONFIG.displayWidth),
    displayBgMaterial
  )
  displayBg.position.y = ELEVATOR_CONFIG.displayPosY
  displayBg.position.x = ELEVATOR_CONFIG.doorDepth * 0.25
  displayBg.userData.isDisplayBg = true // Mark for identification
  displayBg.castShadow = true
  displayBg.receiveShadow = true
  doorGroup.add(displayBg)

  // ✨ Canvas texture cho 7-segment LED display
  const canvas = document.createElement('canvas')
  canvas.width = 256   // ✨ Square canvas
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  const displayTexture = new THREE.CanvasTexture(canvas)
  displayTexture.magFilter = THREE.NearestFilter
  displayTexture.minFilter = THREE.NearestFilter

  // Function để vẽ display lại (sẽ gọi từ Scene1Manager)
  const updateDisplayTexture = function(ballCount, isCountdownActive = false, colorMaxValue = 15) {
    ctx.fillStyle = ELEVATOR_CONFIG.displayBgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Tính màu dựa trên ballCount
    let r = 255, g = 0, b = 0 // Default: Red
    const isNumericCount = Number.isFinite(ballCount)
    const safeCount = isNumericCount ? Math.max(0, ballCount) : 0
    const safeColorMax = Number.isFinite(colorMaxValue) && colorMaxValue > 0 ? colorMaxValue : 15

    // Nếu countdown đang chạy thì luôn xanh.
    if (isCountdownActive) {
      r = 0
      g = 255
      b = 0
    } else if (isNumericCount) {
      const ratio = THREE.MathUtils.clamp(safeCount / safeColorMax, 0, 1)
      r = Math.floor(255 * (1 - ratio))
      g = Math.floor(255 * ratio)
    }

    const color = `rgb(${r}, ${g}, ${b})`
    ctx.fillStyle = color
    ctx.font = 'bold 180px "Courier New", monospace'  // ✨ Use fallback font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const displayText = isNumericCount
      ? String(Math.max(0, Math.floor(ballCount))).padStart(2, '0')
      : String(ballCount)
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2)

    // ✨ Update texture
    displayTexture.needsUpdate = true
  }

  const displayMaterial = new THREE.MeshStandardMaterial({
    map: displayTexture,
    emissive: 0x000000,
    emissiveIntensity: 0.3,
    metalness: 0,
    roughness: 0.5
  })

  const displayPanel = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth * 0.1, ELEVATOR_CONFIG.displayHeight, ELEVATOR_CONFIG.displayWidth),
    displayMaterial
  )
  displayPanel.position.y = ELEVATOR_CONFIG.displayPosY
  displayPanel.position.x = -ELEVATOR_CONFIG.doorDepth * 0.05  // ✨ Sâu vừa đủ, nằm trong khung
  displayPanel.position.z = 0  // ✨ Giữa rộng cửa
  displayPanel.rotation.y = Math.PI  // ✨ Flip to face outward
  displayPanel.userData.isDisplayPanel = true // Mark for identification
  
  // ✨ CRITICAL: Expose updateDisplay in userData so Scene1Manager can call it
  displayPanel.userData.updateDisplay = updateDisplayTexture
  
  // ✨ Initialize display with "00" in red
  updateDisplayTexture(0)
  
  doorGroup.add(displayPanel)

  // =====================================================
  // 3. ANIMATION STATE
  // =====================================================
  doorGroup.userData.animationState = {
    isOpening: false,
    isOpen: false,
    openProgress: 0, // 0 = closed, 1 = fully open
    openStartTime: 0,
    glowIntensity: 0
  }

  // =====================================================
  // 4. ANIMATION METHODS
  // =====================================================

  /**
   * Start door opening animation
   */
  doorGroup.userData.openDoor = function() {
    if (this.animationState.isOpening || this.animationState.isOpen) return
    
    this.animationState.isOpening = true
    this.animationState.openStartTime = Date.now()
    this.animationState.openProgress = 0
  }

  /**
   * Update door animation (call from Scene1Manager update loop)
   * @param {number} deltaTime - Delta time in milliseconds
   */
  doorGroup.userData.updateAnimation = function(deltaTime) {
    if (!this.animationState.isOpening) return

    const elapsed = Date.now() - this.animationState.openStartTime
    const durationMs = ELEVATOR_CONFIG.animationDuration * 1000
    this.animationState.openProgress = Math.min(elapsed / durationMs, 1.0)

    // Find door panel and glow plane
    const doorPanel = this.children.find(c => c.userData.isDoorPanel)
    const glowPlane = this.children.find(c => c.userData.isGlowPlane)
    const environmentLight = this.children.find(c => c.userData.isEnvironmentLight)

    if (doorPanel) {
      // ✨ Ép chiều rộng cửa từ 1 → 0 về một bên (từ phải sang trái)
      doorPanel.scale.z = 1 - this.animationState.openProgress
      // Adjust position to keep left edge fixed, compress from right
      doorPanel.position.z = -this.animationState.openProgress * (ELEVATOR_CONFIG.doorWidth / 2)
      // Also fade out door slightly
      doorPanel.material.opacity = 0.9 * (1 - this.animationState.openProgress)
    }

    if (glowPlane) {
      // Increase glow intensity - glow plane emits light, doesn't cast it
      // Sáng dần từ 0 → 5 khi mở cửa
      glowPlane.material.emissiveIntensity = ELEVATOR_CONFIG.lightIntensity * this.animationState.openProgress
    }

    if (environmentLight) {
      // ✨ NEW: Animate environment light intensity from 0 → max as door opens
      // Light cast lên môi trường xung quanh khi cửa mở
      environmentLight.intensity = ELEVATOR_CONFIG.environmentLightIntensity * this.animationState.openProgress
    }

    // Animation complete
    if (this.animationState.openProgress >= 1.0) {
      this.animationState.isOpening = false
      this.animationState.isOpen = true
    }
  }

  // =====================================================
  // 5. HITBOX CONFIGURATION
  // =====================================================
  
  // Simple hitbox that wraps the elevator door (width, height, depth)
  doorGroup.userData.physics = {
    type: 'static',
    material: 'table',
    shapes: [
      {
        type: 'box',
        size: [
          ELEVATOR_CONFIG.doorDepth,                    // Depth (x-axis)
          ELEVATOR_CONFIG.doorHeight,                   // Height (y-axis)
          ELEVATOR_CONFIG.doorWidth                     // Width (z-axis)
        ],
        offset: [0, 0, 0]  // Center position relative to door group
      }
    ]
  }

  // Mark for trigger collision detection
  doorGroup.userData.isTriggerZone = true
  doorGroup.userData.triggerType = 'elevator'

  return doorGroup
}

/**
 * Export elevator door asset with proper static asset structure
 * - name: Asset name
 * - description: Asset description
 * - factory: Function that creates a new elevator door instance
 * - physics: Static physics with hitbox
 */
export function getElevatorDoorAsset() {
  return {
    name: 'Elevator Door',
    description: 'Làm sao để mở nó?',
    factory: () => createElevatorDoor(),
    physics: {
      type: 'static',
      material: 'table',
      shapes: [
        {
          type: 'box',
          size: [
            ELEVATOR_CONFIG.doorDepth,
            ELEVATOR_CONFIG.doorHeight,
            ELEVATOR_CONFIG.doorWidth
          ],
          offset: [0, 0, 0]
        }
      ]
    }
  }
}
