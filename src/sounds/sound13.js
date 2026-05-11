import {
  calculateDistanceGain,
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND13_CONFIG = {
  baseOutputGain: 0.74,
  maxBurstsPerWindow: 8,
  burstWindowSec: 0.14,
  fullVolumeDistance: 2.2,
  maxAudibleDistance: 18,
  maxDistanceGain: 1.32,
  pitchJitter: 0.07,
  decayJitter: 0.14,
  gainJitter: 0.16,
}

class Sound13Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.48)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND13_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playBowlingJump({ intensity = 0.85, sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound13', SOUND13_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND13_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND13_CONFIG.maxBurstsPerWindow) return

    const strength = clamp(intensity, 0, 1)
    const startAt = now + 0.001
    const loudness = lerp(0.22, 0.42, strength) * distanceGain * randomSpread(SOUND13_CONFIG.gainJitter)
    const ringDuration = lerp(0.42, 0.86, strength) * randomSpread(SOUND13_CONFIG.decayJitter)
    const overtoneDuration = ringDuration * lerp(0.48, 0.68, strength)
    const tickDuration = 0.038 * randomSpread(SOUND13_CONFIG.decayJitter)
    const shimmerDuration = ringDuration * 0.72

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)
    eventGain.connect(destination)

    const vibratoOsc = audioContext.createOscillator()
    vibratoOsc.type = 'sine'
    vibratoOsc.frequency.setValueAtTime(5.8 * randomSpread(0.06), startAt)

    const vibratoGain = audioContext.createGain()
    vibratoGain.gain.setValueAtTime(11 + (strength * 12), startAt)

    const ringFreq = lerp(540, 690, strength) * randomSpread(SOUND13_CONFIG.pitchJitter)
    const ringOsc = audioContext.createOscillator()
    ringOsc.type = 'triangle'
    ringOsc.frequency.setValueAtTime(ringFreq, startAt)
    ringOsc.frequency.exponentialRampToValueAtTime(Math.max(260, ringFreq * 0.7), startAt + ringDuration)

    const ringFilter = audioContext.createBiquadFilter()
    ringFilter.type = 'bandpass'
    ringFilter.frequency.setValueAtTime(lerp(1400, 1750, strength) * randomSpread(0.08), startAt)
    ringFilter.Q.value = 2.7

    const ringGain = audioContext.createGain()
    ringGain.gain.setValueAtTime(0.0001, startAt)
    ringGain.gain.exponentialRampToValueAtTime(0.24 * loudness, startAt + 0.006)
    ringGain.gain.exponentialRampToValueAtTime(0.0001, startAt + ringDuration)

    vibratoOsc.connect(vibratoGain)
    vibratoGain.connect(ringOsc.frequency)
    ringOsc.connect(ringFilter)
    ringFilter.connect(ringGain)
    ringGain.connect(eventGain)

    const overtoneFreq = ringFreq * lerp(1.95, 2.25, strength) * randomSpread(SOUND13_CONFIG.pitchJitter * 0.8)
    const overtoneOsc = audioContext.createOscillator()
    overtoneOsc.type = 'sine'
    overtoneOsc.frequency.setValueAtTime(overtoneFreq, startAt)
    overtoneOsc.frequency.exponentialRampToValueAtTime(Math.max(420, overtoneFreq * 0.68), startAt + overtoneDuration)

    const overtoneGain = audioContext.createGain()
    overtoneGain.gain.setValueAtTime(0.0001, startAt)
    overtoneGain.gain.exponentialRampToValueAtTime(0.16 * loudness, startAt + 0.004)
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + overtoneDuration)

    overtoneOsc.connect(overtoneGain)
    overtoneGain.connect(eventGain)

    const tickOsc = audioContext.createOscillator()
    tickOsc.type = 'square'
    tickOsc.frequency.setValueAtTime(1640 * randomSpread(0.08), startAt)
    tickOsc.frequency.exponentialRampToValueAtTime(620 * randomSpread(0.07), startAt + tickDuration)

    const tickFilter = audioContext.createBiquadFilter()
    tickFilter.type = 'highpass'
    tickFilter.frequency.setValueAtTime(920 * randomSpread(0.08), startAt)

    const tickGain = audioContext.createGain()
    tickGain.gain.setValueAtTime(0.0001, startAt)
    tickGain.gain.exponentialRampToValueAtTime(0.18 * loudness, startAt + 0.002)
    tickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tickDuration)

    tickOsc.connect(tickFilter)
    tickFilter.connect(tickGain)
    tickGain.connect(eventGain)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.48)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.06), startAt)

    const noiseBandpass = audioContext.createBiquadFilter()
    noiseBandpass.type = 'bandpass'
    noiseBandpass.frequency.setValueAtTime(2350 * randomSpread(0.08), startAt)
    noiseBandpass.frequency.exponentialRampToValueAtTime(980 * randomSpread(0.08), startAt + shimmerDuration)
    noiseBandpass.Q.value = 1.6

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.055 * loudness, startAt + 0.003)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + shimmerDuration)

    noiseSource.connect(noiseBandpass)
    noiseBandpass.connect(noiseGain)
    noiseGain.connect(eventGain)

    vibratoOsc.start(startAt)
    ringOsc.start(startAt)
    overtoneOsc.start(startAt)
    tickOsc.start(startAt)
    noiseSource.start(startAt)

    vibratoOsc.stop(startAt + ringDuration + 0.04)
    ringOsc.stop(startAt + ringDuration + 0.04)
    overtoneOsc.stop(startAt + overtoneDuration + 0.03)
    tickOsc.stop(startAt + tickDuration + 0.02)
    noiseSource.stop(startAt + shimmerDuration + 0.03)

    this._recentBursts.push(now)
  }
}

const sound13Synth = new Sound13Synth()

export function playSound13(options) {
  sound13Synth.playBowlingJump(options)
}

export function primeSound13Audio() {
  sound13Synth.prime()
}