import { settingsManager } from '../core/SettingsManager.js'
import { registerSoundFilter1Target } from '../sounds/soundfilter1.js'

const MUSIC_PLAYER_CONFIG = {
  fadeInSec: 15,
  fadeOutSec: 1.35,
  sectionTransitionDelayMs: [15000, 30000],
  nextSongDelayMs: [15000, 30000],
  retryDelayMs: 1500,
  fadeInStartGain: 0.0001,
}

const MUSIC_GROUPS = {
  lobby: [
    '9jackjack8-dream-pool-ambient-dreamcore-486226.mp3',
    'tim_kulig_free_music-transgressions-435310.mp3',
    'wanderingarc-whispers-moonless-mountain-01-relaxing-ambient-music-255568.mp3',
    'drmseq-dreamy-pads-with-simple-retro-beat-323033.mp3',
  ],
  section1: [
    'mezhdunami-mezhdunami-little-world-141275.mp3',
    '9jackjack8-dream-pool-ambient-dreamcore-486226.mp3',
    'papulina-waiting-room-for-no-one-485626.mp3',
    'wanderingarc-the-calling-moonless-mountain-03-relaxing-ambient-music-255570.mp3',
  ],
  section2: [
    'papulina-abandon-park-485630.mp3',
    'papulina-dead-mall-water-park-485627.mp3',
    'papulina-liminal-pool-glow-485628.mp3',
    'papulina-structural-dissolution-485623.mp3',
    'tim_kulig_free_music-simplicity-235293.mp3',
  ],
  section3: [
    'tim_kulig_free_music-bounce-my-checks-slow-diamond-speaker-435313.mp3',
    'tim_kulig_free_music-cold-robot-slower-435312.mp3',
    'tim_kulig_free_music-intentions-270706.mp3',
    'daljit_kundi-voices-from-within-akira-yamaoka-gathering-mix-392840.mp3',
    'kuzu420-nowhere-chilling-dark-vibe-ambient-music-265672.mp3',
  ],
  chasing: [
    'daljit_kundi-matter-is-energy-akira-yamaoka-unreasonable-mix-392839.mp3',
    'syncraftianofficial-syncraftian-creeper-355353.mp3',
  ],
  guy: [
    'tim_kulig_free_music-lake-like-glass-270701.mp3',
  ],

}

const MUSIC_TRACK_URLS = Object.fromEntries(
  Object.entries(import.meta.glob('./*.mp3', { eager: true, import: 'default' })).map(([filePath, assetUrl]) => {
    const fileName = filePath.split('/').pop()
    return [fileName, assetUrl]
  })
)

function randomIntInRange(min, max) {
  const safeMin = Math.min(min, max)
  const safeMax = Math.max(min, max)
  return Math.floor(Math.random() * ((safeMax - safeMin) + 1)) + safeMin
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

export class MusicPlayer {
    /**
     * Request Chasing theme music (for section3 chase event)
     * @param {Object} options
     */
    async requestChasing(options = {}) {
      await this.requestGroup('chasing', {
        immediate: options.immediate ?? true,
        fadeOutSec: options.fadeOutSec,
        delayMs: options.delayMs,
        delayRangeMs: options.delayRangeMs,
        forceRestart: options.forceRestart ?? true,
      })
    }

    /**
     * Return to section3 music (after chase ends)
     * @param {Object} options
     */
    async returnToSection3(options = {}) {
      await this.requestGroup('section3', {
        immediate: options.immediate ?? true,
        fadeOutSec: options.fadeOutSec,
        delayMs: options.delayMs,
        delayRangeMs: options.delayRangeMs,
        forceRestart: options.forceRestart ?? true,
      })
    }
  constructor() {
    this.audioContext = null
    this.masterGainNode = null
    this.currentSource = null
    this.currentGainNode = null
    this.currentGroupKey = null
    this.currentTrackName = null
    this.requestedGroupKey = null
    this.pendingGroupKey = null
    this.pendingStartTimer = null
    this.isPlaying = false
    this.playbackState = 'off'
    this._requestVersion = 0
    this._lastTrackByGroup = new Map()
    this._nextTrackBlockName = null
    this._resumeBound = false

    this.initAudioContext()
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.masterGainNode = this.audioContext.createGain()
      registerSoundFilter1Target({
        key: 'music',
        audioContext: this.audioContext,
        inputNode: this.masterGainNode,
        outputNode: this.audioContext.destination,
      })
      this.updateVolume()

      settingsManager.onChange(() => {
        this.updateVolume()
      })

      if (!this._resumeBound) {
        this._resumeBound = true
        window.addEventListener('pointerdown', () => {
          this.unlock().catch(() => {})
        }, { passive: true })
        window.addEventListener('keydown', () => {
          this.unlock().catch(() => {})
        })
      }
    } catch (error) {
      console.error('Web Audio API not supported:', error)
    }
  }

  updateVolume() {
    if (!this.masterGainNode) return

    const masterVolume = settingsManager.get('masterVolume') ?? 1
    const musicVolume = settingsManager.get('musicVolume') ?? 1
    this.masterGainNode.gain.value = masterVolume * musicVolume
  }

  async unlock() {
    if (!this.audioContext || this.audioContext.state !== 'suspended') return
    await this.audioContext.resume()
  }

  async start() {
    await this.requestLobby({ immediate: true })
  }

  pause() {
    if (!this.audioContext || this.audioContext.state !== 'running') return
    this.audioContext.suspend().catch(() => {})
    this.playbackState = 'paused'
  }

  resume() {
    this.unlock().catch(() => {})
    if (this.currentSource) {
      this._setPlaybackState('playing')
      return
    }
    if (this.requestedGroupKey || this.pendingStartTimer) {
      this._setPlaybackState('waiting')
    }
  }

  async stop(options = {}) {
    await this.requestSilence(options)
  }

  async requestLobby(options = {}) {
    await this.requestGroup('lobby', {
      immediate: options.immediate ?? true,
      fadeOutSec: options.fadeOutSec,
      delayMs: options.delayMs,
      delayRangeMs: options.delayRangeMs,
      forceRestart: options.forceRestart,
    })
  }

  async requestSection(sectionKey, options = {}) {
    const groupKey = this._resolveSectionGroupKey(sectionKey)
    if (!groupKey) return

    await this.requestGroup(groupKey, {
      immediate: options.immediate ?? false,
      fadeOutSec: options.fadeOutSec,
      delayMs: options.delayMs,
      delayRangeMs: options.delayRangeMs ?? MUSIC_PLAYER_CONFIG.sectionTransitionDelayMs,
      forceRestart: options.forceRestart,
    })
  }

  async requestGuy(options = {}) {
    await this.requestGroup('guy', {
      immediate: options.immediate ?? true,
      fadeOutSec: options.fadeOutSec,
      delayMs: options.delayMs,
      delayRangeMs: options.delayRangeMs,
      forceRestart: options.forceRestart ?? true,
    })
  }

  async requestSilence({ immediate = false, fadeOutSec = MUSIC_PLAYER_CONFIG.fadeOutSec } = {}) {
    const requestVersion = ++this._requestVersion
    this.requestedGroupKey = null
    this.pendingGroupKey = null
    this._nextTrackBlockName = null
    this._clearPendingStartTimer()

    if (!this.currentSource || !this.currentGainNode) {
      this._disposeCurrentPlayback()
      this._setPlaybackState('off')
      return
    }

    await this._fadeOutAndDisposeCurrent({ immediate, fadeOutSec, requestVersion })
    if (this._requestVersion === requestVersion) {
      this._setPlaybackState('off')
    }
  }

  async requestGroup(groupKey, {
    immediate = false,
    fadeOutSec = MUSIC_PLAYER_CONFIG.fadeOutSec,
    delayMs = null,
    delayRangeMs = null,
    forceRestart = false,
  } = {}) {
    if (!MUSIC_GROUPS[groupKey]?.length) {
      await this.requestSilence({ immediate, fadeOutSec })
      return
    }

    const sameCurrentGroup = this.currentSource && this.currentGroupKey === groupKey
    const samePendingGroup = this.pendingStartTimer !== null && this.pendingGroupKey === groupKey
    if (!forceRestart && this.requestedGroupKey === groupKey && (sameCurrentGroup || samePendingGroup)) {
      return
    }

    const requestVersion = ++this._requestVersion
    const currentTrackName = this.currentTrackName
    const isCrossGroupSwitch = !!currentTrackName && !!this.currentGroupKey && this.currentGroupKey !== groupKey
    this.requestedGroupKey = groupKey
    this.pendingGroupKey = null
    this._nextTrackBlockName = isCrossGroupSwitch ? currentTrackName : null
    this._clearPendingStartTimer()

    if (this.currentSource && this.currentGainNode) {
      await this._fadeOutAndDisposeCurrent({ immediate, fadeOutSec, requestVersion })
      if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
        return
      }
    } else {
      this._disposeCurrentPlayback()
    }

    const scheduledDelayMs = immediate
      ? 0
      : (typeof delayMs === 'number' ? delayMs : this._pickDelayMs(delayRangeMs))

    this._scheduleGroupPlayback(groupKey, scheduledDelayMs, requestVersion)
  }

  _resolveSectionGroupKey(sectionKey) {
    if (sectionKey === 'section4') return 'section2'
    return MUSIC_GROUPS[sectionKey] ? sectionKey : null
  }

  _pickDelayMs(delayRangeMs) {
    if (!Array.isArray(delayRangeMs) || delayRangeMs.length < 2) {
      return 0
    }

    return randomIntInRange(delayRangeMs[0], delayRangeMs[1])
  }

  _resolveTrackUrl(trackName) {
    return MUSIC_TRACK_URLS[trackName] || `./music/${trackName}`
  }

  _pickNextTrackName(groupKey) {
    const tracks = MUSIC_GROUPS[groupKey] || []
    if (!tracks.length) return null

    const previousTrack = this._lastTrackByGroup.get(groupKey) || null
    const blockedTrack = this._nextTrackBlockName || null
    if (tracks.length === 1) {
      return tracks[0]
    }

    const candidates = tracks.filter(trackName => trackName !== previousTrack && trackName !== blockedTrack)
    const fallbackCandidates = tracks.filter(trackName => trackName !== previousTrack)
    const pool = candidates.length ? candidates : (fallbackCandidates.length ? fallbackCandidates : tracks)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  _scheduleGroupPlayback(groupKey, delayMs, requestVersion) {
    const safeDelayMs = Math.max(0, delayMs || 0)
    this.pendingGroupKey = groupKey
    this._setPlaybackState('waiting')

    if (safeDelayMs === 0) {
      this.pendingGroupKey = null
      void this._startRandomTrackForGroup(groupKey, requestVersion)
      return
    }

    this.pendingStartTimer = window.setTimeout(() => {
      this.pendingStartTimer = null
      this.pendingGroupKey = null
      if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
        return
      }
      void this._startRandomTrackForGroup(groupKey, requestVersion)
    }, safeDelayMs)
  }

  async _startRandomTrackForGroup(groupKey, requestVersion) {
    if (!this.audioContext || this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
      return
    }

    const trackName = this._pickNextTrackName(groupKey)
    if (!trackName) {
      this._setPlaybackState('off')
      return
    }

    this._setPlaybackState('loading')

    try {
      const response = await fetch(this._resolveTrackUrl(trackName))
      if (!response.ok) {
        throw new Error(`Failed to load music track: ${trackName}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
        return
      }

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
        return
      }

      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      const now = this.audioContext.currentTime
      const startAt = now + 0.05

      source.buffer = audioBuffer
      gainNode.gain.value = MUSIC_PLAYER_CONFIG.fadeInStartGain
      source.connect(gainNode)
      gainNode.connect(this.masterGainNode)
      gainNode.gain.cancelScheduledValues(now)
      gainNode.gain.setValueAtTime(MUSIC_PLAYER_CONFIG.fadeInStartGain, now)
      gainNode.gain.setValueAtTime(MUSIC_PLAYER_CONFIG.fadeInStartGain, startAt)
      gainNode.gain.linearRampToValueAtTime(1, startAt + MUSIC_PLAYER_CONFIG.fadeInSec)

      source.onended = () => {
        if (source !== this.currentSource) return

        this._disposeCurrentPlayback()
        this.currentGroupKey = groupKey
        if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
          this._setPlaybackState('off')
          return
        }

        this._scheduleGroupPlayback(
          groupKey,
          this._pickDelayMs(MUSIC_PLAYER_CONFIG.nextSongDelayMs),
          requestVersion
        )
      }

      source.start(startAt)

      this.currentSource = source
      this.currentGainNode = gainNode
      this.currentGroupKey = groupKey
      this.currentTrackName = trackName
      this._nextTrackBlockName = null
      this._lastTrackByGroup.set(groupKey, trackName)
      this._setPlaybackState('playing')
    } catch (error) {
      console.error('Error starting music track:', error)
      if (this._requestVersion !== requestVersion || this.requestedGroupKey !== groupKey) {
        return
      }

      this._scheduleGroupPlayback(groupKey, MUSIC_PLAYER_CONFIG.retryDelayMs, requestVersion)
    }
  }

  _disposePlaybackNodes(sourceNode, gainNode) {
    if (sourceNode) {
      sourceNode.onended = null
      disconnectNode(sourceNode)
      stopNode(sourceNode)
    }

    disconnectNode(gainNode)
  }

  _disposeCurrentPlayback() {
    this._disposePlaybackNodes(this.currentSource, this.currentGainNode)
    this.currentSource = null
    this.currentGainNode = null
    this.currentTrackName = null
    this.isPlaying = false
    if (!this.requestedGroupKey && !this.pendingStartTimer) {
      this.currentGroupKey = null
    }
  }

  _clearPendingStartTimer() {
    if (this.pendingStartTimer !== null) {
      clearTimeout(this.pendingStartTimer)
      this.pendingStartTimer = null
    }
  }

  _setPlaybackState(nextState) {
    this.playbackState = nextState
    this.isPlaying = nextState !== 'off'
  }

  _fadeOutAndDisposeCurrent({ immediate = false, fadeOutSec = MUSIC_PLAYER_CONFIG.fadeOutSec, requestVersion }) {
    if (!this.currentSource || !this.currentGainNode || !this.audioContext) {
      this._disposeCurrentPlayback()
      return Promise.resolve()
    }

    const sourceNode = this.currentSource
    const gainNode = this.currentGainNode
    sourceNode.onended = null

    if (immediate) {
      this._disposeCurrentPlayback()
      return Promise.resolve()
    }

    const now = this.audioContext.currentTime
    const durationSec = Math.max(0.08, fadeOutSec)
    const currentGain = Math.max(0.0001, gainNode.gain.value)

    this._setPlaybackState('stopping')
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(currentGain, now)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

    try {
      sourceNode.stop(now + durationSec + 0.05)
    } catch {}

    return new Promise(resolve => {
      window.setTimeout(() => {
        this._disposePlaybackNodes(sourceNode, gainNode)
        if (this.currentSource === sourceNode) {
          this.currentSource = null
        }
        if (this.currentGainNode === gainNode) {
          this.currentGainNode = null
          this.currentTrackName = null
        }
        if (this._requestVersion === requestVersion) {
          this.isPlaying = !!this.requestedGroupKey || this.pendingStartTimer !== null
        }
        resolve()
      }, Math.ceil((durationSec * 1000) + 80))
    })
  }
}

export const musicPlayer = new MusicPlayer()
