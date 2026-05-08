const DEFAULT_PLAYER_CUSTOMIZATION = Object.freeze({
  bodyColor: '#DDDDDD',
  eyeColor: '#000000',
  earType: 'round',
  socksEnabled: false,
  sockColor: '#111111'
})

const PLAYER_EAR_TYPES = Object.freeze({
  ROUND: 'round',
  POINTY: 'pointy'
})

function sanitizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized.toUpperCase()
  }

  return fallback
}

export function normalizePlayerCustomization(customization = {}) {
  const base = { ...DEFAULT_PLAYER_CUSTOMIZATION }
  const earType = customization.earType === PLAYER_EAR_TYPES.POINTY
    ? PLAYER_EAR_TYPES.POINTY
    : PLAYER_EAR_TYPES.ROUND

  return {
    bodyColor: sanitizeHexColor(customization.bodyColor, base.bodyColor),
    eyeColor: sanitizeHexColor(customization.eyeColor, base.eyeColor),
    earType,
    socksEnabled: Boolean(customization.socksEnabled),
    sockColor: sanitizeHexColor(customization.sockColor, base.sockColor)
  }
}

export function isDefaultPlayerCustomization(customization = {}) {
  const normalized = normalizePlayerCustomization(customization)

  return Object.keys(DEFAULT_PLAYER_CUSTOMIZATION).every((key) => normalized[key] === DEFAULT_PLAYER_CUSTOMIZATION[key])
}

export { DEFAULT_PLAYER_CUSTOMIZATION, PLAYER_EAR_TYPES }