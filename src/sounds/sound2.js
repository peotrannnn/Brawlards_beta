import {
  calculateDistanceGain,
  getSharedNoiseBuffer,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND2_CONFIG = {
  baseOutputGain: 0.82,
  maxBurstsPerWindow: 8,
  burstWindowSec: 0.1,
  fullVolumeDistance: 1.8,
  maxAudibleDistance: 16,
  maxDistanceGain: 1.35,
  pitchJitter: 0.08,
  decayJitter: 0.14,
  gainJitter: 0.18,
  noiseMixJitter: 0.16,
}

class Sound2Synth {
  constructor() {
    this._recentBursts = []
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(0.24)
  }

  _trimRecentBursts(now) {
    const minTime = now - SOUND2_CONFIG.burstWindowSec
    while (this._recentBursts.length > 0 && this._recentBursts[0] < minTime) {
      this._recentBursts.shift()
    }
  }

  playSpawnPop({ sourcePosition = null, listenerPosition = null } = {}) {
    const playback = prepareSfxPlayback('sound2', SOUND2_CONFIG.baseOutputGain)
    if (!playback) return
    const { audioContext, destination } = playback

    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, SOUND2_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime
    this._trimRecentBursts(now)
    if (this._recentBursts.length >= SOUND2_CONFIG.maxBurstsPerWindow) return

    const startAt = now + 0.001
    const popPitch = randomSpread(SOUND2_CONFIG.pitchJitter)
    const bodyPitch = randomSpread(SOUND2_CONFIG.pitchJitter * 0.75)
    const popDecay = 0.032 * randomSpread(SOUND2_CONFIG.decayJitter)
    const bodyDecay = 0.11 * randomSpread(SOUND2_CONFIG.decayJitter * 0.8)
    const noiseDecay = 0.085 * randomSpread(SOUND2_CONFIG.decayJitter)
    const loudness = distanceGain * randomSpread(SOUND2_CONFIG.gainJitter)

    const eventGain = audioContext.createGain()
    eventGain.gain.setValueAtTime(randomSpread(SOUND2_CONFIG.noiseMixJitter * 0.6), startAt)
    eventGain.connect(destination)

    const popOsc = audioContext.createOscillator()
    popOsc.type = 'triangle'
    popOsc.frequency.setValueAtTime(780 * popPitch, startAt)
    popOsc.frequency.exponentialRampToValueAtTime(290 * bodyPitch, startAt + popDecay)

    const popGain = audioContext.createGain()
    popGain.gain.setValueAtTime(0.0001, startAt)
    popGain.gain.exponentialRampToValueAtTime(0.28 * loudness, startAt + 0.002)
    popGain.gain.exponentialRampToValueAtTime(0.0001, startAt + popDecay)

    popOsc.connect(popGain)
    popGain.connect(eventGain)

    const bodyOsc = audioContext.createOscillator()
    bodyOsc.type = 'sine'
    bodyOsc.frequency.setValueAtTime(420 * bodyPitch, startAt)
    bodyOsc.frequency.exponentialRampToValueAtTime(170 * bodyPitch, startAt + bodyDecay)

    const bodyGain = audioContext.createGain()
    bodyGain.gain.setValueAtTime(0.0001, startAt)
    bodyGain.gain.exponentialRampToValueAtTime(0.18 * loudness, startAt + 0.003)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + bodyDecay)

    bodyOsc.connect(bodyGain)
    bodyGain.connect(eventGain)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(0.24)
    noiseSource.playbackRate.setValueAtTime(randomSpread(0.08), startAt)

    const noiseFilter = audioContext.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.setValueAtTime(2400 * randomSpread(0.12), startAt)
    noiseFilter.frequency.exponentialRampToValueAtTime(820 * randomSpread(0.08), startAt + noiseDecay)
    noiseFilter.Q.value = 0.8

    const noiseGain = audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, startAt)
    noiseGain.gain.exponentialRampToValueAtTime(0.1 * loudness * randomSpread(SOUND2_CONFIG.noiseMixJitter), startAt + 0.004)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + noiseDecay)

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(eventGain)

    popOsc.start(startAt)
    bodyOsc.start(startAt)
    noiseSource.start(startAt)
    popOsc.stop(startAt + popDecay + 0.015)
    bodyOsc.stop(startAt + bodyDecay + 0.02)
    noiseSource.stop(startAt + noiseDecay + 0.015)

    this._recentBursts.push(now)
  }
}

const sound2Synth = new Sound2Synth()

export function playSound2(options) {
  sound2Synth.playSpawnPop(options)
}

export function primeSound2Audio() {
  sound2Synth.prime()
}
