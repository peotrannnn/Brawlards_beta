import * as THREE from "three"
import { startSimulationTest } from "./core/SimulationTest.js"
import { createInspector } from "./core/Inspector.js"
import { startPlay } from "./core/Play.js"
import { musicPlayer } from "./music/MusicPlayer.js"
import { preloadCoreAssets } from "./assets/preloadAssets.js"
import { createSection1 } from "./assets/scenes/sections/section1_1.js"
import { runWithLoadingOverlay } from "./utils/loadingOverlay.js"
import { settingsManager } from "./core/SettingsManager.js"
import { getGraphicsQualityProfile } from "./core/graphicsQuality.js"
import { createSettingsScreen } from "./ui/SettingsMenuScreen.js"
import { clearUiHoverSound, initUISoundEffects, playTypingSound, syncUiHoverSound } from "./ui/uiSoundEffects.js"
import { IT_STYLE, UI_THEME } from "./ui/uiTheme.js"

const EPSILON_STUDIO_FONT_PRECONNECT_ID = 'epsilon-studio-font-preconnect'
const EPSILON_STUDIO_FONT_PRECONNECT_CROSS_ID = 'epsilon-studio-font-preconnect-cross'
const EPSILON_STUDIO_FONT_LINK_ID = 'epsilon-studio-font-link'
const EPSILON_STUDIO_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
const LOBBY_INTRO_LINES = [
  'It was just another dream, like all the others. You had dreamed it many times before, yet this time it felt more real than ever.',
  'Rarely could a dream feel this vivid... but how long would it be before reality called you back?',
  'And could you even find your way back?',
]

export { IT_STYLE }


const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap // Use PCFShadowMap to avoid deprecation warning

let rendererMenuBlurPx = 0
let rendererShadowOverride = null
let rendererQualityOverride = null
let rendererClearColor = 0x000000
let rendererClearAlpha = 1

function setRendererClearColor(color, alpha = 1) {
  rendererClearColor = color
  rendererClearAlpha = alpha
  renderer.setClearColor(color, alpha)
}

function clearRendererFrame() {
  renderer.setClearColor(rendererClearColor, rendererClearAlpha)
  renderer.clear()
}

function requestApplicationExit() {
  try {
    window.close()
  } catch {}

  window.setTimeout(() => {
    if (window.closed) return

    try {
      window.open('', '_self')
    } catch {}

    try {
      window.close()
    } catch {}
  }, 16)
}

function applyRendererQualityPreset(settings = settingsManager.getAll()) {
  const qualityProfile = rendererQualityOverride || getGraphicsQualityProfile(settings?.quality)
  const baseRatio = window.devicePixelRatio || 1
  const cappedBaseRatio = Math.min(baseRatio, qualityProfile.maxDevicePixelRatio)
  renderer.setPixelRatio(cappedBaseRatio * qualityProfile.menuPixelRatioScale)
}

function syncRendererPresentation(settings = settingsManager.getAll()) {
  const qualityProfile = getGraphicsQualityProfile(settings?.quality)
  const allowShadows = Boolean(settings?.shadows) && qualityProfile.allowShadows
  renderer.shadowMap.enabled = rendererShadowOverride ?? allowShadows

  const filterParts = [`brightness(${settings?.brightness ?? settingsManager.get('brightness')})`]
  if (rendererMenuBlurPx > 0) {
    filterParts.push(`blur(${rendererMenuBlurPx}px)`)
  }

  renderer.domElement.style.filter = filterParts.join(' ')
}

// Apply initial settings
const initialSettings = settingsManager.getAll()
applyRendererQualityPreset(initialSettings)
syncRendererPresentation(initialSettings)

// Listen to settings changes
settingsManager.onChange((settings) => {
  applyRendererQualityPreset(settings)
  syncRendererPresentation(settings)
  clearRendererFrame()
  // We can't easily force all materials to update shadow maps without traversing the scene,
  // but it will apply on the next play or scene load.
})

document.body.style.margin = "0"
document.body.style.overflow = "hidden"
document.body.appendChild(renderer.domElement)

let currentCleanup = null
let currentHomePageCleanup = null
let currentHomePageMenuReveal = null

function cleanupHomePageState() {
  currentHomePageMenuReveal = null
  if (typeof currentHomePageCleanup === 'function') {
    currentHomePageCleanup()
    currentHomePageCleanup = null
  }
}

function clearHomePageOverlay() {
  currentHomePageMenuReveal = null

  const menuOverlay = document.getElementById("mainMenuOverlay")
  if (menuOverlay) menuOverlay.remove()

  const home = document.getElementById("homePage")
  if (home) home.remove()
}

function cleanupMenuBackgroundForSceneTransition() {
  cleanupHomePageState()
  setRendererClearColor(0x000000, 1)
  clearRendererFrame()
}

function ensureEpsilonStudioFont() {
  if (!document.getElementById(EPSILON_STUDIO_FONT_PRECONNECT_ID)) {
    const preconnect = document.createElement('link')
    preconnect.id = EPSILON_STUDIO_FONT_PRECONNECT_ID
    preconnect.rel = 'preconnect'
    preconnect.href = 'https://fonts.googleapis.com'
    document.head.appendChild(preconnect)
  }

  if (!document.getElementById(EPSILON_STUDIO_FONT_PRECONNECT_CROSS_ID)) {
    const preconnectCross = document.createElement('link')
    preconnectCross.id = EPSILON_STUDIO_FONT_PRECONNECT_CROSS_ID
    preconnectCross.rel = 'preconnect'
    preconnectCross.href = 'https://fonts.gstatic.com'
    preconnectCross.crossOrigin = 'anonymous'
    document.head.appendChild(preconnectCross)
  }

  if (!document.getElementById(EPSILON_STUDIO_FONT_LINK_ID)) {
    const fontLink = document.createElement('link')
    fontLink.id = EPSILON_STUDIO_FONT_LINK_ID
    fontLink.rel = 'stylesheet'
    fontLink.href = EPSILON_STUDIO_FONT_HREF
    document.head.appendChild(fontLink)
  }
}

function createBootLoadingScreen() {
  ensureEpsilonStudioFont()
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
  let disposed = false
  let advanceResolver = null
  let introKeydownHandler = null

  const introStyle = document.createElement('style')
  introStyle.textContent = `
    @keyframes bootIntroCaretBlink {
      0%, 45% { opacity: 1; }
      46%, 100% { opacity: 0; }
    }
  `
  document.head.appendChild(introStyle)

  const overlay = document.createElement('div')
  overlay.id = 'bootLoadingOverlay'
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '40000'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.background = UI_THEME.boot.overlayBackground
  overlay.style.opacity = '1'
  overlay.style.transition = 'opacity 0.9s ease'
  overlay.style.pointerEvents = 'auto'
  overlay.style.overflow = 'hidden'

  const shell = document.createElement('div')
  shell.style.display = 'flex'
  shell.style.flexDirection = 'column'
  shell.style.alignItems = 'center'
  shell.style.justifyContent = 'center'
  shell.style.gap = '12px'
  shell.style.padding = '32px'
  shell.style.width = 'min(88vw, 680px)'

  const brand = document.createElement('div')
  brand.textContent = 'epsilon'
  brand.style.display = 'inline-block'
  brand.style.fontFamily = '"Plus Jakarta Sans", sans-serif'
  brand.style.fontWeight = '800'
  brand.style.fontSize = 'clamp(56px, 12vw, 132px)'
  brand.style.lineHeight = '1.04'
  brand.style.letterSpacing = '-0.085em'
  brand.style.padding = '0.06em 0.04em 0.1em'
  brand.style.textTransform = 'lowercase'
  brand.style.background = UI_THEME.boot.brandGradient
  brand.style.backgroundClip = 'text'
  brand.style.webkitBackgroundClip = 'text'
  brand.style.color = UI_THEME.common.transparent
  brand.style.webkitTextFillColor = UI_THEME.common.transparent
  brand.style.textShadow = 'none'

  const studio = document.createElement('div')
  studio.textContent = 'studio'
  studio.style.display = 'inline-block'
  studio.style.fontFamily = '"Plus Jakarta Sans", sans-serif'
  studio.style.fontWeight = '600'
  studio.style.fontSize = 'clamp(12px, 1.5vw, 16px)'
  studio.style.lineHeight = '1.1'
  studio.style.letterSpacing = '0.58em'
  studio.style.textTransform = 'uppercase'
  studio.style.paddingLeft = '0.58em'
  studio.style.color = UI_THEME.boot.studioColor
  studio.style.textShadow = 'none'

  const status = document.createElement('div')
  status.textContent = 'Loading scene assets'
  status.style.marginTop = '18px'
  status.style.fontFamily = '"Plus Jakarta Sans", sans-serif'
  status.style.fontSize = '12px'
  status.style.fontWeight = '500'
  status.style.letterSpacing = '0.2em'
  status.style.textTransform = 'uppercase'
  status.style.color = UI_THEME.boot.statusColor

  const progressTrack = document.createElement('div')
  progressTrack.style.width = 'min(340px, 62vw)'
  progressTrack.style.height = '2px'
  progressTrack.style.marginTop = '8px'
  progressTrack.style.background = UI_THEME.boot.progressTrack
  progressTrack.style.overflow = 'hidden'

  const progressFill = document.createElement('div')
  progressFill.style.width = '0%'
  progressFill.style.height = '100%'
  progressFill.style.background = UI_THEME.boot.progressFill
  progressFill.style.transition = 'width 0.18s ease'
  progressTrack.appendChild(progressFill)

  const detail = document.createElement('div')
  detail.textContent = 'Preparing Section 1'
  detail.style.minHeight = '18px'
  detail.style.fontFamily = '"Plus Jakarta Sans", sans-serif'
  detail.style.fontSize = '11px'
  detail.style.fontWeight = '400'
  detail.style.letterSpacing = '0.12em'
  detail.style.textTransform = 'uppercase'
  detail.style.color = UI_THEME.boot.detailColor

  const storyLayer = document.createElement('div')
  storyLayer.style.position = 'absolute'
  storyLayer.style.inset = '0'
  storyLayer.style.display = 'flex'
  storyLayer.style.alignItems = 'center'
  storyLayer.style.justifyContent = 'center'
  storyLayer.style.padding = 'clamp(24px, 6vw, 80px)'
  storyLayer.style.opacity = '0'
  storyLayer.style.pointerEvents = 'none'
  storyLayer.style.transition = 'opacity 0.6s ease'

  const storyInner = document.createElement('div')
  storyInner.style.width = 'min(86vw, 940px)'
  storyInner.style.display = 'flex'
  storyInner.style.flexDirection = 'column'
  storyInner.style.alignItems = 'stretch'
  storyInner.style.gap = 'clamp(20px, 4vw, 32px)'

  const storyText = document.createElement('div')
  storyText.style.display = 'flex'
  storyText.style.flexDirection = 'column'
  storyText.style.gap = 'clamp(18px, 3vw, 28px)'

  const actionRow = document.createElement('div')
  actionRow.style.display = 'flex'
  actionRow.style.justifyContent = 'flex-end'

  const nextButton = document.createElement('button')
  nextButton.type = 'button'
  nextButton.textContent = 'NEXT'
  IT_STYLE.applyToElement(nextButton, 'button')
  nextButton.style.width = 'fit-content'
  nextButton.style.minWidth = '0'
  nextButton.style.padding = '10px 18px'
  nextButton.style.opacity = '0'
  nextButton.style.pointerEvents = 'none'
  nextButton.style.transition = 'opacity 0.2s ease, transform 0.3s ease, box-shadow 0.3s ease'
  nextButton.disabled = true

  actionRow.appendChild(nextButton)
  storyInner.appendChild(storyText)
  storyInner.appendChild(actionRow)
  storyLayer.appendChild(storyInner)

  shell.appendChild(brand)
  shell.appendChild(studio)
  shell.appendChild(status)
  shell.appendChild(progressTrack)
  shell.appendChild(detail)
  overlay.appendChild(shell)
  overlay.appendChild(storyLayer)
  document.body.appendChild(overlay)

  const hideNextButton = () => {
    nextButton.disabled = true
    nextButton.style.opacity = '0'
    nextButton.style.pointerEvents = 'none'
    clearUiHoverSound(nextButton)
  }

  const resolveAdvance = () => {
    if (typeof advanceResolver !== 'function') return
    const resolve = advanceResolver
    advanceResolver = null
    hideNextButton()
    resolve()
  }

  nextButton.onclick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    resolveAdvance()
  }

  const cleanupIntroInput = () => {
    if (introKeydownHandler) {
      window.removeEventListener('keydown', introKeydownHandler, true)
      introKeydownHandler = null
    }
    if (typeof advanceResolver === 'function') {
      const resolve = advanceResolver
      advanceResolver = null
      resolve()
    }
  }

  const waitForAdvance = () => new Promise((resolve) => {
    advanceResolver = resolve
    nextButton.disabled = false
    nextButton.style.opacity = '1'
    nextButton.style.pointerEvents = 'auto'
    window.requestAnimationFrame(() => {
      syncUiHoverSound(nextButton)
    })
  })

  introKeydownHandler = (event) => {
    if (storyLayer.style.pointerEvents !== 'auto') return
    if (!['Enter', 'NumpadEnter', 'ArrowUp', 'ArrowDown'].includes(event.code)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      resolveAdvance()
    }
  }

  const createStoryParagraph = () => {
    const paragraph = document.createElement('p')
    paragraph.style.margin = '0'
    paragraph.style.color = IT_STYLE.colors.neonGreen
    paragraph.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    paragraph.style.fontWeight = 'normal'
    paragraph.style.fontSize = 'clamp(17px, 2vw, 25px)'
    paragraph.style.lineHeight = '1.8'
    paragraph.style.letterSpacing = '0.5px'
    paragraph.style.textShadow = 'none'
    paragraph.style.whiteSpace = 'pre-wrap'
    return paragraph
  }

  const createCaret = () => {
    const caret = document.createElement('span')
    caret.setAttribute('aria-hidden', 'true')
    caret.style.display = 'inline-block'
    caret.style.width = '0.72em'
    caret.style.height = '1.05em'
    caret.style.marginLeft = '0.16em'
    caret.style.background = IT_STYLE.colors.neonGreen
    caret.style.verticalAlign = 'text-bottom'
    caret.style.animation = 'bootIntroCaretBlink 1s steps(1, end) infinite'
    return caret
  }

  const typeStoryLine = async (paragraph, text) => {
    const textNode = document.createElement('span')
    const caret = createCaret()
    paragraph.appendChild(textNode)
    paragraph.appendChild(caret)

    for (const character of text) {
      if (disposed) break
      textNode.textContent += character
      playTypingSound(character)
      const delayMs = /[.!?]/.test(character) ? 54 : character === ',' ? 38 : character === ' ' ? 16 : 22
      await wait(delayMs)
    }

    return caret
  }

  return {
    update(progress, label) {
      if (disposed) return
      const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
      progressFill.style.width = `${Math.round(clamped * 100)}%`
      if (label) {
        detail.textContent = String(label).replace(/[_-]+/g, ' ')
      }
    },
    async playLobbyIntro() {
      if (disposed) return

      shell.style.transition = 'opacity 3s ease'
      shell.style.opacity = '0'
      await wait(3000)
      if (disposed) return

      shell.remove()
      storyLayer.style.pointerEvents = 'auto'
      storyLayer.style.opacity = '1'
      window.addEventListener('keydown', introKeydownHandler, true)

      for (const line of LOBBY_INTRO_LINES) {
        if (disposed) return

        const paragraph = createStoryParagraph()
        storyText.appendChild(paragraph)

        const caret = await typeStoryLine(paragraph, line)
        if (disposed) return

        await waitForAdvance()
        if (caret && caret.parentNode) {
          caret.remove()
        }
      }

      storyLayer.style.pointerEvents = 'none'
      storyLayer.style.opacity = '0'
      await wait(800)
      if (disposed) return

      storyLayer.remove()
      cleanupIntroInput()

      await wait(3000)
      if (disposed) return

      overlay.style.transition = 'opacity 3s ease'
      overlay.style.opacity = '0'
      await wait(3000)
      if (disposed) return

      this.close()
    },
    fadeOut() {
      return new Promise((resolve) => {
        overlay.style.opacity = '0'
        window.setTimeout(() => {
          this.close()
          resolve()
        }, 920)
      })
    },
    close() {
      if (disposed) return
      disposed = true
      cleanupIntroInput()
      nextButton.onclick = null
      if (introStyle.parentNode) {
        introStyle.remove()
      }
      overlay.remove()
    }
  }
}

function startHomePageBackgroundScene() {
  const menuScene = new THREE.Scene()
  const section1Root = new THREE.Group()
  const menuCamera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 220)
  const qualityProfile = getGraphicsQualityProfile('high')
  const allowMenuShadows = true
  const menuFrameIntervalMs = Math.max(0, qualityProfile.menuFrameIntervalMs || 0)
  const orbitTarget = new THREE.Vector3(0, 4.1, 0)
  const orbitPosition = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  const orbitOffset = new THREE.Vector3(0, 0, 0)
  let animationId = 0
  let disposed = false
  let lightingController = null
  let lastMenuRenderNow = -Infinity

  rendererQualityOverride = qualityProfile
  applyRendererQualityPreset(settingsManager.getAll())
  rendererShadowOverride = allowMenuShadows
  rendererMenuBlurPx = qualityProfile.menuBlurPx ?? 2.6
  syncRendererPresentation()
  setRendererClearColor(0x090c11, 1)

  createSection1(section1Root, {
    fog: {
      color: '#211b17',
      near: 18,
      far: 145,
    },
    shadows: {
      enabled: allowMenuShadows,
      mapSize: Math.min(qualityProfile.shadowMapSize, 1024),
      cameraSize: 18,
    },
    ambientLight: {
      color: '#ffe1b3',
      intensity: 0.56,
    },
    directionalLight: {
      intensity: 0.18,
      position: [14, 26, 8],
      castShadow: false,
    },
  })

  if (typeof section1Root.userData?.applyLighting === 'function') {
    lightingController = section1Root.userData.applyLighting(menuScene, renderer)
  }

  menuScene.add(section1Root)

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    menuCamera.aspect = window.innerWidth / window.innerHeight
    menuCamera.updateProjectionMatrix()
  }

  function animateMenuBackground(now = 0) {
    if (disposed) return

    animationId = window.requestAnimationFrame(animateMenuBackground)

     if (menuFrameIntervalMs > 0 && now - lastMenuRenderNow < menuFrameIntervalMs) {
      return
    }
    lastMenuRenderNow = now

    const orbitAngle = now * 0.00022
    const radiusX = 18.2 + Math.sin(now * 0.00027) * 0.6
    const radiusZ = 13.4 + Math.cos(now * 0.00021) * 0.45

    orbitOffset.set(
      Math.cos(orbitAngle) * radiusX,
      3.8 + Math.sin(now * 0.00034) * 0.22,
      Math.sin(orbitAngle) * radiusZ
    )
    orbitPosition.copy(orbitTarget).add(orbitOffset)
    lookTarget.set(
      orbitTarget.x + Math.cos(now * 0.00012) * 1.4,
      orbitTarget.y + 0.06 + Math.sin(now * 0.00028) * 0.14,
      orbitTarget.z + Math.sin(now * 0.00016) * 1.05
    )

    menuCamera.position.copy(orbitPosition)
    menuCamera.lookAt(lookTarget)
    renderer.render(menuScene, menuCamera)
  }

  window.addEventListener('resize', onResize)
  onResize()
  animateMenuBackground(0)

  return () => {
    if (disposed) return
    disposed = true

    window.cancelAnimationFrame(animationId)
    window.removeEventListener('resize', onResize)

    rendererMenuBlurPx = 0
    rendererQualityOverride = null
    applyRendererQualityPreset(settingsManager.getAll())
    rendererShadowOverride = null
    syncRendererPresentation()

    if (lightingController && typeof lightingController.toggleShadows === 'function') {
      lightingController.toggleShadows(false)
    }

    if (section1Root.parent) {
      section1Root.parent.remove(section1Root)
    }

    menuScene.fog = null
  }
}

initUISoundEffects()

void bootIntoHomePage()

async function bootIntoHomePage() {
  const bootLoadingScreen = createBootLoadingScreen()

  try {
    rendererMenuBlurPx = 0
    rendererShadowOverride = null
    syncRendererPresentation()
    setRendererClearColor(0x000000, 1)
    clearRendererFrame()

    bootLoadingScreen.update(0, 'Preparing Section 1')
    await preloadCoreAssets((progress, label) => bootLoadingScreen.update(progress, label))
  } catch (error) {
    console.error('Failed to preload homepage assets:', error)
  } finally {
    try {
      showHomePage({ fadeIn: true, deferMenuReveal: true })
      await bootLoadingScreen.playLobbyIntro()
      currentHomePageMenuReveal?.()
    } finally {
      bootLoadingScreen.close()
    }
  }
}

// ==================== MAIN MENU ====================
function showHomePage(options = {}) {
  const { fadeIn = false, deferMenuReveal = false } = options
  clearEntireUI();
  void musicPlayer.requestLobby({ immediate: false, delayMs: 12_000 })


  currentHomePageCleanup = startHomePageBackgroundScene()

  const menuOverlay = document.createElement('div');
  menuOverlay.id = 'mainMenuOverlay';
  menuOverlay.style.position = 'fixed';
  menuOverlay.style.top = '0';
  menuOverlay.style.left = '0';
  menuOverlay.style.width = '100vw';
  menuOverlay.style.height = '100vh';
  menuOverlay.style.display = 'flex';
  menuOverlay.style.flexDirection = 'column';
  menuOverlay.style.justifyContent = 'center';
  menuOverlay.style.alignItems = 'center';
  menuOverlay.style.zIndex = '20003';
  menuOverlay.style.background = UI_THEME.menu.overlayGradient;
  menuOverlay.style.pointerEvents = (!fadeIn || !deferMenuReveal) ? 'auto' : 'none';
  menuOverlay.style.transition = 'opacity 1s';
  menuOverlay.style.opacity = fadeIn ? '0' : '1';

  const menuBox = document.createElement('div');
  menuBox.style.background = IT_STYLE.colors.darkBg;
  menuBox.style.border = `2px solid ${IT_STYLE.colors.borderBlue}`;
  menuBox.style.borderRadius = '0';
  menuBox.style.width = '280px';
  menuBox.style.maxWidth = '92vw';
  menuBox.style.boxShadow = UI_THEME.play.panelShadow;
  menuBox.style.overflow = 'hidden';
  menuBox.style.display = 'flex';
  menuBox.style.flexDirection = 'column';
  menuBox.style.alignItems = 'stretch';
  menuBox.style.pointerEvents = (!fadeIn || !deferMenuReveal) ? 'auto' : 'none';

  const titleBar = document.createElement('div');
  titleBar.style.background = IT_STYLE.colors.accentBlue;
  titleBar.style.position = 'relative';
  titleBar.style.display = 'flex';
  titleBar.style.alignItems = 'stretch';
  titleBar.style.minHeight = UI_THEME.windowChrome.titleBarHeight;
  titleBar.style.borderBottom = `2px solid ${IT_STYLE.colors.borderBlue}`;

  const titleLabel = document.createElement('div');
  titleLabel.textContent = 'BRAWLARDS';
  titleLabel.style.color = UI_THEME.common.white;
  titleLabel.style.display = 'flex';
  titleLabel.style.alignItems = 'center';
  titleLabel.style.justifyContent = 'center';
  titleLabel.style.minHeight = UI_THEME.windowChrome.titleBarHeight;
  titleLabel.style.padding = `0 ${UI_THEME.windowChrome.titleRightPadding} 0 ${UI_THEME.windowChrome.titleLeftPadding}`;
  titleLabel.style.fontWeight = 'bold';
  titleLabel.style.fontSize = UI_THEME.windowChrome.titleFontSize;
  titleLabel.style.letterSpacing = '1px';
  titleLabel.style.textTransform = 'uppercase';
  titleLabel.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
  titleLabel.style.textAlign = 'center';
  titleLabel.style.textShadow = UI_THEME.terminal.textShadow;
  titleBar.appendChild(titleLabel);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'X';
  closeButton.setAttribute('aria-label', 'Exit game');
  closeButton.style.position = 'absolute';
  closeButton.style.top = '0';
  closeButton.style.right = '0';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';
  closeButton.style.width = UI_THEME.windowChrome.closeWidth;
  closeButton.style.minWidth = UI_THEME.windowChrome.closeWidth;
  closeButton.style.height = '100%';
  closeButton.style.border = 'none';
  closeButton.style.borderLeft = `2px solid ${UI_THEME.windowChrome.closeBorder}`;
  closeButton.style.background = UI_THEME.windowChrome.closeBackground;
  closeButton.style.color = UI_THEME.windowChrome.closeText;
  closeButton.style.boxShadow = UI_THEME.windowChrome.closeShadow;
  closeButton.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
  closeButton.style.fontSize = UI_THEME.windowChrome.closeFontSize;
  closeButton.style.fontWeight = 'bold';
  closeButton.style.lineHeight = '1';
  closeButton.style.cursor = 'pointer';
  closeButton.style.textShadow = UI_THEME.terminal.textShadow;
  closeButton.style.transition = 'box-shadow 0.2s ease, filter 0.2s ease';
  closeButton.onmouseover = () => {
    closeButton.style.boxShadow = UI_THEME.windowChrome.closeHoverShadow;
    closeButton.style.filter = `brightness(${UI_THEME.windowChrome.closeHoverBrightness})`;
  };
  closeButton.onmouseout = () => {
    closeButton.style.boxShadow = UI_THEME.windowChrome.closeShadow;
    closeButton.style.filter = 'none';
  };
  closeButton.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestApplicationExit();
  };
  titleBar.appendChild(closeButton);

  const menuListArea = document.createElement('div');
  menuListArea.style.display = 'flex';
  menuListArea.style.flexDirection = 'column';
  menuListArea.style.gap = '0';
  menuListArea.style.background = UI_THEME.common.transparent;
  menuListArea.style.padding = '0';

  const menuItems = [
    { label: 'PLAY', action: (afterFade) => navigateToPlay(afterFade) },
    { label: 'DEBUG', action: (afterFade) => navigateToSimulation(afterFade) },
    { label: 'INSPECT', action: (afterFade) => navigateToInspector(afterFade) },
    { label: 'SETTINGS', action: (afterFade) => navigateToSettings(afterFade) },
  ];

  const createMenuItem = (label, action, index) => {
    const item = document.createElement('div');
    item.textContent = label;
    item.style.padding = '14px 20px';
    item.style.textAlign = 'left';
    item.style.fontSize = '14px';
    item.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
    item.style.fontWeight = 'normal';
    item.style.cursor = 'pointer';
    item.style.userSelect = 'none';
    item.style.borderBottom = index < menuItems.length - 1 ? `1px solid ${IT_STYLE.colors.borderBlue}` : 'none';
    item.style.transition = 'all 0.2s ease';
    item.style.backgroundColor = UI_THEME.common.transparent;
    item.style.color = IT_STYLE.colors.neonGreen;
    item.style.letterSpacing = '0.5px';
    
    item.onmouseenter = () => {
      item.style.backgroundColor = UI_THEME.menu.itemHoverBackground;
      item.style.paddingLeft = '28px';
      item.style.color = UI_THEME.menu.itemHoverText;
      item.style.textShadow = UI_THEME.menu.itemHoverTextShadow;
    };
    
    item.onmouseleave = () => {
      item.style.backgroundColor = UI_THEME.common.transparent;
      item.style.paddingLeft = '20px';
      item.style.color = IT_STYLE.colors.neonGreen;
      item.style.textShadow = 'none';
    };
    
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof action === 'function') {
        action(() => {
          if (menuOverlay && menuOverlay.parentNode) {
            menuOverlay.style.opacity = '0';
            setTimeout(() => {
              menuOverlay.remove();
            }, 1000);
          }
        });
      }
    };
    return item;
  };
  
  menuItems.forEach((item, idx) => {
    const menuItem = createMenuItem(item.label, item.action, idx);
    menuListArea.appendChild(menuItem);
  });

  let currentIndex = 0;
  let menuInteractive = !fadeIn || !deferMenuReveal;
  const menuItemElements = menuListArea.children;

  const revealMenu = () => {
    if (!menuOverlay.parentNode) return
    menuInteractive = true
    menuOverlay.style.pointerEvents = 'auto'
    menuBox.style.pointerEvents = 'auto'
    currentHomePageMenuReveal = null
    window.requestAnimationFrame(() => {
      if (menuOverlay.parentNode) {
        menuOverlay.style.opacity = '1'
      }
    })
  }
  
  const updateSelection = () => {
    Array.from(menuItemElements).forEach((item, idx) => {
      if (idx === currentIndex) {
        item.style.backgroundColor = IT_STYLE.colors.accentBlue;
        item.style.color = UI_THEME.menu.itemSelectedText;
        item.style.fontWeight = 'bold';
        item.style.paddingLeft = '28px';
        item.style.boxShadow = UI_THEME.terminal.selectedInsetShadow;
      } else {
        item.style.backgroundColor = UI_THEME.common.transparent;
        item.style.color = IT_STYLE.colors.neonGreen;
        item.style.fontWeight = 'normal';
        item.style.paddingLeft = '20px';
        item.style.boxShadow = 'none';
      }
    });
    if (menuItemElements[currentIndex]) {
      menuItemElements[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };
  
  const handleKeyDown = (e) => {
    if (!menuInteractive) return
    if (e.code === 'ArrowDown') {
      currentIndex = (currentIndex + 1) % menuItems.length;
      updateSelection();
      e.preventDefault();
    } else if (e.code === 'ArrowUp') {
      currentIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
      updateSelection();
      e.preventDefault();
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const selectedItem = menuItems[currentIndex];
      if (selectedItem && typeof selectedItem.action === 'function') {
        selectedItem.action(() => {
          if (menuOverlay && menuOverlay.parentNode) {
            menuOverlay.style.opacity = '0';
            setTimeout(() => {
              menuOverlay.remove();
            }, 1000);
          }
        });
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach((node) => {
          if (node === menuOverlay || node.contains?.(menuOverlay)) {
            window.removeEventListener('keydown', handleKeyDown);
            observer.disconnect();
          }
        });
      }
    });
  });
  observer.observe(document.body, { childList: true });
  
  menuOverlay.onclick = (e) => {
    if (e.target === menuOverlay) {
      e.preventDefault();
    }
  };
  
  menuBox.appendChild(titleBar);
  menuBox.appendChild(menuListArea);
  menuOverlay.appendChild(menuBox);
  document.body.appendChild(menuOverlay);

  if (fadeIn) {
    if (deferMenuReveal) {
      currentHomePageMenuReveal = revealMenu
    } else {
      revealMenu()
    }
  }

  const cleanupHomePage = currentHomePageCleanup
  currentHomePageCleanup = () => {
    currentHomePageMenuReveal = null
    window.removeEventListener('keydown', handleKeyDown)
    observer.disconnect()
    if (typeof cleanupHomePage === 'function') {
      cleanupHomePage()
    }
  }
  
  updateSelection();
}

// ==================== NAVIGATION ====================
async function navigateToSimulation() {
  clearEntireUI()

  try {
    void musicPlayer.requestSilence({ fadeOutSec: 1.1 })
    currentCleanup = await runWithLoadingOverlay(
      async (updateProgress) => {
        await preloadCoreAssets(updateProgress)
        return startSimulationTest(renderer, () => {
          showHomePage()
        }, false)
      },
      { title: 'Loading Simulation', minimumVisibleMs: 260 }
    )
  } catch (error) {
    console.error('Failed to preload simulation assets:', error)
    showHomePage()
  }
}

function waitForNavigationLoadingFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
}

async function returnToHomePageWithLoading() {
  try {
    await runWithLoadingOverlay(
      async () => {
        clearEntireUI()
        await waitForNavigationLoadingFrame()
        showHomePage()
      },
      { title: 'Loading Menu', minimumVisibleMs: 220 }
    )
  } catch (error) {
    console.error('Failed to return to home page:', error)
    clearEntireUI()
    showHomePage()
  }
}

async function navigateToPlay() {
  clearHomePageOverlay()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async () => {
        await waitForNavigationLoadingFrame()
        return startPlay(renderer, () => {
          currentCleanup = null
          void returnToHomePageWithLoading()
        }, {
          preserveMenuBackground: true,
          onStartGameplay: cleanupMenuBackgroundForSceneTransition,
        })
      },
      { title: 'Loading Play', minimumVisibleMs: 260 }
    )
  } catch (error) {
    console.error('Failed to open play screen:', error)
    showHomePage()
  }
}

async function navigateToSettings() {
  clearHomePageOverlay()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async () => {
        await waitForNavigationLoadingFrame()
        let cleanupSettings = null
        cleanupSettings = createSettingsScreen(() => {
          if (currentCleanup === cleanupSettings) {
            currentCleanup = null
          }
          void returnToHomePageWithLoading()
        })
        return cleanupSettings
      },
      { title: 'Loading Settings', minimumVisibleMs: 220 }
    )
  } catch (error) {
    console.error('Failed to open settings screen:', error)
    showHomePage()
  }
}

async function navigateToInspector() {
  clearHomePageOverlay()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async (updateProgress) => {
        await preloadCoreAssets(updateProgress)
        return createInspector(() => {
          void returnToHomePageWithLoading()
        })
      },
      { title: 'Loading Inspector', minimumVisibleMs: 260 }
    )
  } catch (error) {
    console.error('Failed to preload inspector assets:', error)
    showHomePage()
  }
}

// ==================== CLEANUP ====================
function clearEntireUI() {
  // Always cleanup previous screen if any
  if (typeof currentCleanup === "function") {
    currentCleanup();
    currentCleanup = null;
  }

  cleanupHomePageState()
  setRendererClearColor(0x000000, 1)
  clearRendererFrame()

  clearHomePageOverlay()

  const playBg = document.getElementById("playBackground")
  if (playBg) playBg.remove()

  const playContainer = document.getElementById("playContainer")
  if (playContainer) playContainer.remove()

  const extraUI = document.querySelectorAll(".page-ui")
  extraUI.forEach(el => el.remove())
}