import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // Use root path in local dev to avoid blank page from subpath-only URLs.
  // Use relative path in production so dist/index.html can run directly.
  base: mode === 'production' ? './' : '/',
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
