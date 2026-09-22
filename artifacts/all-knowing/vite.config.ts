import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './src/lib/pwa.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions)],
  build: {
    rollupOptions: {
      output: {
        // Keep the React runtime in its own long-lived chunk so app/data edits
        // don't invalidate it on every deploy.
        manualChunks: (id: string) =>
          /node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id) ? 'react' : undefined,
      },
    },
  },
  server: {
    host: true,
    // `.scratch/` is gitignored task scratch (clones, dumps, headless-browser profiles).
    // Watching it can crash Vite on locked files (EBUSY) and should never trigger HMR.
    watch: { ignored: ['**/.scratch/**'] },
    proxy: {
      '/er-map': {
        target: 'http://127.0.0.1:8099',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/er-map/, '') || '/',
      },
      // Optional Gideon LLM (Meta Muse Spark). Dev-only, so the browser is not
      // blocked by CORS. The default base is `/gideon-llm/v1` in dev; an explicit
      // VITE_GIDEON_BASE_URL bypasses this and calls the provider directly.
      '/gideon-llm': {
        target: 'https://api.meta.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gideon-llm/, '') || '/',
      },
    },
  },
})
