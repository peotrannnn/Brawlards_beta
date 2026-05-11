import {
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND12_CONFIG = {
  baseOutputGain: 0.42,
  maxBurstsPerWindow: 10,
  burstWindowSec: 0.1,
  pitchJitter: 0.06,
  gainJitter: 0.12,
  decayJitter: 0.14,
}

class Sound12Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.16)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND12_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playCompuneAdvance() {
    const playback = prepareSfxPlayback('sound12', SOUND12_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND12_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const loudness = randomSpread(SOUND12_CONFIG.gainJitter)
    const blipDecay = 0.072 * randomSpread(SOUND12_CONFIG.decayJitter)
    const tailDecay = 0.11 * randomSpread(SOUND12_CONFIG.decayJitter)

    const carrierOsc = audioContext.createOscillator()
    carrierOsc.type = 'triangle'
    const carrierFreq = 1180 * randomSpread(SOUND12_CONFIG.pitchJitter)
    carrierOsc.frequency.setValueAtTime(carrierFreq, startAt)
    carrierOsc.frequency.exponentialRampToValueAtTime(Math.max(220, carrierFreq * 0.52), startAt + blipDecay)

    const carrierFilter = audioContext.createBiquadFilter()
    carrierFilter.type = 'lowpass'
    carrierFilter.frequency.setValueAtTime(2600 * randomSpread(0.07), startAt)
    carrierFilter.frequency.exponentialRampToValueAtTime(780 * randomSpread(0.06), startAt + tailDecay)
    carrierFilter.Q.value = 0.9

    const carrierGain = audioContext.createGain()
    carrierGain.gain.setValueAtTime(0.0001, startAt)
    carrierGain.gain.exponentialRampToValueAtTime(0.11 * loudness, startAt + 0.003)
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, startAt + blipDecay)

    carrierOsc.connect(carrierFilter)
    carrierFilter.connect(carrierGain)
    carrierGain.connect(destination)

    const chirpOsc = audioContext.createOscillator()
    chirpOsc.type = 'sawtooth'
    chirpOsc.frequency.setValueAtTime(760 * randomSpread(0.07), startAt)
    chirpOsc.frequency.exponentialRampToValueAtTime(1480 * randomSpread(0.05), startAt + 0.022)
    chirpOsc.frequency.exponentialRampToValueAtTime(520 * randomSpread(0.06), startAt + tailDecay)

    const chirpFilter = audioContext.createBiquadFilter()
    chirpFilter.type = 'bandpass'
    chirpFilter.frequency.setValueAtTime(2100 * randomSpread(0.08), startAt)
    chirpFilter.Q.value = 2.4

    const chirpGain = audioContext.createGain()
    chirpGain.gain.setValueAtTime(0.0001, startAt)
    chirpGain.gain.exponentialRampToValueAtTime(0.045 * loudness, startAt + 0.002)
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tailDecay)

    chirpOsc.connect(chirpFilter)
    chirpFilter.connect(chirpGain)
    chirpGain.connect(destination)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.16)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.08), startAt)

    const noiseHighpass = audioContext.createBiquadFilter()
    noiseHighpass.type = 'highpass'
    noiseHighpass.frequency.setValueAtTime(1450 * randomSpread(0.08), startAt)

    const noiseBandpass = audioContext.createBiquadFilter()
    noiseBandpass.type = 'bandpass'
    noiseBandpass.frequency.setValueAtTime(2900 * randomSpread(0.08), startAt)
    noiseBandpass.frequency.exponentialRampToValueAtTime(1180 * randomSpread(0.06), startAt + tailDecay)
    noiseBandpass.Q.value = 1.8

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.022 * loudness, startAt + 0.001)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tailDecay)

    noiseSource.connect(noiseHighpass)
    noiseHighpass.connect(noiseBandpass)
    noiseBandpass.connect(noiseGain)
    noiseGain.connect(destination)

    carrierOsc.start(startAt)
    chirpOsc.start(startAt)
    noiseSource.start(startAt)

    carrierOsc.stop(startAt + blipDecay + 0.03)
    chirpOsc.stop(startAt + tailDecay + 0.03)
    noiseSource.stop(startAt + tailDecay + 0.03)

    this._recentBursts.push(now)
  }
}

const sound12Synth = new Sound12Synth()

export function playSound12() {
  sound12Synth.playCompuneAdvance()
}

export function primeSound12Audio() {
  sound12Synth.prime()
}