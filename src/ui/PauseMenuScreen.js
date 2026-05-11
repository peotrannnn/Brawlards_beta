import { UI_THEME } from './uiTheme.js'

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
    const executeAction = (action) => {
      if (typeof action !== 'function') return
      this.hide()
      action()
    }

    this.container = document.createElement('div')
    this.container.id = 'pauseMenuScreen'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${UI_THEME.pauseMenu.overlayBackground};
      backdrop-filter: blur(8px);
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

    // Menu box - style giống menu chính
    const menuBox = document.createElement('div')
    menuBox.style.background = UI_THEME.terminal.darkBg
    menuBox.style.border = `2px solid ${UI_THEME.terminal.borderBlue}`
    menuBox.style.borderRadius = '0'
    menuBox.style.width = '280px'
    menuBox.style.maxWidth = '92vw'
    menuBox.style.boxShadow = UI_THEME.terminal.panelShadow
    menuBox.style.overflow = 'hidden'
    menuBox.style.display = 'flex'
    menuBox.style.flexDirection = 'column'
    menuBox.style.alignItems = 'stretch'

    // Title bar
    const titleBar = document.createElement('div')
    titleBar.style.position = 'relative'
    titleBar.style.display = 'flex'
    titleBar.style.alignItems = 'stretch'
    titleBar.style.background = UI_THEME.terminal.accentBlue
    titleBar.style.minHeight = UI_THEME.windowChrome.titleBarHeight
    titleBar.style.borderBottom = `2px solid ${UI_THEME.terminal.borderBlue}`

    const titleLabel = document.createElement('div')
    titleLabel.textContent = 'PAUSE'
    titleLabel.style.display = 'flex'
    titleLabel.style.alignItems = 'center'
    titleLabel.style.justifyContent = 'center'
    titleLabel.style.minHeight = UI_THEME.windowChrome.titleBarHeight
    titleLabel.style.padding = `0 ${UI_THEME.windowChrome.titleRightPadding} 0 ${UI_THEME.windowChrome.titleLeftPadding}`
    titleLabel.style.color = UI_THEME.common.white
    titleLabel.style.fontWeight = 'bold'
    titleLabel.style.fontSize = UI_THEME.windowChrome.titleFontSize
    titleLabel.style.letterSpacing = '1px'
    titleLabel.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    titleLabel.style.textAlign = 'center'
    titleLabel.style.textShadow = UI_THEME.terminal.textShadow
    titleBar.appendChild(titleLabel)

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.textContent = 'X'
    closeButton.setAttribute('aria-label', 'Resume game')
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
    closeButton.onclick = () => executeAction(this.onResume)
    titleBar.appendChild(closeButton)

    // Menu list area
    const menuListArea = document.createElement('div')
    menuListArea.style.display = 'flex'
    menuListArea.style.flexDirection = 'column'
    menuListArea.style.gap = '0'
    menuListArea.style.background = UI_THEME.common.transparent
    menuListArea.style.padding = '0'

    const menuItems = [
      { label: 'RESUME', action: () => this.onResume(), defaultColor: UI_THEME.pauseMenu.resumeText, selectedColor: UI_THEME.pauseMenu.selectedText, selectedBg: UI_THEME.pauseMenu.selectedBackground },
      { label: 'SETTINGS', action: () => this.onSettings(), defaultColor: UI_THEME.common.textMuted, selectedColor: UI_THEME.pauseMenu.selectedText, selectedBg: UI_THEME.pauseMenu.selectedBackground },
      { label: 'BACK TO MENU', action: () => this.onBackToMenu(), defaultColor: UI_THEME.pauseMenu.backText, selectedColor: UI_THEME.pauseMenu.selectedText, selectedBg: UI_THEME.pauseMenu.selectedBackground },
    ]

    let currentIndex = 0
    let menuActive = true

    const createMenuItem = (item, index) => {
      const element = document.createElement('div')
      element.textContent = item.label
      element.style.padding = '14px 20px'
      element.style.textAlign = 'left'
      element.style.fontSize = '14px'
      element.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
      element.style.fontWeight = 'normal'
      element.style.cursor = 'pointer'
      element.style.userSelect = 'none'
      element.style.borderBottom = index < menuItems.length - 1 ? `1px solid ${UI_THEME.terminal.borderBlue}` : 'none'
      element.style.transition = 'all 0.2s ease'
      element.style.backgroundColor = UI_THEME.common.transparent
      element.style.color = item.defaultColor
      element.style.letterSpacing = '0.5px'
      
      element.onmouseenter = () => {
        if (!menuActive) return
        currentIndex = index
        updateSelection()
      }
      
      element.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!menuActive) return;
        if (typeof item.action === 'function') {
          executeAction(item.action)
        }
      }
      
      return element
    }

    const updateSelection = () => {
      Array.from(menuListArea.children).forEach((element, idx) => {
        const item = menuItems[idx]
        if (idx === currentIndex) {
          element.style.backgroundColor = item.selectedBg
          element.style.color = item.selectedColor
          element.style.fontWeight = 'bold'
          element.style.paddingLeft = '28px'
          element.style.boxShadow = UI_THEME.terminal.selectedInsetShadow
        } else {
          element.style.backgroundColor = UI_THEME.common.transparent
          element.style.color = item.defaultColor
          element.style.fontWeight = 'normal'
          element.style.paddingLeft = '20px'
          element.style.boxShadow = 'none'
        }
      })
      if (menuListArea.children[currentIndex]) {
        menuListArea.children[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    // Tạo các menu items
    menuItems.forEach((item, idx) => {
      const menuItem = createMenuItem(item, idx)
      menuListArea.appendChild(menuItem)
    })

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (!this.isVisible || !menuActive) return
      
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        currentIndex = (currentIndex + 1) % menuItems.length
        updateSelection()
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        currentIndex = (currentIndex - 1 + menuItems.length) % menuItems.length
        updateSelection()
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        const selectedItem = menuItems[currentIndex];
        if (selectedItem && typeof selectedItem.action === 'function') {
          menuActive = false;
          executeAction(selectedItem.action)
          setTimeout(() => { menuActive = true }, 100);
        }
      }
    }

    this.handleKeyDown = handleKeyDown

    menuBox.appendChild(titleBar)
    menuBox.appendChild(menuListArea)
    this.container.appendChild(menuBox)
    document.body.appendChild(this.container)

    updateSelection()
  }

  show() {
    if (!this.container) return
    this.container.style.opacity = '1'
    this.container.style.pointerEvents = 'auto'
    this.isVisible = true
    window.addEventListener('keydown', this.handleKeyDown)
  }

  hide() {
    if (!this.container) return
    this.container.style.opacity = '0'
    this.container.style.pointerEvents = 'none'
    this.isVisible = false
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown)
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.isVisible = false
  }
}