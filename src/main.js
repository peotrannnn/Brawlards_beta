import * as THREE from "three"
import { startSimulationTest } from "./core/SimulationTest.js"
import { createInspector } from "./core/Inspector.js"
import { startPlay } from "./core/Play.js"
import { MusicPlayer } from "./music/MusicPlayer.js"
import { preloadCoreAssets } from "./assets/preloadAssets.js"
import { runWithLoadingOverlay } from "./utils/loadingOverlay.js"
import { settingsManager } from "./core/SettingsManager.js"
import { createSettingsScreen } from "./ui/SettingsMenuScreen.js"
import { initFPSCounter } from "./ui/FPSCounter.js"

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

// Apply initial settings
renderer.shadowMap.enabled = settingsManager.get('shadows')
const initialQuality = settingsManager.get('quality')
renderer.setPixelRatio(initialQuality === 'high' ? window.devicePixelRatio : initialQuality === 'medium' ? 1 : 0.75)

// Listen to settings changes
settingsManager.onChange((settings) => {
  renderer.shadowMap.enabled = settings.shadows
  const pR = settings.quality === 'high' ? window.devicePixelRatio : settings.quality === 'medium' ? 1 : 0.75
  renderer.setPixelRatio(pR)
  // We can't easily force all materials to update shadow maps without traversing the scene,
  // but it will apply on the next play or scene load.
})

document.body.style.margin = "0"
document.body.style.overflow = "hidden"
document.body.appendChild(renderer.domElement)

let currentCleanup = null

const musicPlayer = new MusicPlayer()

// Initialize FPS Counter
initFPSCounter()

document.addEventListener('click', async () => {
  if (!musicPlayer.isPlaying) {
    await musicPlayer.start()
  }
}, { once: true })

showHomePage()

// ==================== MAIN MENU ====================
function showHomePage() {
  clearEntireUI();


  // Clear renderer and set transparent so menu background image is visible
  renderer.setClearColor(0x000000, 0);
  renderer.clear();

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
  menuOverlay.style.background = `url('${import.meta.env.BASE_URL}pictures/jd_thick.png') center center / cover no-repeat`;
  menuOverlay.style.pointerEvents = 'auto';
  menuOverlay.style.transition = 'opacity 1s';

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

  // --- PATCH: Ensure music always starts on any menu action ---
  function ensureMusicPlaying() {
    if (musicPlayer && !musicPlayer.isPlaying) {
      musicPlayer.start();
    }
  }

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
      ensureMusicPlaying();
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
      ensureMusicPlaying();
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
  
  updateSelection();
}

// ==================== NAVIGATION ====================
async function navigateToSimulation() {
  try {
    await runWithLoadingOverlay(
      (updateProgress) => preloadCoreAssets(updateProgress),
      { title: 'Loading Simulation' }
    )

    clearEntireUI()
    currentCleanup = startSimulationTest(renderer, () => {
      showHomePage()
    }, false)
  } catch (error) {
    console.error('Failed to preload simulation assets:', error)
  }
}

function navigateToPlay() {
  clearEntireUI()
  currentCleanup = startPlay(renderer, () => {
    showHomePage()
  })
}

function navigateToSettings() {
  clearEntireUI()
  currentCleanup = createSettingsScreen(() => {
    showHomePage()
  })
}

async function navigateToInspector() {
  try {
    await runWithLoadingOverlay(
      (updateProgress) => preloadCoreAssets(updateProgress),
      { title: 'Loading Inspector' }
    )

    clearEntireUI()
    currentCleanup = createInspector(renderer, () => {
      clearEntireUI(); // cleanup inspector UI and logic
      showHomePage();
    });
  } catch (error) {
    console.error('Failed to preload inspector assets:', error)
  }
}

// ==================== CLEANUP ====================
function clearEntireUI() {
  // Always cleanup previous screen if any
  if (typeof currentCleanup === "function") {
    currentCleanup();
    currentCleanup = null;
  }

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