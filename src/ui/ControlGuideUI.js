// ==================== CONTROL GUIDE UI ====================
// A floating UI window for control instructions, styled exactly like Compune dialog but green and top-left
export class ControlGuideUI {
  constructor() {
    this.textElement = null
    this.contentText = null
    this.progressFill = null
    this.isVisible = false
    this.timeoutId = null
    this.duration = 10
    this.startTime = 0
    this.rafId = null
    this.createTextElement()
  }

  createTextElement() {
    this.textElement = document.createElement('div')
    this.textElement.style.cssText = `
      position: fixed;
      top: 40px;
      left: 40px;
      max-width: 400px;
      padding: 0;
      background: #002d1a;
      border: 2px solid #00CC77;
      border-radius: 0;
      color: #00FFAA;
      font-size: 12px;
      line-height: 1.6;
      z-index: 9999;
      display: none;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      box-shadow: 0 0 20px rgba(0, 204, 119, 0.6), inset 0 0 10px rgba(0, 204, 119, 0.3);
      overflow: hidden;
      transition: opacity 0.8s ease-out;
    `
    const header = document.createElement('div')
    header.style.cssText = `
      background: #00CC77;
      color: #000;
      padding: 6px 12px;
      font-weight: bold;
      border-bottom: 2px solid #00884d;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    `
    header.textContent = '> CONTROLS'
    this.textElement.appendChild(header)
    const contentContainer = document.createElement('div')
    contentContainer.style.cssText = `
      padding: 12px;
      word-wrap: break-word;
      white-space: pre-wrap;
    `
    this.contentText = document.createElement('div')
    this.contentText.textContent = ''
    this.contentText.style.minHeight = '20px'
    contentContainer.appendChild(this.contentText)
    this.textElement.appendChild(contentContainer)

    // Progress bar (identical to Compune)
    const progressBar = document.createElement('div')
    progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: #003d26;
      border-top: 1px solid #00CC77;
      position: relative;
      overflow: hidden;
    `
    this.progressFill = document.createElement('div')
    this.progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #00CC77, #00FFAA);
      width: 0%;
      box-shadow: 0 0 15px rgba(0, 255, 170, 0.8);
      transition: width 0.1s linear;
    `
    progressBar.appendChild(this.progressFill)
    this.textElement.appendChild(progressBar)

    document.body.appendChild(this.textElement)
  }

  showDialog(text, duration = 10) {
    this.contentText.textContent = text
    this.textElement.style.display = 'block'
    this.textElement.style.opacity = '1'
    this.isVisible = true
    this.duration = duration
    this.startTime = performance.now()
    this.updateProgressBar()
    if (this.timeoutId) clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => this.hide(), duration * 1000)
  }

  updateProgressBar() {
    if (!this.isVisible) return
    const elapsed = (performance.now() - this.startTime) / 1000
    const progress = Math.min(1, elapsed / this.duration)
    if (this.progressFill) {
      this.progressFill.style.width = (progress * 100) + '%'
    }
    if (progress < 1) {
      this.rafId = requestAnimationFrame(() => this.updateProgressBar())
    }
  }

  hide() {
    this.textElement.style.opacity = '0'
    setTimeout(() => {
      this.textElement.style.display = 'none'
      this.isVisible = false
      if (this.rafId) cancelAnimationFrame(this.rafId)
      if (this.progressFill) this.progressFill.style.width = '0%'
    }, 800)
  }

  cleanup() {
    if (this.textElement && this.textElement.parentElement) {
      this.textElement.parentElement.removeChild(this.textElement)
    }
    this.contentText = null
    this.textElement = null
    this.progressFill = null
    if (this.timeoutId) clearTimeout(this.timeoutId)
    if (this.rafId) cancelAnimationFrame(this.rafId)
  }
}