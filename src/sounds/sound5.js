import {
  calculateDistanceGain,
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND5_CONFIG = {
  minAudibleSpeed: 0.35,
  maxExpectedSpeed: 5.8,
  baseOutputGain: 0.42,
  maxBurstsPerWindow: 14,
  burstWindowSec: 0.2,
  fullVolumeDistance: 1.5,
  maxAudibleDistance: 12,
  maxDistanceGain: 1.2,
  pitchJitter: 0.05,
  gainJitter: 0.12,
}

const SOUND5_EXPLICIT_SURFACE_PROFILES = {
  'default-ground': {
    baseFreqMin: 1040,
    baseFreqMax: 1440,
    spacingRatio: 1,
    decayRatio: 1,
    loudnessRatio: 1,
    glideRatio: 0.9,
    filterType: 'bandpass',
    filterRatio: 1.04,
    filterQ: 1.08,
    noteMultipliers: [1, 1.22, 1.48],
    waveTypes: ['triangle', 'triangle', 'triangle'],
    transientNoiseGain: 0.025,
    transientNoiseDecay: 0.028,
    transientNoiseFilterType: 'bandpass',
    transientNoiseFilterRatio: 1.1,
    transientNoiseQ: 1.1,
  },
  'section1-floor': {
    baseFreqMin: 420,
    baseFreqMax: 620,
    spacingRatio: 1.32,
    decayRatio: 1.42,
    loudnessRatio: 1.12,
    glideRatio: 0.62,
    filterType: 'lowpass',
    filterRatio: 0.52,
    filterQ: 0.72,
    noteMultipliers: [1, 1.02],
    waveTypes: ['sine', 'triangle'],
    subThumpGain: 0.09,
    subThumpFreqRatio: 0.42,
    subThumpDecay: 0.11,
    transientNoiseGain: 0.008,
    transientNoiseDecay: 0.02,
    transientNoiseFilterType: 'lowpass',
    transientNoiseFilterRatio: 0.48,
    transientNoiseQ: 0.7,
  },
  'billiard-cloth': {
    baseFreqMin: 980,
    baseFreqMax: 1220,
    spacingRatio: 1.06,
    decayRatio: 0.68,
    loudnessRatio: 0.62,
    glideRatio: 0.96,
    filterType: 'bandpass',
    filterRatio: 0.88,
    filterQ: 2.1,
    noteMultipliers: [1, 1.18, 1.42],
    waveTypes: ['sine', 'sine', 'triangle'],
    transientNoiseGain: 0.016,
    transientNoiseDecay: 0.018,
    transientNoiseFilterType: 'bandpass',
    transientNoiseFilterRatio: 1.42,
    transientNoiseQ: 2.4,
  },
  'section2-floor': {
    baseFreqMin: 2200,
    baseFreqMax: 2900,
    spacingRatio: 0.62,
    decayRatio: 0.5,
    loudnessRatio: 0.78,
    glideRatio: 1,
    filterType: 'highpass',
    filterRatio: 2.1,
    filterQ: 2.6,
    noteMultipliers: [1, 1.92],
    waveTypes: ['square', 'square'],
    transientNoiseGain: 0.095,
    transientNoiseDecay: 0.012,
    transientNoiseFilterType: 'highpass',
    transientNoiseFilterRatio: 2.6,
    transientNoiseQ: 2.8,
  },
  'section3-ground': {
    baseFreqMin: 660,
    baseFreqMax: 920,
    spacingRatio: 1.18,
    decayRatio: 1.08,
    loudnessRatio: 0.94,
    glideRatio: 0.78,
    filterType: 'bandpass',
    filterRatio: 0.9,
    filterQ: 1.18,
    noteMultipliers: [1, 1.08],
    waveTypes: ['triangle', 'sine'],
    subThumpGain: 0.045,
    subThumpFreqRatio: 0.46,
    subThumpDecay: 0.08,
    transientNoiseGain: 0.064,
    transientNoiseDecay: 0.028,
    transientNoiseFilterType: 'bandpass',
    transientNoiseFilterRatio: 1.36,
    transientNoiseQ: 1.44,
  },
  'section3-pedestal': {
    baseFreqMin: 520,
    baseFreqMax: 760,
    spacingRatio: 0.8,
    decayRatio: 0.74,
    loudnessRatio: 1.12,
    glideRatio: 0.62,
    filterType: 'lowpass',
    filterRatio: 0.74,
    filterQ: 1.18,
    noteMultipliers: [1, 1.1],
    waveTypes: ['triangle', 'square'],
    subThumpGain: 0.16,
    subThumpFreqRatio: 0.3,
    subThumpDecay: 0.11,
    transientNoiseGain: 0.012,
    transientNoiseDecay: 0.014,
    transientNoiseFilterType: 'lowpass',
    transientNoiseFilterRatio: 0.72,
    transientNoiseQ: 1.04,
  },
  'chest-wood': {
    baseFreqMin: 880,
    baseFreqMax: 1160,
    spacingRatio: 1.1,
    decayRatio: 1.12,
    loudnessRatio: 1.04,
    glideRatio: 0.8,
    filterType: 'lowpass',
    filterRatio: 0.8,
    filterQ: 0.88,
    noteMultipliers: [1, 1.12, 1.26],
    waveTypes: ['triangle', 'triangle', 'sine'],
    subThumpGain: 0.05,
    subThumpFreqRatio: 0.46,
    subThumpDecay: 0.08,
  },
  'carton-cardboard': {
    baseFreqMin: 1280,
    baseFreqMax: 1660,
    spacingRatio: 0.98,
    decayRatio: 0.92,
    loudnessRatio: 0.94,
    glideRatio: 0.88,
    filterType: 'bandpass',
    filterRatio: 1.16,
    filterQ: 1.28,
    noteMultipliers: [1, 1.26, 1.62],
    waveTypes: ['triangle', 'square', 'triangle'],
    transientNoiseGain: 0.034,
    transientNoiseDecay: 0.02,
    transientNoiseFilterType: 'bandpass',
    transientNoiseFilterRatio: 1.24,
    transientNoiseQ: 1.36,
  },
}

const SOUND5_GENERIC_WAVE_SETS = [
  ['triangle', 'triangle', 'sine'],
  ['triangle', 'square', 'triangle'],
  ['sine', 'triangle', 'square'],
  ['square', 'triangle', 'triangle'],
  ['sine', 'square', 'triangle'],
]

const SOUND5_FILTER_TYPES = ['lowpass', 'bandpass', 'highpass']

function hashSurfaceType(value) {
  const text = typeof value === 'string' ? value : 'default-ground'
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function hashToUnit(hash, salt = 0) {
  const mixed = (hash ^ Math.imul(0x9e3779b1, salt + 1)) >>> 0
  return (mixed % 1000) / 999
}

class Sound5Synth {
  constructor() {
    this._recentBursts = []
    this._surfaceProfileCache = new Map()
  }

  _getExplicitSurfaceProfile(surfaceAudioType) {
    if (typeof surfaceAudioType !== 'string' || surfaceAudioType.trim().length === 0) {
      return null
    }

    const normalizedSurfaceType = surfaceAudioType.trim()
    if (SOUND5_EXPLICIT_SURFACE_PROFILES[normalizedSurfaceType]) {
      return SOUND5_EXPLICIT_SURFACE_PROFILES[normalizedSurfaceType]
    }

    const typeSegments = normalizedSurfaceType.split(':')
    while (typeSegments.length > 1) {
      typeSegments.pop()
      const candidateKey = typeSegments.join(':')
      if (SOUND5_EXPLICIT_SURFACE_PROFILES[candidateKey]) {
        return SOUND5_EXPLICIT_SURFACE_PROFILES[candidateKey]
      }
    }

    return null
  }

  prime() {
    primeSharedSfxAudio()
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND5_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  _getSurfaceProfile(surfaceAudioType = 'default-ground') {
    const normalizedSurfaceType = typeof surfaceAudioType === 'string' && surfaceAudioType.trim().length > 0
      ? surfaceAudioType.trim()
      : 'default-ground'

    const explicitProfile = this._getExplicitSurfaceProfile(normalizedSurfaceType)
    if (explicitProfile) {
      return explicitProfile
    }

    const cachedProfile = this._surfaceProfileCache.get(normalizedSurfaceType)
    if (cachedProfile) {
      return cachedProfile
    }

    const hash = hashSurfaceType(normalizedSurfaceType)
    const baseFreqMin = lerp(640, 1760, hashToUnit(hash, 0))
    const baseFreqSpan = lerp(220, 520, hashToUnit(hash, 1))
    const generatedProfile = {
      baseFreqMin,
      baseFreqMax: baseFreqMin + baseFreqSpan,
      spacingRatio: lerp(0.8, 1.26, hashToUnit(hash, 2)),
      decayRatio: lerp(0.72, 1.34, hashToUnit(hash, 3)),
      loudnessRatio: lerp(0.82, 1.18, hashToUnit(hash, 4)),
      glideRatio: lerp(0.66, 0.99, hashToUnit(hash, 5)),
      filterType: SOUND5_FILTER_TYPES[Math.floor(hashToUnit(hash, 6) * SOUND5_FILTER_TYPES.length) % SOUND5_FILTER_TYPES.length],
      filterRatio: lerp(0.58, 1.78, hashToUnit(hash, 7)),
      filterQ: lerp(0.72, 1.9, hashToUnit(hash, 8)),
      noteMultipliers: [
        1,
        lerp(1.06, 1.7, hashToUnit(hash, 9)),
        lerp(1.18, 2.34, hashToUnit(hash, 10)),
      ],
      waveTypes: SOUND5_GENERIC_WAVE_SETS[Math.floor(hashToUnit(hash, 11) * SOUND5_GENERIC_WAVE_SETS.length) % SOUND5_GENERIC_WAVE_SETS.length],
      transientNoiseGain: lerp(0.01, 0.05, hashToUnit(hash, 12)),
      transientNoiseDecay: lerp(0.014, 0.03, hashToUnit(hash, 13)),
      transientNoiseFilterType: SOUND5_FILTER_TYPES[Math.floor(hashToUnit(hash, 14) * SOUND5_FILTER_TYPES.length) % SOUND5_FILTER_TYPES.length],
      transientNoiseFilterRatio: lerp(0.5, 1.9, hashToUnit(hash, 15)),
      transientNoiseQ: lerp(0.7, 2.2, hashToUnit(hash, 16)),
    }

    this._surfaceProfileCache.set(normalizedSurfaceType, generatedProfile)
    return generatedProfile
  }

  _buildProfile(speed, distanceGain, surfaceAudioType = 'default-ground') {
    const speedNorm = clamp(speed / SOUND5_CONFIG.maxExpectedSpeed, 0, 1)
    const surfaceProfile = this._getSurfaceProfile(surfaceAudioType)
    const baseFreq = lerp(surfaceProfile.baseFreqMin, surfaceProfile.baseFreqMax, speedNorm) * randomSpread(SOUND5_CONFIG.pitchJitter)
    const noteSpacing = lerp(0.034, 0.022, speedNorm) * surfaceProfile.spacingRatio * randomSpread(0.1)
    const noteDecay = lerp(0.052, 0.04, speedNorm) * surfaceProfile.decayRatio * randomSpread(0.1)
    const loudness = lerp(0.08, 0.13, speedNorm) * distanceGain * surfaceProfile.loudnessRatio * randomSpread(SOUND5_CONFIG.gainJitter)

    return {
      baseFreq,
      noteSpacing,
      noteDecay,
      loudness,
      shimmerFreq: baseFreq * surfaceProfile.filterRatio,
      filterType: surfaceProfile.filterType,
      filterQ: surfaceProfile.filterQ,
      glideRatio: surfaceProfile.glideRatio,
      noteMultipliers: surfaceProfile.noteMultipliers,
      waveTypes: surfaceProfile.waveTypes,
    }
  }

  playMovementTing({ speed = 0, surfaceAudioType = 'default-ground', sourcePosition = null, listenerPosition = null } = {}) {
    if (speed < SOUND5_CONFIG.minAudibleSpeed) return

    const playback = prepareSfxPlayback('sound5', SOUND5_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND5_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND5_CONFIG.maxBurstsPerWindow) return

    const profile = this._buildProfile(speed, distanceGain, surfaceAudioType)
    const startAt = now + 0.001

    if (profile.transientNoiseGain > 0.0005) {
      const noiseBuffer = getSharedNoiseBuffer(0.08)
      if (noiseBuffer) {
      const noiseSource = audioContext.createBufferSource()
      noiseSource.buffer = noiseBuffer

      const noiseFilter = audioContext.createBiquadFilter()
      noiseFilter.type = profile.transientNoiseFilterType || 'bandpass'
      noiseFilter.frequency.setValueAtTime(Math.max(120, profile.baseFreq * (profile.transientNoiseFilterRatio || 1)), startAt)
      noiseFilter.Q.value = profile.transientNoiseQ || 1

      const noiseGain = audioContext.createGain()
      noiseGain.gain.setValueAtTime(0.0001, startAt)
      noiseGain.gain.exponentialRampToValueAtTime(profile.loudness * profile.transientNoiseGain, startAt + 0.001)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + (profile.transientNoiseDecay || 0.02))

      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(destination)

      noiseSource.start(startAt)
      noiseSource.stop(startAt + Math.max(0.03, (profile.transientNoiseDecay || 0.02) + 0.02))
      }
    }

    if (profile.subThumpGain > 0.0005) {
      const subOsc = audioContext.createOscillator()
      subOsc.type = 'sine'
      const subFreq = Math.max(48, profile.baseFreq * (profile.subThumpFreqRatio || 0.4))
      subOsc.frequency.setValueAtTime(subFreq, startAt)
      subOsc.frequency.exponentialRampToValueAtTime(Math.max(32, subFreq * 0.62), startAt + (profile.subThumpDecay || 0.08))

      const subGain = audioContext.createGain()
      subGain.gain.setValueAtTime(0.0001, startAt)
      subGain.gain.exponentialRampToValueAtTime(profile.loudness * profile.subThumpGain, startAt + 0.002)
      subGain.gain.exponentialRampToValueAtTime(0.0001, startAt + (profile.subThumpDecay || 0.08))

      subOsc.connect(subGain)
      subGain.connect(destination)

      subOsc.start(startAt)
      subOsc.stop(startAt + Math.max(0.06, (profile.subThumpDecay || 0.08) + 0.03))
    }

    const shimmerFilter = audioContext.createBiquadFilter()
    shimmerFilter.type = profile.filterType
    shimmerFilter.frequency.setValueAtTime(profile.shimmerFreq, startAt)
    shimmerFilter.Q.value = profile.filterQ
    shimmerFilter.connect(destination)

    profile.noteMultipliers.forEach((multiplier, index) => {
      const noteStart = startAt + (index * profile.noteSpacing)
      const noteFreq = profile.baseFreq * multiplier * randomSpread(SOUND5_CONFIG.pitchJitter * 0.55)
      const noteGainValue = profile.loudness * lerp(1, 0.7, index / Math.max(1, profile.noteMultipliers.length - 1))

      const osc = audioContext.createOscillator()
        osc.type = profile.waveTypes[index] || profile.waveTypes[profile.waveTypes.length - 1] || 'triangle'
      osc.frequency.setValueAtTime(noteFreq, noteStart)
        osc.frequency.exponentialRampToValueAtTime(Math.max(280, noteFreq * profile.glideRatio), noteStart + profile.noteDecay)

      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(noteGainValue, noteStart + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + profile.noteDecay)

      osc.connect(gain)
      gain.connect(shimmerFilter)

      osc.start(noteStart)
      osc.stop(noteStart + profile.noteDecay + 0.02)
    })

    this._recentBursts.push(now)
  }
}

const sound5Synth = new Sound5Synth()

export function playSound5(options) {
  sound5Synth.playMovementTing(options)
}

export function primeSound5Audio() {
  sound5Synth.prime()
}