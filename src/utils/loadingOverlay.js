export function createLoadingOverlay(titleText) {
  const overlay = document.createElement('div')
  overlay.className = 'page-ui'
  overlay.style.position = 'fixed'
  overlay.style.top = '16px'
  overlay.style.right = '16px'
  overlay.style.width = '280px'
  overlay.style.padding = '10px 12px'
  overlay.style.background = 'rgba(10, 26, 61, 0.95)'
  overlay.style.border = '2px solid #0066FF'
  overlay.style.boxShadow = '0 0 14px rgba(0, 102, 255, 0.45)'
  overlay.style.color = '#d6e8ff'
  overlay.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
  overlay.style.fontSize = '12px'
  overlay.style.zIndex = '30000'

  const title = document.createElement('div')
  title.textContent = titleText
  title.style.fontWeight = 'bold'
  title.style.letterSpacing = '0.5px'
  title.style.marginBottom = '8px'

  const detail = document.createElement('div')
  detail.textContent = 'Preparing assets...'
  detail.style.color = '#9cc1ff'
  detail.style.marginBottom = '8px'
  detail.style.minHeight = '16px'

  const barTrack = document.createElement('div')
  barTrack.style.height = '8px'
  barTrack.style.background = 'rgba(255, 255, 255, 0.12)'
  barTrack.style.border = '1px solid #004399'

  const barFill = document.createElement('div')
  barFill.style.height = '100%'
  barFill.style.width = '0%'
  barFill.style.background = 'linear-gradient(90deg, #00FF00, #40b7ff)'
  barFill.style.transition = 'width 0.15s linear'
  barTrack.appendChild(barFill)

  const percent = document.createElement('div')
  percent.textContent = '0%'
  percent.style.marginTop = '8px'
  percent.style.textAlign = 'right'
  percent.style.color = '#00FF00'
  percent.style.fontWeight = 'bold'

  overlay.appendChild(title)
  overlay.appendChild(detail)
  overlay.appendChild(barTrack)
  overlay.appendChild(percent)

  document.body.appendChild(overlay)

  return {
    update(progress, label) {
      const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
      const pct = Math.round(clamped * 100)
      barFill.style.width = `${pct}%`
      percent.textContent = `${pct}%`
      if (label) detail.textContent = `Loading: ${label}`
    },
    close() {
      overlay.remove()
    }
  }
}

export async function runWithLoadingOverlay(task, options = {}) {
  const overlay = createLoadingOverlay(options.title || 'Loading Data')

  try {
    const result = await task((progress, label) => overlay.update(progress, label))
    overlay.update(1, 'complete')
    return result
  } finally {
    setTimeout(() => overlay.close(), 120)
  }
}
