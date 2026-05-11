import {
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND15_CONFIG = {
  baseOutputGain: 0.17,
  maxBurstsPerWindow: 12,
  burstWindowSec: 0.14,
  pitchJitter: 0.05,
  gainJitter: 0.08,
  decayJitter: 0.12,
}

class Sound15Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.1)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND15_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playTypingTick({ emphasis = 1 } = {}) {
    const playback = prepareSfxPlayback('sound15', SOUND15_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND15_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
  const accent = Math.max(0.84, Math.min(1.15, emphasis))
    const loudness = accent * randomSpread(SOUND15_CONFIG.gainJitter)
  const tickDecay = 0.03 * randomSpread(SOUND15_CONFIG.decayJitter)
  const bodyDecay = 0.068 * randomSpread(SOUND15_CONFIG.decayJitter)
  const noiseDecay = 0.054 * randomSpread(SOUND15_CONFIG.decayJitter)

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)

  const speakerLowpass = audioContext.createBiquadFilter()
  speakerLowpass.type = 'lowpass'
  speakerLowpass.frequency.setValueAtTime(1850 * randomSpread(0.05), startAt)
  speakerLowpass.Q.value = 0.7

  const speakerMid = audioContext.createBiquadFilter()
  speakerMid.type = 'peaking'
  speakerMid.frequency.setValueAtTime(940 * randomSpread(0.06), startAt)
  speakerMid.Q.value = 1.05
  speakerMid.gain.setValueAtTime(1.8, startAt)

  eventGain.connect(speakerLowpass)
  speakerLowpass.connect(speakerMid)
  speakerMid.connect(destination)

    const tickOsc = audioContext.createOscillator()
  tickOsc.type = 'triangle'
  const tickFreq = 1380 * randomSpread(SOUND15_CONFIG.pitchJitter)
    tickOsc.frequency.setValueAtTime(tickFreq, startAt)
  tickOsc.frequency.exponentialRampToValueAtTime(Math.max(540, tickFreq * 0.7), startAt + tickDecay)

    const tickFilter = audioContext.createBiquadFilter()
    tickFilter.type = 'bandpass'
  tickFilter.frequency.setValueAtTime(1580 * randomSpread(0.08), startAt)
  tickFilter.Q.value = 1.65

    const tickGain = audioContext.createGain()
    tickGain.gain.setValueAtTime(0.0001, startAt)
  tickGain.gain.exponentialRampToValueAtTime(0.042 * loudness, startAt + 0.0022)
    tickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tickDecay)

    tickOsc.connect(tickFilter)
    tickFilter.connect(tickGain)
    tickGain.connect(eventGain)

    const bodyOsc = audioContext.createOscillator()
  bodyOsc.type = 'sine'
  const bodyFreq = 520 * randomSpread(SOUND15_CONFIG.pitchJitter * 0.75)
    bodyOsc.frequency.setValueAtTime(bodyFreq, startAt)
  bodyOsc.frequency.exponentialRampToValueAtTime(Math.max(240, bodyFreq * 0.74), startAt + bodyDecay)

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
  bodyGain.gain.exponentialRampToValueAtTime(0.034 * loudness, startAt + 0.004)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + bodyDecay)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(eventGain)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.1)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.08), startAt)

  const noiseBandpass = audioContext.createBiquadFilter()
  noiseBandpass.type = 'bandpass'
  noiseBandpass.frequency.setValueAtTime(1280 * randomSpread(0.08), startAt)
  noiseBandpass.Q.value = 0.95

  const noiseLowpass = audioContext.createBiquadFilter()
  noiseLowpass.type = 'lowpass'
  noiseLowpass.frequency.setValueAtTime(1750 * randomSpread(0.06), startAt)

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
  noiseGain.gain.exponentialRampToValueAtTime(0.011 * loudness, startAt + 0.002)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + noiseDecay)

  noiseSource.connect(noiseBandpass)
  noiseBandpass.connect(noiseLowpass)
  noiseLowpass.connect(noiseGain)
    noiseGain.connect(eventGain)

    tickOsc.start(startAt)
    bodyOsc.start(startAt)
    noiseSource.start(startAt)

    tickOsc.stop(startAt + tickDecay + 0.02)
    bodyOsc.stop(startAt + bodyDecay + 0.02)
    noiseSource.stop(startAt + noiseDecay + 0.02)

    this._recentBursts.push(now)
  }
}

const sound15Synth = new Sound15Synth()

export function playSound15(options) {
  sound15Synth.playTypingTick(options)
}

export function primeSound15Audio() {
  sound15Synth.prime()
}