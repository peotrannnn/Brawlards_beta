import * as THREE from 'three'
import { createDummyPreviewMesh } from '../assets/objects/Dummy.js'
import { UI_THEME } from '../ui/uiTheme.js'

const LOADING_OVERLAY_STYLE_ID = 'global-loading-overlay-style'
const LOADING_OVERLAY_PREVIEW_SIZE = 132

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function waitForOverlayPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
}

function ensureLoadingOverlayStyles() {
  if (document.getElementById(LOADING_OVERLAY_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = LOADING_OVERLAY_STYLE_ID
  style.textContent = `
    .global-loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 45000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${UI_THEME.loadingOverlay.background};
      opacity: 1;
      pointer-events: auto;
      transition: opacity 0.22s ease;
    }

    .global-loading-overlay__shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transform: translateY(-4px);
    }

    .global-loading-overlay__preview-shell {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateZ(0);
      transform-origin: center center;
      will-change: transform;
      animation:
        global-loading-overlay-preview-spin 2.6s linear infinite,
        global-loading-overlay-preview-float 1.8s ease-in-out infinite alternate;
    }

    .global-loading-overlay__preview {
      width: 132px;
      height: 132px;
      display: block;
      filter: ${UI_THEME.loadingOverlay.previewDropShadow};
    }

    .global-loading-overlay__label {
      color: ${UI_THEME.loadingOverlay.labelColor};
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      line-height: 1;
      white-space: nowrap;
      text-transform: none;
      text-align: center;
    }

    @keyframes global-loading-overlay-preview-spin {
      from {
        transform: translateZ(0) rotate(0deg);
      }

      to {
        transform: translateZ(0) rotate(360deg);
      }
    }

    @keyframes global-loading-overlay-preview-float {
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

export function createLoadingOverlay(titleText = 'Loading') {
  ensureLoadingOverlayStyles()

  const existing = document.querySelector('.global-loading-overlay')
  if (existing) {
    existing.remove()
  }

  const overlay = document.createElement('div')
  overlay.className = 'global-loading-overlay'
  overlay.setAttribute('aria-label', titleText)

  const shell = document.createElement('div')
  shell.className = 'global-loading-overlay__shell'

  const previewShell = document.createElement('div')
  previewShell.className = 'global-loading-overlay__preview-shell'

  const label = document.createElement('div')
  label.className = 'global-loading-overlay__label'
  label.textContent = 'loading'

  overlay.appendChild(shell)
  shell.appendChild(previewShell)
  shell.appendChild(label)
  document.body.appendChild(overlay)

  let previewRenderer = null
  let previewScene = null
  let previewCamera = null
  let dummyWrapper = null
  let dummy = null
  let closed = false

  try {
    previewRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    })
    previewRenderer.setClearColor(0x000000, 0)
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
    previewRenderer.setSize(LOADING_OVERLAY_PREVIEW_SIZE, LOADING_OVERLAY_PREVIEW_SIZE, false)
    previewRenderer.domElement.className = 'global-loading-overlay__preview'

    previewScene = new THREE.Scene()
    previewCamera = new THREE.PerspectiveCamera(28, 1, 0.1, 20)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(2.4, 3.1, 3.8)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85)
    rimLight.position.set(-2.8, 1.6, -2.2)

    dummyWrapper = new THREE.Group()
    dummyWrapper.position.y = 0.08
    dummyWrapper.rotation.x = 0
    dummyWrapper.rotation.y = 0

    dummy = createDummyPreviewMesh()
    dummy.scale.setScalar(1.08)
    dummy.position.y = -0.58
    dummyWrapper.add(dummy)

    previewScene.add(ambientLight)
    previewScene.add(keyLight)
    previewScene.add(rimLight)
    previewScene.add(dummyWrapper)
    fitPerspectiveCameraToObject(previewCamera, dummyWrapper)

    previewShell.appendChild(previewRenderer.domElement)

    previewRenderer.render(previewScene, previewCamera)
  } catch {
    previewRenderer = null
    previewScene = null
    previewCamera = null
    dummyWrapper = null
    dummy = null
  }

  const disposePreview = () => {
    if (dummy) {
      dummy.traverse((child) => {
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

    if (previewRenderer) {
      previewRenderer.dispose()
      if (typeof previewRenderer.forceContextLoss === 'function') {
        previewRenderer.forceContextLoss()
      }
    }
  }

  return {
    update(_progress, _label) {
      // Intentionally no-op: this transition overlay only shows the dummy and loading text.
    },
    close() {
      if (closed) return
      closed = true

      overlay.style.opacity = '0'
      window.setTimeout(() => {
        disposePreview()
        overlay.remove()
      }, 220)
    }
  }
}

export async function runWithLoadingOverlay(task, options = {}) {
  const overlay = createLoadingOverlay(options.title || 'Loading')
  const startedAt = performance.now()
  const minimumVisibleMs = Math.max(0, options.minimumVisibleMs ?? 220)

  try {
    await waitForOverlayPaint()
    return await task((progress, label) => overlay.update(progress, label))
  } finally {
    const elapsedMs = performance.now() - startedAt
    const remainingMs = Math.max(0, minimumVisibleMs - elapsedMs)
    window.setTimeout(() => overlay.close(), remainingMs)
  }
}
