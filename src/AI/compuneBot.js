import * as THREE from 'three'
import { createSweatEffect } from '../effects/particles/particle8.js'

// ==================== CONFIGURATION ====================
const CONFIG = {
  TRIGGER_DISTANCE: 3.0,
  DISCONNECT_DELAY: 10,
  FINISH_READ_DELAY: 3,
  PAGE_DISPLAY_TIME: 5,
  INPUT_SPEED_THRESHOLD: 500,
  FADE_DURATION: 800
}

// ==================== COMPUNE AI ====================
export class CompuneAI {
  constructor(compuneMesh, compuneBody, scene) {
    this.mesh = compuneMesh
    this.body = compuneBody
    this.scene = scene
    
    // State
    this.state = 'default'
    this.isPlayerInTrigger = false
    this.allDialogsRead = false
    this.shouldDespawn = false
    
    // Dialog
    this.dialogPages = []
    this.currentPageIndex = 0
    this.isShowingDialog = false
    this.pageTimer = 0
    this.disconnectTimer = 0
    
    // Input tracking
    this.lastInputTime = 0
    this.activeSweatEffects = []
    
    // UI
    this.textElement = null
    this.contentText = null
    this.progressFill = null
    this.keydownListener = null
    
    this.createTextElement()
  }

  // ==================== UI ====================
  createTextElement() {
    this.textElement = document.createElement('div')
    this.textElement.style.cssText = `
      position: fixed;
      top: 40px;
      right: 40px;
      max-width: 400px;
      padding: 0;
      background: #0a1a3d;
      border: 2px solid #0066FF;
      border-radius: 0;
      color: #00FF00;
      font-size: 12px;
      line-height: 1.6;
      z-index: 9999;
      display: none;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      box-shadow: 0 0 20px rgba(0, 102, 255, 0.6), inset 0 0 10px rgba(0, 102, 255, 0.3);
      overflow: hidden;
      transition: opacity 0.8s ease-out;
    `
    
    const header = document.createElement('div')
    header.style.cssText = `
      background: #0066FF;
      color: #000;
      padding: 6px 12px;
      font-weight: bold;
      border-bottom: 2px solid #004399;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    `
    header.textContent = '> COMPUNE'
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
      width: 0%;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
      transition: width 0.1s linear;
    `
    progressBar.appendChild(this.progressFill)
    this.textElement.appendChild(progressBar)
    
    document.body.appendChild(this.textElement)
  }

  // ==================== DIALOG ====================
  setDialog(pages) {
    this.dialogPages = pages || []
    this.currentPageIndex = 0
    this.allDialogsRead = false
    this.addKeyListener()
  }

  showPage(index) {
    if (index < 0 || index >= this.dialogPages.length) {
      this.closeDialog()
      return
    }
    this.currentPageIndex = index
    this.contentText.textContent = this.dialogPages[index]
    this.textElement.style.display = 'block'
    this.isShowingDialog = true
    this.pageTimer = 0
  }

  nextPage() {
    if (this.currentPageIndex < this.dialogPages.length - 1) {
      this.showPage(this.currentPageIndex + 1)
    } else {
      this.allDialogsRead = true
      this.state = 'finished'
      this.disconnectTimer = 0
      this.isPlayerInTrigger = false
      this.fadeOutAndClose()
    }
  }

  fadeOutAndClose() {
    this.isShowingDialog = false
    this.textElement.style.opacity = '0'
    this.removeKeyListener()
    setTimeout(() => {
      this.textElement.style.display = 'none'
      this.textElement.style.opacity = '1'
      this.currentPageIndex = 0
    }, CONFIG.FADE_DURATION)
  }

  closeDialog() {
    this.isShowingDialog = false
    this.textElement.style.opacity = '0'
    setTimeout(() => {
      this.textElement.style.display = 'none'
      this.textElement.style.opacity = '1'
      this.currentPageIndex = 0
    }, CONFIG.FADE_DURATION)
    this.removeKeyListener()
  }

  startDialog() {
    if (this.dialogPages.length === 0) return
    this.state = 'talking'
    this.disconnectTimer = 0
    this.currentPageIndex = 0
    this.showDefaultScreen()
    this.showPage(0)
    this.addKeyListener()
  }

  // ==================== INPUT ====================
  addKeyListener() {
    if (this.keydownListener) return
    this.keydownListener = (e) => {
      if (this.dialogPages.length === 0) return
      if (e.key !== 'Enter') return
      e.preventDefault()
      
      const currentTime = Date.now()
      const timeSinceLastInput = currentTime - this.lastInputTime
      if (this.lastInputTime > 0 && timeSinceLastInput < CONFIG.INPUT_SPEED_THRESHOLD) {
        try {
          const sweatEffect = createSweatEffect(this.scene, this.mesh.position.clone())
          this.activeSweatEffects.push(sweatEffect)
        } catch (err) {}
      }
      this.lastInputTime = currentTime
      this.nextPage()
    }
    window.addEventListener('keydown', this.keydownListener)
  }

  removeKeyListener() {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener)
      this.keydownListener = null
      this.lastInputTime = 0
    }
  }

  // ==================== SCREEN ====================
  showDisconnectScreen() {
    if (this.mesh.userData.screenMaterial && this.mesh.userData.noSignalTexture) {
      this.mesh.userData.screenMaterial.map = this.mesh.userData.noSignalTexture
      this.mesh.userData.screenMaterial.emissiveIntensity = 0
      this.mesh.userData.screenMaterial.emissive.setHex(0xffffff)
      this.mesh.userData.screenMaterial.needsUpdate = true
    }
  }

  showDefaultScreen() {
    if (this.mesh.userData.screenMaterial && this.mesh.userData.defaultScreenTexture) {
      this.mesh.userData.screenMaterial.map = this.mesh.userData.defaultScreenTexture
      this.mesh.userData.screenMaterial.emissiveIntensity = 2.0
      this.mesh.userData.screenMaterial.emissive.setHex(0x0066ff)
      this.mesh.userData.screenMaterial.needsUpdate = true
    }
  }

  // ==================== UPDATE ====================
  update(delta, syncList) {
    for (let i = this.activeSweatEffects.length - 1; i >= 0; i--) {
      const effect = this.activeSweatEffects[i]
      effect.update(delta)
      if (effect.finished) this.activeSweatEffects.splice(i, 1)
    }
    
    let playerDist = Infinity
    for (const entry of syncList) {
      if (entry.name === 'Player' && entry.mesh) {
        playerDist = this.mesh.position.distanceTo(entry.mesh.position)
        break
      }
    }
    const playerInTrigger = playerDist <= CONFIG.TRIGGER_DISTANCE
    
    switch (this.state) {
      case 'default':
        if (playerInTrigger) {
          this.isPlayerInTrigger = true
          this.startDialog()
        }
        break
      case 'talking':
        if (!playerInTrigger && this.isPlayerInTrigger) {
          this.isPlayerInTrigger = false
          this.state = 'disconnecting'
          this.disconnectTimer = 0
          this.closeDialog()
          this.showDisconnectScreen()
        }
        break
      case 'disconnecting':
        this.disconnectTimer += delta
        if (playerInTrigger) {
          this.isPlayerInTrigger = true
          this.state = 'talking'
          this.disconnectTimer = 0
          this.showDefaultScreen()
          this.startDialog()
        } else if (this.disconnectTimer >= CONFIG.DISCONNECT_DELAY) {
          this.shouldDespawn = true
        }
        break
      case 'finished':
        this.disconnectTimer += delta
        if (this.disconnectTimer >= CONFIG.FINISH_READ_DELAY) {
          this.shouldDespawn = true
        }
        break
    }
    
    if (this.isShowingDialog && this.state === 'talking') {
      this.pageTimer += delta
      const progress = Math.min(1, this.pageTimer / CONFIG.PAGE_DISPLAY_TIME)
      if (this.progressFill) {
        this.progressFill.style.width = (progress * 100) + '%'
      }
      if (this.pageTimer >= CONFIG.PAGE_DISPLAY_TIME) {
        this.nextPage()
      }
    }
  }

  // ==================== CLEANUP ====================
  cleanup() {
    this.removeKeyListener()
    if (this.textElement && this.textElement.parentElement) {
      this.textElement.parentElement.removeChild(this.textElement)
    }
    this.contentText = null
    this.progressFill = null
    this.activeSweatEffects = []
  }
}