import * as THREE from 'three'

const ELEVATOR_CONFIG = {
  doorWidth: 3.8,
  doorHeight: 5.0,
  doorDepth: 0.2,
  animationDuration: 1.5,
  lightIntensity: 5,
  environmentLightIntensity: 800,
  environmentLightDistance: 40,
  frameColor: '#3d3d3d',
  frameMetalness: 0.6,
  frameRoughness: 0.4,
  glowColor: '#ffffff',
  displayWidth: 1.3,
  displayHeight: 1.3,
  displayPosY: 4.15,
  displayBgColor: '#000000',
  displayBgEmissive: '#000000',
  displayBgEmissiveIntensity: 0.1
}

function createElevatorDoor() {
  const doorGroup = new THREE.Group()
  doorGroup.name = 'Elevator Door'

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: ELEVATOR_CONFIG.frameColor,
    metalness: ELEVATOR_CONFIG.frameMetalness,
    roughness: ELEVATOR_CONFIG.frameRoughness
  })
  const frameThickness = 0.15

  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, frameThickness, ELEVATOR_CONFIG.doorWidth + 2 * frameThickness),
    frameMaterial
  )
  frameTop.position.y = ELEVATOR_CONFIG.doorHeight / 2 + frameThickness / 2
  frameTop.castShadow = true
  frameTop.receiveShadow = true
  doorGroup.add(frameTop)

  const frameBottom = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, frameThickness, ELEVATOR_CONFIG.doorWidth + 2 * frameThickness),
    frameMaterial
  )
  frameBottom.position.y = -ELEVATOR_CONFIG.doorHeight / 2 - frameThickness / 2
  frameBottom.castShadow = true
  frameBottom.receiveShadow = true
  doorGroup.add(frameBottom)

  const frameLeft = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, frameThickness),
    frameMaterial
  )
  frameLeft.position.z = -ELEVATOR_CONFIG.doorWidth / 2 - frameThickness / 2
  frameLeft.castShadow = true
  frameLeft.receiveShadow = true
  doorGroup.add(frameLeft)

  const frameRight = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, frameThickness),
    frameMaterial
  )
  frameRight.position.z = ELEVATOR_CONFIG.doorWidth / 2 + frameThickness / 2
  frameRight.castShadow = true
  frameRight.receiveShadow = true
  doorGroup.add(frameRight)

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9
  })

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(ELEVATOR_CONFIG.doorDepth, ELEVATOR_CONFIG.doorHeight, ELEVATOR_CONFIG.doorWidth),
    doorMaterial
  )
  doorPanel.position.set(0, 0, 0)
  doorPanel.userData.isDoorPanel = true
  doorPanel.castShadow = true
  doorPanel.receiveShadow = true
  doorGroup.add(doorPanel)

  const glowMaterial = new THREE.MeshStandardMaterial({
    color: ELEVATOR_CONFIG.glowColor,
    emissive: ELEVATOR_CONFIG.glowColor,
    emissiveIntensity: 0,
    metalness: 0,
    roughness: 0.8
  })

  const glowPlane = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, ELEVATOR_CONFIG.doorHeight, ELEVATOR_CONFIG.doorWidth),
    glowMaterial
  )
  glowPlane.position.set(0, 0, 0)
  glowPlane.userData.isGlowPlane = true
  doorGroup.add(glowPlane)

  const environmentLight = new THREE.PointLight(
    ELEVATOR_CONFIG.glowColor,
    0,
    ELEVATOR_CONFIG.environmentLightDistance
  )
  environmentLight.position.set(0, 0, 0)
  environmentLight.castShadow = false
  environmentLight.userData.isEnvironmentLight = true
  doorGroup.add(environmentLight)

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
  displayBg.userData.isDisplayBg = true
  displayBg.castShadow = true
  displayBg.receiveShadow = true
  doorGroup.add(displayBg)

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const displayTexture = new THREE.CanvasTexture(canvas)
  displayTexture.magFilter = THREE.NearestFilter
  displayTexture.minFilter = THREE.NearestFilter

  const updateDisplayTexture = function (ballCount, isCountdownActive = false, colorMaxValue = 15) {
    ctx.fillStyle = ELEVATOR_CONFIG.displayBgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let r = 255
    let g = 0
    let b = 0
    const isNumericCount = Number.isFinite(ballCount)
    const safeCount = isNumericCount ? Math.max(0, ballCount) : 0
    const safeColorMax = Number.isFinite(colorMaxValue) && colorMaxValue > 0 ? colorMaxValue : 15

    if (isCountdownActive) {
      r = 0
      g = 255
      b = 0
    } else if (isNumericCount) {
      const ratio = THREE.MathUtils.clamp(safeCount / safeColorMax, 0, 1)
      r = Math.floor(255 * (1 - ratio))
      g = Math.floor(255 * ratio)
    }

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.font = 'bold 180px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const displayText = isNumericCount
      ? String(Math.max(0, Math.floor(ballCount))).padStart(2, '0')
      : String(ballCount)

    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2)
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
  displayPanel.position.x = -ELEVATOR_CONFIG.doorDepth * 0.05
  displayPanel.position.z = 0
  displayPanel.rotation.y = Math.PI
  displayPanel.userData.isDisplayPanel = true
  displayPanel.userData.updateDisplay = updateDisplayTexture
  updateDisplayTexture(0)
  doorGroup.add(displayPanel)

  doorGroup.userData.cachedParts = {
    doorPanel,
    glowPlane,
    environmentLight,
    displayBg,
    displayPanel
  }

  doorGroup.userData.animationState = {
    isOpening: false,
    isOpen: false,
    openProgress: 0,
    openElapsed: 0,
    glowIntensity: 0
  }

  doorGroup.userData.openDoor = function () {
    const animationState = doorGroup.userData.animationState
    if (animationState.isOpening || animationState.isOpen) return

    animationState.isOpening = true
    animationState.openElapsed = 0
    animationState.openProgress = 0
  }

  doorGroup.userData.updateAnimation = function (delta = 1 / 60) {
    const animationState = doorGroup.userData.animationState
    if (!animationState?.isOpening) return
    const animationConfig = doorGroup.userData.animationConfig || {}
    const maxGlowIntensity = animationConfig.maxGlowIntensity ?? ELEVATOR_CONFIG.lightIntensity
    const maxEnvironmentLightIntensity = animationConfig.maxEnvironmentLightIntensity ?? ELEVATOR_CONFIG.environmentLightIntensity
      const environmentLightDistance = animationConfig.environmentLightDistance ?? ELEVATOR_CONFIG.environmentLightDistance

    animationState.openElapsed = Math.min(
      ELEVATOR_CONFIG.animationDuration,
      (animationState.openElapsed || 0) + Math.max(0, delta)
    )
    animationState.openProgress = Math.min(
      animationState.openElapsed / ELEVATOR_CONFIG.animationDuration,
      1.0
    )

    const cachedParts = doorGroup.userData.cachedParts || {}
    const localDoorPanel = cachedParts.doorPanel
    const localGlowPlane = cachedParts.glowPlane
    const localEnvironmentLight = cachedParts.environmentLight

    if (localDoorPanel) {
      localDoorPanel.scale.z = 1 - animationState.openProgress
      localDoorPanel.position.z = -animationState.openProgress * (ELEVATOR_CONFIG.doorWidth / 2)
      localDoorPanel.material.opacity = 0.9 * (1 - animationState.openProgress)
    }

    if (localGlowPlane) {
      localGlowPlane.material.emissiveIntensity = maxGlowIntensity * animationState.openProgress
    }

    if (localEnvironmentLight) {
      localEnvironmentLight.intensity = maxEnvironmentLightIntensity * animationState.openProgress
        localEnvironmentLight.distance = environmentLightDistance
    }

    if (animationState.openProgress >= 1.0) {
      animationState.isOpening = false
      animationState.isOpen = true
    }
  }

  doorGroup.userData.physics = {
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

  doorGroup.userData.isTriggerZone = true
  doorGroup.userData.triggerType = 'elevator'

  return doorGroup
}

export function getElevatorDoorAsset() {
  return {
    name: 'Elevator Door',
    description: 'You’re almost there!',
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
