import {
  calculateDistanceGain,
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND8_CONFIG = {
  baseOutputGain: 0.68,
  maxBurstsPerWindow: 10,
  burstWindowSec: 0.1,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 14,
  maxDistanceGain: 1.26,
  pitchJitter: 0.08,
  decayJitter: 0.14,
  gainJitter: 0.17,
}

class Sound8Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.18)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND8_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playDropPhet({ sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound8', SOUND8_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND8_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND8_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const loudness = distanceGain * randomSpread(SOUND8_CONFIG.gainJitter)
    const burstDecay = 0.07 * randomSpread(SOUND8_CONFIG.decayJitter)
    const tailDecay = 0.1 * randomSpread(SOUND8_CONFIG.decayJitter * 0.85)

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)
    eventGain.connect(destination)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.18)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.1), startAt)

    const noiseHighpass = audioContext.createBiquadFilter()
    noiseHighpass.type = 'highpass'
    noiseHighpass.frequency.setValueAtTime(760 * randomSpread(0.08), startAt)

    const noiseBandpass = audioContext.createBiquadFilter()
    noiseBandpass.type = 'bandpass'
    noiseBandpass.frequency.setValueAtTime(2250 * randomSpread(SOUND8_CONFIG.pitchJitter), startAt)
    noiseBandpass.frequency.exponentialRampToValueAtTime(980 * randomSpread(0.06), startAt + burstDecay)
    noiseBandpass.Q.value = 1.1

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.21 * loudness, startAt + 0.004)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + burstDecay)

    noiseSource.connect(noiseHighpass)
    noiseHighpass.connect(noiseBandpass)
    noiseBandpass.connect(noiseGain)
    noiseGain.connect(eventGain)

    const spitOsc = audioContext.createOscillator()
    spitOsc.type = 'triangle'
    spitOsc.frequency.setValueAtTime(620 * randomSpread(SOUND8_CONFIG.pitchJitter), startAt)
    spitOsc.frequency.exponentialRampToValueAtTime(210 * randomSpread(0.06), startAt + burstDecay)

    const spitGain = audioContext.createGain()
    spitGain.gain.setValueAtTime(0.0001, startAt)
    spitGain.gain.exponentialRampToValueAtTime(0.11 * loudness, startAt + 0.0025)
    spitGain.gain.exponentialRampToValueAtTime(0.0001, startAt + burstDecay)

    spitOsc.connect(spitGain)
    spitGain.connect(eventGain)

    const tailOsc = audioContext.createOscillator()
    tailOsc.type = 'sine'
    tailOsc.frequency.setValueAtTime(180 * randomSpread(0.07), startAt)
    tailOsc.frequency.exponentialRampToValueAtTime(92 * randomSpread(0.05), startAt + tailDecay)

    const tailGain = audioContext.createGain()
    tailGain.gain.setValueAtTime(0.0001, startAt)
    tailGain.gain.exponentialRampToValueAtTime(0.05 * loudness, startAt + 0.007)
    tailGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tailDecay)

    tailOsc.connect(tailGain)
    tailGain.connect(eventGain)

    noiseSource.start(startAt)
    spitOsc.start(startAt)
    tailOsc.start(startAt)
    noiseSource.stop(startAt + burstDecay + 0.02)
    spitOsc.stop(startAt + burstDecay + 0.02)
    tailOsc.stop(startAt + tailDecay + 0.03)

    this._recentBursts.push(now)
  }
}

const sound8Synth = new Sound8Synth()

export function playSound8(options) {
  sound8Synth.playDropPhet(options)
}

export function primeSound8Audio() {
  sound8Synth.prime()
}