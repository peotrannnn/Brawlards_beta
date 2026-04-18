import * as THREE from 'three'

/**
 * UIManager - Quản lý tất cả UI elements
 * 
 * Trách nhiệm:
 * - Tạo và quản lý crosshair
 * - Tạo và quản lý power bar (vòng tròn charging)
 * - Tạo và quản lý charge indicator (chỉ vị trí bắn)
 * - Tạo và quản lý charge line (đường kéo cue)
 * 
 * Tách biệt khỏi camera controller để dễ bảo trì và debug
 */

const UI_CONFIG = {
  CROSSHAIR_COLOR: 'white',
  CROSSHAIR_SIZE: '20px',
  CROSSHAIR_FONT: 'monospace',
  CROSSHAIR_TEXT: '+',
  CROSSHAIR_Z_INDEX: '9999',
  CHARGE_INDICATOR_COLOR: '#00ff00',
  POWER_BAR_Z_INDEX: '9999',
  CHARGE_LINE_Z_INDEX: '9998'
}

export class UIManager {
  constructor() {
    this.camera = null  // Set later từ SimulationTest
    this.elements = {
      crosshair: null,
      powerBarContainer: null,
      powerBarPath: null,
      chargeIndicator: null,
      chargeLine: null,
      spectatorUI: null  // ✨ Spectator UI element
    }
    
    this._createUIElements()
  }

  /**
   * Set camera reference - cần để project world positions sang screen
   */
  setCamera(camera) {
    this.camera = camera
  }

  /**
   * Tạo tất cả UI elements
   */
  _createUIElements() {
    // ========================================
    // CROSSHAIR (dấu cộng giữa màn hình)
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
    // POWER BAR (vòng tròn charging)
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
    spectatorUI.style.transform = 'translate(-50%, calc(-50% + 40px))'  // ✨ Dưới dấu +
    spectatorUI.style.fontSize = '10px'
    spectatorUI.style.fontFamily = 'monospace'
    spectatorUI.style.pointerEvents = 'none'
    spectatorUI.style.display = 'none'
    spectatorUI.style.zIndex = '9999'
    spectatorUI.style.textAlign = 'center'
    spectatorUI.style.whiteSpace = 'nowrap'
    spectatorUI.style.textShadow = '1px 1px 2px black'
    spectatorUI.innerHTML = 'C to enter cam'  // ✨ Chỉ có text, không có dấu +
    document.body.appendChild(spectatorUI)
    this.elements.spectatorUI = spectatorUI

    // ========================================
    // CHARGE INDICATOR (chỉ vị trí bắn "Hit here")
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
    // CHARGE LINE (đường kéo cue)
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
  }

  /**
   * Hiển thị/ẩn crosshair (dấu cộng giữa màn hình)
   */
  showCrosshair(visible = true) {
    this.elements.crosshair.style.display = visible ? 'block' : 'none'
  }

  /**
   * Cập nhật charge indicator (chỉ "Hit here" ở vị trí bắn)
   * @param {boolean} visible - Hiển thị hay không
   * @param {THREE.Vector3} worldPosition - Vị trí trong world space
   * @param {THREE.Camera} camera - Camera để project sang screen space
   */
  updateChargeIndicator(visible, worldPosition, camera = null) {
    const cam = camera || this.camera
    
    if (!visible || !worldPosition || !cam) {
      this.elements.chargeIndicator.style.display = 'none'
      return
    }

    const vector = worldPosition.clone()
    vector.project(cam)

    // Nếu object đằng sau camera thì ẩn
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
   * Cập nhật power bar (vòng tròn charging)
   * @param {boolean} visible - Hiển thị hay không
   * @param {number} chargeAmount - Lượng charge (0-1)
   */
  updatePowerBar(visible, chargeAmount) {
    if (!visible || chargeAmount === undefined) {
      this.elements.powerBarContainer.style.display = 'none'
      return
    }

    const t = Math.max(0, Math.min(1, chargeAmount))
    const percentage = t * 100
    this.elements.powerBarPath.style.strokeDasharray = `${percentage}, 100`

    // Color gradient: Green → Yellow → Red → Purple
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
   * Cập nhật charge line (đường kéo từ cue tip tới target)
   * @param {boolean} visible - Hiển thị hay không
   * @param {THREE.Vector3} startWorldPos - Vị trí bắt đầu (cue tip)
   * @param {THREE.Vector3} endWorldPos - Vị trí kết thúc (target)
   * @param {THREE.Camera} camera - Camera để project sang screen space
   */
  updateChargeLine(visible, startWorldPos, endWorldPos, camera = null) {
    const cam = camera || this.camera

    if (!visible || !startWorldPos || !endWorldPos || !cam) {
      this.elements.chargeLine.style.display = 'none'
      return
    }

    const startVec = startWorldPos.clone().project(cam)
    const endVec = endWorldPos.clone().project(cam)

    // Nếu cả hai điểm đằng sau camera thì ẩn
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
   * Reset tất cả UI về trạng thái ẩn
   */
  reset() {
    this.showCrosshair(false)
    this.updateChargeIndicator(false)
    this.updatePowerBar(false)
    this.updateChargeLine(false)
  }

  /**
   * ✨ Hide all player UI (charge bar, indicator, line)
   * Called when exiting player camera
   */
  hidePlayerUI() {
    this.elements.crosshair.style.display = 'none'
    this.elements.powerBarContainer.style.display = 'none'
    this.elements.chargeIndicator.style.display = 'none'
    this.elements.chargeLine.style.display = 'none'
  }

  /**
   * ✨ Show spectator UI with camera controls hint
   * Called when in spectator mode
   * @param {boolean} pointerLocked - Whether camera is in pointer lock mode
   */
  showSpectatorUI(pointerLocked = false) {
    // ✨ Hide spectator UI text completely - default state shows no hint
    if (!pointerLocked) {
      // Camera not locked - no text needed
      this.elements.spectatorUI.style.display = 'none'
    }
  }

  /**
   * ✨ Hide spectator UI
   * Called when focusing on a game object
   */
  hideSpectatorUI() {
    this.elements.spectatorUI.style.display = 'none'
  }

  /**
   * Cleanup - xóa tất cả elements khỏi DOM
   */
  dispose() {
    Object.values(this.elements).forEach(element => {
      if (element && element.parentElement) {
        element.parentElement.removeChild(element)
      }
    })
  }
}
