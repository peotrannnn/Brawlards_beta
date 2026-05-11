import {
  calculateDistanceGain,
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND14_CONFIG = {
  baseOutputGain: 0.52,
  maxBurstsPerWindow: 8,
  burstWindowSec: 0.12,
  fullVolumeDistance: 1.9,
  maxAudibleDistance: 14,
  maxDistanceGain: 1.18,
  pitchJitter: 0.06,
  decayJitter: 0.12,
  gainJitter: 0.14,
}

class Sound14Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.26)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND14_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playPlayerJump({ jumpSpeed = 0, sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound14', SOUND14_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND14_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND14_CONFIG.maxBurstsPerWindow) return

    const strength = clamp(jumpSpeed / 6.2, 0.45, 1)
    const startAt = now + 0.001
    const loudness = lerp(0.13, 0.24, strength) * distanceGain * randomSpread(SOUND14_CONFIG.gainJitter)
    const bodyDuration = lerp(0.18, 0.28, strength) * randomSpread(SOUND14_CONFIG.decayJitter)
    const chimeDuration = bodyDuration * 0.78
    const airDuration = bodyDuration * 0.65

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)
    eventGain.connect(destination)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'sine'
    const bodyFreq = lerp(620, 690, strength) * randomSpread(SOUND14_CONFIG.pitchJitter)
    bodyOsc.frequency.setValueAtTime(bodyFreq, startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(320, bodyFreq * 0.72), startAt + bodyDuration)

    const bodyFilter = audioContext.createBiquadFilter()
    bodyFilter.type = 'lowpass'
    bodyFilter.frequency.setValueAtTime(1650 * randomSpread(0.06), startAt)
    bodyFilter.frequency.exponentialRampToValueAtTime(720 * randomSpread(0.05), startAt + bodyDuration)
    bodyFilter.Q.value = 0.8

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(0.23 * loudness, startAt + 0.006)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + bodyDuration)

    bodyOsc.connect(bodyFilter)
    bodyFilter.connect(bodyGain)
    bodyGain.connect(eventGain)

    const chimeOsc = audioContext.createOscillator()
    chimeOsc.type = 'triangle'
    const chimeFreq = lerp(940, 1120, strength) * randomSpread(SOUND14_CONFIG.pitchJitter)
    chimeOsc.frequency.setValueAtTime(chimeFreq, startAt)
    chimeOsc.frequency.exponentialRampToValueAtTime(Math.max(500, chimeFreq * 0.66), startAt + chimeDuration)

    const chimeGain = audioContext.createGain()
    chimeGain.gain.setValueAtTime(0.0001, startAt)
    chimeGain.gain.exponentialRampToValueAtTime(0.11 * loudness, startAt + 0.004)
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, startAt + chimeDuration)

    chimeOsc.connect(chimeGain)
    chimeGain.connect(eventGain)

    const airSource = audioContext.createBufferSource()
    airSource.buffer = getSharedNoiseBuffer(0.26)
    airSource.playbackRate.setValueAtTime(randomSpread(0.08), startAt)

    const airFilter = audioContext.createBiquadFilter()
    airFilter.type = 'highpass'
    airFilter.frequency.setValueAtTime(1200 * randomSpread(0.08), startAt)

    const airLowpass = audioContext.createBiquadFilter()
    airLowpass.type = 'lowpass'
    airLowpass.frequency.setValueAtTime(3100 * randomSpread(0.08), startAt)
    airLowpass.frequency.exponentialRampToValueAtTime(1100 * randomSpread(0.06), startAt + airDuration)
    airLowpass.Q.value = 0.7

    const airGain = audioContext.createGain()
    airGain.gain.setValueAtTime(0.0001, startAt)
    airGain.gain.exponentialRampToValueAtTime(0.028 * loudness, startAt + 0.003)
    airGain.gain.exponentialRampToValueAtTime(0.0001, startAt + airDuration)

    airSource.connect(airFilter)
    airFilter.connect(airLowpass)
    airLowpass.connect(airGain)
    airGain.connect(eventGain)

    bodyOsc.start(startAt)
    chimeOsc.start(startAt)
    airSource.start(startAt)

    bodyOsc.stop(startAt + bodyDuration + 0.03)
    chimeOsc.stop(startAt + chimeDuration + 0.03)
    airSource.stop(startAt + airDuration + 0.03)

    this._recentBursts.push(now)
  }
}

const sound14Synth = new Sound14Synth()

export function playSound14(options) {
  sound14Synth.playPlayerJump(options)
}

export function primeSound14Audio() {
  sound14Synth.prime()
}