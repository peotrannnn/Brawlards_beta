export class GameOverScreen {
  constructor(sceneName, completionTime = 0, onReturn, cameraController) {
    this.sceneName = sceneName
    this.completionTime = completionTime
    this.onReturn = onReturn || (() => {})
    this.cameraController = cameraController
    this.reason = null  // 'elevator' = success, 'death' = failure
    
    this.container = null
    this.isVisible = false
    this.autoReturnTimer = 0
    this.autoReturnDelay = 20  // 20 seconds before auto-return
    this.progressFill = null
    
    this._init()
  }

  _init() {
    // Create overlay with dark background (matching Compune - NO glow)
    this.container = document.createElement('div')
    this.container.id = 'gameOverScreen'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 26, 61, 0.85);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.6s ease-in-out;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      pointer-events: none;
    `

    // Create window-like content box (matching Compune style)
    const windowBox = document.createElement('div')
    windowBox.style.cssText = `
      background: #0a1a3d;
      border: 2px solid #0066FF;
      border-radius: 0;
      width: min(400px, 92vw);
      padding: 0;
      overflow: hidden;
      box-shadow: none;
    `

    const titleBar = document.createElement('div')
    titleBar.style.cssText = `
      background: #0066FF;
      color: #000;
      padding: 6px 12px;
      font-weight: bold;
      border-bottom: 2px solid #004399;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    `
    titleBar.textContent = '> Dream_Results.exe'
    windowBox.appendChild(titleBar)

    // Content area
    const contentArea = document.createElement('div')
    contentArea.style.cssText = `
      padding: 24px 22px;
      text-align: center;
    `

    // Level name
    const levelNameEl = document.createElement('h2')
    levelNameEl.textContent = this.sceneName
    levelNameEl.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 17px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      color: #FFFFFF;
      letter-spacing: 1px;
      font-weight: bold;
    `
    contentArea.appendChild(levelNameEl)

    // Status message
    this.statusElement = document.createElement('div')
    this.statusElement.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 16px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      letter-spacing: 1px;
      color: #00FF00;
    `
    contentArea.appendChild(this.statusElement)

    // Time display
    this.timeElement = document.createElement('div')
    this.timeElement.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 12px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      color: #00FF00;
      line-height: 1.6;
    `
    contentArea.appendChild(this.timeElement)

    // Return button (subtle, secondary)
    const backButton = document.createElement('button')
    backButton.textContent = 'Back to Menu'
    backButton.style.cssText = `
      padding: 8px 20px;
      font-size: 11px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      background: #0066FF;
      color: #000;
      border: 2px solid #004399;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 1px;
      font-weight: bold;
      text-transform: uppercase;
    `
    
    backButton.addEventListener('mouseenter', () => {
      backButton.style.background = '#0088FF'
      backButton.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.5)'
    })
    
    backButton.addEventListener('mouseleave', () => {
      backButton.style.background = '#0066FF'
      backButton.style.textShadow = 'none'
    })
    
    // Store references
    backButton.gameOverScreen = this
    backButton.onReturn = this.onReturn
    backButton.onclick = () => {
      if (backButton.gameOverScreen && backButton.gameOverScreen.destroy) {
        backButton.gameOverScreen.destroy()
      }
      if (backButton.onReturn) {
        backButton.onReturn()
      }
    }
    contentArea.appendChild(backButton)
    windowBox.appendChild(contentArea)

    // Progress bar (auto-return timer, matching Compune style)
    this.progressBar = document.createElement('div')
    this.progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: #001a4d;
      border-top: 1px solid #0066FF;
      position: relative;
      overflow: hidden;
    `
    
    this.progressFill = document.createElement('div')
    this.progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #0066FF, #00FF00);
      width: 100%;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
      transition: width 0.1s linear;
    `
    this.progressBar.appendChild(this.progressFill)
    windowBox.appendChild(this.progressBar)

    this.container.appendChild(windowBox)
    document.body.appendChild(this.container)
  }

  show() {
    if (!this.container) return
    
    // ✨ Unlock camera when game over screen appears
    if (this.cameraController && this.cameraController.disableControl) {
      this.cameraController.disableControl()
      console.log('[GameOverScreen] Camera unlocked, pointer lock disabled')
    }
    
    // Update status message based on reason
    if (this.statusElement) {
      if (this.reason === 'elevator') {
        this.statusElement.textContent = 'LEVEL COMPLETED'
        this.statusElement.style.color = '#00FF00'
      } else if (this.reason === 'death') {
        this.statusElement.textContent = 'LEVEL FAILED'
        this.statusElement.style.color = '#FF4444'
      } else {
        this.statusElement.textContent = 'GAME OVER'
        this.statusElement.style.color = '#00FF00'
      }
    }
    
    // Update time display with current completionTime
    if (this.timeElement) {
      const minutes = Math.floor(this.completionTime / 60)
      const seconds = Math.floor(this.completionTime % 60)
      this.timeElement.textContent = `Time: ${minutes}m ${seconds}s`
    }
    
    // ✨ NEW: Reset auto-return timer when showing
    this.autoReturnTimer = 0
    
    this.container.style.opacity = '1'
    this.container.style.pointerEvents = 'auto'
    this.isVisible = true
  }

  /**
   * ✨ NEW: Update auto-return timer (call every frame from SimulationTest)
   */
  update(delta) {
    if (!this.isVisible || !this.progressFill) return
    
    // Increment timer
    this.autoReturnTimer += delta
    
    // Update progress bar (from 100% to 0% as time passes)
    const progress = Math.max(0, 1 - (this.autoReturnTimer / this.autoReturnDelay))
    this.progressFill.style.width = (progress * 100) + '%'
    
    // Auto-return when timer expires
    if (this.autoReturnTimer >= this.autoReturnDelay) {
      console.log('[GameOverScreen] Auto-return timer expired, returning to menu')
      this.destroy()
      if (this.onReturn) {
        this.onReturn()
      }
    }
  }

  hide() {
    if (!this.container) return
    this.container.style.opacity = '0'
    this.container.style.pointerEvents = 'none'
    this.isVisible = false
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }
}
