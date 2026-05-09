import {
  calculateDistanceGain,
  clamp,
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

class Sound5Synth {
  constructor() {
    this._recentBursts = []
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

  _buildProfile(speed, distanceGain) {
    const speedNorm = clamp(speed / SOUND5_CONFIG.maxExpectedSpeed, 0, 1)
    const baseFreq = lerp(1280, 1760, speedNorm) * randomSpread(SOUND5_CONFIG.pitchJitter)
    const noteSpacing = lerp(0.034, 0.022, speedNorm) * randomSpread(0.1)
    const noteDecay = lerp(0.052, 0.04, speedNorm) * randomSpread(0.1)
    const loudness = lerp(0.08, 0.13, speedNorm) * distanceGain * randomSpread(SOUND5_CONFIG.gainJitter)

    return {
      baseFreq,
      noteSpacing,
      noteDecay,
      loudness,
    }
  }

  playMovementTing({ speed = 0, sourcePosition = null, listenerPosition = null } = {}) {
    if (speed < SOUND5_CONFIG.minAudibleSpeed) return

    const playback = prepareSfxPlayback('sound5', SOUND5_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND5_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND5_CONFIG.maxBurstsPerWindow) return

    const profile = this._buildProfile(speed, distanceGain)
    const startAt = now + 0.001
    const noteMultipliers = [1, 1.23, 1.5]

    const shimmerFilter = audioContext.createBiquadFilter()
    shimmerFilter.type = 'bandpass'
    shimmerFilter.frequency.setValueAtTime(profile.baseFreq * 1.15, startAt)
    shimmerFilter.Q.value = 1.2
    shimmerFilter.connect(destination)

    noteMultipliers.forEach((multiplier, index) => {
      const noteStart = startAt + (index * profile.noteSpacing)
      const noteFreq = profile.baseFreq * multiplier * randomSpread(SOUND5_CONFIG.pitchJitter * 0.55)
      const noteGainValue = profile.loudness * lerp(1, 0.7, index / Math.max(1, noteMultipliers.length - 1))

      const osc = audioContext.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(noteFreq, noteStart)
      osc.frequency.exponentialRampToValueAtTime(Math.max(420, noteFreq * 0.92), noteStart + profile.noteDecay)

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