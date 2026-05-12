import { playTypingSound } from './uiSoundEffects.js'
import { UI_THEME } from './uiTheme.js'

const WISDOM_STYLE = {
  colors: UI_THEME.terminal,
  applyButton(button) {
    button.style.cssText = `
      background: ${WISDOM_STYLE.colors.accentBlue};
      color: ${UI_THEME.common.white};
      border: 2px solid ${WISDOM_STYLE.colors.borderBlue};
      border-radius: 0;
      padding: 12px 24px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      text-shadow: ${UI_THEME.terminal.textShadow};
      box-shadow: ${UI_THEME.terminal.buttonShadow};
      transition: all 0.3s ease;
    `
    button.onmouseover = () => {
      button.style.boxShadow = UI_THEME.terminal.buttonHoverShadow
      button.style.transform = 'scale(1.05)'
    }
    button.onmouseout = () => {
      button.style.boxShadow = UI_THEME.terminal.buttonShadow
      button.style.transform = 'scale(1)'
    }
  }
}

const OVERLAY_STYLE_ID = 'death-wisdom-overlay-style'
const INITIAL_PROMPT = 'Do you wish for wisdom?'

const WISDOM_MESSAGE_BY_DETAIL = {
  guy: 'Guy will overwrite your perception of reality. Don’t let it touch you.',
  ball8: 'A lone Ball 8 is harmless. A pack of five is not.',
  bowling: 'Do not approach the Bowling Ball. Anything it touches is obliterated.',
  fan: 'The fan blades are very sharp.',
  eye: 'The Eye sees all.',
  elevator_guide_lost: 'You escaped the simulation… but at the cost of your most loyal companion. Was it worth it?',
  elevator_clean: 'You left the simulation untouched, free of guilt… but was that truly the end?',
  default: 'Some truths reveal themselves only after the ending.'
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function ensureOverlayStyle() {
  if (document.getElementById(OVERLAY_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = OVERLAY_STYLE_ID
  style.textContent = `
    @keyframes deathWisdomCaretBlink {
      0%, 45% { opacity: 1; }
      46%, 100% { opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

export class DeathWisdomOverlay {
  constructor() {
    ensureOverlayStyle()

    this.container = null
    this.storyText = null
    this.actionRow = null
    this.activeButtons = []
    this.activeResolver = null
    this.isVisible = false
    this.sequenceToken = 0
    this.keydownHandler = this._handleKeydown.bind(this)

    this._init()
  }

  _init() {
    this.container = document.createElement('div')
    this.container.id = 'deathWisdomOverlay'
    this.container.style.position = 'fixed'
    this.container.style.inset = '0'
    this.container.style.zIndex = '36000'
    this.container.style.display = 'none'
    this.container.style.alignItems = 'center'
    this.container.style.justifyContent = 'center'
    this.container.style.background = UI_THEME.wisdom.overlayBackground
    this.container.style.opacity = '0'
    this.container.style.pointerEvents = 'none'
    this.container.style.padding = 'clamp(24px, 6vw, 80px)'

    const inner = document.createElement('div')
    inner.style.width = 'min(86vw, 940px)'
    inner.style.display = 'flex'
    inner.style.flexDirection = 'column'
    inner.style.alignItems = 'stretch'
    inner.style.gap = 'clamp(20px, 4vw, 32px)'

    this.storyText = document.createElement('div')
    this.storyText.style.display = 'flex'
    this.storyText.style.flexDirection = 'column'
    this.storyText.style.gap = 'clamp(18px, 3vw, 28px)'

    this.actionRow = document.createElement('div')
    this.actionRow.style.display = 'flex'
    this.actionRow.style.flexWrap = 'wrap'
    this.actionRow.style.gap = '12px'
    this.actionRow.style.justifyContent = 'flex-end'

    inner.appendChild(this.storyText)
    inner.appendChild(this.actionRow)
    this.container.appendChild(inner)
    document.body.appendChild(this.container)

    window.addEventListener('keydown', this.keydownHandler, true)
  }

  async present({ endingDetail = 'default' } = {}) {
    const token = ++this.sequenceToken
    this._resetContent()
    this.isVisible = true

    this.container.style.display = 'flex'
    this.container.style.pointerEvents = 'auto'
    this.container.style.transition = 'opacity 3s ease'
    this.container.style.opacity = '0'
    await wait(20)
    if (token !== this.sequenceToken) return
    this.container.style.opacity = '1'
    await wait(3000)
    if (token !== this.sequenceToken) return

    const wantsWisdom = await this._showInitialPrompt(token)
    if (token !== this.sequenceToken) return

    if (wantsWisdom) {
      const message = WISDOM_MESSAGE_BY_DETAIL[endingDetail] || WISDOM_MESSAGE_BY_DETAIL.default
      await this._showTypedMessage(message, token)
      if (token !== this.sequenceToken) return
      await this._waitForChoice([
        { label: 'NEXT', value: 'next', primary: true }
      ], token)
      if (token !== this.sequenceToken) return
    }

    await this._fadeOut(token)
  }

  async _showInitialPrompt(token) {
    await this._showTypedMessage(INITIAL_PROMPT, token)
    if (token !== this.sequenceToken) return false

    return this._waitForChoice([
      { label: 'Yes', value: true, primary: true },
      { label: 'No, remain ignorant.', value: false, primary: false }
    ], token)
  }

  async _showTypedMessage(text, token) {
    this._clearText()
    this._clearButtons()

    const paragraph = document.createElement('p')
    paragraph.style.margin = '0'
    paragraph.style.color = WISDOM_STYLE.colors.neonGreen
    paragraph.style.fontFamily = "'Consolas', 'Monaco', 'Courier New', monospace"
    paragraph.style.fontWeight = 'normal'
    paragraph.style.fontSize = 'clamp(17px, 2vw, 25px)'
    paragraph.style.lineHeight = '1.8'
    paragraph.style.letterSpacing = '0.5px'
    paragraph.style.textShadow = 'none'
    paragraph.style.whiteSpace = 'pre-wrap'

    const caret = document.createElement('span')
    caret.style.display = 'inline-block'
    caret.style.width = '0.72ch'
    caret.style.height = '1.1em'
    caret.style.marginLeft = '0.14em'
    caret.style.verticalAlign = '-0.16em'
    caret.style.background = WISDOM_STYLE.colors.neonGreen
    caret.style.animation = 'deathWisdomCaretBlink 1s steps(1, end) infinite'

    paragraph.appendChild(caret)
    this.storyText.appendChild(paragraph)

    let visibleText = ''
    for (const character of text) {
      if (token !== this.sequenceToken) return
      visibleText += character
      paragraph.textContent = visibleText
      paragraph.appendChild(caret)
      playTypingSound(character)
      await wait(character === ' ' ? 10 : 18)
    }

    paragraph.textContent = visibleText
    paragraph.appendChild(caret)
  }

  _waitForChoice(buttons, token) {
    this._clearButtons()

    return new Promise(resolve => {
      if (token !== this.sequenceToken) {
        resolve(null)
        return
      }

      this.activeResolver = resolve
      this.activeButtons = buttons.map((buttonConfig, index) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = buttonConfig.label
        WISDOM_STYLE.applyButton(button)
        button.style.width = 'fit-content'
        button.style.minWidth = '0'
        button.style.padding = index === 0 ? '10px 18px' : '10px 16px'
        button.onclick = (event) => {
          event.preventDefault()
          event.stopPropagation()
          this._resolveChoice(buttonConfig.value)
        }
        this.actionRow.appendChild(button)
        return button
      })
    })
  }

  _resolveChoice(value) {
    if (typeof this.activeResolver !== 'function') return
    const resolve = this.activeResolver
    this.activeResolver = null
    this._clearButtons()
    resolve(value)
  }

  async _fadeOut(token) {
    this._clearButtons()
    if (token !== this.sequenceToken) return

    this.container.style.transition = 'opacity 1s ease'
    this.container.style.opacity = '0'
    this.container.style.pointerEvents = 'none'
    await wait(1000)
    if (token !== this.sequenceToken) return
    this._resetContent()
    this.container.style.display = 'none'
    this.isVisible = false
  }

  _handleKeydown(event) {
    if (this.container.style.pointerEvents !== 'auto') return
    if (!this.activeButtons.length) return
    if (event.code !== 'Enter' && event.code !== 'NumpadEnter') return

    event.preventDefault()
    event.stopImmediatePropagation()
    this.activeButtons[0]?.click()
  }

  _clearText() {
    if (!this.storyText) return
    this.storyText.replaceChildren()
  }

  _clearButtons() {
    this.activeButtons.forEach(button => {
      button.onclick = null
      button.onmouseover = null
      button.onmouseout = null
    })
    this.activeButtons = []
    if (this.actionRow) this.actionRow.replaceChildren()
  }

  _resetContent() {
    this._clearText()
    this._clearButtons()
    this.activeResolver = null
  }

  destroy() {
    this.sequenceToken += 1
    this._resetContent()
    this.isVisible = false
    window.removeEventListener('keydown', this.keydownHandler, true)
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
  }
}