/**
 * Asset Registry - Manifest of all assets to preload during loading screen
 * This centralizes all asset paths and metadata
 * Used by preloadCoreAssets to load everything upfront
 */

// Model assets
export const MODELS = {
  baby_oil: {
    name: 'baby_oil',
    url: new URL('./models/baby_oil.glb', import.meta.url).href,
    type: 'model'
  },
  vending_machine: {
    name: 'vending_machine',
    url: new URL('./models/vending_machine_-_only_fantas.glb', import.meta.url).href,
    type: 'model'
  }
}

// Texture assets
export const TEXTURES = {
  person: {
    name: 'person',
    url: `${import.meta.env.BASE_URL}pictures/person.png`,
    type: 'texture'
  },
  no_signal: {
    name: 'no_signal',
    url: `${import.meta.env.BASE_URL}pictures/no_signal.png`,
    type: 'texture'
  }
}

// Audio assets
export const AUDIO_TRACKS = {
  'dream_pool': {
    name: 'dream_pool',
    url: `${import.meta.env.BASE_URL}music/9jackjack8-dream-pool-ambient-dreamcore-486226.mp3`,
    type: 'audio'
  },
  'dreamy_pads': {
    name: 'dreamy_pads',
    url: `${import.meta.env.BASE_URL}music/drmseq-dreamy-pads-with-simple-retro-beat-323033.mp3`,
    type: 'audio'
  },
  'abandon_park': {
    name: 'abandon_park',
    url: `${import.meta.env.BASE_URL}music/papulina-abandon-park-485630.mp3`,
    type: 'audio'
  },
  'dead_mall_water_park': {
    name: 'dead_mall_water_park',
    url: `${import.meta.env.BASE_URL}music/papulina-dead-mall-water-park-485627.mp3`,
    type: 'audio'
  },
  'liminal_pool_glow': {
    name: 'liminal_pool_glow',
    url: `${import.meta.env.BASE_URL}music/papulina-liminal-pool-glow-485628.mp3`,
    type: 'audio'
  },
  'structural_dissolution': {
    name: 'structural_dissolution',
    url: `${import.meta.env.BASE_URL}music/papulina-structural-dissolution-485623.mp3`,
    type: 'audio'
  },
  'waiting_room_for_no_one': {
    name: 'waiting_room_for_no_one',
    url: `${import.meta.env.BASE_URL}music/papulina-waiting-room-for-no-one-485626.mp3`,
    type: 'audio'
  },
  'bounce_my_checks': {
    name: 'bounce_my_checks',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-bounce-my-checks-slow-diamond-speaker-435313.mp3`,
    type: 'audio'
  },
  'cold_robot': {
    name: 'cold_robot',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-cold-robot-slower-435312.mp3`,
    type: 'audio'
  },
  'intentions': {
    name: 'intentions',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-intentions-270706.mp3`,
    type: 'audio'
  },
  'lake_like_glass': {
    name: 'lake_like_glass',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-lake-like-glass-270701.mp3`,
    type: 'audio'
  },
  'light_dreams': {
    name: 'light_dreams',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-light-dreams-435308.mp3`,
    type: 'audio'
  },
  'simplicity': {
    name: 'simplicity',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-simplicity-235293.mp3`,
    type: 'audio'
  },
  'transgressions': {
    name: 'transgressions',
    url: `${import.meta.env.BASE_URL}music/tim_kulig_free_music-transgressions-435310.mp3`,
    type: 'audio'
  },
  'the_calling': {
    name: 'the_calling',
    url: `${import.meta.env.BASE_URL}music/wanderingarc-the-calling-moonless-mountain-03-relaxing-ambient-music-255570.mp3`,
    type: 'audio'
  },
  'whispers': {
    name: 'whispers',
    url: `${import.meta.env.BASE_URL}music/wanderingarc-whispers-moonless-mountain-01-relaxing-ambient-music-255568.mp3`,
    type: 'audio'
  }
}

/**
 * Get complete preload manifest
 * @returns {Array} Array of all assets to preload
 */
export function getPreloadManifest() {
  return [
    ...Object.values(MODELS),
    ...Object.values(TEXTURES),
    ...Object.values(AUDIO_TRACKS)
  ]
}

/**
 * Get asset by category and name
 * @param {string} category - 'models', 'textures', or 'audio'
 * @param {string} name - Asset name
 * @returns {Object|null} Asset definition or null
 */
export function getAsset(category, name) {
  const categoryMap = {
    models: MODELS,
    textures: TEXTURES,
    audio: AUDIO_TRACKS
  }
  return categoryMap[category]?.[name] || null
}

/**
 * Get summary of all assets
 * @returns {Object} Asset counts by category
 */
export function getAssetStats() {
  return {
    models: Object.keys(MODELS).length,
    textures: Object.keys(TEXTURES).length,
    audio: Object.keys(AUDIO_TRACKS).length,
    total: Object.keys(MODELS).length + Object.keys(TEXTURES).length + Object.keys(AUDIO_TRACKS).length
  }
}
