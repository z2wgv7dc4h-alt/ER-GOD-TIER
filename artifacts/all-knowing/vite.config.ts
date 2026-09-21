import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
})
