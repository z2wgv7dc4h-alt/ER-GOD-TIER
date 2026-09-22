import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaOptions } from './src/lib/pwa.ts'

/**
 * Serve the vendored map engine from OUR dev/preview server, so the tiled map
 * needs no separate `node server/index.js` process.
 *
 * The engine's map is static: `web/` (HTML/JS/CSS/icons) + `web/tiles/` + a
 * markers JSON. Only the save reader and live-memory need Node — and we don't
 * need those (PC-only, and the app already parses `.sl2` in the browser). So we
 * serve `/engine/**` here and answer the handful of `/api/*` endpoints the
 * engine's own frontend calls, with no save data.
 *
 * Tiles are read from disk at request time and never committed; on a phone the
 * PC serves them over the LAN exactly as before, just without a second process.
 */
function mimeType(file: string): string {
  const ext = path.extname(file).toLowerCase()
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
      '.txt': 'text/plain; charset=utf-8',
    }[ext] ?? 'application/octet-stream'
  )
}

function mapEngine(): Plugin {
  const root = process.cwd()
  const web = path.join(root, 'vendor', 'elden-ring-map', 'web')
  const dataDir = path.join(root, 'vendor', 'elden-ring-map', 'data')

  const readJson = (f: string, fallback: unknown) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'))
    } catch {
      return fallback
    }
  }
  const markers = (readJson('markers.json', { markers: [] }) as { markers?: unknown[] }).markers ?? []
  const items = (readJson('items.json', { markers: [] }) as { markers?: unknown[] }).markers ?? []
  const pieces = (readJson('pieces.json', { markers: [] }) as { markers?: unknown[] }).markers ?? []
  const all = [...markers, ...items, ...pieces]
  const markerDoc = JSON.stringify({ locales: ['en', 'ru'], markers: all })
  const stateDoc = JSON.stringify({
    savePath: '',
    characters: [],
    activeSlot: null,
    markerCount: all.length,
    live: { enabled: false, status: 'off' },
    checked: {},
    at: Date.now(),
  })

  const handler = (req: any, res: any, next: () => void) => {
    const url = new URL(req.url, 'http://localhost')
    const p = url.pathname
    if (!p.startsWith('/engine')) return next()
    let rest = p.slice('/engine'.length) || '/'

    if (rest.startsWith('/api/')) {
      if (rest === '/api/markers') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(markerDoc)
      }
      if (rest === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        })
        res.write(': connected\n\n')
        res.write(`event: state\ndata: ${stateDoc}\n\n`)
        const ka = setInterval(() => { try { res.write(': ka\n\n') } catch { /* closed */ } }, 20000)
        req.on('close', () => clearInterval(ka))
        return undefined
      }
      if (rest === '/api/state') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(stateDoc)
      }
      if (rest === '/api/saves') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(JSON.stringify({ current: null, slot: null, saves: [] }))
      }
      // /api/check, /api/refresh — no save state to change.
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.end('{"ok":true}')
    }

    const rel = decodeURIComponent((rest === '/' ? '/index.html' : rest).replace(/\/$/, '/index.html'))
    const file = path.join(web, rel)
    if (!file.startsWith(web)) {
      res.statusCode = 403
      return res.end('forbidden')
    }
    const send = (f: string) => {
      res.setHeader('Content-Type', mimeType(f))
      res.setHeader('Cache-Control', 'public, max-age=3600')
      fs.createReadStream(f).pipe(res)
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isFile()) return send(file)
      const index = path.join(file, 'index.html')
      fs.stat(index, (e2, s2) => {
        if (!e2 && s2.isFile()) return send(index)
        res.statusCode = 404
        res.end('not found')
      })
    })
    return undefined
  }

  return {
    name: 'all-knowing-map-engine',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA(pwaOptions), mapEngine()],
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
