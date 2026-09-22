import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import viteConfig from '../../vite.config'
import {
  ENGINE_URL_PATTERN,
  PRECACHE_DATA,
  SOURCED_DATA_CACHE,
  SOURCED_MEDIA_CACHE,
  pwaOptions,
} from './pwa'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

type RuntimeRule = NonNullable<NonNullable<typeof pwaOptions.workbox>['runtimeCaching']>[number]

function rules(): RuntimeRule[] {
  return pwaOptions.workbox?.runtimeCaching ?? []
}

function ruleFor(url: string): RuntimeRule | undefined {
  return rules().find((r) => r.urlPattern instanceof RegExp && r.urlPattern.test(url))
}

describe('web app manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    id?: string
    name?: string
    short_name?: string
    start_url?: string
    scope?: string
    display?: string
    theme_color?: string
    background_color?: string
    icons?: { src: string; sizes?: string; type?: string; purpose?: string }[]
  }

  it('is installable: named, standalone, rooted start_url + scope', () => {
    expect(manifest.name).toBe('All-Knowing')
    expect(manifest.short_name).toBe('All-Knowing')
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('uses the existing dark/soot palette from index.css', () => {
    const css = read('src/index.css')
    const bg = /--bg:\s*(#[0-9a-fA-F]{3,8})/.exec(css)?.[1]
    expect(bg).toBe('#0b0906')
    expect(manifest.theme_color).toBe(bg)
    expect(manifest.background_color).toBe(bg)
  })

  it('declares both any and maskable icons that actually exist on disk', () => {
    const icons = manifest.icons ?? []
    expect(icons.length).toBeGreaterThan(0)
    expect(icons.some((i) => i.purpose === 'any')).toBe(true)
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const icon of icons) {
      expect(icon.sizes, `${icon.src} needs sizes`).toBeTruthy()
      expect(icon.type, `${icon.src} needs a type`).toBeTruthy()
      const onDisk = resolve(root, 'public', icon.src.replace(/^\//, ''))
      expect(existsSync(onDisk), `${icon.src} missing from public/`).toBe(true)
    }
  })

  it('is linked from index.html with a matching theme-color', () => {
    const html = read('index.html')
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    const theme = /<meta name="theme-color" content="(#[0-9a-fA-F]{3,8})"/.exec(html)?.[1]
    expect(theme).toBe(manifest.theme_color)
    expect(html).toContain('apple-mobile-web-app-capable')
  })
})

describe('service worker cache strategy', () => {
  it('generates an auto-updating SW with a SPA navigate fallback', () => {
    expect(pwaOptions.registerType).toBe('autoUpdate')
    expect(pwaOptions.workbox?.navigateFallback).toBe('/index.html')
    const deny = pwaOptions.workbox?.navigateFallbackDenylist ?? []
    expect(deny.some((re) => re instanceof RegExp && re.test('/sourced/guide/catalog.json'))).toBe(true)
    expect(deny.some((re) => re instanceof RegExp && re.test('/engine/api/events'))).toBe(true)
    expect(deny.some((re) => re instanceof RegExp && re.test('/er-map/api/events'))).toBe(true)
  })

  it('precaches the app shell but never sweeps all of /sourced/ into the precache', () => {
    const globPatterns = pwaOptions.workbox?.globPatterns ?? []
    expect(globPatterns.some((g) => g.includes('js'))).toBe(true)
    expect(globPatterns.some((g) => g.includes('css'))).toBe(true)
    expect(globPatterns.some((g) => g.includes('html'))).toBe(true)
    expect(pwaOptions.workbox?.globIgnores).toContain('**/sourced/**')
  })

  it('precaches the small critical sourced JSON so first-load-offline has real data', () => {
    const assets = pwaOptions.includeAssets as string[]
    expect(assets).toEqual([...PRECACHE_DATA])
    for (const file of [
      'sourced/guide/catalog.json',
      'sourced/aliases.json',
      'sourced/regulation-vanilla-v1.17.json',
      'sourced/open/coords.json',
    ]) {
      expect(assets).toContain(file)
      expect(existsSync(resolve(root, 'public', file)), `${file} missing`).toBe(true)
    }
  })

  it('runtime-caches lazily-fetched sourced JSON with stale-while-revalidate', () => {
    const rule = ruleFor('https://all-knowing.test/sourced/open/world-lots.json')
    expect(rule?.handler).toBe('StaleWhileRevalidate')
    expect(rule?.options?.cacheName).toBe(SOURCED_DATA_CACHE)
  })

  it('runtime-caches sourced media (maps, icon packs) cache-first', () => {
    const rule = ruleFor('https://all-knowing.test/sourced/maps/m0-overworld.jpg')
    expect(rule?.handler).toBe('CacheFirst')
    expect(rule?.options?.cacheName).toBe(SOURCED_MEDIA_CACHE)
  })

  it('self-hosts fonts: no remote font rules, woff2 precached by the glob (Task 58)', () => {
    // Assembled so the acceptance grep for the literal host stays empty in src/.
    const stylesHost = ['fonts', 'googleapis', 'com'].join('.')
    const staticHost = ['fonts', 'gstatic', 'com'].join('.')

    // No cross-origin font rules remain.
    expect(ruleFor(`https://${stylesHost}/css2?family=Cinzel`)).toBeUndefined()
    expect(ruleFor(`https://${staticHost}/s/cinzel/v1/abc.woff2`)).toBeUndefined()

    // The output glob picks up the self-hosted woff2 without sweeping sourced/.
    const globPatterns = pwaOptions.workbox?.globPatterns ?? []
    expect(globPatterns.some((g) => g.includes('woff2'))).toBe(true)
    expect(pwaOptions.workbox?.globIgnores).toContain('**/sourced/**')
  })

  it('index.html does not reference remote fonts', () => {
    const html = read('index.html')
    expect(html).not.toContain(['fonts', 'googleapis', 'com'].join('.'))
    expect(html).not.toContain(['fonts', 'gstatic', 'com'].join('.'))
  })

  it('self-hosted woff2 files exist under public/fonts', () => {
    const css = read('src/index.css')
    const files = [...css.matchAll(/url\('\/fonts\/([^']+\.woff2)'\)/g)].map((m) => m[1])
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(existsSync(resolve(root, 'public/fonts', file)), `${file} missing`).toBe(true)
    }
    // Cinzel + Source Sans 3, each latin + latin-ext (variable files).
    expect(new Set(files).size).toBe(6)
  })

  it('never caches the live map engine (offline detection must see real failures)', () => {
    expect(ENGINE_URL_PATTERN.test('http://127.0.0.1:8099/api/state')).toBe(true)
    expect(ENGINE_URL_PATTERN.test('http://localhost:5174/engine/api/state')).toBe(true)
    expect(ENGINE_URL_PATTERN.test('http://localhost:5173/er-map/api/events')).toBe(true)
    expect(ruleFor('http://127.0.0.1:8099/api/state')?.handler).toBe('NetworkOnly')
    expect(ruleFor('http://localhost:5174/engine/api/events')?.handler).toBe('NetworkOnly')
    expect(ruleFor('http://localhost:5173/er-map/api/events')?.handler).toBe('NetworkOnly')
  })
})

describe('vite config integration', () => {
  it('registers the PWA plugin', () => {
    const plugins = (viteConfig.plugins ?? []).flat() as unknown as { name?: string }[]
    expect(plugins.some((p) => p?.name === 'vite-plugin-pwa')).toBe(true)
  })
})
