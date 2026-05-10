import {
  calculateDistanceGain,
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND9_CONFIG = {
  baseOutputGain: 0.72,
  maxBurstsPerWindow: 4,
  burstWindowSec: 0.32,
  fullVolumeDistance: 1.7,
  maxAudibleDistance: 14,
  maxDistanceGain: 1.18,
  pitchJitter: 0.08,
  decayJitter: 0.14,
  gainJitter: 0.16,
}

class Sound9Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.72)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND9_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playDamageZee({ intensity = 0.6, sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound9', SOUND9_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND9_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND9_CONFIG.maxBurstsPerWindow) return

    const strength = clamp(intensity, 0, 1)
    const startAt = now + 0.001
    const loudness = lerp(0.16, 0.34, strength) * distanceGain * randomSpread(SOUND9_CONFIG.gainJitter)
    const whineDuration = lerp(0.42, 0.82, strength) * randomSpread(SOUND9_CONFIG.decayJitter)
    const hissDuration = whineDuration * lerp(0.55, 0.8, strength)

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)
    eventGain.connect(destination)

    const vibratoOsc = audioContext.createOscillator()
    vibratoOsc.type = 'sine'
    vibratoOsc.frequency.setValueAtTime(6.5 * randomSpread(0.08), startAt)

    const vibratoGain = audioContext.createGain()
    vibratoGain.gain.setValueAtTime(16 + (strength * 20), startAt)

    const whineOsc = audioContext.createOscillator()
    whineOsc.type = 'sawtooth'
    whineOsc.frequency.setValueAtTime(1540 * randomSpread(SOUND9_CONFIG.pitchJitter), startAt)
    whineOsc.frequency.exponentialRampToValueAtTime(720 * randomSpread(0.06), startAt + whineDuration)

    const whineFilter = audioContext.createBiquadFilter()
    whineFilter.type = 'bandpass'
    whineFilter.frequency.setValueAtTime(1960 * randomSpread(0.08), startAt)
    whineFilter.frequency.exponentialRampToValueAtTime(980 * randomSpread(0.06), startAt + whineDuration)
    whineFilter.Q.value = 4.8

    const whineGain = audioContext.createGain()
    whineGain.gain.setValueAtTime(0.0001, startAt)
    whineGain.gain.exponentialRampToValueAtTime(0.22 * loudness, startAt + 0.01)
    whineGain.gain.exponentialRampToValueAtTime(0.0001, startAt + whineDuration)

    vibratoOsc.connect(vibratoGain)
    vibratoGain.connect(whineOsc.frequency)
    whineOsc.connect(whineFilter)
    whineFilter.connect(whineGain)
    whineGain.connect(eventGain)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'triangle'
    bodyOsc.frequency.setValueAtTime(920 * randomSpread(SOUND9_CONFIG.pitchJitter * 0.7), startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(280 * randomSpread(0.06), startAt + (whineDuration * 0.82))

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(0.12 * loudness, startAt + 0.012)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + (whineDuration * 0.82))

    bodyOsc.connect(bodyGain)
    bodyGain.connect(eventGain)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.72)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.07), startAt)

    const noiseHighpass = audioContext.createBiquadFilter()
    noiseHighpass.type = 'highpass'
    noiseHighpass.frequency.setValueAtTime(1200 * randomSpread(0.08), startAt)

    const noiseBandpass = audioContext.createBiquadFilter()
    noiseBandpass.type = 'bandpass'
    noiseBandpass.frequency.setValueAtTime(2650 * randomSpread(0.1), startAt)
    noiseBandpass.frequency.exponentialRampToValueAtTime(1120 * randomSpread(0.08), startAt + hissDuration)
    noiseBandpass.Q.value = 1.1

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.09 * loudness, startAt + 0.014)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + hissDuration)

    noiseSource.connect(noiseHighpass)
    noiseHighpass.connect(noiseBandpass)
    noiseBandpass.connect(noiseGain)
    noiseGain.connect(eventGain)

    vibratoOsc.start(startAt)
    whineOsc.start(startAt)
    bodyOsc.start(startAt)
    noiseSource.start(startAt)

    vibratoOsc.stop(startAt + whineDuration + 0.04)
    whineOsc.stop(startAt + whineDuration + 0.04)
    bodyOsc.stop(startAt + whineDuration + 0.04)
    noiseSource.stop(startAt + hissDuration + 0.03)

    this._recentBursts.push(now)
  }
}

const sound9Synth = new Sound9Synth()

export function playSound9(options) {
  sound9Synth.playDamageZee(options)
}

export function primeSound9Audio() {
  sound9Synth.prime()
}