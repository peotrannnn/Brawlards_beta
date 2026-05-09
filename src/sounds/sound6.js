import {
  clamp,
  getSharedNoiseBuffer,
  lerp,
  prepareSfxPlayback,
  primeSharedSfxAudio,
  randomSpread,
} from './sfxCore.js'

const SOUND6_CONFIG = {
  baseOutputGain: 0.1,
  voiceLoudness: 0.5,
  minActiveIntensity: 0.02,
  releaseDestroySec: 0.24,
}

function setAudioParamTarget(param, value, now, timeConstant) {
  if (!param) return
  param.cancelScheduledValues(now)
  param.setTargetAtTime(value, now, timeConstant)
}

function disconnectNode(node) {
  if (!node || typeof node.disconnect !== 'function') return
  try {
    node.disconnect()
  } catch {}
}

function stopNode(node) {
  if (!node || typeof node.stop !== 'function') return
  try {
    node.stop()
  } catch {}
}

function createElectricalDistortionCurve(amount = 90) {
  const sampleCount = 2048
  const curve = new Float32Array(sampleCount)
  const k = Math.max(1, amount)

  for (let i = 0; i < sampleCount; i += 1) {
    const x = (i * 2 / (sampleCount - 1)) - 1
    curve[i] = ((1 + k) * x) / (1 + (k * Math.abs(x)))
  }

  return curve
}

class Sound6Synth {
  constructor() {
    this.voice = null
  }

  prime() {
    primeSharedSfxAudio()
    getSharedNoiseBuffer(1.4)
  }

  _destroyVoice() {
    if (!this.voice) return

    stopNode(this.voice.noiseSource)
    stopNode(this.voice.humOsc)
    stopNode(this.voice.buzzOsc)

    Object.values(this.voice).forEach(node => {
      disconnectNode(node)
    })

    this.voice = null
  }

  _ensureVoice() {
    const playback = prepareSfxPlayback('sound6', SOUND6_CONFIG.baseOutputGain)
    if (!playback) return null

    const { audioContext, destination } = playback
    if (this.voice && this.voice.audioContext === audioContext) {
      return this.voice
    }

    this._destroyVoice()

    const outputGain = audioContext.createGain()
    outputGain.gain.value = 0.0001
    outputGain.connect(destination)

    const noiseSource = audioContext.createBufferSource()
    noiseSource.buffer = getSharedNoiseBuffer(1.4)
    noiseSource.loop = true
    noiseSource.playbackRate.value = randomSpread(0.08)

    const noiseHighpass = audioContext.createBiquadFilter()
    noiseHighpass.type = 'highpass'
    noiseHighpass.frequency.value = 900
    noiseHighpass.Q.value = 1.1

    const noiseBandpass = audioContext.createBiquadFilter()
    noiseBandpass.type = 'bandpass'
    noiseBandpass.frequency.value = 2200
    noiseBandpass.Q.value = 2.2

    const noiseShaper = audioContext.createWaveShaper()
    noiseShaper.curve = createElectricalDistortionCurve(96)
    noiseShaper.oversample = '4x'

    const noiseGain = audioContext.createGain()
    noiseGain.gain.value = 0.0001

    noiseSource.connect(noiseHighpass)
    noiseHighpass.connect(noiseBandpass)
    noiseBandpass.connect(noiseShaper)
    noiseShaper.connect(noiseGain)
    noiseGain.connect(outputGain)

    const humOsc = audioContext.createOscillator()
    humOsc.type = 'square'
    humOsc.frequency.value = 58

    const humFilter = audioContext.createBiquadFilter()
    humFilter.type = 'bandpass'
    humFilter.frequency.value = 145
    humFilter.Q.value = 0.85

    const humGain = audioContext.createGain()
    humGain.gain.value = 0.0001

    humOsc.connect(humFilter)
    humFilter.connect(humGain)
    humGain.connect(outputGain)

    const buzzOsc = audioContext.createOscillator()
    buzzOsc.type = 'sawtooth'
    buzzOsc.frequency.value = 1350

    const buzzFilter = audioContext.createBiquadFilter()
    buzzFilter.type = 'bandpass'
    buzzFilter.frequency.value = 2400
    buzzFilter.Q.value = 5.5

    const buzzGain = audioContext.createGain()
    buzzGain.gain.value = 0.0001

    buzzOsc.connect(buzzFilter)
    buzzFilter.connect(buzzGain)
    buzzGain.connect(outputGain)

    noiseSource.start()
    humOsc.start()
    buzzOsc.start()

    this.voice = {
      audioContext,
      outputGain,
      noiseSource,
      noiseHighpass,
      noiseBandpass,
      noiseShaper,
      noiseGain,
      humOsc,
      humFilter,
      humGain,
      buzzOsc,
      buzzFilter,
      buzzGain,
      lastIntensity: 0,
      releaseDeadline: 0,
      motionSeed: Math.random() * Math.PI * 2,
    }

    return this.voice
  }

  _computeMotion(now, seed) {
    const slow = 0.5 + (0.5 * Math.sin((now * 19.0) + seed))
    const fast = 0.5 + (0.5 * Math.sin((now * 47.0) + (seed * 1.7)))
    const harsh = 0.5 + (0.5 * Math.sin((now * 113.0) + (seed * 2.3)))

    return {
      slow,
      fast,
      harsh,
      crackle: clamp((fast * 0.55) + (harsh * 0.75) - 0.18, 0, 1),
      surge: clamp((slow * 0.35) + (fast * 0.4) + (harsh * 0.45), 0, 1),
    }
  }

  setElectricalFlicker({ intensity = 0, immediate = false } = {}) {
    const targetIntensity = clamp(intensity, 0, 1)
    const voice = targetIntensity > 0.0001 ? this._ensureVoice() : this.voice
    if (!voice) return

    const now = voice.audioContext.currentTime
    const previousIntensity = voice.lastIntensity ?? 0
    const timeConstant = immediate ? 0.001 : (targetIntensity > previousIntensity ? 0.018 : 0.065)

    if (targetIntensity <= SOUND6_CONFIG.minActiveIntensity) {
      setAudioParamTarget(voice.outputGain.gain, 0.0001, now, timeConstant)
      setAudioParamTarget(voice.noiseGain.gain, 0.0001, now, timeConstant)
      setAudioParamTarget(voice.humGain.gain, 0.0001, now, timeConstant)
      setAudioParamTarget(voice.buzzGain.gain, 0.0001, now, timeConstant)

      if (!voice.releaseDeadline) {
        voice.releaseDeadline = now + SOUND6_CONFIG.releaseDestroySec
      }
      voice.lastIntensity = targetIntensity

      if (now >= voice.releaseDeadline) {
        this._destroyVoice()
      }
      return
    }

    voice.releaseDeadline = 0

    const strength = Math.pow(targetIntensity, 0.82)
    const motion = this._computeMotion(now, voice.motionSeed)

    const loudnessScale = SOUND6_CONFIG.voiceLoudness
    const outputGain = lerp(0.16, 0.95, strength) * lerp(0.8, 1.08, motion.surge) * loudnessScale
    const noiseGain = lerp(0.025, 0.34, strength) * lerp(0.55, 1.35, motion.crackle) * loudnessScale
    const humGain = lerp(0.02, 0.16, strength) * lerp(0.7, 1.15, motion.slow) * loudnessScale
    const buzzGain = lerp(0.02, 0.22, strength) * lerp(0.55, 1.35, motion.surge) * loudnessScale

    const noiseHighpassFreq = lerp(850, 1650, strength) * lerp(0.86, 1.18, motion.harsh)
    const noiseBandpassFreq = lerp(1850, 3450, strength) * lerp(0.78, 1.26, motion.crackle)
    const noiseBandpassQ = lerp(1.4, 7.2, strength)

    const humFreq = lerp(54, 94, strength) * lerp(0.95, 1.06, motion.slow)
    const humFilterFreq = lerp(115, 220, strength) * lerp(0.92, 1.14, motion.fast)
    const humFilterQ = lerp(0.7, 1.4, strength)

    const buzzFreq = lerp(980, 2650, strength) * lerp(0.82, 1.28, motion.surge)
    const buzzFilterFreq = lerp(1400, 4300, strength) * lerp(0.85, 1.15, motion.crackle)
    const buzzFilterQ = lerp(3.2, 11.5, strength)

    setAudioParamTarget(voice.outputGain.gain, outputGain, now, timeConstant)
    setAudioParamTarget(voice.noiseGain.gain, noiseGain, now, timeConstant)
    setAudioParamTarget(voice.humGain.gain, humGain, now, timeConstant)
    setAudioParamTarget(voice.buzzGain.gain, buzzGain, now, timeConstant)

    setAudioParamTarget(voice.noiseHighpass.frequency, noiseHighpassFreq, now, timeConstant)
    setAudioParamTarget(voice.noiseBandpass.frequency, noiseBandpassFreq, now, timeConstant)
    setAudioParamTarget(voice.noiseBandpass.Q, noiseBandpassQ, now, timeConstant)

    setAudioParamTarget(voice.humOsc.frequency, humFreq, now, timeConstant)
    setAudioParamTarget(voice.humFilter.frequency, humFilterFreq, now, timeConstant)
    setAudioParamTarget(voice.humFilter.Q, humFilterQ, now, timeConstant)

    setAudioParamTarget(voice.buzzOsc.frequency, buzzFreq, now, timeConstant)
    setAudioParamTarget(voice.buzzFilter.frequency, buzzFilterFreq, now, timeConstant)
    setAudioParamTarget(voice.buzzFilter.Q, buzzFilterQ, now, timeConstant)

    voice.lastIntensity = targetIntensity
  }

  playFlickerShriek({ intensity = 1 } = {}) {
    this.setElectricalFlicker({ intensity, immediate: true })
  }

  stop() {
    this._destroyVoice()
  }
}

const sound6Synth = new Sound6Synth()

export function setSound6FlickerState(options) {
  sound6Synth.setElectricalFlicker(options)
}

export function stopSound6Flicker() {
  sound6Synth.stop()
}

export function playSound6(options) {
  sound6Synth.playFlickerShriek(options)
}

export function primeSound6Audio() {
  sound6Synth.prime()
}