export class GameOverScreen {
  constructor(sceneName, completionTime = 0, onReturn, cameraController) {
    this.sceneName = sceneName
    this.completionTime = completionTime
    this.onReturn = onReturn || (() => {})
    this.cameraController = cameraController
    this.reason = null
    
    this.container = null
    this.isVisible = false
    this.autoReturnTimer = 0
    this.autoReturnDelay = 20
    this.progressFill = null
    
    this._init()
  }

  // ==================== UI CONSTRUCTION ====================
  _init() {
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

    const menuBox = document.createElement('div')
    menuBox.style.background = '#0a1a3d'
    menuBox.style.border = '2px solid #0066FF'
    menuBox.style.borderRadius = '0'
    menuBox.style.width = '480px'
    menuBox.style.maxWidth = '92vw'
    menuBox.style.boxShadow = '0 2px 16px #0008'
    menuBox.style.overflow = 'hidden'
    menuBox.style.display = 'flex'
    menuBox.style.flexDirection = 'column'
    menuBox.style.alignItems = 'stretch'

    const titleBar = document.createElement('div')
    titleBar.textContent = '> DREAM_RESULTS.exe'
    titleBar.style.background = '#0066FF'
    titleBar.style.color = '#000'
    titleBar.style.padding = '12px 20px'
    titleBar.style.fontWeight = 'bold'
    titleBar.style.borderBottom = '2px solid #004399'
    titleBar.style.fontSize = '14px'
    titleBar.style.letterSpacing = '1px'
    titleBar.style.textTransform = 'uppercase'
    titleBar.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    titleBar.style.textAlign = 'center'

    const contentArea = document.createElement('div')
    contentArea.style.padding = '24px 20px 20px 20px'
    contentArea.style.display = 'flex'
    contentArea.style.flexDirection = 'column'
    contentArea.style.gap = '16px'

    const levelItem = document.createElement('div')
    levelItem.textContent = this.sceneName
    levelItem.style.padding = '0'
    levelItem.style.textAlign = 'center'
    levelItem.style.fontSize = '11px'
    levelItem.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    levelItem.style.fontWeight = 'normal'
    levelItem.style.backgroundColor = 'transparent'
    levelItem.style.color = '#888888'
    levelItem.style.letterSpacing = '0.5px'
    levelItem.style.whiteSpace = 'nowrap'
    levelItem.style.overflowX = 'auto'
    contentArea.appendChild(levelItem)

    this.statusElement = document.createElement('div')
    this.statusElement.style.padding = '8px 0'
    this.statusElement.style.textAlign = 'center'
    this.statusElement.style.fontSize = '16px'
    this.statusElement.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    this.statusElement.style.fontWeight = 'bold'
    this.statusElement.style.backgroundColor = 'transparent'
    this.statusElement.style.letterSpacing = '1px'
    this.statusElement.style.whiteSpace = 'nowrap'
    this.statusElement.style.lineHeight = '1.4'
    contentArea.appendChild(this.statusElement)

    this.timeElement = document.createElement('div')
    this.timeElement.style.padding = '4px 0'
    this.timeElement.style.textAlign = 'center'
    this.timeElement.style.fontSize = '12px'
    this.timeElement.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    this.timeElement.style.backgroundColor = 'transparent'
    this.timeElement.style.color = '#00FF00'
    this.timeElement.style.letterSpacing = '0.5px'
    this.timeElement.style.whiteSpace = 'nowrap'
    contentArea.appendChild(this.timeElement)

    menuBox.appendChild(titleBar)
    menuBox.appendChild(contentArea)

    const backItem = document.createElement('div')
    backItem.textContent = 'BACK TO MENU'
    backItem.style.padding = '14px 20px'
    backItem.style.textAlign = 'center'
    backItem.style.fontSize = '14px'
    backItem.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    backItem.style.fontWeight = 'normal'
    backItem.style.cursor = 'pointer'
    backItem.style.userSelect = 'none'
    backItem.style.borderTop = '1px solid #004399'
    backItem.style.transition = 'all 0.2s ease'
    backItem.style.backgroundColor = 'transparent'
    backItem.style.color = '#ff4444'
    backItem.style.letterSpacing = '0.5px'
    backItem.style.whiteSpace = 'nowrap'
    
    backItem.onmouseenter = () => {
      backItem.style.backgroundColor = '#0066FF'
      backItem.style.color = '#000'
      backItem.style.fontWeight = 'bold'
      backItem.style.paddingLeft = '28px'
      backItem.style.paddingRight = '28px'
      backItem.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.3)'
    }
    
    backItem.onmouseleave = () => {
      backItem.style.backgroundColor = 'transparent'
      backItem.style.color = '#ff4444'
      backItem.style.fontWeight = 'normal'
      backItem.style.paddingLeft = '20px'
      backItem.style.paddingRight = '20px'
      backItem.style.boxShadow = 'none'
    }
    
    backItem.onclick = () => {
      this.destroy()
      if (this.onReturn) {
        this.onReturn()
      }
    }
    
    menuBox.appendChild(backItem)

    const progressBar = document.createElement('div')
    progressBar.style.cssText = `
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
    progressBar.appendChild(this.progressFill)
    menuBox.appendChild(progressBar)

    this.container.appendChild(menuBox)
    document.body.appendChild(this.container)
  }

  // ==================== PUBLIC METHODS ====================
  show() {
    if (!this.container) return
    
    if (this.cameraController && this.cameraController.disableControl) {
      this.cameraController.disableControl()
    }
    
    if (this.statusElement) {
      if (this.reason === 'elevator') {
        this.statusElement.textContent = 'YOU ESCAPED THE SIMULATION, AS IT MAY SEEM.'
        this.statusElement.style.color = '#00FF00'
      } else if (this.reason === 'death') {
        this.statusElement.textContent = 'YOU GOT STUCK IN THE SIMULATION.'
        this.statusElement.style.color = '#FF4444'
      } else {
        this.statusElement.textContent = 'BAD ENDING.'
        this.statusElement.style.color = '#00FF00'
      }
    }
    
    if (this.timeElement) {
      const minutes = Math.floor(this.completionTime / 60)
      const seconds = Math.floor(this.completionTime % 60)
      const minutesStr = minutes.toString().padStart(2, '0')
      const secondsStr = seconds.toString().padStart(2, '0')
      this.timeElement.textContent = `${minutesStr}:${secondsStr}`
    }
    
    this.autoReturnTimer = 0
    
    this.container.style.opacity = '1'
    this.container.style.pointerEvents = 'auto'
    this.isVisible = true
  }

  update(delta) {
    if (!this.isVisible || !this.progressFill) return
    
    this.autoReturnTimer += delta
    const progress = Math.max(0, 1 - (this.autoReturnTimer / this.autoReturnDelay))
    this.progressFill.style.width = (progress * 100) + '%'
    
    if (this.autoReturnTimer >= this.autoReturnDelay) {
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