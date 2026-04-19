const SCREEN_MAT_STYLE_ID = 'scene1-screenmat-style'

function ensureStyles() {
  if (document.getElementById(SCREEN_MAT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = SCREEN_MAT_STYLE_ID
  style.textContent = `
    .screen-mat {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1800;

      --blur: 2px;
      --desat: 1;
      --brightness: 1;
      --contrast: 1;
      --veil: 0;
      --dvx: 0px;
      --dvy: 0px;
      --ghost-alpha: 0;

      opacity: 0;
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

    .screen-mat.active {
      animation: pulse var(--pulse-duration, 4s) ease-in-out infinite;
    }

    .screen-mat-ghost {
      position: absolute;
      inset: 0;
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
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1900;
      background: white;
      opacity: 0;
    }

    @keyframes pulse {
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
  `

  document.head.appendChild(style)
}

export class ScreenMat {
  constructor(container = document.body) {
    this.container = container
    this.overlay = null
    this.ghostLayer = null
    this.whiteFlashLayer = null
    this.remainingMs = 0
    this.totalDurationMs = 0
    this.active = false
    this.elapsedMs = 0
    this.isFlash = false
    this.flashRemainingMs = 0

    if (typeof document !== 'undefined') {
      ensureStyles()

      this.overlay = document.createElement('div')
      this.overlay.className = 'screen-mat'

      this.ghostLayer = document.createElement('div')
      this.ghostLayer.className = 'screen-mat-ghost'
      this.overlay.appendChild(this.ghostLayer)

      this.whiteFlashLayer = document.createElement('div')
      this.whiteFlashLayer.className = 'white-flash-layer'

      this.container.appendChild(this.overlay)
      this.container.appendChild(this.whiteFlashLayer)
    }
  }

  start(durationMs = 8000) {
    if (!this.overlay) return

    this.remainingMs = durationMs
    this.totalDurationMs = durationMs
    this.active = true
    this.elapsedMs = 0
    this.isFlash = false

    this.overlay.classList.add('active')
    this.overlay.style.opacity = '1'

    // fixed duration, no random
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

  flash(durationMs = 5000) {
    if (!this.overlay) return

    this.remainingMs = durationMs
    this.totalDurationMs = durationMs
    this.active = true
    this.elapsedMs = 0
    this.isFlash = true
    this.flashRemainingMs = 2000 // white flash duration 2s

    this.overlay.classList.add('active')
    this.overlay.style.opacity = '1'

    // White flash layer - trắng xóa màn hình hoàn toàn
    if (this.whiteFlashLayer) {
      this.whiteFlashLayer.style.opacity = '1'
    }

    // Flash effect parameters
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

  stop() {
    this.active = false
    this.remainingMs = 0
    this.flashRemainingMs = 0

    if (this.overlay) {
      this.overlay.classList.remove('active')
      this.overlay.style.opacity = '0'
    }

    if (this.whiteFlashLayer) {
      this.whiteFlashLayer.style.opacity = '0'
    }
  }

  update(deltaSeconds) {
    if (!this.active || !this.overlay) return

    // clamp delta to avoid jump
    deltaSeconds = Math.min(deltaSeconds, 0.033)

    this.remainingMs -= deltaSeconds * 1000
    this.elapsedMs += deltaSeconds * 1000

    // Handle white flash fade (2 seconds)
    if (this.flashRemainingMs > 0) {
      this.flashRemainingMs -= deltaSeconds * 1000
      const flashOpacity = Math.max(0, this.flashRemainingMs / 2000)
      if (this.whiteFlashLayer) {
        this.whiteFlashLayer.style.opacity = flashOpacity.toFixed(2)
      }
    }

    // Linear decay - tuyến tính giảm dần từ 1 đến 0
    const intensity = Math.max(0, this.remainingMs / this.totalDurationMs)

    let blur, desat, brightness, contrast, veil, dvx, dvy, ghostAlpha

    if (this.isFlash) {
      // Sáng chói flash effect - trắng xóa hoàn toàn lúc bắt đầu
      blur = 0 + intensity * 0.3
      desat = 0 + (intensity * 0.1)
      brightness = 1 + intensity * 2.5
      contrast = 0.5 + intensity * 0.4
      veil = 0 + (intensity * 0.6)
      ghostAlpha = 0.05 + (intensity * 0.2)
    } else {
      // Bình thường - làm sáng chói thay vì tối, giảm tuyến tính mạnh
      blur = 0.3 + intensity * 1.5
      desat = 0.4 - (intensity * 0.35)
      brightness = 1 + intensity * 0.6
      contrast = 0.9 + intensity * 0.15
      veil = 0.08 + (intensity * 0.15)
      ghostAlpha = 0.02 + (intensity * 0.08)
    }

    const drift = 0.1 + intensity * 1.2
    dvx = Math.sin(this.elapsedMs * 0.0023) * drift
    dvy = Math.cos(this.elapsedMs * 0.0017) * drift * 0.6

    this.overlay.style.setProperty('--blur', blur.toFixed(2) + 'px')
    this.overlay.style.setProperty('--desat', desat.toFixed(2))
    this.overlay.style.setProperty('--brightness', brightness.toFixed(2))
    this.overlay.style.setProperty('--contrast', contrast.toFixed(2))
    this.overlay.style.setProperty('--veil', veil.toFixed(2))
    this.overlay.style.setProperty('--dvx', dvx.toFixed(2) + 'px')
    this.overlay.style.setProperty('--dvy', dvy.toFixed(2) + 'px')
    this.overlay.style.setProperty('--ghost-alpha', ghostAlpha.toFixed(2))

    // Linear opacity fade - hết hoàn toàn sau 8s
    this.overlay.style.opacity = intensity.toFixed(2)

    if (this.remainingMs <= 0) {
      this.stop()
    }
  }

  dispose() {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay)
    }

    if (this.whiteFlashLayer && this.whiteFlashLayer.parentElement) {
      this.whiteFlashLayer.parentElement.removeChild(this.whiteFlashLayer)
    }

    this.ghostLayer = null
    this.overlay = null
    this.whiteFlashLayer = null
  }
}