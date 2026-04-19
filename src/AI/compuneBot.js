import * as THREE from 'three'
import { createSweatEffect } from '../effects/particles/particle8.js'

/**
 * CompuneAI - Simple NPC with multi-page dialog
 * 
 * Usage:
 *   const ai = new CompuneAI(mesh, body, scene)
 *   ai.setDialog(["Page 1 text", "Page 2 text", "Page 3 text"])
 *   
 *   In game loop:
 *     ai.update(delta, syncList)
 *     if (ai.shouldDespawn) { cleanup }
 * 
 * State Machine:
 *   - default: Just spawned, no countdown
 *   - talking: Player in trigger zone, showing dialog (press ENTER to skip to next page)
 *   - disconnecting: Player left trigger zone, counting 10s to despawn (if not finished reading)
 *   - finished: Player read all dialogs, counting 3s to despawn
 *   If player returns during disconnecting, resets to talking state
 */

export class CompuneAI {
  constructor(compuneMesh, compuneBody, scene) {
    this.mesh = compuneMesh
    this.body = compuneBody
    this.scene = scene
    
    // Config - Trigger distance based on inner trigger zones (1.5 radius each)
    this.triggerDistance = 3.0  // 1.5 (player small trigger) + 1.5 (compune small trigger)
    this.disconnectDelay = 10   // Seconds to despawn after player leaves (disconnecting state)
    this.finishReadDelay = 3    // Seconds to despawn after player finishes reading all dialogs
    this.pageDisplayTime = 5    // Seconds before auto-advance to next page
    
    // State machine: 'default' -> 'talking' -> 'disconnecting' or 'finished' -> despawn
    this.state = 'default'      // current state
    this.isPlayerInTrigger = false  // Track if player is currently in trigger zone
    this.allDialogsRead = false // Track if player has finished reading all pages
    
    // Dialog state
    this.dialogPages = []       // Array of text strings
    this.currentPageIndex = 0
    this.isShowingDialog = false
    this.pageTimer = 0          // Timer for page auto-advance
    this.disconnectTimer = 0    // Timer for disconnecting state
    this.shouldDespawn = false
    
    // UI - Simple HTML element
    this.textElement = null
    this.contentText = null
    this.progressBar = null
    this.progressFill = null
    this.createTextElement()
    
    // Keyboard listener
    this.keydownListener = null
    
    // Input speed tracking - detect fast Enter presses (<0.5s between presses)
    this.lastInputTime = 0
    this.inputSpeedThreshold = 500  // milliseconds
    this.onFastInput = null  // Callback function to trigger sweat effect
    
    // ✨ NEW: Array to track active sweat effects for update loop
    this.activeSweatEffects = []
  }

  /**
   * Create simple text display element with progress bar
   */
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
      font-weight: normal;
      letter-spacing: 0px;
      opacity: 1;
      box-shadow: 0 0 20px rgba(0, 102, 255, 0.6), inset 0 0 10px rgba(0, 102, 255, 0.3);
      overflow: hidden;
      transition: opacity 0.8s ease-out;
    `
    
    // Header bar
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
    
    // Content container
    const contentContainer = document.createElement('div')
    contentContainer.style.cssText = `
      padding: 12px;
      word-wrap: break-word;
      white-space: pre-wrap;
    `
    this.contentText = document.createElement('div')
    this.contentText.textContent = ''
    this.contentText.style.cssText = `
      min-height: 20px;
    `
    contentContainer.appendChild(this.contentText)
    this.textElement.appendChild(contentContainer)
    
    // Progress bar container
    this.progressBar = document.createElement('div')
    this.progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: #001a4d;
      border-top: 1px solid #0066FF;
      position: relative;
      overflow: hidden;
    `
    
    // Progress fill
    this.progressFill = document.createElement('div')
    this.progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #0066FF, #00FF00);
      width: 0%;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
      transition: width 0.1s linear;
    `
    this.progressBar.appendChild(this.progressFill)
    this.textElement.appendChild(this.progressBar)
    
    document.body.appendChild(this.textElement)
  }

  /**
   * Set dialog pages (array of text strings)
   */
  setDialog(pages) {
    this.dialogPages = pages || []
    this.currentPageIndex = 0
    this.allDialogsRead = false  // Reset when setting new dialog
    
    // ✨ NEW: Setup key listener when dialog is set
    // This allows spawn from dropdown/P in simulator to work correctly
    this.addKeyListener()
  }

  /**
   * Show dialog page at given index
   */
  showPage(index) {
    if (index < 0 || index >= this.dialogPages.length) {
      this.closeDialog()
      return
    }

    this.currentPageIndex = index
    const text = this.dialogPages[index]
    
    this.contentText.textContent = text
    this.textElement.style.display = 'block'
    this.isShowingDialog = true
    this.pageTimer = 0  // Reset timer for auto-advance
  }

  /**
   * Show next page (or close if last page)
   */
  nextPage() {
    if (this.currentPageIndex < this.dialogPages.length - 1) {
      this.showPage(this.currentPageIndex + 1)
    } else {
      // Last page - mark all dialogs as read and enter 'finished' state
      this.allDialogsRead = true
      this.state = 'finished'
      this.disconnectTimer = 0  // Use same timer for finished countdown
      this.isPlayerInTrigger = false  // Reset trigger flag for finished state
      this.fadeOutAndClose()
    }
  }

  /**
   * Fade out and close dialog
   */
  fadeOutAndClose() {
    this.isShowingDialog = false
    this.textElement.style.opacity = '0'
    this.removeKeyListener()
    
    // Wait for fade animation to complete (0.8s)
    setTimeout(() => {
      this.textElement.style.display = 'none'
      this.textElement.style.opacity = '1'  // Reset for next trigger
      this.currentPageIndex = 0
    }, 800)
  }

  /**
   * Close dialog and start despawn countdown
   */
  closeDialog() {
    this.isShowingDialog = false
    this.textElement.style.opacity = '0'
    
    // Wait for fade animation to complete (0.8s)
    setTimeout(() => {
      this.textElement.style.display = 'none'
      this.textElement.style.opacity = '1'  // Reset for next trigger
      this.currentPageIndex = 0
    }, 800)
    
    this.removeKeyListener()
  }

  /**
   * Start dialog from first page (when entering 'talking' state)
   */
  startDialog() {
    if (this.dialogPages.length === 0) return
    
    this.state = 'talking'
    this.disconnectTimer = 0
    this.currentPageIndex = 0
    this.showDefaultScreen()
    
    this.showPage(0)
    this.addKeyListener()
  }

  /**
   * Add keyboard listener (ENTER to skip to next page)
   * Also track input speed for Compune sweat effect on fast input
   */
  addKeyListener() {
    if (this.keydownListener) return  // Already added
    
    this.keydownListener = (e) => {
      // ✨ Check if dialog exists (not just isShowingDialog)
      // This allows fast input detection even when dialog is loaded but not yet displayed
      if (this.dialogPages.length === 0) return
      
      if (e.key === 'Enter') {
        e.preventDefault()
        
        // ✨ NEW: Detect fast input (<0.5s between presses)
        const currentTime = Date.now()
        const timeSinceLastInput = currentTime - this.lastInputTime
        
        if (this.lastInputTime > 0 && timeSinceLastInput < this.inputSpeedThreshold) {
          // Fast input detected!
          console.log(`%c[CompuneAI] ⚡ Fast input detected (${timeSinceLastInput}ms)! Trigger sweat effect!`, 'color: #ffaa00; font-weight: bold')
          
          // ✨ IMPORTANT: CompuneAI directly spawns sweat particle effect
          // This ensures effect appears regardless of scene type (gameplay, simulator, etc)
          try {
            const sweatEffect = createSweatEffect(this.scene, this.mesh.position.clone())
            // ✨ NEW: Store effect to be updated every frame
            this.activeSweatEffects.push(sweatEffect)
            console.log(`[CompuneAI] Sweat effect created! Active: ${this.activeSweatEffects.length}`)
          } catch (err) {
            console.warn('[CompuneAI] Failed to create sweat effect:', err)
          }
          
          // ✨ Also call callback if set (for backward compatibility)
          if (this.onFastInput) {
            this.onFastInput(this.mesh.position)
          }
        }
        
        this.lastInputTime = currentTime
        this.nextPage()
      }
    }
    
    window.addEventListener('keydown', this.keydownListener)
  }

  /**
   * Remove keyboard listener and reset input tracking
   */
  removeKeyListener() {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener)
      this.keydownListener = null
      this.lastInputTime = 0  // Reset input timer when dialog closes
    }
  }

  /**
   * Show no signal screen when disconnecting (no brightness)
   */
  showDisconnectScreen() {
    if (this.mesh.userData.screenMaterial && this.mesh.userData.noSignalTexture) {
      this.mesh.userData.screenMaterial.map = this.mesh.userData.noSignalTexture
      this.mesh.userData.screenMaterial.emissiveIntensity = 0  // No brightness
      this.mesh.userData.screenMaterial.emissive.setHex(0xffffff)  // White emissive
      this.mesh.userData.screenMaterial.roughness = 0.2  // Default roughness
      this.mesh.userData.screenMaterial.needsUpdate = true
    }
  }

  /**
   * Restore default screen when talking (restore emissive)
   */
  showDefaultScreen() {
    if (this.mesh.userData.screenMaterial && this.mesh.userData.defaultScreenTexture) {
      this.mesh.userData.screenMaterial.map = this.mesh.userData.defaultScreenTexture
      this.mesh.userData.screenMaterial.emissiveIntensity = 2.0  // Default intensity
      this.mesh.userData.screenMaterial.emissive.setHex(0x0066ff)  // Blue glow
      this.mesh.userData.screenMaterial.roughness = 0.2  // Default roughness
      this.mesh.userData.screenMaterial.needsUpdate = true
    }
  }

  /**
   * Update every frame
   */
  update(delta, syncList) {
    // ✨ NEW: Update all active sweat effects
    for (let i = this.activeSweatEffects.length - 1; i >= 0; i--) {
      const effect = this.activeSweatEffects[i]
      effect.update(delta)
      
      if (effect.finished) {
        this.activeSweatEffects.splice(i, 1)
      }
    }
    
    // Find player distance
    let playerDist = Infinity
    
    for (const entry of syncList) {
      if (entry.name === 'Player' && entry.mesh) {
        playerDist = this.mesh.position.distanceTo(entry.mesh.position)
        break
      }
    }

    const playerInTrigger = playerDist <= this.triggerDistance

    // ===== MAIN STATE MACHINE =====
    
    switch (this.state) {
      case 'default':
        // Waiting for player
        if (playerInTrigger) {
          this.isPlayerInTrigger = true
          this.startDialog()
        }
        break

      case 'talking':
        // Player is talking/reading dialog
        if (!playerInTrigger && this.isPlayerInTrigger) {
          // Player left trigger - transition to disconnecting
          this.isPlayerInTrigger = false
          this.state = 'disconnecting'
          this.disconnectTimer = 0
          this.closeDialog()
          this.showDisconnectScreen()
          console.debug('[CompuneAI] Player left → disconnecting state')
        }
        break

      case 'disconnecting':
        // Player left, counting down 10 seconds
        this.disconnectTimer += delta

        if (playerInTrigger) {
          // Player came back - return to talking
          this.isPlayerInTrigger = true
          this.state = 'talking'
          this.disconnectTimer = 0
          this.showDefaultScreen()
          this.startDialog()
          console.debug('[CompuneAI] Player returned → talking state')
        } else if (this.disconnectTimer >= this.disconnectDelay) {
          // Timeout reached - despawn
          this.shouldDespawn = true
          console.debug('[CompuneAI] Disconnect timeout reached → DESPAWN')
        }
        break

      case 'finished':
        // Player finished reading all dialogs, counting down 3 seconds
        this.disconnectTimer += delta

        if (this.disconnectTimer >= this.finishReadDelay) {
          // Timeout reached - despawn
          this.shouldDespawn = true
          console.debug('[CompuneAI] Finished timeout reached → DESPAWN')
        }
        break
    }

    // ===== UPDATE DIALOG UI =====
    // Update progress bar and auto-advance while talking
    if (this.isShowingDialog && this.state === 'talking') {
      this.pageTimer += delta
      const progress = Math.min(1, this.pageTimer / this.pageDisplayTime)
      if (this.progressFill) {
        this.progressFill.style.width = (progress * 100) + '%'
      }

      // Auto-advance after 5 seconds
      if (this.pageTimer >= this.pageDisplayTime) {
        this.nextPage()
      }
    }
  }

  /**
   * Cleanup before despawn
   */
  cleanup() {
    this.removeKeyListener()
    if (this.textElement && this.textElement.parentElement) {
      this.textElement.parentElement.removeChild(this.textElement)
    }
    this.contentText = null
    this.progressFill = null
    this.progressBar = null
    
    // ✨ NEW: Cleanup active sweat effects
    this.activeSweatEffects = []
  }
}
