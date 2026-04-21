import * as THREE from 'three'

/**
 * UIManager - Manages all UI elements
 * 
 * Responsibilities:
 * - Create and manage crosshair
 * - Create and manage power bar (charging circle)
 * - Create and manage charge indicator (shows hit position)
 * - Create and manage charge line (drag cue line)
 * - Create and manage HP bar (simple rectangle that changes color)
 * 
 * Separated from camera controller for easier maintenance and debugging
 */

const UI_CONFIG = {
  CROSSHAIR_COLOR: 'white',
  CROSSHAIR_SIZE: '20px',
  CROSSHAIR_FONT: 'monospace',
  CROSSHAIR_TEXT: '+',
  CROSSHAIR_Z_INDEX: '9999',
  CHARGE_INDICATOR_COLOR: '#00ff00',
  POWER_BAR_Z_INDEX: '9999',
  CHARGE_LINE_Z_INDEX: '9998',
  HP_BAR_Z_INDEX: '9999',
  HP_BAR_WIDTH: 100,
  HP_BAR_HEIGHT: 1,
  HP_BAR_BG: '#333333',
  HP_BAR_BORDER: '1px solid #000000',
  HP_TRANSITION_DURATION: '0.2s' // Thời gian chuyển màu
}

export class UIManager {
  constructor() {
    this.camera = null
    this.elements = {
      crosshair: null,
      powerBarContainer: null,
      powerBarPath: null,
      chargeIndicator: null,
      chargeLine: null,
      spectatorUI: null,
      hpBar: null,
      hpFill: null
    }
    
    this._createUIElements()
  }

  /**
   * Set camera reference - needed to project world positions to screen
   */
  setCamera(camera) {
    this.camera = camera
  }

  /**
   * Create all UI elements
   */
  _createUIElements() {
      // ...existing code...
    // ========================================
    // CROSSHAIR (plus sign at screen center)
    // ========================================
    const crosshair = document.createElement('div')
    crosshair.style.position = 'fixed'
    crosshair.style.top = '50%'
    crosshair.style.left = '50%'
    crosshair.style.transform = 'translate(-50%, -50%)'
    crosshair.style.color = UI_CONFIG.CROSSHAIR_COLOR
    crosshair.style.fontSize = UI_CONFIG.CROSSHAIR_SIZE
    crosshair.style.fontFamily = UI_CONFIG.CROSSHAIR_FONT
    crosshair.style.pointerEvents = 'none'
    crosshair.style.display = 'none'
    crosshair.style.zIndex = UI_CONFIG.CROSSHAIR_Z_INDEX
    crosshair.style.textShadow = '1px 1px 2px black'
    crosshair.innerText = UI_CONFIG.CROSSHAIR_TEXT
    document.body.appendChild(crosshair)
    this.elements.crosshair = crosshair

    // ========================================
    // POWER BAR (charging circle)
    // ========================================
    const powerBarContainer = document.createElement('div')
    powerBarContainer.style.position = 'fixed'
    powerBarContainer.style.top = '50%'
    powerBarContainer.style.left = '50%'
    powerBarContainer.style.transform = 'translate(-50%, -50%)'
    powerBarContainer.style.width = '60px'
    powerBarContainer.style.height = '60px'
    powerBarContainer.style.pointerEvents = 'none'
    powerBarContainer.style.display = 'none'
    powerBarContainer.style.zIndex = UI_CONFIG.POWER_BAR_Z_INDEX

    const svgNS = 'http://www.w3.org/2000/svg'
    const powerBarSVG = document.createElementNS(svgNS, 'svg')
    powerBarSVG.setAttribute('viewBox', '0 0 36 36')
    
    const powerBarPath = document.createElementNS(svgNS, 'path')
    powerBarPath.setAttribute('d', 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831')
    powerBarPath.setAttribute('fill', 'none')
    powerBarPath.setAttribute('stroke', '#00ff00')
    powerBarPath.setAttribute('stroke-width', '2')
    powerBarPath.setAttribute('stroke-dasharray', '100, 100')
    powerBarPath.style.strokeLinecap = 'round'

    powerBarSVG.appendChild(powerBarPath)
    powerBarContainer.appendChild(powerBarSVG)
    document.body.appendChild(powerBarContainer)
    this.elements.powerBarContainer = powerBarContainer
    this.elements.powerBarPath = powerBarPath

    // ========================================
    // SPECTATOR UI (C to enter cam / Esc to exit)
    // ========================================
    const spectatorUI = document.createElement('div')
    spectatorUI.style.position = 'fixed'
    spectatorUI.style.top = '50%'
    spectatorUI.style.left = '50%'
    spectatorUI.style.transform = 'translate(-50%, calc(-50% + 40px))'
    spectatorUI.style.fontSize = '10px'
    spectatorUI.style.fontFamily = 'monospace'
    spectatorUI.style.pointerEvents = 'none'
    spectatorUI.style.display = 'none'
    spectatorUI.style.zIndex = '9999'
    spectatorUI.style.textAlign = 'center'
    spectatorUI.style.whiteSpace = 'nowrap'
    spectatorUI.style.textShadow = '1px 1px 2px black'
    spectatorUI.innerHTML = 'C to enter cam'
    document.body.appendChild(spectatorUI)
    this.elements.spectatorUI = spectatorUI

    // ========================================
    // CHARGE INDICATOR (shows "Hit here" position)
    // ========================================
    const chargeIndicator = document.createElement('div')
    chargeIndicator.style.position = 'fixed'
    chargeIndicator.style.color = UI_CONFIG.CHARGE_INDICATOR_COLOR
    chargeIndicator.style.fontSize = '30px'
    chargeIndicator.style.fontWeight = 'bold'
    chargeIndicator.style.fontFamily = 'monospace'
    chargeIndicator.style.pointerEvents = 'none'
    chargeIndicator.style.display = 'none'
    chargeIndicator.style.zIndex = UI_CONFIG.POWER_BAR_Z_INDEX
    
    const hitText = document.createElement('span')
    hitText.innerText = 'Hit here'
    hitText.style.position = 'absolute'
    hitText.style.fontSize = '12px'
    hitText.style.whiteSpace = 'nowrap'
    hitText.style.transform = 'translate(15px, -50%)'
    
    const minusSign = document.createElement('span')
    minusSign.innerText = '-'
    minusSign.style.position = 'absolute'
    minusSign.style.transform = 'translate(-50%, -55%)'

    chargeIndicator.appendChild(hitText)
    chargeIndicator.appendChild(minusSign)
    document.body.appendChild(chargeIndicator)
    this.elements.chargeIndicator = chargeIndicator

    // ========================================
    // CHARGE LINE (drag cue line)
    // ========================================
    const chargeLine = document.createElement('div')
    chargeLine.style.position = 'fixed'
    chargeLine.style.backgroundColor = UI_CONFIG.CHARGE_INDICATOR_COLOR
    chargeLine.style.height = '2px'
    chargeLine.style.pointerEvents = 'none'
    chargeLine.style.display = 'none'
    chargeLine.style.zIndex = UI_CONFIG.CHARGE_LINE_Z_INDEX
    chargeLine.style.transformOrigin = '0 50%'
    document.body.appendChild(chargeLine)
    this.elements.chargeLine = chargeLine

    // ========================================
    // HP BAR (simple rectangle, no rounded corners, no effects)
    // ========================================
    const hpBar = document.createElement('div')
    hpBar.style.position = 'fixed'
    hpBar.style.left = '50%'
    hpBar.style.bottom = '30px'
    hpBar.style.transform = 'translateX(-50%)'
    hpBar.style.width = UI_CONFIG.HP_BAR_WIDTH + 'px'
    hpBar.style.height = UI_CONFIG.HP_BAR_HEIGHT + 'px'
    hpBar.style.backgroundColor = UI_CONFIG.HP_BAR_BG
    hpBar.style.border = UI_CONFIG.HP_BAR_BORDER
    hpBar.style.display = 'none'
    hpBar.style.zIndex = UI_CONFIG.HP_BAR_Z_INDEX
    hpBar.style.overflow = 'hidden'

    const hpFill = document.createElement('div')
    hpFill.style.height = '100%'
    hpFill.style.width = '100%'
    hpFill.style.backgroundColor = '#66bb6a'
    hpFill.style.transition = `width ${UI_CONFIG.HP_TRANSITION_DURATION} ease-out, background-color ${UI_CONFIG.HP_TRANSITION_DURATION} ease-out`

    hpBar.appendChild(hpFill)
    document.body.appendChild(hpBar)
    
    this.elements.hpBar = hpBar
    this.elements.hpFill = hpFill
  }

  /**
   * Show/hide crosshair (plus sign at screen center)
   */
  showCrosshair(visible = true) {
    this.elements.crosshair.style.display = visible ? 'block' : 'none'
  }

  /**
   * Update charge indicator (shows "Hit here" at shoot position)
   */
  updateChargeIndicator(visible, worldPosition, camera = null) {
    const cam = camera || this.camera
    
    if (!visible || !worldPosition || !cam) {
      this.elements.chargeIndicator.style.display = 'none'
      return
    }

    const vector = worldPosition.clone()
    vector.project(cam)

    if (vector.z > 1) {
      this.elements.chargeIndicator.style.display = 'none'
      return
    }

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth
    const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

    this.elements.chargeIndicator.style.left = `${x}px`
    this.elements.chargeIndicator.style.top = `${y}px`
    this.elements.chargeIndicator.style.display = 'block'
  }

  /**
   * Update power bar (charging circle)
   */
  updatePowerBar(visible, chargeAmount) {
    if (!visible || chargeAmount === undefined) {
      this.elements.powerBarContainer.style.display = 'none'
      return
    }

    const t = Math.max(0, Math.min(1, chargeAmount))
    const percentage = t * 100
    this.elements.powerBarPath.style.strokeDasharray = `${percentage}, 100`

    let r, g, b
    if (t < 0.33) {
      const localT = t / 0.33
      r = Math.floor(255 * localT)
      g = 255
      b = 0
    } else if (t < 0.66) {
      const localT = (t - 0.33) / 0.33
      r = 255
      g = Math.floor(255 * (1 - localT))
      b = 0
    } else {
      const localT = (t - 0.66) / 0.34
      r = Math.floor(255 - (75 * localT))
      g = 0
      b = Math.floor(255 * localT)
    }

    this.elements.powerBarPath.setAttribute('stroke', `rgb(${r},${g},${b})`)
    this.elements.powerBarContainer.style.display = 'block'
  }

  /**
   * Update charge line (drag line from cue tip to target)
   */
  updateChargeLine(visible, startWorldPos, endWorldPos, camera = null) {
    const cam = camera || this.camera

    if (!visible || !startWorldPos || !endWorldPos || !cam) {
      this.elements.chargeLine.style.display = 'none'
      return
    }

    const startVec = startWorldPos.clone().project(cam)
    const endVec = endWorldPos.clone().project(cam)

    if (startVec.z > 1 || endVec.z > 1) {
      this.elements.chargeLine.style.display = 'none'
      return
    }

    const startX = (startVec.x * 0.5 + 0.5) * window.innerWidth
    const startY = (-(startVec.y * 0.5) + 0.5) * window.innerHeight
    const endX = (endVec.x * 0.5 + 0.5) * window.innerWidth
    const endY = (-(endVec.y * 0.5) + 0.5) * window.innerHeight

    const dx = endX - startX
    const dy = endY - startY
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    this.elements.chargeLine.style.left = `${startX}px`
    this.elements.chargeLine.style.top = `${startY}px`
    this.elements.chargeLine.style.width = `${length}px`
    this.elements.chargeLine.style.transform = `rotate(${angle}rad)`
    this.elements.chargeLine.style.display = 'block'
  }

  /**
   * Reset all UI to hidden state
   */
  reset() {
    this.showCrosshair(false)
    this.updateChargeIndicator(false)
    this.updatePowerBar(false)
    this.updateChargeLine(false)
    this.showHPBar(false)
  }

  /**
   * Hide all player UI (charge bar, indicator, line)
   */
  hidePlayerUI() {
    this.elements.crosshair.style.display = 'none'
    this.elements.powerBarContainer.style.display = 'none'
    this.elements.chargeIndicator.style.display = 'none'
    this.elements.chargeLine.style.display = 'none'
    this.showHPBar(false)
  }

  /**
   * Show/hide HP bar - always visible when camera attaches to player
   */
  showHPBar(visible = true, hp = null, maxHP = null) {
    this.elements.hpBar.style.display = visible ? 'block' : 'none'
    // Always update HP bar fill and color to match the latest values when showing
    if (visible) {
      // If values are not provided, try to keep the current fill
      if (typeof hp === 'number' && typeof maxHP === 'number') {
        this.updateHPBar(hp, maxHP)
      }
    }
  }

  /**
   * Helper function: Interpolate between two RGB colors
   * @param {number} t - Interpolation factor (0 to 1)
   * @param {Object} color1 - First color {r, g, b}
   * @param {Object} color2 - Second color {r, g, b}
   * @returns {string} RGB color string
   */
  _interpolateColor(t, color1, color2) {
    const r = Math.floor(color1.r + (color2.r - color1.r) * t)
    const g = Math.floor(color1.g + (color2.g - color1.g) * t)
    const b = Math.floor(color1.b + (color2.b - color1.b) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  /**
   * Get color based on health percentage with smooth gradient
   * Chuyển màu từ XANH DƯƠNG -> VÀNG -> ĐỎ
   * @param {number} percentage - Health percentage (0 to 1)
   * @returns {string} RGB color string
   */
  _getHealthColor(percentage) {
    const colors = [
    { pos: 0.0, r: 239, g: 83,  b: 80  }, // Đỏ mềm (không gắt)
    { pos: 0.5, r: 255, g: 202, b: 40  }, // Vàng ấm
    { pos: 1.0, r: 102, g: 187, b: 106 }  // Xanh lá dịu
  ]
    
    if (percentage <= 0) {
      return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})`
    }
    
    if (percentage >= 1) {
      return `rgb(${colors[colors.length - 1].r}, ${colors[colors.length - 1].g}, ${colors[colors.length - 1].b})`
    }
    
    // Tìm hai màu để nội suy
    for (let i = 0; i < colors.length - 1; i++) {
      if (percentage <= colors[i + 1].pos) {
        const color1 = colors[i]
        const color2 = colors[i + 1]
        
        // Tính toán hệ số nội suy giữa hai điểm màu
        const range = color2.pos - color1.pos
        const t = (percentage - color1.pos) / range
        
        return this._interpolateColor(t, color1, color2)
      }
    }
    
    // Fallback
    return `rgb(${colors[colors.length - 1].r}, ${colors[colors.length - 1].g}, ${colors[colors.length - 1].b})`
  }

  /**
   * Update HP bar - smooth color transition based on health percentage
   * Màu sắc chuyển mượt: Xanh dương (full HP) -> Vàng -> Đỏ (0 HP)
   */
  updateHPBar(hp, maxHP = 100, wasDamaged = false) {
    if (typeof hp !== 'number' || typeof maxHP !== 'number') return

    const percentage = Math.max(0, Math.min(1, hp / maxHP))
    const widthPercent = percentage * 100

    // Cập nhật chiều rộng với transition mượt
    this.elements.hpFill.style.width = widthPercent + '%'

    // Lấy màu gradient mượt dựa trên phần trăm HP
    const color = this._getHealthColor(percentage)
    this.elements.hpFill.style.backgroundColor = color

    // ...existing code...
  }

  // ...existing code...

  /**
   * Show spectator UI with camera controls hint
   */
  showSpectatorUI(pointerLocked = false) {
    if (!pointerLocked) {
      this.elements.spectatorUI.style.display = 'none'
    }
  }

  /**
   * Hide spectator UI
   */
  hideSpectatorUI() {
    this.elements.spectatorUI.style.display = 'none'
  }

  /**
   * Cleanup - remove all elements from DOM
   */
  dispose() {
    Object.values(this.elements).forEach(element => {
      if (element && element.parentElement) {
        element.parentElement.removeChild(element)
      }
    })
  }
}