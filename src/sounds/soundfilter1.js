const SOUND_FILTER1_STATE = {
  targets: new Map(),
  currentIntensity: 0,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function lerp(start, end, alpha) {
  return start + ((end - start) * alpha)
}

function disconnectNode(node) {
  if (!node || typeof node.disconnect !== 'function') return
  try {
    node.disconnect()
  } catch {}
}

function createNoiseBuffer(audioContext, durationSec = 1.25) {
  const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * durationSec))
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate)
  const data = buffer.getChannelData(0)

  let lastSample = 0
  let heldSample = 0
  let holdFrames = 0
  for (let i = 0; i < frameCount; i += 1) {
    if (holdFrames <= 0) {
      heldSample = ((Math.random() * 2) - 1) * (0.22 + (Math.random() * 0.4))
      holdFrames = 2 + Math.floor(Math.random() * 7)
    }
    holdFrames -= 1

    const white = (Math.random() * 2) - 1
    const crackle = Math.random() > 0.9984 ? ((Math.random() * 2) - 1) * 0.85 : 0
    lastSample = (lastSample * 0.68) + (white * 0.16) + (heldSample * 0.14) + (crackle * 0.22)
    data[i] = clamp(lastSample, -1, 1)
  }

  return buffer
}

function createStaticDistortionCurve(amount = 38) {
  const samples = 2048
  const curve = new Float32Array(samples)
  const k = Math.max(1, amount)

  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2 / (samples - 1)) - 1
    curve[i] = ((1 + k) * x) / (1 + (k * Math.abs(x)))
  }

  return curve
}

function applyTargetState(target, intensity, immediate = false) {
  if (!target?.audioContext || target.audioContext.state === 'closed') return

  const now = target.audioContext.currentTime
  const previousIntensity = target.lastIntensity ?? SOUND_FILTER1_STATE.currentIntensity
  const timeConstant = immediate ? 0.001 : (intensity > previousIntensity ? 0.03 : 0.08)
  const isMusicTarget = target.key === 'music'
  const muffleStrength = Math.pow(clamp(intensity, 0, 1), 0.62)
  const targetMuffleStrength = isMusicTarget
    ? clamp((muffleStrength * 0.9) + 0.02, 0, 1)
    : clamp((muffleStrength * 0.82) + 0.01, 0, 1)
  const staticOnset = clamp((intensity - 0.5) / 0.5, 0, 1)
  const staticReveal = Math.pow(staticOnset, 2.35)
  const cutoff = lerp(18000, isMusicTarget ? 780 : 1050, targetMuffleStrength)
  const resonance = lerp(0.0001, isMusicTarget ? 1.25 : 1.1, targetMuffleStrength)
  const highShelfGain = lerp(0, isMusicTarget ? -15 : -10, targetMuffleStrength)
  const midDipGain = lerp(0, isMusicTarget ? -6.5 : -4.5, targetMuffleStrength)
  const loudness = lerp(1, isMusicTarget ? 0.64 : 0.76, targetMuffleStrength)
  const staticGain = lerp(0.000001, isMusicTarget ? 0.008 : 0.012, staticReveal) * Math.max(0.0001, target.inputNode?.gain?.value ?? 1)
  const staticHighpass = lerp(700, 980, targetMuffleStrength)
  const staticBandpass = lerp(1400, 1900, targetMuffleStrength)
  const staticBandQ = lerp(0.9, 1.7, staticReveal)
  const staticPresenceGain = lerp(0, 2.6, staticReveal)
  const staticLowpass = lerp(5600, 3900, targetMuffleStrength)

  target.lowpass.frequency.cancelScheduledValues(now)
  target.lowpass.frequency.setTargetAtTime(cutoff, now, timeConstant)
  target.lowpass.Q.cancelScheduledValues(now)
  target.lowpass.Q.setTargetAtTime(resonance, now, timeConstant)
  target.midDip.gain.cancelScheduledValues(now)
  target.midDip.gain.setTargetAtTime(midDipGain, now, timeConstant)
  target.highShelf.gain.cancelScheduledValues(now)
  target.highShelf.gain.setTargetAtTime(highShelfGain, now, timeConstant)
  target.postGain.gain.cancelScheduledValues(now)
  target.postGain.gain.setTargetAtTime(loudness, now, timeConstant)
  target.staticHighpass.frequency.cancelScheduledValues(now)
  target.staticHighpass.frequency.setTargetAtTime(staticHighpass, now, timeConstant)
  target.staticBandpass.frequency.cancelScheduledValues(now)
  target.staticBandpass.frequency.setTargetAtTime(staticBandpass, now, timeConstant)
  target.staticBandpass.Q.cancelScheduledValues(now)
  target.staticBandpass.Q.setTargetAtTime(staticBandQ, now, timeConstant)
  target.staticPresence.gain.cancelScheduledValues(now)
  target.staticPresence.gain.setTargetAtTime(staticPresenceGain, now, timeConstant)
  target.staticLowpass.frequency.cancelScheduledValues(now)
  target.staticLowpass.frequency.setTargetAtTime(staticLowpass, now, timeConstant)
  target.staticGain.gain.cancelScheduledValues(now)
  target.staticGain.gain.setTargetAtTime(staticGain, now, timeConstant)

  target.lastIntensity = intensity
}

export function registerSoundFilter1Target({ key, audioContext, inputNode, outputNode }) {
  if (!key || !audioContext || !inputNode || !outputNode) return null

  const existing = SOUND_FILTER1_STATE.targets.get(key)
  if (
    existing
    && existing.audioContext === audioContext
    && existing.inputNode === inputNode
    && existing.outputNode === outputNode
  ) {
    applyTargetState(existing, SOUND_FILTER1_STATE.currentIntensity, true)
    return existing
  }

  disconnectNode(inputNode)

  const lowpass = audioContext.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 22000
  lowpass.Q.value = 0.0001

  const midDip = audioContext.createBiquadFilter()
  midDip.type = 'peaking'
  midDip.frequency.value = 1350
  midDip.Q.value = 0.78
  midDip.gain.value = 0

  const highShelf = audioContext.createBiquadFilter()
  highShelf.type = 'highshelf'
  highShelf.frequency.value = 2100
  highShelf.gain.value = 0

  const postGain = audioContext.createGain()
  postGain.gain.value = 1

  const staticSource = audioContext.createBufferSource()
  staticSource.buffer = createNoiseBuffer(audioContext)
  staticSource.loop = true

  const staticHighpass = audioContext.createBiquadFilter()
  staticHighpass.type = 'highpass'
  staticHighpass.frequency.value = 950
  staticHighpass.Q.value = 1.1

  const staticShaper = audioContext.createWaveShaper()
  staticShaper.curve = createStaticDistortionCurve(42)
  staticShaper.oversample = '4x'

  const staticBandpass = audioContext.createBiquadFilter()
  staticBandpass.type = 'bandpass'
  staticBandpass.frequency.value = 1850
  staticBandpass.Q.value = 1.2

  const staticPresence = audioContext.createBiquadFilter()
  staticPresence.type = 'peaking'
  staticPresence.frequency.value = 2850
  staticPresence.Q.value = 1.45
  staticPresence.gain.value = 0

  const staticLowpass = audioContext.createBiquadFilter()
  staticLowpass.type = 'lowpass'
  staticLowpass.frequency.value = 7600
  staticLowpass.Q.value = 0.72

  const staticGain = audioContext.createGain()
  staticGain.gain.value = 0.00001

  inputNode.connect(lowpass)
  lowpass.connect(midDip)
  midDip.connect(highShelf)
  highShelf.connect(postGain)
  postGain.connect(outputNode)

  staticSource.connect(staticHighpass)
  staticHighpass.connect(staticShaper)
  staticShaper.connect(staticBandpass)
  staticBandpass.connect(staticPresence)
  staticPresence.connect(staticLowpass)
  staticLowpass.connect(staticGain)
  staticGain.connect(outputNode)
  staticSource.start()

  const target = {
    key,
    audioContext,
    inputNode,
    outputNode,
    lowpass,
    midDip,
    highShelf,
    postGain,
    staticSource,
    staticHighpass,
    staticShaper,
    staticBandpass,
    staticPresence,
    staticLowpass,
    staticGain,
    lastIntensity: SOUND_FILTER1_STATE.currentIntensity,
  }

  SOUND_FILTER1_STATE.targets.set(key, target)
  applyTargetState(target, SOUND_FILTER1_STATE.currentIntensity, true)
  return target
}

export function updateSoundFilter1({ underwaterIntensity = 0, guyProximityIntensity = 0, delta = 1 / 60 } = {}) {
  const underwater = clamp(underwaterIntensity, 0, 1)
  const guyProximity = clamp(guyProximityIntensity, 0, 1)
  const combined = 1 - ((1 - underwater) * (1 - guyProximity))

  const riseAlpha = 1 - Math.exp(-Math.max(0, delta) * 8.5)
  const fallAlpha = 1 - Math.exp(-Math.max(0, delta) * 4.2)
  const alpha = combined > SOUND_FILTER1_STATE.currentIntensity ? riseAlpha : fallAlpha

  SOUND_FILTER1_STATE.currentIntensity = lerp(
    SOUND_FILTER1_STATE.currentIntensity,
    combined,
    clamp(alpha, 0, 1)
  )

  if (Math.abs(SOUND_FILTER1_STATE.currentIntensity - combined) < 0.0005) {
    SOUND_FILTER1_STATE.currentIntensity = combined
  }

  SOUND_FILTER1_STATE.targets.forEach(target => {
    applyTargetState(target, SOUND_FILTER1_STATE.currentIntensity)
  })

  return SOUND_FILTER1_STATE.currentIntensity
}

export function resetSoundFilter1({ immediate = false } = {}) {
  SOUND_FILTER1_STATE.currentIntensity = 0
  SOUND_FILTER1_STATE.targets.forEach(target => {
    applyTargetState(target, 0, immediate)
  })
}