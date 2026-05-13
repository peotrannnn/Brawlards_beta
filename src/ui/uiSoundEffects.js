import { playSound10, primeSound10Audio } from '../sounds/sound10.js'
import { playSound11, primeSound11Audio } from '../sounds/sound11.js'
import { playSound15, primeSound15Audio } from '../sounds/sound15.js'

const UI_SOUND_STATE = {
  initialized: false,
  hoveredControl: null,
}

const UI_SURFACE_SELECTOR = [
  '#mainMenuOverlay',
  '#pauseMenuScreen',
  '#gameOverScreen',
  '.settings-screen-overlay',
  '#playContainer',
  '.page-ui',
].join(', ')

function isVisibleControl(element) {
  if (!(element instanceof HTMLElement)) return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none'
}

function findUiSoundTarget(target) {
  let current = target instanceof Element ? target : null

  while (current && current !== document.body) {
    if (current instanceof HTMLButtonElement && isVisibleControl(current)) {
      return current
    }

    const surface = current.closest(UI_SURFACE_SELECTOR)
    if (surface && current !== surface && current instanceof HTMLElement) {
      const style = window.getComputedStyle(current)
      if (style.cursor === 'pointer' && isVisibleControl(current)) {
        return current
      }
    }

    current = current.parentElement
  }

  return null
}

function handlePointerOver(event) {
  if (UI_SOUND_STATE.hoveredControl && !isVisibleControl(UI_SOUND_STATE.hoveredControl)) {
    UI_SOUND_STATE.hoveredControl = null
  }

  const target = findUiSoundTarget(event.target)
  if (!target || target === UI_SOUND_STATE.hoveredControl) return

  UI_SOUND_STATE.hoveredControl = target
  playSound10()
}

function handlePointerOut(event) {
  const hovered = UI_SOUND_STATE.hoveredControl
  if (!hovered) return

  const target = findUiSoundTarget(event.target)
  if (target !== hovered) return

  const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null
  if (relatedTarget && hovered.contains(relatedTarget)) return

  UI_SOUND_STATE.hoveredControl = null
}

function handleClick(event) {
  const target = findUiSoundTarget(event.target)
  if (!target) return
  playSound11()
}

export function playTypingSound(character = '') {
  if (typeof character === 'string' && character.trim().length === 0) return

  let emphasis = 1
  if (/[.!?]/.test(character)) {
    emphasis = 1.14
  } else if (/[,:;]/.test(character)) {
    emphasis = 1.06
  }

  playSound15({ emphasis })
}

export function clearUiHoverSound(control = null) {
  if (!(control instanceof HTMLElement)) {
    UI_SOUND_STATE.hoveredControl = null
    return
  }

  if (UI_SOUND_STATE.hoveredControl === control) {
    UI_SOUND_STATE.hoveredControl = null
  }
}

export function syncUiHoverSound(control) {
  if (!UI_SOUND_STATE.initialized || !(control instanceof HTMLElement) || !isVisibleControl(control)) return

  if (UI_SOUND_STATE.hoveredControl && !isVisibleControl(UI_SOUND_STATE.hoveredControl)) {
    UI_SOUND_STATE.hoveredControl = null
  }

  if (!control.matches(':hover') || UI_SOUND_STATE.hoveredControl === control) return

  UI_SOUND_STATE.hoveredControl = control
  playSound10()
}

export function initUISoundEffects() {
  if (UI_SOUND_STATE.initialized || typeof document === 'undefined') return

  UI_SOUND_STATE.initialized = true
  primeSound10Audio()
  primeSound11Audio()
  primeSound15Audio()

  // Ensure AudioContext is resumed on first user gesture (fixes Chrome autoplay policy)
  const resumeAllAudioContexts = () => {
    try {
      if (window.resumeSharedSfxAudio) window.resumeSharedSfxAudio()
      if (window.musicPlayer && typeof window.musicPlayer.unlock === 'function') window.musicPlayer.unlock()
    } catch {}
    window.removeEventListener('pointerdown', resumeAllAudioContexts, true)
    window.removeEventListener('keydown', resumeAllAudioContexts, true)
    window.removeEventListener('click', resumeAllAudioContexts, true)
  }
  window.addEventListener('pointerdown', resumeAllAudioContexts, true)
  window.addEventListener('keydown', resumeAllAudioContexts, true)
  window.addEventListener('click', resumeAllAudioContexts, true)

  document.addEventListener('pointerover', handlePointerOver, true)
  document.addEventListener('pointerout', handlePointerOut, true)
  document.addEventListener('click', handleClick, true)
  window.addEventListener('blur', () => {
    UI_SOUND_STATE.hoveredControl = null
  })
}