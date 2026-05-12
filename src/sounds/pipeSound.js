import {
  calculateDistanceGain,
  clamp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const PIPE_SOUND_URL = new URL('./pipe.mp3', import.meta.url).href

const PIPE_SOUND_CONFIG = {
  baseOutputGain: 0.82,
  fullVolumeDistance: 2.1,
  maxAudibleDistance: 18,
  maxDistanceGain: 1.28,
  pitchJitter: 0.045,
  gainJitter: 0.12,
}

class PipeSoundPlayer {
  constructor() {
    this._buffer = null
    this._bufferPromise = null
    this._bufferContext = null
  }

  prime() {
    const audioContext = primeSharedSfxAudio()
    if (!audioContext) return
    void this._ensureBuffer(audioContext)
  }

  async _ensureBuffer(audioContext) {
    if (!audioContext) return null
    if (this._buffer && this._bufferContext === audioContext) {
      return this._buffer
    }
    if (this._bufferPromise) {
      return this._bufferPromise
    }

    this._bufferPromise = fetch(PIPE_SOUND_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load pipe sound: ${response.status}`)
        }
        return response.arrayBuffer()
      })
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer.slice(0)))
      .then((buffer) => {
        this._buffer = buffer
        this._bufferContext = audioContext
        return buffer
      })
      .catch(() => null)
      .finally(() => {
        this._bufferPromise = null
      })

    return this._bufferPromise
  }

  play({ sourcePosition = null, listenerPosition = null, intensity = 1 } = {}) {
    const playback = prepareSfxPlayback('pipeSound', PIPE_SOUND_CONFIG.baseOutputGain)
    if (!playback) return

    const { audioContext, destination } = playback
    if (!this._buffer || this._bufferContext !== audioContext) {
      void this._ensureBuffer(audioContext)
      return
    }

    const distanceGain = calculateDistanceGain(sourcePosition, listenerPosition, PIPE_SOUND_CONFIG)
    if (distanceGain <= 0.015) return

    const now = audioContext.currentTime + 0.001
    const normalizedIntensity = clamp(intensity, 0.2, 1.35)

    const source = audioContext.createBufferSource()
    source.buffer = this._buffer
    source.playbackRate.setValueAtTime(randomSpread(PIPE_SOUND_CONFIG.pitchJitter), now)

    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(
      distanceGain * normalizedIntensity * randomSpread(PIPE_SOUND_CONFIG.gainJitter),
      now
    )

    source.connect(gain)
    gain.connect(destination)

    source.start(now)
    source.onended = () => {
      try {
        source.disconnect()
      } catch {}
      try {
        gain.disconnect()
      } catch {}
    }
  }
}

const pipeSoundPlayer = new PipeSoundPlayer()

export function playPipeSound(options) {
  pipeSoundPlayer.play(options)
}

export function primePipeSoundAudio() {
  pipeSoundPlayer.prime()
}