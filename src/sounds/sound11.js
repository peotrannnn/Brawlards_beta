import {
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND11_CONFIG = {
  baseOutputGain: 0.5,
  maxBurstsPerWindow: 12,
  burstWindowSec: 0.12,
  pitchJitter: 0.08,
  gainJitter: 0.14,
  decayJitter: 0.12,
}

class Sound11Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.12)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND11_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playUiClick() {
    const playback = prepareSfxPlayback('sound11', SOUND11_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND11_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const loudness = randomSpread(SOUND11_CONFIG.gainJitter)
    const clickDecay = 0.032 * randomSpread(SOUND11_CONFIG.decayJitter)
    const tailDecay = 0.055 * randomSpread(SOUND11_CONFIG.decayJitter)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'square'
    const bodyFreq = 420 * randomSpread(SOUND11_CONFIG.pitchJitter)
    bodyOsc.frequency.setValueAtTime(bodyFreq, startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(120, bodyFreq * 0.38), startAt + clickDecay)

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(0.15 * loudness, startAt + 0.002)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + clickDecay)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(destination)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.12)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.08), startAt)

    const noiseFilter = audioContext.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(1680 * randomSpread(0.08), startAt)
    noiseFilter.frequency.exponentialRampToValueAtTime(720 * randomSpread(0.06), startAt + tailDecay)
    noiseFilter.Q.value = 1.2

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.08 * loudness, startAt + 0.001)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tailDecay)

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(destination)

    bodyOsc.start(startAt)
    noiseSource.start(startAt)
    bodyOsc.stop(startAt + clickDecay + 0.02)
    noiseSource.stop(startAt + tailDecay + 0.02)

    this._recentBursts.push(now)
  }
}

const sound11Synth = new Sound11Synth()

export function playSound11() {
  sound11Synth.playUiClick()
}

export function primeSound11Audio() {
  sound11Synth.prime()
}