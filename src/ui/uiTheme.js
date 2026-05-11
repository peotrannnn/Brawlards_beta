const TERMINAL_COLORS = {
  darkBg: 'rgba(10, 13, 17, 0.84)',
  accentBlue: '#3a5f72',
  neonGreen: '#00FF00',
  darkAccent: '#1f2a35',
  borderBlue: '#397798',
  accentGlow: 'rgba(44, 112, 148, 0.38)',
  accentGlowSoft: 'rgba(19, 101, 145, 0.16)',
  accentGlowStrong: 'rgba(103, 133, 149, 0.56)',
}

const COMMON_COLORS = {
  white: '#fff',
  black: '#000',
  transparent: 'transparent',
  textPrimary: '#fff',
  textMuted: '#888888',
  textSoft: '#eaf4ff',
  textSubtle: '#ccc',
  success: '#00FF00',
  successBright: '#00FFAA',
  successDark: '#00CC77',
  successBorder: '#00884d',
  danger: '#ff4444',
  dangerStrong: '#FF4444',
  blocked: '#ff4d4d',
  warning: '#c09012',
  warningDark: '#8b650a',
  warningBorder: '#6c4f08',
  warningGlow: 'rgba(192, 144, 18, 0.3)',
  warningGlowStrong: 'rgba(192, 144, 18, 0.42)',
  warningInset: 'rgba(255, 239, 184, 0.12)',
  warningInsetStrong: 'rgba(255, 239, 184, 0.18)',
  overlayBlack: '#000',
  overlayDim: 'rgba(0, 0, 0, 0.4)',
  overlayDimStrong: 'rgba(0, 0, 0, 0.46)',
  overlayPanel: 'rgba(0, 0, 0, 0.5)',
  overlayFullscreen: 'rgba(10, 12, 16, 0.88)',
  shadowBlackSoft: 'rgba(0, 0, 0, 0.25)',
  shadowBlackInset: 'rgba(0, 0, 0, 0.3)',
  shadowPanel: 'rgba(0, 0, 0, 0.55)',
  shadowPanelCompact: '#0008',
  thumbBorder: '#0b1322',
  thumbFill: '#d7f6ff',
}

const DANGER_BUTTON_COLORS = {
  background: '#8b0000',
  border: '#5a0000',
  text: COMMON_COLORS.white,
  shadow: '0 0 12px rgba(255, 0, 0, 0.4), inset 0 0 6px rgba(255, 0, 0, 0.2)',
  hoverShadow: '0 0 20px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 0, 0, 0.3)',
}

const TERMINAL_SHADOWS = {
  panel: `0 2px 16px ${COMMON_COLORS.shadowPanel}, 0 0 16px ${TERMINAL_COLORS.accentGlowSoft}`,
  box: `0 0 20px ${TERMINAL_COLORS.accentGlow}, inset 0 0 10px ${TERMINAL_COLORS.accentGlowSoft}`,
  button: `0 0 15px ${TERMINAL_COLORS.accentGlow}, inset 0 0 8px ${TERMINAL_COLORS.accentGlowSoft}`,
  buttonHover: `0 0 25px ${TERMINAL_COLORS.accentGlowStrong}, inset 0 0 12px ${TERMINAL_COLORS.accentGlowSoft}`,
  compact: `0 0 10px ${TERMINAL_COLORS.accentGlow}, inset 0 0 5px ${TERMINAL_COLORS.accentGlowSoft}`,
  selectedInset: `inset 0 0 10px ${COMMON_COLORS.shadowBlackInset}`,
  notice: `0 0 20px ${TERMINAL_COLORS.accentGlow}, inset 0 0 10px ${TERMINAL_COLORS.accentGlowSoft}`,
}

export const UI_THEME = {
  common: COMMON_COLORS,
  dangerButton: DANGER_BUTTON_COLORS,
  terminal: {
    ...TERMINAL_COLORS,
    textPrimary: COMMON_COLORS.textPrimary,
    textMuted: COMMON_COLORS.textMuted,
    textShadow: `0 1px 1px ${COMMON_COLORS.shadowBlackSoft}`,
    panelShadow: TERMINAL_SHADOWS.panel,
    boxShadow: TERMINAL_SHADOWS.box,
    buttonShadow: TERMINAL_SHADOWS.button,
    buttonHoverShadow: TERMINAL_SHADOWS.buttonHover,
    compactShadow: TERMINAL_SHADOWS.compact,
    selectedInsetShadow: TERMINAL_SHADOWS.selectedInset,
  },
  windowChrome: {
    titleBarHeight: '42px',
    titleFontSize: '13px',
    titleLeftPadding: '20px',
    titleRightPadding: '52px',
    closeWidth: '42px',
    closeFontSize: '17px',
    closeBackground: DANGER_BUTTON_COLORS.background,
    closeText: DANGER_BUTTON_COLORS.text,
    closeBorder: TERMINAL_COLORS.borderBlue,
    closeShadow: 'inset 0 0 8px rgba(255, 0, 0, 0.18)',
    closeHoverShadow: 'inset 0 0 14px rgba(255, 72, 72, 0.34)',
    closeHoverBrightness: '1.08',
  },
  scrollbar: {
    width: '12px',
    firefoxThumb: TERMINAL_COLORS.borderBlue,
    firefoxTrack: '#0b1016',
    trackBackground: 'linear-gradient(180deg, rgba(8, 12, 18, 0.98), rgba(18, 28, 36, 0.95))',
    trackPattern: 'repeating-linear-gradient(180deg, rgba(168, 230, 255, 0.08) 0 1px, rgba(168, 230, 255, 0) 1px 6px)',
    trackBorder: TERMINAL_COLORS.borderBlue,
    trackInset: 'inset 0 0 10px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(58, 95, 114, 0.28)',
    thumbBackground: `linear-gradient(180deg, #5f93ab 0%, ${TERMINAL_COLORS.borderBlue} 45%, #213d4d 100%)`,
    thumbPattern: 'repeating-linear-gradient(180deg, rgba(234, 244, 255, 0.22) 0 2px, rgba(8, 13, 17, 0) 2px 6px)',
    thumbBorder: '#9ddcff',
    thumbShadow: `0 0 10px ${TERMINAL_COLORS.accentGlow}, inset 0 0 0 1px rgba(255, 255, 255, 0.1)`,
    thumbHoverBackground: 'linear-gradient(180deg, #8acbe7 0%, #4f96bc 50%, #24495f 100%)',
    thumbHoverShadow: `0 0 14px ${TERMINAL_COLORS.accentGlowStrong}, inset 0 0 0 1px rgba(255, 255, 255, 0.16)`,
  },
  boot: {
    overlayBackground: COMMON_COLORS.overlayBlack,
    brandGradient: 'linear-gradient(90deg, #E85E97 0%, #F6A623 100%)',
    studioColor: '#3A7FF2',
    statusColor: 'rgba(148, 163, 184, 0.92)',
    detailColor: 'rgba(100, 116, 139, 0.92)',
    progressTrack: 'rgba(255, 255, 255, 0.14)',
    progressFill: 'linear-gradient(90deg, #f8fafc, #94a3b8)',
  },
  loadingOverlay: {
    background: COMMON_COLORS.overlayBlack,
    previewDropShadow: 'drop-shadow(0 0 18px rgba(255, 255, 255, 0.1))',
    labelColor: '#ffffff',
  },
  menu: {
    overlayGradient: 'linear-gradient(180deg, rgba(7, 11, 17, 0.2), rgba(7, 11, 17, 0.42))',
    itemHoverBackground: TERMINAL_COLORS.accentGlowSoft,
    itemHoverText: COMMON_COLORS.white,
    itemHoverTextShadow: `0 0 8px ${TERMINAL_COLORS.borderBlue}`,
    itemSelectedText: COMMON_COLORS.white,
    itemDefaultText: TERMINAL_COLORS.neonGreen,
  },
  play: {
    panelShadow: COMMON_COLORS.shadowPanelCompact,
    previewGradient: 'radial-gradient(circle at 35% 25%, rgba(103, 183, 220, 0.2), rgba(14, 17, 21, 0.96) 70%)',
    previewInsetGlow: 'rgba(168, 230, 255, 0.12)',
    rowBackground: 'rgba(20, 24, 30, 0.78)',
    rowBorder: 'rgba(168, 230, 255, 0.22)',
    rowInsetGlow: 'rgba(103, 133, 149, 0.08)',
    inputBackground: '#101419',
    inputText: COMMON_COLORS.textSoft,
    pageBackground: '#111111',
    labelDefault: COMMON_COLORS.textSubtle,
    labelActive: '#0f0',
  },
  settings: {
    menuOverlay: COMMON_COLORS.overlayBlack,
    gameplayOverlay: COMMON_COLORS.overlayDimStrong,
    shellShadow: `0 2px 16px ${COMMON_COLORS.shadowPanelCompact}, 0 0 18px ${TERMINAL_COLORS.accentGlowSoft}`,
    controlCardBackground: 'rgba(20, 24, 30, 0.72)',
    valueBadgeBackground: 'rgba(23, 28, 34, 0.9)',
    sliderInsetShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.45)',
    sliderThumbBorder: COMMON_COLORS.thumbBorder,
    sliderThumbBackground: COMMON_COLORS.thumbFill,
    selectInsetShadow: 'inset 0 0 8px rgba(0, 102, 255, 0.12)',
    resetGradient: `linear-gradient(180deg, ${COMMON_COLORS.warning}, ${COMMON_COLORS.warningDark})`,
    resetBorder: COMMON_COLORS.warningBorder,
    resetText: COMMON_COLORS.white,
    resetShadow: `0 0 18px ${COMMON_COLORS.warningGlow}, inset 0 0 10px ${COMMON_COLORS.warningInset}`,
    resetHoverShadow: `0 0 24px ${COMMON_COLORS.warningGlowStrong}, inset 0 0 12px ${COMMON_COLORS.warningInsetStrong}`,
  },
  wisdom: {
    overlayBackground: COMMON_COLORS.overlayBlack,
  },
  gameOver: {
    overlayBackground: COMMON_COLORS.overlayFullscreen,
    levelMuted: COMMON_COLORS.textMuted,
    timeText: COMMON_COLORS.success,
    defaultStatusText: COMMON_COLORS.success,
    deathStatusText: COMMON_COLORS.dangerStrong,
    backText: COMMON_COLORS.danger,
    progressBackground: TERMINAL_COLORS.darkAccent,
    progressGradient: `linear-gradient(90deg, ${TERMINAL_COLORS.accentBlue}, ${TERMINAL_COLORS.borderBlue})`,
    progressGlow: '0 0 12px rgba(103, 133, 149, 0.32)',
  },
  pauseMenu: {
    overlayBackground: COMMON_COLORS.overlayDim,
    selectedText: COMMON_COLORS.white,
    selectedBackground: TERMINAL_COLORS.accentBlue,
    resumeText: COMMON_COLORS.success,
    backText: COMMON_COLORS.danger,
  },
  controlGuide: {
    background: '#002d1a',
    border: '#00CC77',
    text: '#00FFAA',
    shadow: '0 0 20px rgba(0, 204, 119, 0.6), inset 0 0 10px rgba(0, 204, 119, 0.3)',
    headerBackground: '#00CC77',
    headerText: COMMON_COLORS.black,
    headerBorder: '#00884d',
    progressBackground: '#003d26',
    progressBorder: '#00CC77',
    progressFill: 'linear-gradient(90deg, #00CC77, #00FFAA)',
    progressGlow: '0 0 15px rgba(0, 255, 170, 0.8)',
  },
  hud: {
    crosshairColor: 'white',
    crosshairShadow: '1px 1px 2px black',
    chargeIndicatorColor: '#00ff00',
    blockedHintColor: COMMON_COLORS.blocked,
    hpBarBackground: '#333333',
    hpBarBorderColor: '#000000',
    hpFillDefault: '#66bb6a',
    powerBarStops: [
      { pos: 0.0, r: 0, g: 255, b: 0 },
      { pos: 0.33, r: 255, g: 255, b: 0 },
      { pos: 0.66, r: 255, g: 0, b: 0 },
      { pos: 1.0, r: 180, g: 0, b: 255 },
    ],
    healthStops: [
      { pos: 0.0, r: 239, g: 83, b: 80 },
      { pos: 0.5, r: 255, g: 202, b: 40 },
      { pos: 1.0, r: 102, g: 187, b: 106 },
    ],
  },
  simulation: {
    perfOverlayBackground: '#002d1a',
    perfOverlayBorder: '#00CC77',
    perfOverlayText: '#00FFAA',
    perfOverlayShadow: '0 0 20px rgba(0, 204, 119, 0.6), inset 0 0 10px rgba(0, 204, 119, 0.3)',
    clickResumeOverlay: COMMON_COLORS.overlayPanel,
    clickResumeBoxBackground: '#0a1a3d',
    clickResumeBoxBorder: '#0066FF',
    clickResumeBoxText: COMMON_COLORS.success,
    clickResumeBoxShadow: '0 0 20px rgba(0, 102, 255, 0.6)',
    clickResumePulseMin: 'rgba(0, 102, 255, 0.5)',
    clickResumePulseMax: 'rgba(0, 102, 255, 0.8)',
    helpOverlayBackground: 'rgba(10, 26, 61, 0.85)',
    helpBoxBackground: '#0a1a3d',
    helpBoxBorder: '#0066FF',
    helpTitleBackground: '#0066FF',
    helpTitleText: COMMON_COLORS.black,
    helpTitleBorder: '#004399',
    helpContentText: COMMON_COLORS.white,
    helpHintBackground: '#0066FF',
    helpHintText: '#111',
    helpHintBorder: '#004399',
    spawnHintBackground: '#00CC77',
    spawnHintText: '#111',
    spawnHintBorder: '#008855',
    spawnBoxBackground: '#0a1a3d',
    spawnBoxBorder: '#00CC77',
    spawnTitleBackground: '#00CC77',
    spawnTitleText: COMMON_COLORS.black,
    spawnTitleBorder: '#008855',
    spawnSelectedBackground: '#00CC77',
    spawnSelectedText: '#111',
    spawnItemText: COMMON_COLORS.white,
    spawnItemBorder: '#333a',
  },
}

export const IT_STYLE = {
  colors: UI_THEME.terminal,
  applyToElement: (element, type = 'box') => {
    if (type === 'box') {
      element.style.cssText = `
        background: ${UI_THEME.terminal.darkBg};
        border: 2px solid ${UI_THEME.terminal.borderBlue};
        border-radius: 0;
        color: ${UI_THEME.terminal.neonGreen};
        padding: 12px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.6;
        box-shadow: ${UI_THEME.terminal.boxShadow};
      `
    } else if (type === 'button') {
      element.style.cssText = `
        background: ${UI_THEME.terminal.accentBlue};
        color: ${UI_THEME.common.textPrimary};
        border: 2px solid ${UI_THEME.terminal.borderBlue};
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
      element.onmouseover = () => {
        element.style.boxShadow = UI_THEME.terminal.buttonHoverShadow
        element.style.transform = 'scale(1.05)'
      }
      element.onmouseout = () => {
        element.style.boxShadow = UI_THEME.terminal.buttonShadow
        element.style.transform = 'scale(1)'
      }
    } else if (type === 'header') {
      element.style.cssText = `
        background: ${UI_THEME.terminal.accentBlue};
        color: ${UI_THEME.common.textPrimary};
        padding: 6px 12px;
        font-weight: bold;
        border-bottom: 2px solid ${UI_THEME.terminal.borderBlue};
        font-size: 11px;
        letter-spacing: 1px;
        text-transform: uppercase;
        text-shadow: ${UI_THEME.terminal.textShadow};
      `
    } else if (type === 'backButton') {
      element.style.cssText = `
        background: ${UI_THEME.dangerButton.background};
        color: ${UI_THEME.dangerButton.text};
        border: 2px solid ${UI_THEME.dangerButton.border};
        border-radius: 0;
        padding: 8px 16px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-weight: bold;
        font-size: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: ${UI_THEME.dangerButton.shadow};
        transition: all 0.3s ease;
      `
      element.onmouseover = () => {
        element.style.boxShadow = UI_THEME.dangerButton.hoverShadow
        element.style.transform = 'scale(1.05)'
      }
      element.onmouseout = () => {
        element.style.boxShadow = UI_THEME.dangerButton.shadow
        element.style.transform = 'scale(1)'
      }
    }
  }
}