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

  _returnToMenu() {
    this.destroy()
    if (this.onReturn) {
      this.onReturn()
    }
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
    menuBox.style.width = 'min(92vw, 360px)'
    menuBox.style.maxWidth = '92vw'
    menuBox.style.boxShadow = UI_THEME.play.panelShadow
    menuBox.style.overflow = 'hidden'
    menuBox.style.display = 'flex'
    menuBox.style.flexDirection = 'column'
    menuBox.style.alignItems = 'stretch'

    const titleBar = document.createElement('div')
    titleBar.style.background = UI_THEME.terminal.accentBlue
    titleBar.style.position = 'relative'
    titleBar.style.display = 'flex'
    titleBar.style.alignItems = 'stretch'
    titleBar.style.minHeight = UI_THEME.windowChrome.titleBarHeight
    titleBar.style.borderBottom = `2px solid ${UI_THEME.terminal.borderBlue}`

    const titleLabel = document.createElement('div')
    titleLabel.textContent = 'DREAM RESULTS'
    titleLabel.style.color = UI_THEME.common.white
    titleLabel.style.display = 'flex'
    titleLabel.style.alignItems = 'center'
    titleLabel.style.justifyContent = 'center'
    titleLabel.style.minHeight = UI_THEME.windowChrome.titleBarHeight
    titleLabel.style.padding = `0 ${UI_THEME.windowChrome.titleRightPadding} 0 ${UI_THEME.windowChrome.titleLeftPadding}`
    titleLabel.style.fontWeight = 'bold'
    titleLabel.style.fontSize = UI_THEME.windowChrome.titleFontSize
    titleLabel.style.letterSpacing = '1px'
    titleLabel.style.textTransform = 'uppercase'
    titleLabel.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    titleLabel.style.textAlign = 'center'
    titleLabel.style.textShadow = UI_THEME.terminal.textShadow
    titleBar.appendChild(titleLabel)

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.textContent = 'X'
    closeButton.setAttribute('aria-label', 'Return to menu')
    closeButton.style.position = 'absolute'
    closeButton.style.top = '0'
    closeButton.style.right = '0'
    closeButton.style.display = 'flex'
    closeButton.style.alignItems = 'center'
    closeButton.style.justifyContent = 'center'
    closeButton.style.width = UI_THEME.windowChrome.closeWidth
    closeButton.style.minWidth = UI_THEME.windowChrome.closeWidth
    closeButton.style.height = '100%'
    closeButton.style.border = 'none'
    closeButton.style.borderLeft = `2px solid ${UI_THEME.windowChrome.closeBorder}`
    closeButton.style.background = UI_THEME.windowChrome.closeBackground
    closeButton.style.color = UI_THEME.windowChrome.closeText
    closeButton.style.boxShadow = UI_THEME.windowChrome.closeShadow
    closeButton.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    closeButton.style.fontSize = UI_THEME.windowChrome.closeFontSize
    closeButton.style.fontWeight = 'bold'
    closeButton.style.lineHeight = '1'
    closeButton.style.cursor = 'pointer'
    closeButton.style.textShadow = UI_THEME.terminal.textShadow
    closeButton.style.transition = 'box-shadow 0.2s ease, filter 0.2s ease'
    closeButton.onmouseover = () => {
      closeButton.style.boxShadow = UI_THEME.windowChrome.closeHoverShadow
      closeButton.style.filter = `brightness(${UI_THEME.windowChrome.closeHoverBrightness})`
    }
    closeButton.onmouseout = () => {
      closeButton.style.boxShadow = UI_THEME.windowChrome.closeShadow
      closeButton.style.filter = 'none'
    }
    closeButton.onclick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      this._returnToMenu()
    }
    titleBar.appendChild(closeButton)

    const contentArea = document.createElement('div')
    contentArea.style.padding = '16px'
    contentArea.style.display = 'flex'
    contentArea.style.flexDirection = 'column'
    contentArea.style.gap = '10px'

    const summaryCard = document.createElement('div')
    summaryCard.style.display = 'flex'
    summaryCard.style.flexDirection = 'column'
    summaryCard.style.gap = '8px'
    summaryCard.style.padding = '12px 14px'
    summaryCard.style.background = UI_THEME.play.rowBackground
    summaryCard.style.border = `1px solid ${UI_THEME.play.rowBorder}`
    summaryCard.style.boxShadow = `inset 0 0 10px ${UI_THEME.play.rowInsetGlow}`

    const sectionLabel = document.createElement('div')
    sectionLabel.textContent = 'SCENE'
    sectionLabel.style.fontSize = '10px'
    sectionLabel.style.letterSpacing = '0.18em'
    sectionLabel.style.color = UI_THEME.gameOver.levelMuted
    sectionLabel.style.textAlign = 'left'
    summaryCard.appendChild(sectionLabel)

    const levelItem = document.createElement('div')
    levelItem.textContent = this.sceneName
    levelItem.style.padding = '0'
    levelItem.style.textAlign = 'left'
    levelItem.style.fontSize = '11px'
    levelItem.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    levelItem.style.fontWeight = 'bold'
    levelItem.style.backgroundColor = UI_THEME.common.transparent
    levelItem.style.color = UI_THEME.gameOver.levelMuted
    levelItem.style.letterSpacing = '0.08em'
    levelItem.style.whiteSpace = 'normal'
    levelItem.style.overflowWrap = 'anywhere'
    summaryCard.appendChild(levelItem)

    contentArea.appendChild(summaryCard)

    const statusCard = document.createElement('div')
    statusCard.style.display = 'flex'
    statusCard.style.flexDirection = 'column'
    statusCard.style.gap = '8px'
    statusCard.style.padding = '14px 16px'
    statusCard.style.background = UI_THEME.common.transparent
    statusCard.style.border = `1px solid ${UI_THEME.terminal.borderBlue}`
    statusCard.style.boxShadow = UI_THEME.terminal.compactShadow

    const statusLabel = document.createElement('div')
    statusLabel.textContent = 'STATUS'
    statusLabel.style.fontSize = '10px'
    statusLabel.style.letterSpacing = '0.18em'
    statusLabel.style.color = UI_THEME.gameOver.levelMuted
    statusLabel.style.textAlign = 'center'
    statusCard.appendChild(statusLabel)

    this.statusElement = document.createElement('div')
    this.statusElement.style.padding = '0'
    this.statusElement.style.textAlign = 'center'
    this.statusElement.style.fontSize = '15px'
    this.statusElement.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    this.statusElement.style.fontWeight = 'bold'
    this.statusElement.style.backgroundColor = UI_THEME.common.transparent
    this.statusElement.style.letterSpacing = '0.05em'
    this.statusElement.style.whiteSpace = 'normal'
    this.statusElement.style.overflowWrap = 'anywhere'
    this.statusElement.style.lineHeight = '1.45'
    statusCard.appendChild(this.statusElement)

    contentArea.appendChild(statusCard)

    const timeCard = document.createElement('div')
    timeCard.style.display = 'flex'
    timeCard.style.flexDirection = 'column'
    timeCard.style.alignItems = 'center'
    timeCard.style.gap = '6px'
    timeCard.style.padding = '14px 16px 16px'
    timeCard.style.background = UI_THEME.play.rowBackground
    timeCard.style.border = `1px solid ${UI_THEME.play.rowBorder}`
    timeCard.style.boxShadow = `inset 0 0 10px ${UI_THEME.play.rowInsetGlow}`

    const timeLabel = document.createElement('div')
    timeLabel.textContent = 'PLAY TIME'
    timeLabel.style.fontSize = '10px'
    timeLabel.style.letterSpacing = '0.22em'
    timeLabel.style.color = UI_THEME.gameOver.levelMuted
    timeLabel.style.textAlign = 'center'
    timeCard.appendChild(timeLabel)

    this.timeElement = document.createElement('div')
    this.timeElement.style.padding = '0'
    this.timeElement.style.textAlign = 'center'
    this.timeElement.style.fontSize = '36px'
    this.timeElement.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    this.timeElement.style.fontWeight = 'bold'
    this.timeElement.style.backgroundColor = UI_THEME.common.transparent
    this.timeElement.style.color = UI_THEME.gameOver.timeText
    this.timeElement.style.letterSpacing = '0.08em'
    this.timeElement.style.whiteSpace = 'nowrap'
    this.timeElement.style.lineHeight = '1'
    timeCard.appendChild(this.timeElement)

    contentArea.appendChild(timeCard)

    menuBox.appendChild(titleBar)
    menuBox.appendChild(contentArea)

    const progressBar = document.createElement('div')
    progressBar.style.cssText = `
      width: 100%;
      height: 5px;
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
      this._returnToMenu()
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
    this.isVisible = false
  }
}