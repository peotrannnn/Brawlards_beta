import {
  calculateDistanceGain,
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND3_CONFIG = {
  baseOutputGain: 0.76,
  maxBurstsPerWindow: 8,
  burstWindowSec: 0.11,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 16,
  maxDistanceGain: 1.35,
  filterJitter: 0.18,
  decayJitter: 0.16,
  gainJitter: 0.18,
}

class Sound3Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.42)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND3_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playDespawnHiss({ sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound3', SOUND3_CONFIG.baseOutputGain)
    if (!playback) return
    const { audioContext, destination } = playback

    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND3_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND3_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const hissDuration = 0.22 * randomSpread(SOUND3_CONFIG.decayJitter)
    const tailDuration = 0.18 * randomSpread(SOUND3_CONFIG.decayJitter * 0.8)
    const loudness = distanceGain * randomSpread(SOUND3_CONFIG.gainJitter)

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(randomSpread(0.08), startAt)
    eventGain.connect(destination)

    const hissSource = audioContext.createBufferSource()
    hissSource.buffer = getSharedNoiseBuffer(0.42)
    hissSource.playbackRate.setValueAtTime(randomSpread(0.06), startAt)

    const highpass = audioContext.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(860 * randomSpread(SOUND3_CONFIG.filterJitter), startAt)

    const lowpass = audioContext.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.setValueAtTime(4200 * randomSpread(SOUND3_CONFIG.filterJitter), startAt)
    lowpass.frequency.exponentialRampToValueAtTime(1100 * randomSpread(0.12), startAt + hissDuration)
    lowpass.Q.value = 0.7

    const hissGain = audioContext.createGain()
    hissGain.gain.setValueAtTime(0.0001, startAt)
    hissGain.gain.exponentialRampToValueAtTime(0.18 * loudness, startAt + 0.01)
    hissGain.gain.exponentialRampToValueAtTime(0.0001, startAt + hissDuration)

    hissSource.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(hissGain)
    hissGain.connect(eventGain)

    const tailOsc = audioContext.createOscillator()
    tailOsc.type = 'sine'
    tailOsc.frequency.setValueAtTime(240 * randomSpread(0.12), startAt)
    tailOsc.frequency.exponentialRampToValueAtTime(92 * randomSpread(0.08), startAt + tailDuration)

    const tailGain = audioContext.createGain()
    tailGain.gain.setValueAtTime(0.0001, startAt)
    tailGain.gain.exponentialRampToValueAtTime(0.05 * loudness, startAt + 0.01)
    tailGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tailDuration)

    tailOsc.connect(tailGain)
    tailGain.connect(eventGain)

    hissSource.start(startAt)
    tailOsc.start(startAt)
    hissSource.stop(startAt + hissDuration + 0.02)
    tailOsc.stop(startAt + tailDuration + 0.02)

    this._recentBursts.push(now)
  }
}

const sound3Synth = new Sound3Synth()

export function playSound3(options) {
  sound3Synth.playDespawnHiss(options)
}

export function primeSound3Audio() {
  sound3Synth.prime()
}
