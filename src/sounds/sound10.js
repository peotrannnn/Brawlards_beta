import {
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND10_CONFIG = {
  baseOutputGain: 0.54,
  maxBurstsPerWindow: 10,
  burstWindowSec: 0.12,
  pitchJitter: 0.05,
  gainJitter: 0.12,
  decayJitter: 0.1,
}

class Sound10Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND10_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playUiDing() {
    const playback = prepareSfxPlayback('sound10', SOUND10_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND10_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const loudness = randomSpread(SOUND10_CONFIG.gainJitter)
    const noteDecay = 0.12 * randomSpread(SOUND10_CONFIG.decayJitter)

    const shimmer = audioContext.createBiquadFilter()
    shimmer.type = 'bandpass'
    shimmer.frequency.setValueAtTime(1780 * randomSpread(0.06), startAt)
    shimmer.Q.value = 1.4
    shimmer.connect(destination)

    const tones = [
      { type: 'triangle', freq: 1520, gain: 0.16, startOffset: 0 },
      { type: 'sine', freq: 2280, gain: 0.07, startOffset: 0.006 },
    ]

    tones.forEach((tone) => {
      const toneStart = startAt + tone.startOffset
      const osc = audioContext.createOscillator()
      osc.type = tone.type
      const baseFreq = tone.freq * randomSpread(SOUND10_CONFIG.pitchJitter)
      osc.frequency.setValueAtTime(baseFreq, toneStart)
      osc.frequency.exponentialRampToValueAtTime(Math.max(480, baseFreq * 0.92), toneStart + noteDecay)

      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, toneStart)
      gain.gain.exponentialRampToValueAtTime(tone.gain * loudness, toneStart + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + noteDecay)

      osc.connect(gain)
      gain.connect(shimmer)

      osc.start(toneStart)
      osc.stop(toneStart + noteDecay + 0.03)
    })

    this._recentBursts.push(now)
  }
}

const sound10Synth = new Sound10Synth()

export function playSound10() {
  sound10Synth.playUiDing()
}

export function primeSound10Audio() {
  sound10Synth.prime()
}