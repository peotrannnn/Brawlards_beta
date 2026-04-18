export class PauseMenuScreen {
  constructor(onResume, onSettings, onBackToMenu) {
    this.onResume = onResume || (() => {})
    this.onSettings = onSettings || (() => {})
    this.onBackToMenu = onBackToMenu || (() => {})

    this.container = null
    this.isVisible = false

    this._init()
  }

  _init() {
    this.container = document.createElement('div')
    this.container.id = 'pauseMenuScreen'
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
      z-index: 1900;
      opacity: 0;
      transition: opacity 0.25s ease-in-out;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      pointer-events: none;
    `

    const windowBox = document.createElement('div')
    windowBox.style.cssText = `
      background: #0a1a3d;
      border: 2px solid #0066FF;
      border-radius: 0;
      width: min(400px, 92vw);
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
    titleBar.textContent = '> Pause_Menu.exe'

    const contentArea = document.createElement('div')
    contentArea.style.cssText = `
      padding: 24px 22px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    `

    const title = document.createElement('h2')
    title.textContent = 'GAME PAUSED'
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #FFFFFF;
      letter-spacing: 2px;
      font-weight: bold;
    `

    const subtitle = document.createElement('div')
    subtitle.textContent = 'Select an option'
    subtitle.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 12px;
      color: #77CCFF;
      letter-spacing: 1px;
    `

    const makeButton = (label, styles) => {
      const button = document.createElement('button')
      button.textContent = label
      button.style.cssText = `
        min-width: 170px;
        padding: 9px 16px;
        font-size: 11px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        letter-spacing: 1px;
        font-weight: bold;
        text-transform: uppercase;
        border-radius: 0;
        cursor: pointer;
        transition: all 0.2s ease;
        ${styles}
      `
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-1px)'
      })
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0px)'
      })
      return button
    }

    const resumeButton = makeButton('Back to Game', `
      background: #0066FF;
      color: #000;
      border: 2px solid #004399;
    `)

    const settingsButton = makeButton('Settings', `
      background: #1a3d73;
      color: #CFE8FF;
      border: 2px solid #2d5da8;
    `)

    const menuButton = makeButton('Back to Menu', `
      background: #8b0000;
      color: #fff;
      border: 2px solid #5a0000;
    `)

    resumeButton.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.onResume()
    }

    settingsButton.onclick = () => this.onSettings()
    menuButton.onclick = () => this.onBackToMenu()

    contentArea.appendChild(title)
    contentArea.appendChild(subtitle)
    contentArea.appendChild(resumeButton)
    contentArea.appendChild(settingsButton)
    contentArea.appendChild(menuButton)

    windowBox.appendChild(titleBar)
    windowBox.appendChild(contentArea)
    this.container.appendChild(windowBox)
    document.body.appendChild(this.container)
  }

  show() {
    if (!this.container) return
    this.container.style.opacity = '1'
    this.container.style.pointerEvents = 'auto'
    this.isVisible = true
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
