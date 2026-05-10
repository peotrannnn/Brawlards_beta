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
import { initFPSCounter } from "./ui/FPSCounter.js"
import { initUISoundEffects } from "./ui/uiSoundEffects.js"

const EPSILON_STUDIO_FONT_PRECONNECT_ID = 'epsilon-studio-font-preconnect'
const EPSILON_STUDIO_FONT_PRECONNECT_CROSS_ID = 'epsilon-studio-font-preconnect-cross'
const EPSILON_STUDIO_FONT_LINK_ID = 'epsilon-studio-font-link'
const EPSILON_STUDIO_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'

// ==================== IT-STYLE UI THEME ====================
export const IT_STYLE = {
  colors: {
    darkBg: '#0a1a3d',
    accentBlue: '#0066FF',
    neonGreen: '#00FF00',
    darkAccent: '#001a4d',
    borderBlue: '#004399'
  },
  
  applyToElement: (element, type = 'box') => {
    if (type === 'box') {
      element.style.cssText = `
        background: ${IT_STYLE.colors.darkBg};
        border: 2px solid ${IT_STYLE.colors.accentBlue};
        border-radius: 0;
        color: ${IT_STYLE.colors.neonGreen};
        padding: 12px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
        box-shadow: 0 0 20px rgba(0, 102, 255, 0.6), inset 0 0 10px rgba(0, 102, 255, 0.3);
      `
    } else if (type === 'button') {
      element.style.cssText = `
        background: ${IT_STYLE.colors.accentBlue};
        color: #000;
        border: 2px solid ${IT_STYLE.colors.borderBlue};
        border-radius: 0;
        padding: 12px 24px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-weight: bold;
        font-size: 12px;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 0 15px rgba(0, 102, 255, 0.5), inset 0 0 8px rgba(0, 255, 0, 0.2);
        transition: all 0.3s ease;
      `
      element.onmouseover = () => {
        element.style.boxShadow = `0 0 25px rgba(0, 102, 255, 0.8), inset 0 0 12px rgba(0, 255, 0, 0.4)`
        element.style.transform = 'scale(1.05)'
      }
      element.onmouseout = () => {
        element.style.boxShadow = `0 0 15px rgba(0, 102, 255, 0.5), inset 0 0 8px rgba(0, 255, 0, 0.2)`
        element.style.transform = 'scale(1)'
      }
    } else if (type === 'header') {
      element.style.cssText = `
        background: ${IT_STYLE.colors.accentBlue};
        color: #000;
        padding: 6px 12px;
        font-weight: bold;
        border-bottom: 2px solid ${IT_STYLE.colors.borderBlue};
        font-size: 11px;
        letter-spacing: 1px;
        text-transform: uppercase;
      `
    } else if (type === 'backButton') {
      element.style.cssText = `
        background: #8b0000;
        color: #fff;
        border: 2px solid #5a0000;
        border-radius: 0;
        padding: 8px 16px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-weight: bold;
        font-size: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(255, 0, 0, 0.4), inset 0 0 6px rgba(255, 0, 0, 0.2);
        transition: all 0.3s ease;
      `
      element.onmouseover = () => {
        element.style.boxShadow = `0 0 20px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 0, 0, 0.3)`
        element.style.transform = 'scale(1.05)'
      }
      element.onmouseout = () => {
        element.style.boxShadow = `0 0 12px rgba(255, 0, 0, 0.4), inset 0 0 6px rgba(255, 0, 0, 0.2)`
        element.style.transform = 'scale(1)'
      }
    }
  }
}


const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap // Use PCFShadowMap to avoid deprecation warning

let rendererMenuBlurPx = 0
let rendererShadowOverride = null
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

function applyRendererQualityPreset(settings = settingsManager.getAll()) {
  const qualityProfile = getGraphicsQualityProfile(settings?.quality)
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

function cleanupHomePageState() {
  if (typeof currentHomePageCleanup === 'function') {
    currentHomePageCleanup()
    currentHomePageCleanup = null
  }
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

  const overlay = document.createElement('div')
  overlay.id = 'bootLoadingOverlay'
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '40000'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.background = '#000'
  overlay.style.opacity = '1'
  overlay.style.transition = 'opacity 0.9s ease'
  overlay.style.pointerEvents = 'auto'

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
  brand.style.background = 'linear-gradient(90deg, #E85E97 0%, #F6A623 100%)'
  brand.style.backgroundClip = 'text'
  brand.style.webkitBackgroundClip = 'text'
  brand.style.color = 'transparent'
  brand.style.webkitTextFillColor = 'transparent'
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
  studio.style.color = '#3A7FF2'
  studio.style.textShadow = 'none'

  const status = document.createElement('div')
  status.textContent = 'Loading scene assets'
  status.style.marginTop = '18px'
  status.style.fontFamily = '"Plus Jakarta Sans", sans-serif'
  status.style.fontSize = '12px'
  status.style.fontWeight = '500'
  status.style.letterSpacing = '0.2em'
  status.style.textTransform = 'uppercase'
  status.style.color = 'rgba(148, 163, 184, 0.92)'

  const progressTrack = document.createElement('div')
  progressTrack.style.width = 'min(340px, 62vw)'
  progressTrack.style.height = '2px'
  progressTrack.style.marginTop = '8px'
  progressTrack.style.background = 'rgba(255, 255, 255, 0.14)'
  progressTrack.style.overflow = 'hidden'

  const progressFill = document.createElement('div')
  progressFill.style.width = '0%'
  progressFill.style.height = '100%'
  progressFill.style.background = 'linear-gradient(90deg, #f8fafc, #94a3b8)'
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
  detail.style.color = 'rgba(100, 116, 139, 0.92)'

  shell.appendChild(brand)
  shell.appendChild(studio)
  shell.appendChild(status)
  shell.appendChild(progressTrack)
  shell.appendChild(detail)
  overlay.appendChild(shell)
  document.body.appendChild(overlay)

  return {
    update(progress, label) {
      const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
      progressFill.style.width = `${Math.round(clamped * 100)}%`
      if (label) {
        detail.textContent = String(label).replace(/[_-]+/g, ' ')
      }
    },
    fadeOut() {
      return new Promise((resolve) => {
        overlay.style.opacity = '0'
        window.setTimeout(() => {
          overlay.remove()
          resolve()
        }, 920)
      })
    },
    close() {
      overlay.remove()
    }
  }
}

function startHomePageBackgroundScene() {
  const menuScene = new THREE.Scene()
  const section1Root = new THREE.Group()
  const menuCamera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 220)
  const qualityProfile = getGraphicsQualityProfile(settingsManager.get('quality'))
  const allowMenuShadows = Boolean(settingsManager.get('shadows')) && qualityProfile.allowShadows
  const menuFrameIntervalMs = Math.max(0, qualityProfile.menuFrameIntervalMs || 0)
  const orbitTarget = new THREE.Vector3(0, 4.1, 0)
  const orbitPosition = new THREE.Vector3()
  const lookTarget = new THREE.Vector3()
  const orbitOffset = new THREE.Vector3(0, 0, 0)
  let animationId = 0
  let disposed = false
  let lightingController = null
  let lastMenuRenderNow = -Infinity

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

// Initialize FPS Counter
initFPSCounter()
initUISoundEffects()

void bootIntoHomePage()

async function bootIntoHomePage() {
  const bootLoadingScreen = createBootLoadingScreen()
  let homeShown = false

  try {
    rendererMenuBlurPx = 0
    rendererShadowOverride = null
    syncRendererPresentation()
    setRendererClearColor(0x000000, 1)
    clearRendererFrame()

    bootLoadingScreen.update(0, 'Preparing Section 1')
    await preloadCoreAssets((progress, label) => bootLoadingScreen.update(progress, label))

    showHomePage({ fadeIn: true })
    homeShown = true
  } catch (error) {
    console.error('Failed to preload homepage assets:', error)
    if (!homeShown) {
      showHomePage({ fadeIn: true })
    }
  } finally {
    await bootLoadingScreen.fadeOut()
  }
}

// ==================== MAIN MENU ====================
function showHomePage(options = {}) {
  const { fadeIn = false } = options
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
  menuOverlay.style.background = 'linear-gradient(180deg, rgba(7, 11, 17, 0.2), rgba(7, 11, 17, 0.42))';
  menuOverlay.style.pointerEvents = 'auto';
  menuOverlay.style.transition = 'opacity 1s';
  menuOverlay.style.opacity = fadeIn ? '0' : '1';

  const menuBox = document.createElement('div');
  menuBox.style.background = IT_STYLE.colors.darkBg;
  menuBox.style.border = `2px solid ${IT_STYLE.colors.accentBlue}`;
  menuBox.style.borderRadius = '0';
  menuBox.style.width = '280px';
  menuBox.style.maxWidth = '92vw';
  menuBox.style.boxShadow = '0 2px 16px #0008';
  menuBox.style.overflow = 'hidden';
  menuBox.style.display = 'flex';
  menuBox.style.flexDirection = 'column';
  menuBox.style.alignItems = 'stretch';
  menuBox.style.pointerEvents = 'auto';

  const titleBar = document.createElement('div');
  titleBar.textContent = 'BRAWLARDS';
  titleBar.style.background = IT_STYLE.colors.accentBlue;
  titleBar.style.color = '#000';
  titleBar.style.padding = '12px 20px';
  titleBar.style.fontWeight = 'bold';
  titleBar.style.borderBottom = `2px solid ${IT_STYLE.colors.borderBlue}`;
  titleBar.style.fontSize = '14px';
  titleBar.style.letterSpacing = '1px';
  titleBar.style.textTransform = 'uppercase';
  titleBar.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace";
  titleBar.style.textAlign = 'center';

  const menuListArea = document.createElement('div');
  menuListArea.style.display = 'flex';
  menuListArea.style.flexDirection = 'column';
  menuListArea.style.gap = '0';
  menuListArea.style.background = 'transparent';
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
    item.style.backgroundColor = 'transparent';
    item.style.color = IT_STYLE.colors.neonGreen;
    item.style.letterSpacing = '0.5px';
    
    item.onmouseenter = () => {
      item.style.backgroundColor = `rgba(0, 102, 255, 0.2)`;
      item.style.paddingLeft = '28px';
      item.style.color = '#fff';
      item.style.textShadow = `0 0 8px ${IT_STYLE.colors.accentBlue}`;
    };
    
    item.onmouseleave = () => {
      item.style.backgroundColor = 'transparent';
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
  const menuItemElements = menuListArea.children;
  
  const updateSelection = () => {
    Array.from(menuItemElements).forEach((item, idx) => {
      if (idx === currentIndex) {
        item.style.backgroundColor = IT_STYLE.colors.accentBlue;
        item.style.color = '#000';
        item.style.fontWeight = 'bold';
        item.style.paddingLeft = '28px';
        item.style.boxShadow = `inset 0 0 10px rgba(0,0,0,0.3)`;
      } else {
        item.style.backgroundColor = 'transparent';
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
    window.requestAnimationFrame(() => {
      menuOverlay.style.opacity = '1'
    })
  }

  const cleanupHomePage = currentHomePageCleanup
  currentHomePageCleanup = () => {
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

async function navigateToPlay() {
  clearEntireUI()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async () => {
        await waitForNavigationLoadingFrame()
        return startPlay(renderer, () => {
          showHomePage()
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
  clearEntireUI()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async () => {
        await waitForNavigationLoadingFrame()
        let cleanupSettings = null
        cleanupSettings = createSettingsScreen(() => {
          if (currentCleanup === cleanupSettings) {
            currentCleanup = null
          }
          showHomePage()
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
  clearEntireUI()

  try {
    currentCleanup = await runWithLoadingOverlay(
      async (updateProgress) => {
        await preloadCoreAssets(updateProgress)
        return createInspector(renderer, () => {
          clearEntireUI();
          showHomePage();
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

  const menuOverlay = document.getElementById("mainMenuOverlay")
  if (menuOverlay) menuOverlay.remove()
  
  const home = document.getElementById("homePage")
  if (home) home.remove()

  const playBg = document.getElementById("playBackground")
  if (playBg) playBg.remove()

  const playBackBtn = document.getElementById("playBackButton")
  if (playBackBtn) playBackBtn.remove()

  const inspectorBackBtn = document.getElementById("inspectorBackButton")
  if (inspectorBackBtn) inspectorBackBtn.remove()

  const playContainer = document.getElementById("playContainer")
  if (playContainer) playContainer.remove()

  const extraUI = document.querySelectorAll(".page-ui")
  extraUI.forEach(el => el.remove())
}