export const GRAPHICS_QUALITY_PROFILES = {
  low: {
    key: 'low',
    label: 'patater computer',
    menuPixelRatioScale: 0.3,
    menuBlurPx: 0.8,
    menuFrameIntervalMs: 50,
    maxDevicePixelRatio: 0.85,
    gameplayMinScale: 0.22,
    gameplayMaxScale: 0.34,
    gameplayStartupScale: 0.28,
    gameplayStartupMaxScale: 0.32,
    allowShadows: false,
    allowFakeShadows: false,
    shadowMapSize: 512,
    maxTransientEffects: 42,
    transientSpawnChance: 0.35,
    allowVeinEffects: false,
    allowItemArrowEffects: false,
    section3Tier: 'low'
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    menuPixelRatioScale: 0.58,
    menuBlurPx: 1.7,
    menuFrameIntervalMs: 33,
    maxDevicePixelRatio: 1.2,
    gameplayMinScale: 0.32,
    gameplayMaxScale: 0.62,
    gameplayStartupScale: 0.46,
    gameplayStartupMaxScale: 0.56,
    allowShadows: true,
    allowFakeShadows: true,
    shadowMapSize: 1024,
    maxTransientEffects: 120,
    transientSpawnChance: 0.68,
    allowVeinEffects: true,
    allowItemArrowEffects: true,
    section3Tier: 'medium'
  },
  high: {
    key: 'high',
    label: 'I hate my computer',
    menuPixelRatioScale: 1.0,
    menuBlurPx: 2.6,
    menuFrameIntervalMs: 0,
    maxDevicePixelRatio: 2.0,
    gameplayMinScale: 0.4,
    gameplayMaxScale: 1.0,
    gameplayStartupScale: 0.8,
    gameplayStartupMaxScale: 1.0,
    allowShadows: true,
    allowFakeShadows: true,
    shadowMapSize: 2048,
    maxTransientEffects: 260,
    transientSpawnChance: 1.0,
    allowVeinEffects: true,
    allowItemArrowEffects: true,
    section3Tier: 'high'
  }
}

export function normalizeGraphicsQuality(quality) {
  if (typeof quality !== 'string') return 'high'
  return GRAPHICS_QUALITY_PROFILES[quality] ? quality : 'high'
}

export function getGraphicsQualityProfile(quality) {
  return GRAPHICS_QUALITY_PROFILES[normalizeGraphicsQuality(quality)]
}