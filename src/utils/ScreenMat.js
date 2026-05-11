import * as THREE from 'three'
import { createDummyPreviewMesh } from '../assets/objects/Dummy.js'

const SCREEN_MAT_STYLE_ID = 'scene1-screenmat-style'
const SCREEN_MAT_LOADING_PREVIEW_SIZE = 132

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function lerp(start, end, alpha) {
  return start + ((end - start) * alpha)
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(1e-5, edge1 - edge0), 0, 1)
  return t * t * (3 - (2 * t))
}

function fitPerspectiveCameraToObject(camera, object, { padding = 1.22, verticalOffsetFactor = 0.04 } = {}) {
  if (!camera || !object) return

  object.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(object)
  if (bounds.isEmpty()) return

  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * camera.aspect)
  const fitHeightDistance = size.y / (2 * Math.tan(verticalFov * 0.5))
  const fitWidthDistance = size.x / (2 * Math.tan(horizontalFov * 0.5))
  const fitDepthDistance = size.z * 0.7
  const distance = Math.max(fitHeightDistance, fitWidthDistance, fitDepthDistance, 1.4) * padding

  camera.position.set(
    center.x,
    center.y + (size.y * verticalOffsetFactor),
    center.z + distance
  )
  camera.near = Math.max(0.01, distance / 100)
  camera.far = Math.max(20, distance * 8)
  camera.lookAt(center.x, center.y, center.z)
  camera.updateProjectionMatrix()
}

function ensureStyles() {
  if (document.getElementById(SCREEN_MAT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = SCREEN_MAT_STYLE_ID
  style.textContent = `
    .screen-mat-blood-layer,
    .screen-mat-guy-layer,
    .screen-mat-stun-layer,
    .white-flash-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
    }

    .screen-mat-loading-stage {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
    }

    .screen-mat-loading-shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transform: translateY(-2px);
    }

    .screen-mat-loading-preview-shell {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateZ(0);
      transform-origin: center center;
      will-change: transform;
      animation:
        screen-mat-loading-preview-spin 2.6s linear infinite,
        screen-mat-loading-preview-float 1.8s ease-in-out infinite alternate;
    }

    .screen-mat-loading-preview {
      width: 132px;
      height: 132px;
      display: block;
      filter: drop-shadow(0 0 14px rgba(0, 0, 0, 0.08));
    }

    .screen-mat-loading-label {
      color: #000000;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      line-height: 1;
      white-space: nowrap;
      text-transform: none;
      text-align: center;
      margin-top: 0;
    }

    .screen-mat-blood-layer {
      z-index: 1700;
      opacity: 0;
      --blood-mid-alpha: 0;
      --blood-edge-alpha: 0;
      background:
        radial-gradient(
          circle at center,
          rgba(55, 0, 0, 0) 36%,
          rgba(125, 0, 0, var(--blood-mid-alpha)) 64%,
          rgba(210, 10, 10, var(--blood-edge-alpha)) 100%
        );
      mix-blend-mode: screen;
      filter: saturate(1.3) contrast(1.08);
    }

    .screen-mat-guy-layer {
      inset: -3%;
      z-index: 1800;
      opacity: 0;
      --blur: 0px;
      --brightness: 1;
      --contrast: 1;
      --veil: 0;
      --ghost-alpha: 0;
      --noise-alpha: 0;
      --dvx: 0px;
      --dvy: 0px;
      --warp-x: 0px;
      --warp-y: 0px;
      --warp-scale-x: 1;
      --warp-scale-y: 1;
      --warp-skew-x: 0deg;
      --warp-skew-y: 0deg;
      background: rgba(6, 8, 12, var(--veil));
      overflow: hidden;
      transform-origin: center center;
      transform:
        translate3d(var(--warp-x), var(--warp-y), 0)
        scale(var(--warp-scale-x), var(--warp-scale-y))
        skewX(var(--warp-skew-x))
        skewY(var(--warp-skew-y));
      will-change: transform, opacity, backdrop-filter, -webkit-backdrop-filter;
      backdrop-filter:
        blur(var(--blur))
        brightness(var(--brightness))
        contrast(var(--contrast))
        saturate(0.9);
      -webkit-backdrop-filter:
        blur(var(--blur))
        brightness(var(--brightness))
        contrast(var(--contrast))
        saturate(0.9);
    }

    .screen-mat-guy-layer.low-cost,
    .screen-mat-guy-layer.low-cost .screen-mat-guy-ghost,
    .screen-mat-guy-layer.low-cost .screen-mat-guy-noise,
    .screen-mat-stun-layer.low-cost,
    .screen-mat-stun-layer.low-cost .screen-mat-stun-ghost,
    .screen-mat-stun-layer.low-cost.active {
      animation: none !important;
      transform: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      filter: none !important;
    }

    .screen-mat-guy-ghost,
    .screen-mat-stun-ghost {
      position: absolute;
      inset: 0;
    }

    .screen-mat-guy-ghost {
      background: rgba(150, 170, 220, 0.06);
      opacity: var(--ghost-alpha);
      transform: translate(var(--dvx), var(--dvy));
      mix-blend-mode: screen;
    }

    .screen-mat-guy-noise {
      position: absolute;
      inset: -4%;
      opacity: var(--noise-alpha);
      background-image:
        linear-gradient(180deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.03) 20%, rgba(255, 255, 255, 0.15) 52%, rgba(255, 255, 255, 0.02) 100%),
        repeating-linear-gradient(180deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(255, 255, 255, 0.05) 3px, rgba(0, 0, 0, 0.12) 4px),
        repeating-linear-gradient(90deg, rgba(255, 0, 0, 0.05) 0px, rgba(255, 0, 0, 0) 2px, rgba(0, 255, 255, 0.05) 3px, rgba(0, 255, 255, 0) 5px);
      background-size: 100% 100%, 100% 6px, 240px 100%;
      mix-blend-mode: screen;
      transform: translate(calc(var(--dvx) * -0.7), calc(var(--dvy) * -0.35));
      filter: blur(0.45px) contrast(1.14) saturate(1.08);
      animation: screen-mat-vhs 0.18s steps(2) infinite;
    }

    .screen-mat-stun-layer {
      z-index: 1900;
      opacity: 0;
      --blur: 2px;
      --desat: 1;
      --brightness: 1;
      --contrast: 1;
      --veil: 0;
      --dvx: 0px;
      --dvy: 0px;
      --ghost-alpha: 0;
      background: rgba(6, 8, 12, var(--veil));
      backdrop-filter:
        blur(var(--blur))
        grayscale(calc(1 - var(--desat)))
        brightness(var(--brightness))
        contrast(var(--contrast));
      -webkit-backdrop-filter:
        blur(var(--blur))
        grayscale(calc(1 - var(--desat)))
        brightness(var(--brightness))
        contrast(var(--contrast));
      filter:
        blur(var(--blur))
        grayscale(calc(1 - var(--desat)))
        brightness(var(--brightness))
        contrast(var(--contrast));
    }

    .screen-mat-stun-layer.active {
      animation: screen-mat-pulse var(--pulse-duration, 4s) ease-in-out infinite;
    }

    .screen-mat-stun-ghost {
      background: rgba(150, 170, 220, 0.03);
      opacity: var(--ghost-alpha);
      transform: translate(var(--dvx), var(--dvy));
      mix-blend-mode: screen;
      backdrop-filter:
        blur(calc(var(--blur) * 0.5))
        grayscale(calc(1 - var(--desat)))
        brightness(calc(var(--brightness) * 0.95))
        contrast(calc(var(--contrast) * 1.05));
      -webkit-backdrop-filter:
        blur(calc(var(--blur) * 0.5))
        grayscale(calc(1 - var(--desat)))
        brightness(calc(var(--brightness) * 0.95))
        contrast(calc(var(--contrast) * 1.05));
    }

    .white-flash-layer {
      z-index: 20000;
      background: white;
      opacity: 0;
    }

    @keyframes screen-mat-pulse {
      0% {
        backdrop-filter:
          blur(var(--blur))
          grayscale(calc(1 - var(--desat)))
          brightness(var(--brightness))
          contrast(var(--contrast));
        filter:
          blur(var(--blur))
          grayscale(calc(1 - var(--desat)))
          brightness(var(--brightness))
          contrast(var(--contrast));
      }

      50% {
        backdrop-filter:
          blur(calc(var(--blur) * 1.6))
          grayscale(calc(1 - var(--desat)))
          brightness(calc(var(--brightness) * 0.9))
          contrast(calc(var(--contrast) * 1.15));
        filter:
          blur(calc(var(--blur) * 1.6))
          grayscale(calc(1 - var(--desat)))
          brightness(calc(var(--brightness) * 0.9))
          contrast(calc(var(--contrast) * 1.15));
      }

      100% {
        backdrop-filter:
          blur(var(--blur))
          grayscale(calc(1 - var(--desat)))
          brightness(var(--brightness))
          contrast(var(--contrast));
        filter:
          blur(var(--blur))
          grayscale(calc(1 - var(--desat)))
          brightness(var(--brightness))
          contrast(var(--contrast));
      }
    }

    @keyframes screen-mat-vhs {
      0% {
        transform: translate(calc(var(--dvx) * -0.7), calc(var(--dvy) * -0.35));
      }

      50% {
        transform: translate(calc(var(--dvx) * -1.15), calc(var(--dvy) * -0.15));
      }

      100% {
        transform: translate(calc(var(--dvx) * -0.55), calc(var(--dvy) * -0.5));
      }
    }

    @keyframes screen-mat-loading-preview-spin {
      from {
        transform: translateZ(0) rotate(0deg);
      }

      to {
        transform: translateZ(0) rotate(360deg);
      }
    }

    @keyframes screen-mat-loading-preview-float {
      from {
        translate: 0 2px;
      }

      to {
        translate: 0 -4px;
      }
    }
  `

  document.head.appendChild(style)
}

export class ScreenMat {
  constructor(container = document.body) {
    this.container = container
    this.overlay = null
    this.ghostLayer = null
    this.whiteFlashLayer = null
    this.guyLayer = null
    this.guyGhostLayer = null
    this.guyNoiseLayer = null
    this.bloodLayer = null
    this.loadingStage = null
    this.loadingLabel = null
    this.loadingPreviewRenderer = null
    this.loadingPreviewScene = null
    this.loadingPreviewCamera = null
    this.loadingPreviewDummyWrapper = null
    this.loadingPreviewDummy = null
    this.sceneDistortionTarget = null
    this.sceneDistortionOriginalStyle = null

    this.stunRemainingMs = 0
    this.stunTotalDurationMs = 0
    this.stunActive = false
    this.stunElapsedMs = 0
    this.isFlash = false
    this.flashRemainingMs = 0
    this.lowCost = false
    this.loadingTransition = null

    this.runtimeMs = 0
    this.guyTargetIntensity = 0
    this.guyCurrentIntensity = 0
    this.bloodHealthRatio = 1
    this.damagePulse = 0

    if (typeof document !== 'undefined') {
      ensureStyles()

      this.bloodLayer = document.createElement('div')
      this.bloodLayer.className = 'screen-mat-blood-layer'

      this.guyLayer = document.createElement('div')
      this.guyLayer.className = 'screen-mat-guy-layer'

      this.guyGhostLayer = document.createElement('div')
      this.guyGhostLayer.className = 'screen-mat-guy-ghost'
      this.guyLayer.appendChild(this.guyGhostLayer)

      this.guyNoiseLayer = document.createElement('div')
      this.guyNoiseLayer.className = 'screen-mat-guy-noise'
      this.guyLayer.appendChild(this.guyNoiseLayer)

      this.overlay = document.createElement('div')
      this.overlay.className = 'screen-mat-stun-layer'

      this.ghostLayer = document.createElement('div')
      this.ghostLayer.className = 'screen-mat-stun-ghost'
      this.overlay.appendChild(this.ghostLayer)

      this.whiteFlashLayer = document.createElement('div')
      this.whiteFlashLayer.className = 'white-flash-layer'
      this._initializeLoadingIndicator()

      this.container.appendChild(this.bloodLayer)
      this.container.appendChild(this.guyLayer)
      this.container.appendChild(this.overlay)
      this.container.appendChild(this.whiteFlashLayer)
    }
  }

  _initializeLoadingIndicator() {
    if (!this.whiteFlashLayer || typeof document === 'undefined') return

    const stage = document.createElement('div')
    stage.className = 'screen-mat-loading-stage'

    const shell = document.createElement('div')
    shell.className = 'screen-mat-loading-shell'

    const previewShell = document.createElement('div')
    previewShell.className = 'screen-mat-loading-preview-shell'

    const label = document.createElement('div')
    label.className = 'screen-mat-loading-label'
    label.textContent = 'loading'

    stage.appendChild(shell)
    shell.appendChild(previewShell)
    shell.appendChild(label)
    this.whiteFlashLayer.appendChild(stage)

    this.loadingStage = stage
    this.loadingLabel = label

    try {
      const previewRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      })
      previewRenderer.setClearColor(0xffffff, 0)
      previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
      previewRenderer.setSize(SCREEN_MAT_LOADING_PREVIEW_SIZE, SCREEN_MAT_LOADING_PREVIEW_SIZE, false)
      previewRenderer.domElement.className = 'screen-mat-loading-preview'

      const previewScene = new THREE.Scene()
      const previewCamera = new THREE.PerspectiveCamera(28, 1, 0.1, 20)

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
      keyLight.position.set(2.4, 3.1, 3.8)
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.85)
      rimLight.position.set(-2.8, 1.6, -2.2)

      const dummyWrapper = new THREE.Group()
      dummyWrapper.position.y = 0.08
      dummyWrapper.rotation.x = 0
      dummyWrapper.rotation.y = 0

      const dummy = createDummyPreviewMesh()
      dummy.scale.setScalar(1.08)
      dummy.position.y = -0.58
      dummyWrapper.add(dummy)

      previewScene.add(ambientLight)
      previewScene.add(keyLight)
      previewScene.add(rimLight)
      previewScene.add(dummyWrapper)
      fitPerspectiveCameraToObject(previewCamera, dummyWrapper)

      previewShell.appendChild(previewRenderer.domElement)

      this.loadingPreviewRenderer = previewRenderer
      this.loadingPreviewScene = previewScene
      this.loadingPreviewCamera = previewCamera
      this.loadingPreviewDummyWrapper = dummyWrapper
      this.loadingPreviewDummy = dummy

      previewRenderer.render(previewScene, previewCamera)
    } catch {
      this.loadingPreviewRenderer = null
      this.loadingPreviewScene = null
      this.loadingPreviewCamera = null
      this.loadingPreviewDummyWrapper = null
      this.loadingPreviewDummy = null
    }
  }

  _setLoadingIndicatorVisible(visible) {
    if (!this.loadingStage) return
    this.loadingStage.style.display = visible ? 'flex' : 'none'
    this.loadingStage.style.opacity = visible ? '1' : '0'
  }

  _disposeLoadingIndicator() {
    if (this.loadingPreviewDummy) {
      this.loadingPreviewDummy.traverse((child) => {
        if (child?.geometry?.dispose) {
          child.geometry.dispose()
        }

        const material = child?.material
        if (!material) return

        const materials = Array.isArray(material) ? material : [material]
        materials.forEach((entry) => {
          if (!entry) return
          if (entry.map?.dispose) entry.map.dispose()
          if (entry.emissiveMap?.dispose) entry.emissiveMap.dispose()
          if (entry.dispose) entry.dispose()
        })
      })
    }

    if (this.loadingPreviewRenderer) {
      this.loadingPreviewRenderer.dispose()
      if (typeof this.loadingPreviewRenderer.forceContextLoss === 'function') {
        this.loadingPreviewRenderer.forceContextLoss()
      }
    }

    if (this.loadingStage && this.loadingStage.parentElement) {
      this.loadingStage.parentElement.removeChild(this.loadingStage)
    }

    this.loadingStage = null
    this.loadingLabel = null
    this.loadingPreviewRenderer = null
    this.loadingPreviewScene = null
    this.loadingPreviewCamera = null
    this.loadingPreviewDummyWrapper = null
    this.loadingPreviewDummy = null
  }

  _setPerformanceMode(lowCost) {
    this.lowCost = !!lowCost

    if (this.overlay) {
      this.overlay.classList.toggle('low-cost', this.lowCost)
    }

    if (this.guyLayer) {
      this.guyLayer.classList.toggle('low-cost', this.lowCost)
    }
  }

  _setWhiteLayerOpacity(opacity) {
    if (!this.whiteFlashLayer) return
    const clamped = Number.isFinite(opacity) ? clamp(opacity, 0, 1) : 0
    this.whiteFlashLayer.style.opacity = clamped.toFixed(2)
  }

  _restoreSceneDistortionTarget() {
    if (!this.sceneDistortionTarget || !this.sceneDistortionOriginalStyle) return

    this.sceneDistortionTarget.style.transform = this.sceneDistortionOriginalStyle.transform
    this.sceneDistortionTarget.style.filter = this.sceneDistortionOriginalStyle.filter
    this.sceneDistortionTarget.style.transformOrigin = this.sceneDistortionOriginalStyle.transformOrigin
    this.sceneDistortionTarget.style.willChange = this.sceneDistortionOriginalStyle.willChange
  }

  _resolveSceneDistortionTarget() {
    if (this.sceneDistortionTarget?.isConnected) return this.sceneDistortionTarget
    if (typeof document === 'undefined') return null

    let bestCanvas = null
    let bestArea = 0

    const canvases = document.querySelectorAll('canvas')
    canvases.forEach((canvas) => {
      if (!canvas?.isConnected) return
      if (this.whiteFlashLayer?.contains(canvas)) return

      const rect = canvas.getBoundingClientRect()
      const area = Math.max(0, rect.width) * Math.max(0, rect.height)
      if (area <= bestArea) return

      bestArea = area
      bestCanvas = canvas
    })

    if (bestCanvas !== this.sceneDistortionTarget) {
      this._restoreSceneDistortionTarget()
      this.sceneDistortionTarget = bestCanvas
      this.sceneDistortionOriginalStyle = bestCanvas
        ? {
          transform: bestCanvas.style.transform || '',
          filter: bestCanvas.style.filter || '',
          transformOrigin: bestCanvas.style.transformOrigin || '',
          willChange: bestCanvas.style.willChange || '',
        }
        : null
    }

    return this.sceneDistortionTarget
  }

  _applySceneDistortion(intensity, distortion = {}) {
    const target = this._resolveSceneDistortionTarget()
    if (!target) return

    const clamped = clamp(intensity, 0, 1)
    const distortionStrength = smoothstep(0.18, 1, clamped)
    if (distortionStrength <= 0.0005) {
      this._restoreSceneDistortionTarget()
      return
    }

    const {
      warpX = 0,
      warpY = 0,
      warpScaleX = 1,
      warpScaleY = 1,
      warpSkewX = 0,
      warpSkewY = 0,
    } = distortion

    const translateX = warpX * 0.62 * distortionStrength
    const translateY = warpY * 0.48 * distortionStrength
    const scaleX = 1 + ((warpScaleX - 1) * 0.42 * distortionStrength) + (distortionStrength * 0.0028)
    const scaleY = 1 + ((warpScaleY - 1) * 0.36 * distortionStrength) + (distortionStrength * 0.0018)
    const skewX = warpSkewX * 0.22 * distortionStrength
    const skewY = warpSkewY * 0.24 * distortionStrength
    const blur = 0.015 + (distortionStrength * 0.18)
    const brightness = 1 - (distortionStrength * 0.025)
    const contrast = 1 + (distortionStrength * 0.04)

    target.style.transformOrigin = 'center center'
    target.style.willChange = 'transform, filter'
    target.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)}) skew(${skewX.toFixed(2)}deg, ${skewY.toFixed(2)}deg)`
    target.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)})`
  }

  _resetStun() {
    this.stunActive = false
    this.stunRemainingMs = 0
    this.stunTotalDurationMs = 0
    this.stunElapsedMs = 0
    this.isFlash = false
    this.flashRemainingMs = 0

    if (this.overlay) {
      this.overlay.classList.remove('active')
      this.overlay.style.opacity = '0'
      this.overlay.style.setProperty('--veil', '0')
      this.overlay.style.setProperty('--ghost-alpha', '0')
      this.overlay.style.setProperty('--dvx', '0px')
      this.overlay.style.setProperty('--dvy', '0px')
    }

    this._setPerformanceMode(false)
  }

  _applyGuyVisuals(intensity) {
    if (!this.guyLayer) return

    const clamped = clamp(intensity, 0, 1)
    if (clamped <= 0.0005) {
      this.guyLayer.style.opacity = '0'
      this.guyLayer.style.setProperty('--veil', '0')
      this.guyLayer.style.setProperty('--ghost-alpha', '0')
      this.guyLayer.style.setProperty('--noise-alpha', '0')
      this.guyLayer.style.setProperty('--dvx', '0px')
      this.guyLayer.style.setProperty('--dvy', '0px')
      this.guyLayer.style.setProperty('--warp-x', '0px')
      this.guyLayer.style.setProperty('--warp-y', '0px')
      this.guyLayer.style.setProperty('--warp-scale-x', '1')
      this.guyLayer.style.setProperty('--warp-scale-y', '1')
      this.guyLayer.style.setProperty('--warp-skew-x', '0deg')
      this.guyLayer.style.setProperty('--warp-skew-y', '0deg')
      this._applySceneDistortion(0)
      return
    }

    const drift = 0.18 + (clamped * 4.4)
    const dvx = Math.sin(this.runtimeMs * 0.027) * drift
    const dvy = Math.cos(this.runtimeMs * 0.019) * drift * 0.45
    const warpBlend = Math.pow(clamped, 1.24)
    const warpX = (
      Math.sin(this.runtimeMs * 0.019)
      + (Math.sin(this.runtimeMs * 0.043) * 0.35)
    ) * (0.18 + (warpBlend * 3.2))
    const warpY = (
      Math.cos(this.runtimeMs * 0.015)
      + (Math.sin(this.runtimeMs * 0.031) * 0.28)
    ) * (0.08 + (warpBlend * 1.35))
    const warpScaleX = 1 + (clamped * 0.012) + (((Math.sin(this.runtimeMs * 0.011) + 1) * 0.5) * clamped * 0.01)
    const warpScaleY = 1 + (clamped * 0.007) + (((Math.cos(this.runtimeMs * 0.014) + 1) * 0.5) * clamped * 0.007)
    const warpSkewX = (
      Math.sin(this.runtimeMs * 0.013)
      + (Math.sin(this.runtimeMs * 0.029) * 0.22)
    ) * (0.05 + (clamped * 0.95))
    const warpSkewY = Math.cos(this.runtimeMs * 0.012) * (0.018 + (clamped * 0.32))
    const blur = 0.14 + (clamped * 2.5)
    const brightness = 1 - (clamped * 0.26)
    const contrast = 1 + (clamped * 0.14)
    const veil = 0.05 + (clamped * 0.4)
    const ghostAlpha = 0.025 + (clamped * 0.2)
    const noiseAlpha = 0.05 + (clamped * 0.24)

    if (!this.lowCost) {
      this.guyLayer.style.setProperty('--blur', `${blur.toFixed(2)}px`)
      this.guyLayer.style.setProperty('--brightness', brightness.toFixed(2))
      this.guyLayer.style.setProperty('--contrast', contrast.toFixed(2))
    }

    this.guyLayer.style.setProperty('--veil', veil.toFixed(3))
    this.guyLayer.style.setProperty('--ghost-alpha', ghostAlpha.toFixed(3))
    this.guyLayer.style.setProperty('--noise-alpha', noiseAlpha.toFixed(3))
    this.guyLayer.style.setProperty('--dvx', `${dvx.toFixed(2)}px`)
    this.guyLayer.style.setProperty('--dvy', `${dvy.toFixed(2)}px`)
    this.guyLayer.style.setProperty('--warp-x', `${warpX.toFixed(2)}px`)
    this.guyLayer.style.setProperty('--warp-y', `${warpY.toFixed(2)}px`)
    this.guyLayer.style.setProperty('--warp-scale-x', warpScaleX.toFixed(4))
    this.guyLayer.style.setProperty('--warp-scale-y', warpScaleY.toFixed(4))
    this.guyLayer.style.setProperty('--warp-skew-x', `${warpSkewX.toFixed(2)}deg`)
    this.guyLayer.style.setProperty('--warp-skew-y', `${warpSkewY.toFixed(2)}deg`)
    this._applySceneDistortion(clamped, {
      warpX,
      warpY,
      warpScaleX,
      warpScaleY,
      warpSkewX,
      warpSkewY,
    })
    this.guyLayer.style.opacity = Math.min(1, clamped * 1.08).toFixed(2)
  }

  _applyBloodVisuals() {
    if (!this.bloodLayer) return

    const persistent = this.bloodHealthRatio < 0.3
      ? clamp(1 - smoothstep(0, 0.3, this.bloodHealthRatio), 0, 1) * 0.92
      : 0
    const intensity = Math.max(persistent, this.damagePulse)

    if (intensity <= 0.0005) {
      this.bloodLayer.style.opacity = '0'
      this.bloodLayer.style.setProperty('--blood-mid-alpha', '0')
      this.bloodLayer.style.setProperty('--blood-edge-alpha', '0')
      return
    }

    const midAlpha = 0.08 + (intensity * 0.36)
    const edgeAlpha = 0.2 + (intensity * 0.78)
    this.bloodLayer.style.opacity = Math.min(1, 0.28 + (intensity * 1.08)).toFixed(2)
    this.bloodLayer.style.setProperty('--blood-mid-alpha', midAlpha.toFixed(3))
    this.bloodLayer.style.setProperty('--blood-edge-alpha', edgeAlpha.toFixed(3))
  }

  setGuyEffectIntensity(intensity = 0) {
    this.guyTargetIntensity = clamp(intensity, 0, 1)
  }

  setBloodHealthRatio(healthRatio = 1) {
    this.bloodHealthRatio = clamp(healthRatio, 0, 1)
  }

  triggerDamagePulse({ intensity = 1 } = {}) {
    this.damagePulse = Math.max(this.damagePulse, clamp(intensity, 0, 1))
  }

  start(durationMs = 8000, options = {}) {
    if (!this.overlay) return

    this._setPerformanceMode(options.lowCost)

    this.stunRemainingMs = Math.max(1, durationMs)
    this.stunTotalDurationMs = Math.max(1, durationMs)
    this.stunActive = true
    this.stunElapsedMs = 0
    this.isFlash = false

    this.overlay.classList.add('active')
    this.overlay.style.opacity = '1'
    this.overlay.style.setProperty('--pulse-duration', '4s')
    this.overlay.style.setProperty('--blur', '2px')
    this.overlay.style.setProperty('--desat', '1')
    this.overlay.style.setProperty('--brightness', '1')
    this.overlay.style.setProperty('--contrast', '1')
    this.overlay.style.setProperty('--veil', '0.05')
    this.overlay.style.setProperty('--dvx', '0px')
    this.overlay.style.setProperty('--dvy', '0px')
    this.overlay.style.setProperty('--ghost-alpha', '0.03')
  }

  flash(durationMs = 5000, options = {}) {
    if (!this.overlay) return

    this._setPerformanceMode(options.lowCost)

    this.stunRemainingMs = Math.max(1, durationMs)
    this.stunTotalDurationMs = Math.max(1, durationMs)
    this.stunActive = true
    this.stunElapsedMs = 0
    this.isFlash = true
    this.flashRemainingMs = Math.min(Math.max(1, durationMs), 2000)

    this.overlay.classList.add('active')
    this.overlay.style.opacity = '1'
    this.whiteFlashLayer.style.background = '#ffffff'
    this.overlay.style.setProperty('--pulse-duration', '0.5s')
    this.overlay.style.setProperty('--blur', '0px')
    this.overlay.style.setProperty('--desat', '0')
    this.overlay.style.setProperty('--brightness', '3.5')
    this.overlay.style.setProperty('--contrast', '0.5')
    this.overlay.style.setProperty('--veil', '0.6')
    this.overlay.style.setProperty('--dvx', '0px')
    this.overlay.style.setProperty('--dvy', '0px')
    this.overlay.style.setProperty('--ghost-alpha', '0.25')
  }

  startLoadingTransition(options = {}) {
    if (!this.whiteFlashLayer) return

    const fadeInMs = Math.max(0, options.fadeInMs ?? 500)
    const fadeOutMs = Math.max(0, options.fadeOutMs ?? 500)

    this.loadingTransition = {
      fadeInMs,
      fadeOutMs,
      elapsedMs: 0,
      opacity: fadeInMs > 0 ? 0 : 1,
      phase: fadeInMs > 0 ? 'fadeIn' : 'hold',
      readyToFadeOut: false,
    }

    this.whiteFlashLayer.style.background = options.color || '#ffffff'
    this._setWhiteLayerOpacity(this.loadingTransition.opacity)
  }

  finishLoadingTransition() {
    if (!this.loadingTransition) return

    this.loadingTransition.readyToFadeOut = true
    if (this.loadingTransition.phase === 'hold') {
      this.loadingTransition.phase = 'fadeOut'
      this.loadingTransition.elapsedMs = 0
    }
  }

  isLoadingTransitionActive() {
    return !!this.loadingTransition
  }

  isLoadingTransitionOpaque() {
    if (!this.loadingTransition) return false
    return this.loadingTransition.phase === 'hold' && this.loadingTransition.opacity >= 0.999
  }

  stop() {
    this.loadingTransition = null
    this.guyTargetIntensity = 0
    this.guyCurrentIntensity = 0
    this.bloodHealthRatio = 1
    this.damagePulse = 0

    this._resetStun()
    this._setWhiteLayerOpacity(0)
    this._setLoadingIndicatorVisible(false)
    if (this.whiteFlashLayer) {
      this.whiteFlashLayer.style.background = '#ffffff'
    }

    this._applyGuyVisuals(0)
    this._applyBloodVisuals()
  }

  update(deltaSeconds) {
    if (!this.overlay && !this.whiteFlashLayer && !this.guyLayer && !this.bloodLayer) return

    deltaSeconds = Math.min(deltaSeconds, 0.033)
    const deltaMs = deltaSeconds * 1000
    this.runtimeMs += deltaMs

    let flashOpacity = 0
    if (this.flashRemainingMs > 0) {
      this.flashRemainingMs = Math.max(0, this.flashRemainingMs - deltaMs)
      flashOpacity = Math.max(0, this.flashRemainingMs / 2000)
    }

    let loadingOpacity = 0
    if (this.loadingTransition) {
      const transition = this.loadingTransition

      if (transition.phase === 'fadeIn') {
        transition.elapsedMs += deltaMs
        const progress = transition.fadeInMs > 0
          ? Math.min(transition.elapsedMs / transition.fadeInMs, 1)
          : 1
        transition.opacity = progress
        if (progress >= 1) {
          transition.phase = transition.readyToFadeOut ? 'fadeOut' : 'hold'
          transition.elapsedMs = 0
          transition.opacity = 1
        }
      } else if (transition.phase === 'hold') {
        transition.opacity = 1
        if (transition.readyToFadeOut) {
          transition.phase = 'fadeOut'
          transition.elapsedMs = 0
        }
      } else if (transition.phase === 'fadeOut') {
        transition.elapsedMs += deltaMs
        const progress = transition.fadeOutMs > 0
          ? Math.min(transition.elapsedMs / transition.fadeOutMs, 1)
          : 1
        transition.opacity = 1 - progress
        if (progress >= 1) {
          this.loadingTransition = null
          loadingOpacity = 0
        }
      }

      if (this.loadingTransition) {
        loadingOpacity = this.loadingTransition.opacity
      }
    }

    this._setWhiteLayerOpacity(Math.max(flashOpacity, loadingOpacity))

    const loadingIndicatorVisible = loadingOpacity > 0.001
    this._setLoadingIndicatorVisible(loadingIndicatorVisible)

    const guyRiseAlpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * 8.5)
    const guyFallAlpha = 1 - Math.exp(-Math.max(0, deltaSeconds) * 4.2)
    const guyAlpha = this.guyTargetIntensity > this.guyCurrentIntensity ? guyRiseAlpha : guyFallAlpha
    this.guyCurrentIntensity = lerp(this.guyCurrentIntensity, this.guyTargetIntensity, clamp(guyAlpha, 0, 1))
    if (Math.abs(this.guyCurrentIntensity - this.guyTargetIntensity) < 0.0005) {
      this.guyCurrentIntensity = this.guyTargetIntensity
    }
    this._applyGuyVisuals(this.guyCurrentIntensity)

    if (this.damagePulse > 0) {
      this.damagePulse = Math.max(0, this.damagePulse - (deltaSeconds * 1.05))
    }
    this._applyBloodVisuals()

    if (!this.stunActive || !this.overlay) return

    this.stunRemainingMs = Math.max(0, this.stunRemainingMs - deltaMs)
    this.stunElapsedMs += deltaMs
    const intensity = Math.max(0, this.stunRemainingMs / Math.max(1, this.stunTotalDurationMs))

    let blur
    let desat
    let brightness
    let contrast
    let veil
    let ghostAlpha

    if (this.isFlash) {
      blur = intensity * 0.3
      desat = intensity * 0.1
      brightness = 1 + (intensity * 2.5)
      contrast = 0.5 + (intensity * 0.4)
      veil = intensity * 0.6
      ghostAlpha = 0.05 + (intensity * 0.2)
    } else {
      blur = 0.3 + (intensity * 1.5)
      desat = 0.4 - (intensity * 0.35)
      brightness = 1 + (intensity * 0.6)
      contrast = 0.9 + (intensity * 0.15)
      veil = 0.08 + (intensity * 0.15)
      ghostAlpha = 0.02 + (intensity * 0.08)
    }

    const drift = 0.1 + (intensity * 1.2)
    const dvx = Math.sin(this.stunElapsedMs * 0.0023) * drift
    const dvy = Math.cos(this.stunElapsedMs * 0.0017) * drift * 0.6

    if (!this.lowCost) {
      this.overlay.style.setProperty('--blur', `${blur.toFixed(2)}px`)
      this.overlay.style.setProperty('--desat', desat.toFixed(2))
      this.overlay.style.setProperty('--brightness', brightness.toFixed(2))
      this.overlay.style.setProperty('--contrast', contrast.toFixed(2))
    }

    this.overlay.style.setProperty('--veil', veil.toFixed(2))
    this.overlay.style.setProperty('--dvx', `${dvx.toFixed(2)}px`)
    this.overlay.style.setProperty('--dvy', `${dvy.toFixed(2)}px`)
    this.overlay.style.setProperty('--ghost-alpha', ghostAlpha.toFixed(2))
    this.overlay.style.opacity = intensity.toFixed(2)

    if (this.stunRemainingMs <= 0) {
      this._resetStun()
    }
  }

  dispose() {
    this._disposeLoadingIndicator()
    this._applySceneDistortion(0)

    if (this.bloodLayer && this.bloodLayer.parentElement) {
      this.bloodLayer.parentElement.removeChild(this.bloodLayer)
    }

    if (this.guyLayer && this.guyLayer.parentElement) {
      this.guyLayer.parentElement.removeChild(this.guyLayer)
    }

    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay)
    }

    if (this.whiteFlashLayer && this.whiteFlashLayer.parentElement) {
      this.whiteFlashLayer.parentElement.removeChild(this.whiteFlashLayer)
    }

    this.bloodLayer = null
    this.guyLayer = null
    this.guyGhostLayer = null
    this.guyNoiseLayer = null
    this.ghostLayer = null
    this.overlay = null
    this.whiteFlashLayer = null
    this.sceneDistortionTarget = null
    this.sceneDistortionOriginalStyle = null
  }
}