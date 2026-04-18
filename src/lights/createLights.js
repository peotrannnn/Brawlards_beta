import * as THREE from "three";

// ======================================================
// GLOBAL CONFIG - DỄ DÀNG CHỈNH SỬA
// ======================================================

// ==================== FOG CONFIG ====================
const FOG_CONFIG = {
  type: "linear",              // Các loại: "none" | "linear" | "exponential"
  color: "#27272a",
  near: 1,
  far: 50,
  density: 0.0001
}

// ==================== SHADOW CONFIG ====================
const SHADOW_CONFIG = {
  enabled: true,
  mapSize: 512,               // Các giá trị: 512 | 1024 | 2048
  bias: -0.0001,
  normalBias: 0.00000001,
  cameraSize: 12               // Vùng shadow nhỏ -> nét hơn
}

// ==================== LIGHTS CONFIG ====================

// Ambient Light
const AMBIENT_LIGHT_CONFIG = {
  color: "#2b4cbb",
  intensity: 0 // Tắt mặc định (để Scene tự quyết định)
}

// Directional Light (Main Light)
const DIRECTIONAL_LIGHT_CONFIG = {
  color: "#ffffff",
  intensity: 0, // Tắt mặc định
  position: [10, 20, 10],      // [x, y, z]
  castShadow: false // Tắt shadow mặc định
}

// Point Lights - Thêm nhiều đèn point light vào đây
const POINT_LIGHTS_CONFIG = [
  // Ví dụ: 
  // {
  //   color: "#ff0000",
  //   intensity: 1,
  //   distance: 10,
  //   decay: 1,
  //   position: [2, 3, 4],
  //   castShadow: false
  // }
]

// Spot Lights - Thêm nhiều đèn spot light vào đây
const SPOT_LIGHTS_CONFIG = [
  // Ví dụ:
  // {
  //   color: "#00ff00",
  //   intensity: 2,
  //   distance: 15,
  //   angle: Math.PI / 4,
  //   penumbra: 0.2,
  //   decay: 1,
  //   position: [0, 5, 0],
  //   target: [0, 0, 0],
  //   castShadow: true
  // }
]

// ==================== DEBUG CONFIG ====================
const SHOW_LIGHT_HELPERS = false

// ==================== FAKE SHADOW CONFIG ====================
const FAKE_SHADOW_CONFIG = {
  defaultSize: 1,
  defaultOpacity: 0.8,
  defaultFadeRate: 0.9,
  shadowOffset: 0.02           // Độ cao shadow so với mặt đất
}

// ======================================================
// MAIN FUNCTION - SETUP SCENE LIGHTING
// ======================================================

export function setupSceneLighting(scene, renderer, options = {}) {

  // ======================================================
  // MERGE CONFIG - Kết hợp config mặc định và options
  // ======================================================

  const config = {
    fog: { ...FOG_CONFIG, ...(options.fog || {}) },
    shadows: { ...SHADOW_CONFIG, ...(options.shadows || {}) },
    ambient: { ...AMBIENT_LIGHT_CONFIG, ...(options.ambientLight || {}) },
    directional: { ...DIRECTIONAL_LIGHT_CONFIG, ...(options.directionalLight || {}) },
    pointLights: options.pointLights || POINT_LIGHTS_CONFIG,
    spotLights: options.spotLights || SPOT_LIGHTS_CONFIG,
    helpers: options.helpers ?? SHOW_LIGHT_HELPERS
  }

  // ======================================================
  // RENDERER SHADOW SETUP
  // ======================================================

  if (renderer && config.shadows.enabled) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap  // Bóng mềm hơn, đẹp hơn và che được răng cưa
  }

  // ======================================================
  // FOG SETUP
  // ======================================================

  if (config.fog.type === "linear") {
    scene.fog = new THREE.Fog(
      config.fog.color,
      config.fog.near,
      config.fog.far
    )
  } else if (config.fog.type === "exponential") {
    scene.fog = new THREE.FogExp2(
      config.fog.color,
      config.fog.density
    )
  } else {
    scene.fog = null
  }

  // ======================================================
  // AMBIENT LIGHT SETUP
  // ======================================================

  const ambientLight = new THREE.AmbientLight(
    config.ambient.color,
    config.ambient.intensity
  )
  scene.add(ambientLight)

  // ======================================================
  // DIRECTIONAL LIGHT SETUP
  // ======================================================

  const dirLight = new THREE.DirectionalLight(
    config.directional.color,
    config.directional.intensity
  )
  dirLight.position.set(...config.directional.position)

  // Shadow setup for directional light
  if (config.directional.castShadow && config.shadows.enabled) {
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = config.shadows.mapSize
    dirLight.shadow.mapSize.height = config.shadows.mapSize
    dirLight.shadow.bias = config.shadows.bias
    dirLight.shadow.normalBias = config.shadows.normalBias

    const d = config.shadows.cameraSize
    dirLight.shadow.camera.left = -d
    dirLight.shadow.camera.right = d
    dirLight.shadow.camera.top = d
    dirLight.shadow.camera.bottom = -d
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 60
  }

  scene.add(dirLight)

  // Directional light target
  const dirTarget = new THREE.Object3D()
  dirTarget.position.set(0, 0, 0)
  scene.add(dirTarget)
  dirLight.target = dirTarget

  // ======================================================
  // POINT LIGHTS SETUP
  // ======================================================

  const pointLights = []
  config.pointLights.forEach(plConfig => {
    const pl = new THREE.PointLight(
      plConfig.color,
      plConfig.intensity,
      plConfig.distance,
      plConfig.decay
    )
    pl.position.set(...plConfig.position)

    if (plConfig.castShadow && config.shadows.enabled) {
      pl.castShadow = true
      pl.shadow.mapSize.width = config.shadows.mapSize
      pl.shadow.mapSize.height = config.shadows.mapSize
      pl.shadow.bias = config.shadows.bias
      pl.shadow.normalBias = config.shadows.normalBias
    }

    scene.add(pl)
    pointLights.push(pl)
  })

  // ======================================================
  // SPOT LIGHTS SETUP
  // ======================================================

  const spotLights = []
  config.spotLights.forEach(slConfig => {
    const sl = new THREE.SpotLight(
      slConfig.color,
      slConfig.intensity,
      slConfig.distance,
      slConfig.angle,
      slConfig.penumbra,
      slConfig.decay
    )
    sl.position.set(...slConfig.position)

    if (slConfig.castShadow && config.shadows.enabled) {
      sl.castShadow = true
      sl.shadow.mapSize.width = config.shadows.mapSize
      sl.shadow.mapSize.height = config.shadows.mapSize
      sl.shadow.bias = config.shadows.bias
      sl.shadow.normalBias = config.shadows.normalBias
    }

    const target = new THREE.Object3D()
    target.position.set(...(slConfig.target || [0, 0, 0]))
    scene.add(target)
    sl.target = target

    scene.add(sl)
    spotLights.push(sl)
  })

  // ======================================================
  // LIGHT HELPERS SETUP (Debug)
  // ======================================================

  if (config.helpers) {
    scene.add(new THREE.DirectionalLightHelper(dirLight, 1))
    pointLights.forEach(pl => {
      scene.add(new THREE.PointLightHelper(pl, 0.5))
    })
    spotLights.forEach(sl => {
      scene.add(new THREE.SpotLightHelper(sl))
    })
  }

  // ======================================================
  // STORE ORIGINAL SHADOW STATE
  // ======================================================

  const allLights = [dirLight, ...pointLights, ...spotLights]
  allLights.forEach(light => {
    light.userData.originalShadow = light.castShadow
  })

  // ======================================================
  // RETURN CONTROLLER
  // ======================================================

  return {
    ambientLight,
    directionalLight: dirLight,
    pointLights,
    spotLights,

    updateShadowSettings(settings) {
      allLights.forEach(light => {
        if (!light.shadow) return

        if (settings.mapSize) {
          light.shadow.mapSize.width = settings.mapSize
          light.shadow.mapSize.height = settings.mapSize
        }
        if (settings.bias !== undefined) {
          light.shadow.bias = settings.bias
        }
        if (settings.normalBias !== undefined) {
          light.shadow.normalBias = settings.normalBias
        }
      })
    },

    toggleShadows(enable) {
      allLights.forEach(light => {
        if (light.castShadow === undefined) return
        light.castShadow = enable && light.userData.originalShadow
      })
    }
  }
}

// ======================================================
// FAKE SHADOW MANAGER
// ======================================================

/**
 * Quản lý shadow giả (dạng hình tròn) cho các object động
 * Giúp tối ưu performance, object động vẫn nhận shadow thật 
 * nhưng CAST shadow giả này
 */
export class FakeShadowManager {
  constructor(scene) {
    this.scene = scene
    this.shadows = new Map() // Maps target object UUID to shadow data
    this.shadowTexture = this._createShadowTexture()
    
    this.raycaster = new THREE.Raycaster()
    this.downVector = new THREE.Vector3(0, -1, 0)
    this.groundObjects = [] // List of objects that can receive shadows
  }

  /**
   * Tạo texture shadow hình tròn với gradient mờ dần
   * @private
   */
  _createShadowTexture() {
    const canvas = document.createElement('canvas')
    const size = 128
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')

    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0, 
      size / 2, size / 2, size / 2
    )
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)')  // Tâm shadow đậm hơn
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')   // Rìa shadow mờ dần

    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)

    return new THREE.CanvasTexture(canvas)
  }

  /**
   * Set các object mà shadow sẽ chiếu lên (sàn nhà, bàn, v.v.)
   * @param {THREE.Object3D[]} objects Array of ground objects
   */
  setGroundObjects(objects) {
    this.groundObjects = objects
  }

  /**
   * Thêm fake shadow cho một object
   * @param {THREE.Object3D} targetObject Object cần tạo shadow
   * @param {object} options Tùy chỉnh shadow
   * @param {number} options.size Kích thước shadow (mặc định: 1)
   * @param {number} options.opacity Độ mờ cơ bản (mặc định: 0.7)
   * @param {number} options.fadeRate Tốc độ mờ theo độ cao (mặc định: 0.8)
   */
  addShadow(targetObject, options = {}) {
    if (!targetObject || this.shadows.has(targetObject.uuid)) {
      return
    }

    const size = options.size ?? FAKE_SHADOW_CONFIG.defaultSize
    const opacity = options.opacity ?? FAKE_SHADOW_CONFIG.defaultOpacity
    const fadeRate = options.fadeRate ?? FAKE_SHADOW_CONFIG.defaultFadeRate // Sử dụng fadeRate từ options

    // Tắt cast shadow thật cho object
    targetObject.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false
      }
    })

    // Tạo shadow mesh
    const shadowGeo = new THREE.PlaneGeometry(size, size)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: opacity,
    })

    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI / 2 // Xoay để nằm ngang
    shadowMesh.visible = false // Ẩn ban đầu, sẽ hiện khi tìm thấy mặt đất
    this.scene.add(shadowMesh)

    // Lưu data
    this.shadows.set(targetObject.uuid, {
      target: targetObject,
      shadow: shadowMesh,
      baseOpacity: opacity,
      fadeRate: fadeRate
    })
  }

  /**
   * Xóa shadow của một object
   * @param {THREE.Object3D} targetObject Object cần xóa shadow
   */
  removeShadow(targetObject) {
    if (!targetObject || !this.shadows.has(targetObject.uuid)) {
      return
    }

    const shadowData = this.shadows.get(targetObject.uuid)
    this.scene.remove(shadowData.shadow)
    shadowData.shadow.geometry.dispose()
    shadowData.shadow.material.dispose()
    this.shadows.delete(targetObject.uuid)
  }

  /**
   * Update vị trí và opacity của tất cả shadows
   * Gọi hàm này trong animation loop
   */
  update() {
    if (this.shadows.size === 0) return

    this.shadows.forEach(shadowData => {
      const { target, shadow, baseOpacity, fadeRate } = shadowData

      // Update vị trí X, Z theo target
      shadow.position.x = target.position.x
      shadow.position.z = target.position.z

      // Raycast xuống để tìm mặt đất
      this.raycaster.set(target.position, this.downVector)
      
      // Kiểm tra va chạm với ground objects
      const intersects = this.raycaster.intersectObjects(this.groundObjects, true)

      if (intersects.length > 0) {
        const hit = intersects[0]
        // Đặt shadow hơi cao hơn mặt đất một chút
        shadow.position.y = hit.point.y + FAKE_SHADOW_CONFIG.shadowOffset
        shadow.visible = true

        // Điều chỉnh opacity theo độ cao
        shadow.material.opacity = Math.max(0, baseOpacity - hit.distance * fadeRate)
      } else {
        // Không tìm thấy mặt đất -> ẩn shadow
        shadow.visible = false
      }
    })
  }

  /**
   * Xóa tất cả shadows và dọn dẹp
   */
  clearAll() {
    this.shadows.forEach(shadowData => {
      this.scene.remove(shadowData.shadow)
      shadowData.shadow.geometry.dispose()
      shadowData.shadow.material.dispose()
    })
    this.shadows.clear()
  }
}