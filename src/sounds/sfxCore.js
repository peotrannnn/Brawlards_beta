import { settingsManager } from '../core/SettingsManager.js'
import { registerSoundFilter1Target } from './soundfilter1.js'

const SHARED_SFX_LOUDNESS_BOOST = 5

const SFX_CORE_STATE = {
  audioContext: null,
  outputGainNode: null,
  channelNodes: new Map(),
  noiseBuffers: new Map(),
  settingsBound: false,
  resumeListenersBound: false,
}

function ensureSfxCore() {
  if (SFX_CORE_STATE.audioContext && SFX_CORE_STATE.outputGainNode) {
    return SFX_CORE_STATE.audioContext
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null

  try {
    const audioContext = new AudioContextCtor()
    const outputGainNode = audioContext.createGain()
    registerSoundFilter1Target({
      key: 'sfx',
      audioContext,
      inputNode: outputGainNode,
      outputNode: audioContext.destination,
    })

    SFX_CORE_STATE.audioContext = audioContext
    SFX_CORE_STATE.outputGainNode = outputGainNode
    updateSharedSfxVolume()

    if (!SFX_CORE_STATE.settingsBound) {
      SFX_CORE_STATE.settingsBound = true
      settingsManager.onChange(() => {
        updateSharedSfxVolume()
      })
    }

    if (!SFX_CORE_STATE.resumeListenersBound) {
      SFX_CORE_STATE.resumeListenersBound = true
      window.addEventListener('pointerdown', resumeSharedSfxAudio, { passive: true })
      window.addEventListener('keydown', resumeSharedSfxAudio)
    }
  } catch {
    SFX_CORE_STATE.audioContext = null
    SFX_CORE_STATE.outputGainNode = null
    return null
  }

  return SFX_CORE_STATE.audioContext
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(start, end, alpha) {
  return start + (end - start) * alpha
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(1e-5, edge1 - edge0), 0, 1)
  return t * t * (3 - (2 * t))
}

export function randomSpread(spread) {
  return 1 + ((Math.random() * 2) - 1) * spread
}

export function calculateDistanceGain(sourcePosition, listenerPosition, config) {
  if (!sourcePosition || !listenerPosition) {
    return 1
  }

  const dx = sourcePosition.x - listenerPosition.x
  const dy = sourcePosition.y - listenerPosition.y
  const dz = sourcePosition.z - listenerPosition.z
  const distance = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz))

  if (distance >= config.maxAudibleDistance) {
    return 0
  }

  if (distance <= config.fullVolumeDistance) {
    return config.maxDistanceGain
  }

  const fade = 1 - smoothstep(
    config.fullVolumeDistance,
    config.maxAudibleDistance,
    distance
  )
  const inverse = 1 / (1 + Math.pow(distance / 3.2, 2))

  return clamp(Math.max(fade, inverse * 1.8), 0, config.maxDistanceGain)
}

function updateSharedSfxVolume() {
  if (!SFX_CORE_STATE.outputGainNode) return

  const masterVolume = settingsManager.get('masterVolume') ?? 1
  const sfxVolume = settingsManager.get('sfxVolume') ?? 1
  SFX_CORE_STATE.outputGainNode.gain.value = masterVolume * sfxVolume * SHARED_SFX_LOUDNESS_BOOST
}

export function resumeSharedSfxAudio() {
  const audioContext = ensureSfxCore()
  if (!audioContext || audioContext.state !== 'suspended') return
  audioContext.resume().catch(() => {})
}

export function primeSharedSfxAudio() {
  const audioContext = ensureSfxCore()
  if (!audioContext) return null
  resumeSharedSfxAudio()
  return audioContext
}

function getChannelNode(channelKey, baseOutputGain) {
  if (!SFX_CORE_STATE.outputGainNode) return null

  let channelNode = SFX_CORE_STATE.channelNodes.get(channelKey)
  if (!channelNode) {
    channelNode = SFX_CORE_STATE.audioContext.createGain()
    channelNode.connect(SFX_CORE_STATE.outputGainNode)
    SFX_CORE_STATE.channelNodes.set(channelKey, channelNode)
  }

  channelNode.gain.value = baseOutputGain
  return channelNode
}

export function prepareSfxPlayback(channelKey, baseOutputGain) {
  const audioContext = primeSharedSfxAudio()
  if (!audioContext || !SFX_CORE_STATE.outputGainNode) return null
  if (audioContext.state !== 'running') return null

  const destination = getChannelNode(channelKey, baseOutputGain)
  if (!destination) return null

  return { audioContext, destination }
}

export function getSharedNoiseBuffer(durationSeconds = 0.25) {
  const audioContext = ensureSfxCore()
  if (!audioContext) return null

  const frameLength = Math.max(1, Math.floor(audioContext.sampleRate * durationSeconds))
  const bufferKey = `${audioContext.sampleRate}:${frameLength}`
  const cachedBuffer = SFX_CORE_STATE.noiseBuffers.get(bufferKey)
  if (cachedBuffer) return cachedBuffer

  const buffer = audioContext.createBuffer(1, frameLength, audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frameLength; i += 1) {
    data[i] = (Math.random() * 2) - 1
  }

  SFX_CORE_STATE.noiseBuffers.set(bufferKey, buffer)
  return buffer
}
