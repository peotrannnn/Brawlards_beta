import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // Use root path in local dev to avoid blank page from subpath-only URLs.
  // Use absolute path for GitHub Pages deployment.
  base: mode === 'production' ? '/Brawlards_beta/' : '/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
}))
