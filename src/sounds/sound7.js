import {
  calculateDistanceGain,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND7_CONFIG = {
  baseOutputGain: 0.74,
  maxBurstsPerWindow: 10,
  burstWindowSec: 0.12,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 14,
  maxDistanceGain: 1.28,
  pitchJitter: 0.06,
  decayJitter: 0.12,
  gainJitter: 0.16,
}

class Sound7Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND7_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playPickupPop({ sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound7', SOUND7_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND7_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND7_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const loudness = distanceGain * randomSpread(SOUND7_CONFIG.gainJitter)
    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(1, startAt)
    eventGain.connect(destination)

    const noteProfiles = [
      { startOffset: 0, freq: 1320, decay: 0.038, gain: 0.18, type: 'triangle' },
      { startOffset: 0.024, freq: 1760, decay: 0.05, gain: 0.145, type: 'triangle' },
    ]

    noteProfiles.forEach((profile) => {
      const noteStart = startAt + profile.startOffset
      const noteDecay = profile.decay * randomSpread(SOUND7_CONFIG.decayJitter)
      const noteFreq = profile.freq * randomSpread(SOUND7_CONFIG.pitchJitter)

      const osc = audioContext.createOscillator()
      osc.type = profile.type
      osc.frequency.setValueAtTime(noteFreq, noteStart)
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(520, noteFreq * 1.08),
        noteStart + (noteDecay * 0.45)
      )
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(420, noteFreq * 0.92),
        noteStart + noteDecay
      )

      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(profile.gain * loudness, noteStart + 0.002)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDecay)

      osc.connect(gain)
      gain.connect(eventGain)

      osc.start(noteStart)
      osc.stop(noteStart + noteDecay + 0.02)
    })

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(610 * randomSpread(SOUND7_CONFIG.pitchJitter * 0.65), startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(295 * randomSpread(0.04), startAt + 0.074)

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(0.082 * loudness, startAt + 0.004)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.074)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(eventGain)

    const clickOsc = audioContext.createOscillator()
    clickOsc.type = 'square'
    clickOsc.frequency.setValueAtTime(2280 * randomSpread(SOUND7_CONFIG.pitchJitter), startAt)
    clickOsc.frequency.exponentialRampToValueAtTime(1180 * randomSpread(0.05), startAt + 0.016)

    const clickGain = audioContext.createGain()
    clickGain.gain.setValueAtTime(0.0001, startAt)
    clickGain.gain.exponentialRampToValueAtTime(0.07 * loudness, startAt + 0.0012)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.016)

    clickOsc.connect(clickGain)
    clickGain.connect(eventGain)

    bodyOsc.start(startAt)
    clickOsc.start(startAt)
    bodyOsc.stop(startAt + 0.094)
    clickOsc.stop(startAt + 0.03)

    this._recentBursts.push(now)
  }
}

const sound7Synth = new Sound7Synth()

export function playSound7(options) {
  sound7Synth.playPickupPop(options)
}

export function primeSound7Audio() {
  sound7Synth.prime()
}