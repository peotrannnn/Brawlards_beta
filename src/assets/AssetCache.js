import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * Centralized singleton cache for all assets (models, textures, audio, data)
 * All assets are loaded during preload phase and only retrieved during gameplay
 * No additional loading happens once gameplay starts
 */
class AssetCacheManager {
  constructor() {
    this.models = new Map()        // { name → GLTF object }
    this.textures = new Map()      // { name → THREE.Texture }
    this.audioBuffers = new Map()  // { name → ArrayBuffer }
    this.isLoading = new Map()     // { name → Promise } for loading in progress
    this.gltfLoader = new GLTFLoader()
    this.textureLoader = new THREE.TextureLoader()
  }

  /**
   * Preload a GLTF/GLB model and cache it
   * @param {string} name - Unique identifier (e.g., 'baby_oil', 'vending_machine')
   * @param {string} url - Path to GLB/GLTF file
   * @returns {Promise<GLTF>} Loaded and cached model
   */
  async preloadModel(name, url) {
    // Return if already cached
    if (this.models.has(name)) {
      return this.models.get(name)
    }

    // Return pending load if in progress
    if (this.isLoading.has(name)) {
      return this.isLoading.get(name)
    }

    // Load model
    const loadPromise = new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.models.set(name, gltf)
          this.isLoading.delete(name)
          resolve(gltf)
        },
        undefined,
        (error) => {
          this.isLoading.delete(name)
          reject(new Error(`Failed to load model '${name}' from ${url}: ${error.message}`))
        }
      )
    })

    this.isLoading.set(name, loadPromise)
    return loadPromise
  }

  /**
   * Get cached model (must be preloaded)
   * @param {string} name - Model identifier
   * @returns {GLTF|null} Cached model or null if not loaded
   */
  getModel(name) {
    return this.models.get(name) || null
  }

  /**
   * Clone a cached model (creates new instance from cached GLTF)
   * Use when you need multiple copies of same model
   * @param {string} name - Model identifier
   * @returns {THREE.Group} Cloned model scene
   */
  cloneModel(name) {
    const cached = this.models.get(name)
    if (!cached) {
      throw new Error(`Model '${name}' not cached. Must preload before cloning.`)
    }
    return cached.scene.clone()
  }

  /**
   * Clone with skeleton support (for rigged/animated models)
   * @param {string} name - Model identifier
   * @returns {THREE.Group} Cloned model with skeleton
   */
  cloneModelWithSkeleton(name) {
    const cached = this.models.get(name)
    if (!cached) {
      throw new Error(`Model '${name}' not cached. Must preload before cloning.`)
    }
    return cloneSkeleton(cached.scene)
  }

  /**
   * Preload a texture image
   * @param {string} name - Unique identifier
   * @param {string} url - Path to image file
   * @returns {Promise<THREE.Texture>} Loaded and cached texture
   */
  async preloadTexture(name, url) {
    if (this.textures.has(name)) {
      return this.textures.get(name)
    }

    if (this.isLoading.has(name)) {
      return this.isLoading.get(name)
    }

    const loadPromise = new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.textures.set(name, texture)
          this.isLoading.delete(name)
          resolve(texture)
        },
        undefined,
        (error) => {
          this.isLoading.delete(name)
          reject(new Error(`Failed to load texture '${name}' from ${url}: ${error.message}`))
        }
      )
    })

    this.isLoading.set(name, loadPromise)
    return loadPromise
  }

  /**
   * Get cached texture
   * @param {string} name - Texture identifier
   * @returns {THREE.Texture|null} Cached texture or null
   */
  getTexture(name) {
    return this.textures.get(name) || null
  }

  /**
   * Preload audio file as ArrayBuffer
   * @param {string} name - Unique identifier
   * @param {string} url - Path to audio file
   * @returns {Promise<ArrayBuffer>} Loaded audio buffer
   */
  async preloadAudio(name, url) {
    if (this.audioBuffers.has(name)) {
      return this.audioBuffers.get(name)
    }

    if (this.isLoading.has(name)) {
      return this.isLoading.get(name)
    }

    const loadPromise = (async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const buffer = await response.arrayBuffer()
        this.audioBuffers.set(name, buffer)
        this.isLoading.delete(name)
        return buffer
      } catch (error) {
        this.isLoading.delete(name)
        throw new Error(`Failed to load audio '${name}' from ${url}: ${error.message}`)
      }
    })()

    this.isLoading.set(name, loadPromise)
    return loadPromise
  }

  /**
   * Get cached audio buffer
   * @param {string} name - Audio identifier
   * @returns {ArrayBuffer|null} Cached audio buffer or null
   */
  getAudio(name) {
    return this.audioBuffers.get(name) || null
  }

  /**
   * Preload multiple assets in parallel
   * @param {Array} tasks - Array of { name, url, type }
   *   type can be 'model', 'texture', or 'audio'
   * @returns {Promise<Array>} All loaded assets
   */
  async preloadBatch(tasks) {
    const promises = tasks.map(({ name, url, type }) => {
      if (type === 'model') {
        return this.preloadModel(name, url)
      } else if (type === 'texture') {
        return this.preloadTexture(name, url)
      } else if (type === 'audio') {
        return this.preloadAudio(name, url)
      } else {
        return Promise.reject(new Error(`Unknown asset type: ${type}`))
      }
    })
    return Promise.all(promises)
  }

  /**
   * Get all loaded assets (for debugging)
   * @returns {Object} Summary of loaded assets
   */
  getStats() {
    return {
      models: this.models.size,
      textures: this.textures.size,
      audioBuffers: this.audioBuffers.size,
      isLoading: this.isLoading.size
    }
  }

  /**
   * Clear all caches (use sparingly - only for major scene transitions)
   * Disposes THREE.js resources
   */
  clear() {
    // Dispose models
    this.models.forEach(gltf => {
      gltf.scene.traverse(object => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    })
    this.models.clear()

    // Dispose textures
    this.textures.forEach(texture => texture.dispose())
    this.textures.clear()

    // Clear audio buffers
    this.audioBuffers.clear()

    // Handle pending loads
    this.isLoading.clear()
  }
}

// Export singleton instance
export const AssetCache = new AssetCacheManager()
