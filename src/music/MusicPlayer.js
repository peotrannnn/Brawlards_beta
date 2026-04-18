/**
 * MusicPlayer - Background music system
 * Manages audio context, playlist generation, and fade in/out
 */
export class MusicPlayer {
  constructor() {
    this.audioContext = null
    this.currentSource = null
    this.currentGainNode = null
    this.musicFiles = []
    this.currentPlaylist = []
    this.currentIndex = 0
    this.isPlaying = false
    this.fadeInterval = null
    this.nextSongTimeout = null
    
    this.initAudioContext()
    this.loadMusicFiles()
  }
  
  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      document.addEventListener('click', () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume()
        }
      }, { once: true })
    } catch (error) {
      console.error('Web Audio API not supported:', error)
    }
  }
  
  async loadMusicFiles() {
    try {
      this.musicFiles = [
        '9jackjack8-dream-pool-ambient-dreamcore-486226.mp3',
        'drmseq-dreamy-pads-with-simple-retro-beat-323033.mp3',
        'papulina-abandon-park-485630.mp3',
        'papulina-dead-mall-water-park-485627.mp3',
        'papulina-liminal-pool-glow-485628.mp3',
        'papulina-structural-dissolution-485623.mp3',
        'papulina-waiting-room-for-no-one-485626.mp3',
        'tim_kulig_free_music-bounce-my-checks-slow-diamond-speaker-435313.mp3',
        'tim_kulig_free_music-cold-robot-slower-435312.mp3',
        'tim_kulig_free_music-intentions-270706.mp3',
        'tim_kulig_free_music-lake-like-glass-270701.mp3',
        'tim_kulig_free_music-light-dreams-435308.mp3',
        'tim_kulig_free_music-simplicity-235293.mp3',
        'tim_kulig_free_music-transgressions-435310.mp3',
        'wanderingarc-the-calling-moonless-mountain-03-relaxing-ambient-music-255570.mp3',
        'wanderingarc-whispers-moonless-mountain-01-relaxing-ambient-music-255568.mp3'
      ]
      
      this.generateRandomPlaylist()
    } catch (error) {
      console.error('Error loading music files:', error)
    }
  }
  
  generateRandomPlaylist() {
    const indices = Array.from({ length: this.musicFiles.length }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    this.currentPlaylist = indices.map(i => this.musicFiles[i])
  }
  
  getNextSong(currentSong) {
    const availableSongs = this.musicFiles.filter(song => song !== currentSong)
    const randomIndex = Math.floor(Math.random() * availableSongs.length)
    return availableSongs[randomIndex]
  }
  
  async playNextSong(fadeIn = true) {
    if (!this.audioContext || this.musicFiles.length === 0) return
    
    try {
      await this.stopCurrentSong()
      
      const currentSong = this.currentPlaylist[this.currentIndex]
      const nextSong = this.getNextSong(currentSong)
      
      if (!nextSong) return
      
      const response = await fetch(`./music/${nextSong}`)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      this.currentSource = this.audioContext.createBufferSource()
      this.currentGainNode = this.audioContext.createGain()
      
      this.currentSource.buffer = audioBuffer
      this.currentSource.connect(this.currentGainNode)
      this.currentGainNode.connect(this.audioContext.destination)
      
      this.currentGainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      
      this.currentSource.start()
      this.isPlaying = true
      
      // 10 seconds fade in
      if (fadeIn) {
        this.currentGainNode.gain.linearRampToValueAtTime(
          1, 
          this.audioContext.currentTime + 10
        )
      }
      
      // Schedule fade out 10 seconds before end
      const fadeOutStart = Math.max(0, audioBuffer.duration - 10)
      this.currentGainNode.gain.setValueAtTime(1, this.audioContext.currentTime + fadeOutStart)
      this.currentGainNode.gain.linearRampToValueAtTime(
        0, 
        this.audioContext.currentTime + audioBuffer.duration
      )
      
      // Schedule next song
      this.nextSongTimeout = setTimeout(() => {
        this.playNextSong(true)
      }, (audioBuffer.duration - 0.1) * 1000)
      
      this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length
      
    } catch (error) {
      console.error('Error playing next song:', error)
      setTimeout(() => this.playNextSong(true), 1000)
    }
  }
  
  async stopCurrentSong() {
    if (this.nextSongTimeout) {
      clearTimeout(this.nextSongTimeout)
      this.nextSongTimeout = null
    }
    
    if (this.currentSource) {
      try {
        this.currentSource.stop()
        this.currentSource.disconnect()
      } catch (e) {
        // Ignore if source already stopped
      }
      this.currentSource = null
    }
    
    if (this.currentGainNode) {
      this.currentGainNode.disconnect()
      this.currentGainNode = null
    }
    
    this.isPlaying = false
  }
  
  async start() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    await this.playNextSong(true)
  }
  
  pause() {
    if (this.nextSongTimeout) {
      clearTimeout(this.nextSongTimeout)
      this.nextSongTimeout = null
    }
    
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend()
    }
    this.isPlaying = false
  }
  
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume()
      this.isPlaying = true
    }
  }
  
  stop() {
    this.stopCurrentSong()
    if (this.audioContext) {
      this.audioContext.suspend()
    }
    this.isPlaying = false
  }
}
