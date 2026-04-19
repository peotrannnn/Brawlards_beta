import { AssetCache } from './AssetCache.js'
import { getPreloadManifest } from './AssetRegistry.js'

let preloadPromise = null
let optionalWarmupStarted = false

const CRITICAL_PRELOAD_CONCURRENCY = 4
const OPTIONAL_PRELOAD_CONCURRENCY = 2

function loadAsset(asset) {
  if (asset.type === 'model') {
    return AssetCache.preloadModel(asset.name, asset.url)
  }
  if (asset.type === 'texture') {
    return AssetCache.preloadTexture(asset.name, asset.url)
  }
  if (asset.type === 'audio') {
    return AssetCache.preloadAudio(asset.name, asset.url)
  }
  return Promise.reject(new Error(`Unknown asset type: ${asset.type}`))
}

async function preloadWithConcurrency(tasks, concurrency, onEachDone) {
  if (!Array.isArray(tasks) || tasks.length === 0) return

  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex
      nextIndex += 1
      const asset = tasks[index]

      try {
        await loadAsset(asset)
        if (typeof onEachDone === 'function') onEachDone(null, asset)
      } catch (error) {
        if (typeof onEachDone === 'function') onEachDone(error, asset)
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, tasks.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

function scheduleIdleTask(task) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      task().catch((error) => {
        console.error('[preloadAssets] Optional warmup failed:', error)
      })
    }, { timeout: 1500 })
    return
  }

  setTimeout(() => {
    task().catch((error) => {
      console.error('[preloadAssets] Optional warmup failed:', error)
    })
  }, 400)
}

function startOptionalWarmup(optionalAssets) {
  if (optionalWarmupStarted || !optionalAssets.length) return
  optionalWarmupStarted = true

  scheduleIdleTask(async () => {
    await preloadWithConcurrency(optionalAssets, OPTIONAL_PRELOAD_CONCURRENCY)
  })
}

/**
 * Preload all core assets into cache during loading screen
 * After this completes, all assets are available and no more loading occurs
 *
 * @param {Function} onProgress - Called with (progress: 0-1, label: string)
 * @returns {Promise<void>}
 */
export function preloadCoreAssets(onProgress) {
  if (preloadPromise) {
    if (typeof onProgress === 'function') onProgress(1, 'ready')
    return preloadPromise
  }

  const manifest = getPreloadManifest()
  const criticalAssets = manifest.filter(asset => asset.type !== 'audio')
  const optionalAssets = manifest.filter(asset => asset.type === 'audio')

  const totalCritical = criticalAssets.length || 1
  let completedCritical = 0

  const report = (label) => {
    if (typeof onProgress !== 'function') return
    onProgress(Math.min(completedCritical / totalCritical, 1), label)
  }

  preloadPromise = (async () => {
    report('starting')

    await preloadWithConcurrency(
      criticalAssets,
      CRITICAL_PRELOAD_CONCURRENCY,
      (error, asset) => {
        completedCritical += 1
        if (error) {
          console.error(`Asset preload error: ${error.message}`)
          report(`ERROR: ${asset.name}`)
          return
        }
        report(asset.name)
      }
    )

    report('core ready')

    // Audio warmup is optional and deferred so gameplay can start sooner.
    startOptionalWarmup(optionalAssets)

    return undefined
  })().catch((error) => {
    preloadPromise = null
    throw error
  })

  return preloadPromise
}

