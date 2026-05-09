import {
  calculateDistanceGain,
  clamp,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND1_CONFIG = {
  maxExpectedImpactForce: 0.5,
  maxExpectedMass: 12,
  baseOutputGain: 0.96,
  maxBurstsPerWindow: 6,
  burstWindowSec: 0.08,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 16,
  maxDistanceGain: 1.35,
  pitchJitter: 0.045,
  decayJitter: 0.12,
  gainJitter: 0.2,
  filterQJitter: 0.24,
}

class Sound1Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND1_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  _createVariation() {
    return {
      clickPitch: randomSpread(SOUND1_CONFIG.pitchJitter),
      bodyPitch: randomSpread(SOUND1_CONFIG.pitchJitter * 0.7),
      resonancePitch: randomSpread(SOUND1_CONFIG.pitchJitter * 0.9),
      clickDecay: randomSpread(SOUND1_CONFIG.decayJitter),
      bodyDecay: randomSpread(SOUND1_CONFIG.decayJitter * 0.8),
      resonanceDecay: randomSpread(SOUND1_CONFIG.decayJitter),
      clickGain: randomSpread(SOUND1_CONFIG.gainJitter),
      bodyGain: randomSpread(SOUND1_CONFIG.gainJitter * 0.8),
      resonanceGain: randomSpread(SOUND1_CONFIG.gainJitter),
      impactGain: randomSpread(SOUND1_CONFIG.gainJitter * 0.45),
      filterQ: randomSpread(SOUND1_CONFIG.filterQJitter),
    }
  }

  _buildProfile(impactForce, targetMass, charge, distanceGain, variation) {
    const forceNorm = clamp(impactForce / SOUND1_CONFIG.maxExpectedImpactForce, 0, 1)
    const massNorm = clamp(
      Math.log1p(Math.max(0.05, targetMass)) / Math.log1p(SOUND1_CONFIG.maxExpectedMass),
      0,
      1
    )
    const chargeNorm = clamp(charge, 0, 1)
    const brightness = clamp((forceNorm * 0.72) + (chargeNorm * 0.28), 0, 1)

    const bodyFreq = lerp(980, 230, massNorm) * lerp(0.92, 1.08, brightness) * variation.bodyPitch
    const clickFreq = lerp(2200, 700, massNorm) * lerp(0.96, 1.18, brightness) * variation.clickPitch
    const resonanceFreq = bodyFreq * lerp(1.62, 1.86, brightness) * variation.resonancePitch

    const clickDecay = lerp(0.018, 0.036, brightness) * variation.clickDecay
    const bodyDecay = (lerp(0.05, 0.12, massNorm) + (brightness * 0.02)) * variation.bodyDecay
    const resonanceDecay = bodyDecay * lerp(0.64, 0.82, brightness) * variation.resonanceDecay

    const loudness = lerp(0.9, 1.9, forceNorm) * lerp(0.95, 1.16, chargeNorm) * distanceGain
    const clickGain = lerp(0.1, 0.27, brightness) * lerp(1.0, 0.76, massNorm) * loudness * variation.clickGain
    const bodyGain = lerp(0.14, 0.32, brightness) * lerp(0.9, 1.16, massNorm) * loudness * variation.bodyGain
    const resonanceGain = bodyGain * lerp(0.3, 0.48, brightness) * variation.resonanceGain

    return {
      bodyFreq,
      clickFreq,
      resonanceFreq,
      clickDecay,
      bodyDecay,
      resonanceDecay,
      clickGain,
      bodyGain,
      resonanceGain,
      filterQ: 1.35 * variation.filterQ,
      impactGain: variation.impactGain,
    }
  }

  playCueImpact({ impactForce = 0, targetMass = 0.17, charge = 0, sourcePosition = null, listenerPosition = null } = {}) {
    if (!(impactForce > 0.005)) return

    const playback = prepareSfxPlayback('sound1', SOUND1_CONFIG.baseOutputGain)
    if (!playback) return
    const { audioContext, destination } = playback

    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND1_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND1_CONFIG.maxBurstsPerWindow) return

    const variation = this._createVariation()
    const profile = this._buildProfile(impactForce, targetMass, charge, distanceGain, variation)
    const startAt = now + 0.001

    const impactGainNode = audioContext.createGain()
    impactGainNode.gain.setValueAtTime(profile.impactGain, startAt)
    impactGainNode.connect(destination)

    const clickOsc = audioContext.createOscillator()
    clickOsc.type = 'triangle'
    clickOsc.frequency.setValueAtTime(profile.clickFreq, startAt)
    clickOsc.frequency.exponentialRampToValueAtTime(
      Math.max(180, profile.clickFreq * 0.52),
      startAt + profile.clickDecay
    )

    const clickFilter = audioContext.createBiquadFilter()
    clickFilter.type = 'bandpass'
    clickFilter.frequency.setValueAtTime(profile.clickFreq * 0.88, startAt)
    clickFilter.Q.value = profile.filterQ

    const clickGain = audioContext.createGain()
    clickGain.gain.setValueAtTime(0.0001, startAt)
    clickGain.gain.exponentialRampToValueAtTime(profile.clickGain, startAt + 0.0012)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.clickDecay)

    clickOsc.connect(clickFilter)
    clickFilter.connect(clickGain)
    clickGain.connect(impactGainNode)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(profile.bodyFreq, startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(
      Math.max(110, profile.bodyFreq * 0.84),
      startAt + profile.bodyDecay
    )

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(profile.bodyGain, startAt + 0.0025)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.bodyDecay)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(impactGainNode)

    const resonanceOsc = audioContext.createOscillator()
    resonanceOsc.type = 'sine'
    resonanceOsc.frequency.setValueAtTime(profile.resonanceFreq, startAt)
    resonanceOsc.frequency.exponentialRampToValueAtTime(
      Math.max(180, profile.resonanceFreq * 0.9),
      startAt + profile.resonanceDecay
    )

    const resonanceGain = audioContext.createGain()
    resonanceGain.gain.setValueAtTime(0.0001, startAt)
    resonanceGain.gain.exponentialRampToValueAtTime(profile.resonanceGain, startAt + 0.002)
    resonanceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.resonanceDecay)

    resonanceOsc.connect(resonanceGain)
    resonanceGain.connect(impactGainNode)

    clickOsc.start(startAt)
    bodyOsc.start(startAt)
    resonanceOsc.start(startAt)
    clickOsc.stop(startAt + profile.clickDecay + 0.01)
    bodyOsc.stop(startAt + profile.bodyDecay + 0.02)
    resonanceOsc.stop(startAt + profile.resonanceDecay + 0.02)

    this._recentBursts.push(now)
  }
}

const sound1Synth = new Sound1Synth()

export function playSound1(options) {
  sound1Synth.playCueImpact(options)
}

export function primeSound1Audio() {
  sound1Synth.prime()
}
