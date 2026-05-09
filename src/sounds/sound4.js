import {
  calculateDistanceGain,
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND4_CONFIG = {
  minAudibleFallHeight: 0.55,
  maxExpectedFallHeight: 8.5,
  maxExpectedMass: 120,
  gravity: 9.82,
  baseOutputGain: 0.88,
  maxBurstsPerWindow: 10,
  burstWindowSec: 0.12,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 16,
  maxDistanceGain: 1.35,
  pitchJitter: 0.06,
  decayJitter: 0.14,
  gainJitter: 0.18,
}

class Sound4Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.2)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND4_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  _buildProfile(fallHeight, targetMass, distanceGain) {
    const heightNorm = clamp(
      (fallHeight - SOUND4_CONFIG.minAudibleFallHeight)
      / Math.max(0.001, SOUND4_CONFIG.maxExpectedFallHeight - SOUND4_CONFIG.minAudibleFallHeight),
      0,
      1
    )
    const massNorm = clamp(
      Math.log1p(Math.max(0.05, targetMass)) / Math.log1p(SOUND4_CONFIG.maxExpectedMass),
      0,
      1
    )
    const brightness = clamp((1 - massNorm) * 0.8 + heightNorm * 0.2, 0, 1)

    const bodyFreq = lerp(240, 70, massNorm) * randomSpread(SOUND4_CONFIG.pitchJitter * 0.65)
    const knockFreq = lerp(760, 170, massNorm) * randomSpread(SOUND4_CONFIG.pitchJitter)
    const noiseCutoff = lerp(1800, 520, massNorm) * randomSpread(SOUND4_CONFIG.pitchJitter * 0.7)

    const bodyDecay = lerp(0.09, 0.2, Math.max(heightNorm, massNorm)) * randomSpread(SOUND4_CONFIG.decayJitter)
    const knockDecay = lerp(0.025, 0.055, heightNorm) * randomSpread(SOUND4_CONFIG.decayJitter * 0.8)
    const noiseDecay = lerp(0.04, 0.085, brightness) * randomSpread(SOUND4_CONFIG.decayJitter)

    const massLoudness = lerp(0.72, 1.55, massNorm)
    const loudness = lerp(0.55, 1.75, heightNorm) * massLoudness * distanceGain * randomSpread(SOUND4_CONFIG.gainJitter)
    const knockGain = lerp(0.08, 0.22, brightness) * lerp(0.92, 1.12, massNorm) * loudness
    const bodyGain = lerp(0.12, 0.32, massNorm) * loudness
    const noiseGain = lerp(0.02, 0.09, brightness) * loudness

    return {
      bodyFreq,
      knockFreq,
      noiseCutoff,
      bodyDecay,
      knockDecay,
      noiseDecay,
      knockGain,
      bodyGain,
      noiseGain,
      impactGain: randomSpread(SOUND4_CONFIG.gainJitter * 0.4),
    }
  }

  playLandingThud({ fallHeight = 0, targetMass = 1, sourcePosition = null, listenerPosition = null } = {}) {
    if (!(fallHeight >= SOUND4_CONFIG.minAudibleFallHeight)) return

    const playback = prepareSfxPlayback('sound4', SOUND4_CONFIG.baseOutputGain)
    if (!playback) return
    const { audioContext, destination } = playback

    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND4_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND4_CONFIG.maxBurstsPerWindow) return

    const profile = this._buildProfile(fallHeight, targetMass, distanceGain)
    const startAt = now + 0.001

    const impactGainNode = audioContext.createGain()
    impactGainNode.gain.setValueAtTime(profile.impactGain, startAt)
    impactGainNode.connect(destination)

    const knockOsc = audioContext.createOscillator()
    knockOsc.type = 'triangle'
    knockOsc.frequency.setValueAtTime(profile.knockFreq, startAt)
    knockOsc.frequency.exponentialRampToValueAtTime(Math.max(80, profile.knockFreq * 0.45), startAt + profile.knockDecay)

    const knockGain = audioContext.createGain()
    knockGain.gain.setValueAtTime(0.0001, startAt)
    knockGain.gain.exponentialRampToValueAtTime(profile.knockGain, startAt + 0.002)
    knockGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.knockDecay)

    knockOsc.connect(knockGain)
    knockGain.connect(impactGainNode)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(profile.bodyFreq, startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(38, profile.bodyFreq * 0.7), startAt + profile.bodyDecay)

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(profile.bodyGain, startAt + 0.004)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.bodyDecay)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(impactGainNode)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.2)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.05), startAt)

    const noiseFilter = audioContext.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.setValueAtTime(profile.noiseCutoff, startAt)
    noiseFilter.frequency.exponentialRampToValueAtTime(Math.max(180, profile.noiseCutoff * 0.4), startAt + profile.noiseDecay)
    noiseFilter.Q.value = 0.65

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(profile.noiseGain, startAt + 0.003)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.noiseDecay)

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(impactGainNode)

    knockOsc.start(startAt)
    bodyOsc.start(startAt)
    noiseSource.start(startAt)
    knockOsc.stop(startAt + profile.knockDecay + 0.015)
    bodyOsc.stop(startAt + profile.bodyDecay + 0.03)
    noiseSource.stop(startAt + profile.noiseDecay + 0.02)

    this._recentBursts.push(now)
  }

  computeEquivalentFallHeight(impactSpeed) {
    const speed = Math.max(0, impactSpeed)
    return (speed * speed) / (2 * SOUND4_CONFIG.gravity)
  }
}

const sound4Synth = new Sound4Synth()

export function playSound4(options) {
  sound4Synth.playLandingThud(options)
}

export function primeSound4Audio() {
  sound4Synth.prime()
}

export function computeSound4EquivalentFallHeight(impactSpeed) {
  return sound4Synth.computeEquivalentFallHeight(impactSpeed)
}
