// main.js

import * as THREE from "three"
import { startSimulationTest } from "./core/SimulationTest.js"
import { createInspector } from "./core/Inspector.js"
import { startPlay } from "./core/Play.js"
import { MusicPlayer } from "./music/MusicPlayer.js"
import { preloadCoreAssets } from "./assets/preloadAssets.js"
import { runWithLoadingOverlay } from "./utils/loadingOverlay.js"

// ==================== IT-STYLE UI THEME ====================
// Unified tech/hacker aesthetic for all UI elements
export const IT_STYLE = {
  colors: {
    darkBg: '#0a1a3d',      // Dark blue background
    accentBlue: '#0066FF',   // Bright blue accent
    neonGreen: '#00FF00',    // Neon green text
    darkAccent: '#001a4d',   // Darker blue
    borderBlue: '#004399'    // Border color
  },
  
  // Apply IT style to any element
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
      // Hover effect
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
      // Hover effect
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

document.body.style.margin = "0"
document.body.style.overflow = "hidden"
document.body.appendChild(renderer.domElement)

let currentCleanup = null

// Music player setup
const musicPlayer = new MusicPlayer()

// Start playing music on first interaction
document.addEventListener('click', async () => {
  if (!musicPlayer.isPlaying) {
    await musicPlayer.start()
  }
}, { once: true })

showHomePage()

function showHomePage() {
  clearEntireUI()

  const page = document.createElement("div")
  page.id = "homePage"
  page.style.position = "absolute"
  page.style.top = "0"
  page.style.left = "0"
  page.style.width = "100%"
  page.style.height = "100%"
  page.style.display = "flex"
  page.style.flexDirection = "column"
  page.style.justifyContent = "center"
  page.style.alignItems = "center"
  page.style.gap = "20px"
  page.style.background = "#111"

  const title = document.createElement("h1")
  title.innerText = "MAIN MENU"
  title.style.color = "white"
  title.style.fontSize = "42px"
  title.style.marginBottom = "30px"
  title.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
  title.style.textShadow = `0 0 20px ${IT_STYLE.colors.accentBlue}`

  // Main buttons container for equal sizing
  const buttonContainer = document.createElement("div")
  buttonContainer.style.display = "flex"
  buttonContainer.style.flexDirection = "column"
  buttonContainer.style.gap = "15px"
  buttonContainer.style.width = "220px"

  const simBtn = document.createElement("button")
  simBtn.innerText = "Simulation"
  simBtn.style.width = "220px"
  simBtn.style.height = "50px"
  IT_STYLE.applyToElement(simBtn, 'button')

  const playBtn = document.createElement("button")
  playBtn.innerText = "Play"
  playBtn.style.width = "220px"
  playBtn.style.height = "50px"
  IT_STYLE.applyToElement(playBtn, 'button')

  const inspectorBtn = document.createElement("button")
  inspectorBtn.innerText = "Inspector"
  inspectorBtn.style.width = "220px"
  inspectorBtn.style.height = "50px"
  IT_STYLE.applyToElement(inspectorBtn, 'button')

  simBtn.onclick = () => {
    navigateToSimulation()
  }

  playBtn.onclick = () => {
    navigateToPlay()
  }

  inspectorBtn.onclick = () => {
    navigateToInspector()
  }

  buttonContainer.appendChild(playBtn)
  buttonContainer.appendChild(simBtn)
  buttonContainer.appendChild(inspectorBtn)

  page.appendChild(title)
  page.appendChild(buttonContainer)

  document.body.appendChild(page)
}

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

async function navigateToInspector() {
  try {
    await runWithLoadingOverlay(
      (updateProgress) => preloadCoreAssets(updateProgress),
      { title: 'Loading Inspector' }
    )

    clearEntireUI()
    currentCleanup = createInspector(renderer, () => {
      showHomePage()
    })
  } catch (error) {
    console.error('Failed to preload inspector assets:', error)
  }
}

function clearEntireUI() {
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