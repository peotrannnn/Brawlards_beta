import { UI_THEME } from './uiTheme.js'

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
      background: ${UI_THEME.gameOver.overlayBackground};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      opacity: 0;
      transition: opacity 1s ease-in-out;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      pointer-events: none;
    `

    const menuBox = document.createElement('div')
    menuBox.style.background = UI_THEME.terminal.darkBg
    menuBox.style.border = `2px solid ${UI_THEME.terminal.borderBlue}`
    menuBox.style.borderRadius = '0'
    menuBox.style.width = '432px'
    menuBox.style.maxWidth = '92vw'
    menuBox.style.boxShadow = UI_THEME.terminal.panelShadow
    menuBox.style.overflow = 'hidden'
    menuBox.style.display = 'flex'
    menuBox.style.flexDirection = 'column'
    menuBox.style.alignItems = 'stretch'

    const titleBar = document.createElement('div')
    titleBar.textContent = 'DREAM RESULTS'
    titleBar.style.background = UI_THEME.terminal.accentBlue
    titleBar.style.color = UI_THEME.common.white
    titleBar.style.padding = '12px 20px'
    titleBar.style.fontWeight = 'bold'
    titleBar.style.borderBottom = `2px solid ${UI_THEME.terminal.borderBlue}`
    titleBar.style.fontSize = '14px'
    titleBar.style.letterSpacing = '1px'
    titleBar.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    titleBar.style.textAlign = 'center'
    titleBar.style.textShadow = UI_THEME.terminal.textShadow

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
    levelItem.style.backgroundColor = UI_THEME.common.transparent
    levelItem.style.color = UI_THEME.gameOver.levelMuted
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
    this.statusElement.style.backgroundColor = UI_THEME.common.transparent
    this.statusElement.style.letterSpacing = '1px'
    this.statusElement.style.whiteSpace = 'nowrap'
    this.statusElement.style.lineHeight = '1.4'
    contentArea.appendChild(this.statusElement)

    this.timeElement = document.createElement('div')
    this.timeElement.style.padding = '4px 0'
    this.timeElement.style.textAlign = 'center'
    this.timeElement.style.fontSize = '12px'
    this.timeElement.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    this.timeElement.style.backgroundColor = UI_THEME.common.transparent
    this.timeElement.style.color = UI_THEME.gameOver.timeText
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
    backItem.style.borderTop = `1px solid ${UI_THEME.terminal.borderBlue}`
    backItem.style.transition = 'all 0.2s ease'
    backItem.style.backgroundColor = UI_THEME.common.transparent
    backItem.style.color = UI_THEME.gameOver.backText
    backItem.style.letterSpacing = '0.5px'
    backItem.style.whiteSpace = 'nowrap'
    
    backItem.onmouseenter = () => {
      backItem.style.backgroundColor = UI_THEME.terminal.accentBlue
      backItem.style.color = UI_THEME.common.white
      backItem.style.fontWeight = 'bold'
      backItem.style.paddingLeft = '28px'
      backItem.style.paddingRight = '28px'
      backItem.style.boxShadow = UI_THEME.terminal.selectedInsetShadow
    }
    
    backItem.onmouseleave = () => {
      backItem.style.backgroundColor = UI_THEME.common.transparent
      backItem.style.color = UI_THEME.gameOver.backText
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
      background: ${UI_THEME.gameOver.progressBackground};
      border-top: 1px solid ${UI_THEME.terminal.borderBlue};
      position: relative;
      overflow: hidden;
    `
    
    this.progressFill = document.createElement('div')
    this.progressFill.style.cssText = `
      height: 100%;
      background: ${UI_THEME.gameOver.progressGradient};
      width: 100%;
      box-shadow: ${UI_THEME.gameOver.progressGlow};
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
        this.statusElement.style.color = UI_THEME.gameOver.defaultStatusText
      } else if (this.reason === 'death') {
        this.statusElement.textContent = 'YOU GOT STUCK IN THE SIMULATION.'
        this.statusElement.style.color = UI_THEME.gameOver.deathStatusText
      } else {
        this.statusElement.textContent = 'BAD ENDING.'
        this.statusElement.style.color = UI_THEME.gameOver.defaultStatusText
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