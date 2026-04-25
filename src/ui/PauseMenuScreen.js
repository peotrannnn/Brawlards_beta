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

    // Menu box - style giống menu chính
    const menuBox = document.createElement('div')
    menuBox.style.background = '#0a1a3d'
    menuBox.style.border = '2px solid #0066FF'
    menuBox.style.borderRadius = '0'
    menuBox.style.width = '280px'
    menuBox.style.maxWidth = '92vw'
    menuBox.style.boxShadow = '0 2px 16px #0008'
    menuBox.style.overflow = 'hidden'
    menuBox.style.display = 'flex'
    menuBox.style.flexDirection = 'column'
    menuBox.style.alignItems = 'stretch'

    // Title bar
    const titleBar = document.createElement('div')
    titleBar.textContent = '> PAUSE_MENU.exe'
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

    // Menu list area
    const menuListArea = document.createElement('div')
    menuListArea.style.display = 'flex'
    menuListArea.style.flexDirection = 'column'
    menuListArea.style.gap = '0'
    menuListArea.style.background = 'transparent'
    menuListArea.style.padding = '0'

    const menuItems = [
      { label: 'RESUME', action: () => this.onResume(), defaultColor: '#00FF00', selectedColor: '#000', selectedBg: '#0066FF' },
      { label: 'SETTINGS', action: () => this.onSettings(), defaultColor: '#00FF00', selectedColor: '#000', selectedBg: '#0066FF' },
      { label: 'BACK TO MENU', action: () => this.onBackToMenu(), defaultColor: '#ff4444', selectedColor: '#000', selectedBg: '#0066FF' },
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
      element.style.borderBottom = index < menuItems.length - 1 ? '1px solid #004399' : 'none'
      element.style.transition = 'all 0.2s ease'
      element.style.backgroundColor = 'transparent'
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
          // Hide pause menu immediately before resume
          this.hide();
          item.action();
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
          element.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.3)'
        } else {
          element.style.backgroundColor = 'transparent'
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
          // Hide pause menu immediately before resume
          this.hide();
          selectedItem.action();
          setTimeout(() => { menuActive = true }, 100);
        }
      } else if (e.code === 'Escape') {
        e.preventDefault()
        this.onResume()
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