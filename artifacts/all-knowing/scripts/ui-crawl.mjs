#!/usr/bin/env node
/**
 * Task 125 — click-everything crawler.
 *
 * Drives the already-running dev server (http://localhost:5173, override with
 * AUDIT_URL/CRAWL_URL) through every section / sub-view, the header menu, the
 * quick-log sheet, the area picker and an entity page — on phone (390x844) and
 * desktop (1280x800) — clicking every visible interactive element and recording
 * what happened.
 *
 * It never starts a server and never downloads a browser: it launches the
 * installed Edge (falling back to Chrome) through `playwright-core`, exactly
 * like `scripts/ui-audit.mjs`.
 *
 * State is seeded with a demo character (stats + a few bosses/graces logged) and
 * the first-run tour is marked seen, so progress-dependent UI shows up. Storage
 * is fresh per run (`addInitScript` re-seeds the vault on every navigation).
 *
 * Output: `.scratch/ui-crawl/<timestamp>/crawl.json` + `crawl.md`, plus a
 * screenshot whenever a click opens a surface (overlay / sheet / menu).
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright-core'

const BASE = (process.env.CRAWL_URL || process.env.AUDIT_URL || 'http://localhost:5173')
  .replace(/#.*$/, '')
  .replace(/\/$/, '')
const OUT_ROOT = path.join(process.cwd(), '.scratch', 'ui-crawl')
const STAMP = timestamp()
const OUT = path.join(OUT_ROOT, STAMP)

/** Max controls clicked per screen (keeps a full two-viewport run bounded). */
const CAP = Number(process.env.CRAWL_CAP) || 40
/** Optional comma-separated screen id filter (smoke runs). */
const ONLY = (process.env.CRAWL_ONLY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
/** Optional comma-separated run filter (`phone`, `desktop`). */
const ONLY_RUNS = (process.env.CRAWL_RUNS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
/** Enumerate controls only (no clicking) — a fast budget probe. */
const DRY = process.env.CRAWL_DRY === '1'

const RUNS = [
  {
    name: 'phone',
    label: 'phone 390\u00d7844',
    context: {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  },
  {
    name: 'desktop',
    label: 'desktop 1280\u00d7800',
    context: { viewport: { width: 1280, height: 800 } },
  },
]

/* ------------------------------------------------------------------ helpers */

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

/* ------------------------------------------------------------------ seeding */

/**
 * The seeded demo character. Mirrors `demoCharacter` in `src/data/seed.ts`
 * (stats set + a few bosses/graces/items/quests logged so progress-dependent UI
 * — meters, "done" ticks, inferences — has something to show). When replacing
 * an existing vault this acts as the active profile.
 */
const DEMO_CHARACTER = {
  source: 'demo',
  platform: 'pc',
  regulation: '1.17-tarnished-pack',
  fileName: 'ER0000.sl2 (crawl)',
  name: 'Gideon\u2019s Apprentice',
  level: 86,
  startingClass: 'samurai',
  stats: { vigor: 40, mind: 20, endurance: 25, strength: 18, dexterity: 40, intelligence: 9, faith: 8, arcane: 16 },
  loadout: [
    { id: 'uchi', name: 'Uchigatana', kind: 'armament', affinity: 'Keen', upgrade: 18 },
    { id: 'naga', name: 'Nagakiba', kind: 'armament', affinity: 'Blood', upgrade: 16 },
    { id: 'carian', name: 'Carian Knight Shield', kind: 'shield', upgrade: 12 },
    { id: 'okina', name: 'White Reed Set', kind: 'armor' },
    { id: 'radagon-soreseal', name: "Radagon's Soreseal", kind: 'talisman' },
    { id: 'claw', name: 'Claw Talisman', kind: 'talisman' },
    { id: 'unsheathe', name: 'Unsheathe', kind: 'ash' },
  ],
  defeatedBosses: ['boss:margit', 'boss:godrick', 'boss:rennala', 'boss:radahn', 'boss:rykard'],
  discoveredGraces: ['grace:elleh', 'grace:gatefront', 'grace:academy-gate', 'grace:redmane'],
  collectedItems: ['item:shadow-realm-blessing', 'item:revered-ash'],
  completedQuestSteps: ['quest:ranni:service', 'quest:ranni:festival', 'quest:boc:needle'],
  deniedFacts: [],
  answers: { platform: 'pc', dlc: 'sote', lastRegion: 'altus' },
  evidence: [],
  shots: [],
}

function seedVault() {
  const profile = {
    id: 'p-crawl',
    label: DEMO_CHARACTER.name,
    updatedAt: Date.now(),
    character: DEMO_CHARACTER,
    ui: {
      module: 'reckon',
      section: 'me',
      sub: 'overview',
      missingOnly: false,
      selectedMarkerId: null,
    },
  }
  return { version: 1, activeId: profile.id, profiles: [profile] }
}

/* ------------------------------------------------------- in-page crawl utils */

/**
 * Runs before every document in the context. Seeds fresh storage and installs
 * the `window.__crawl` helpers (enumerate / snapshot / clickAt / textBlocks).
 * Must be fully self-contained — Playwright serialises only the function body.
 */
function installCrawl(seed) {
  try {
    if (seed && seed.vault) {
      localStorage.setItem('all-knowing.vault.v1', JSON.stringify(seed.vault))
      localStorage.setItem('all-knowing.tour.seen.v1', '1')
      localStorage.setItem('all-knowing.dock.open.v1', '0')
    }
  } catch {
    /* storage disabled */
  }

  const INTERACTIVE =
    'button, a, input, select, textarea, [role="button"], [role="tab"], [role="link"], summary'
  const OVERLAYS = [
    '.entity-overlay',
    '.quicklog-overlay',
    '.area-picker',
    '.header-more-menu',
    '.help-overlay',
    '.gear-picker',
    '.lockout-overlay',
    '.qr-overlay',
    '.lib-filters-overlay',
    '.tour-overlay',
    '.peek-card',
    '.lib-detail',
  ]

  function style(el) {
    try {
      return getComputedStyle(el)
    } catch {
      return null
    }
  }

  function rect(el) {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }

  function isVisible(el) {
    const cs = style(el)
    if (!cs) return false
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false
    if (parseFloat(cs.opacity || '1') === 0) return false
    const closedDetails = el.closest('details:not([open])')
    if (closedDetails) {
      const summary = closedDetails.querySelector(':scope > summary')
      if (!summary || !summary.contains(el)) return false
    }
    // The crawler wants every rendered control on the screen, including ones
    // scrolled below the fold, so it uses the element's own layout box rather
    // than clipping to the scrollport (unlike the ui-audit viewport check).
    const r = rect(el)
    if (r.width < 0.5 || r.height < 0.5) return false
    return true
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return ''
    const parts = []
    let node = el
    let guard = 0
    while (node && node.nodeType === 1 && node !== document.documentElement && guard++ < 40) {
      const tag = node.nodeName.toLowerCase()
      if (node.id) {
        parts.unshift(`#${node.id}`)
        break
      }
      let sel = tag
      const parent = node.parentElement
      if (parent) {
        const same = Array.prototype.filter.call(parent.children, (c) => c.nodeName === node.nodeName)
        if (same.length > 1) sel += `:nth-of-type(${same.indexOf(node) + 1})`
      }
      const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      if (cls.length) sel += `.${cls.join('.')}`
      parts.unshift(sel)
      node = parent
    }
    return parts.join(' > ')
  }

  function textOf(el) {
    const raw =
      el.getAttribute('aria-label') ||
      el.textContent ||
      el.getAttribute('placeholder') ||
      el.getAttribute('title') ||
      el.getAttribute('value') ||
      ''
    return raw.replace(/\s+/g, ' ').trim().slice(0, 80)
  }

  function scopeRoot(scopeSel) {
    if (scopeSel) return document.querySelector(scopeSel)
    return document.querySelector('main.workspace') || document.querySelector('.app') || document.body
  }

  function listed(root) {
    if (!root) return []
    const out = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE))
    if (root.matches && root.matches(INTERACTIVE)) out.unshift(root)
    return out
  }

  function sampleFor(el) {
    const t = (el.getAttribute('type') || '').toLowerCase()
    if (t === 'number' || t === 'range') return '30'
    if (t === 'date') return '2026-01-01'
    if (t === 'email') return 'crawl@example.com'
    if (t === 'tel') return '5551234'
    if (t === 'url') return 'https://example.com'
    return 'Margit'
  }

  function describe(el) {
    const full = rect(el)
    return {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      role: el.getAttribute('role') || '',
      label: textOf(el),
      selector: cssPath(el),
      w: Math.round(full.width),
      h: Math.round(full.height),
      x: Math.round(full.left),
      y: Math.round(full.top),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
      href: el.getAttribute('href') || '',
    }
  }

  window.__crawl = {
    enumerate(scopeSel) {
      const root = scopeRoot(scopeSel)
      if (!root) return { found: false, controls: [] }
      const seen = new Set()
      const controls = []
      for (const el of listed(root)) {
        if (seen.has(el)) continue
        seen.add(el)
        if (!isVisible(el)) continue
        try {
          controls.push(describe(el))
        } catch {
          /* skip */
        }
      }
      return { found: true, controls }
    },

    snapshot() {
      const open = OVERLAYS.filter((s) => {
        const el = document.querySelector(s)
        if (!el) return false
        const cs = style(el)
        if (!cs || cs.display === 'none' || cs.visibility === 'hidden') return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      })
      return {
        hash: location.hash,
        url: location.href,
        nodeCount: document.getElementsByTagName('*').length,
        textLen: (document.body.innerText || '').length,
        text: (document.body.innerText || '').slice(0, 240),
        checkedCount: document.querySelectorAll('input:checked').length,
        openDetails: document.querySelectorAll('details[open]').length,
        overlays: open,
      }
    },

    clickAt(scopeSel, index) {
      const root = scopeRoot(scopeSel)
      if (!root) return { found: false }
      const visible = listed(root).filter(isVisible)
      const el = visible[index]
      if (!el) return { found: false }
      const desc = describe(el)

      // External anchors: record the attempt but never leave the SPA session.
      if (el.tagName === 'A' && el.getAttribute('href')) {
        const href = el.getAttribute('href')
        if (/^https?:/i.test(href)) {
          try {
            const u = new URL(href, location.href)
            if (u.origin !== location.origin) return { found: true, desc, acted: 'external', external: u.href }
          } catch {
            /* relative — fall through */
          }
        }
      }

      if (el.disabled) return { found: true, desc, acted: 'disabled' }

      if (el.tagName === 'SELECT') {
        const opts = Array.prototype.slice.call(el.options)
        if (opts.length > 1) el.value = opts[1].value
        el.dispatchEvent(new Event('change', { bubbles: true }))
        return { found: true, desc, acted: 'select' }
      }

      if (el.tagName === 'INPUT' && /^(checkbox|radio)$/i.test(el.getAttribute('type') || '')) {
        el.click()
        return { found: true, desc, acted: 'click' }
      }

      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        const value = sampleFor(el)
        try {
          if (setter) setter.call(el, value)
          else el.value = value
        } catch {
          el.value = value
        }
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        try { el.focus() } catch { /* noop */ }
        return { found: true, desc, acted: 'input', sample: value }
      }

      el.click()
      return { found: true, desc, acted: 'click' }
    },

    stats() {
      const text = document.body.innerText || ''
      return {
        words: text.trim().split(/\s+/).filter(Boolean).length,
        chars: text.length,
      }
    },

    textBlocks(limit) {
      const out = []
      const seen = new Set()
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('script, style, svg, noscript')) continue
        let direct = ''
        for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue
        direct = direct.replace(/\s+/g, ' ').trim()
        if (direct.length < 40 || seen.has(direct)) continue
        seen.add(direct)
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        out.push({ text: direct, len: direct.length, selector: cssPath(el) })
      }
      out.sort((a, b) => b.len - a.len)
      return out.slice(0, limit || 20)
    },
  }
}

/* -------------------------------------------------------------- screen model */

async function clickSecondRail(page) {
  const loc = page.locator('.lib-rail-item')
  if ((await loc.count().catch(() => 0)) > 1) {
    await loc.nth(1).click({ timeout: 5000 }).catch(() => {})
  }
  await page.waitForTimeout(500)
}

async function openFirstCard(page) {
  const loc = page.locator('.lib-card')
  if (await loc.count().catch(() => 0)) {
    await loc.first().scrollIntoViewIfNeeded().catch(() => {})
    await loc.first().click({ timeout: 5000 }).catch(() => {})
  }
  await page.locator('.lib-detail').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
}

async function openHeaderMenu(page) {
  await page.locator('.header-more-toggle').first().click({ timeout: 5000 }).catch(() => {})
  await page.locator('.header-more-menu').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
}

async function openQuickLog(page) {
  const headerBtn = page.locator('.quicklog-open:visible')
  if (await headerBtn.count().catch(() => 0)) {
    await headerBtn.first().click({ timeout: 5000 }).catch(() => {})
  } else {
    await page.locator('.header-more-toggle').first().click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(150)
    await page
      .locator('.header-more-menu button')
      .filter({ hasText: /^\s*Quick log\s*$/ })
      .first()
      .click({ timeout: 5000 })
      .catch(() => {})
  }
  await page.locator('.quicklog-sheet').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
}

async function openAreaPicker(page) {
  await page.locator('.area-chip').first().click({ timeout: 5000 }).catch(() => {})
  await page.locator('.area-picker').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
}

async function openEntityPage(page) {
  // Deterministic: the universal panel is hash-addressed (`?e=<factId>`), so set
  // it directly rather than hoping the first link is not a spoiler veil.
  await page
    .evaluate(() => {
      const base = location.hash.split('?')[0] || '#/journey/area'
      location.hash = `${base}?e=${encodeURIComponent('boss:margit')}`
    })
    .catch(() => {})
  await page.locator('.entity-overlay').first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => {})
}

const SCREENS = [
  { id: 'me-overview', route: '#/me/overview' },
  { id: 'me-gear', route: '#/me/gear' },
  { id: 'me-setup', route: '#/me/setup' },
  { id: 'me-profiles', route: '#/me/profiles' },
  { id: 'journey-now', route: '#/journey/now' },
  { id: 'journey-area', route: '#/journey/area' },
  { id: 'journey-map', route: '#/journey/map' },
  { id: 'journey-quests', route: '#/journey/quests' },
  { id: 'library-search', route: '#/library/search' },
  { id: 'library-search-category', route: '#/library/search', setup: clickSecondRail },
  { id: 'library-search-entity', route: '#/library/search', scope: '.lib-detail', setup: openFirstCard },
  { id: 'library-builds', route: '#/library/builds' },
  { id: 'library-pvp', route: '#/library/pvp' },
  { id: 'library-guides', route: '#/library/guides' },
  { id: 'gideon', route: '#/gideon' },
  { id: 'header-more-menu', route: '#/journey/now', scope: '.header-more-menu', setup: openHeaderMenu },
  { id: 'quicklog-sheet', route: '#/journey/now', scope: '.quicklog-sheet', setup: openQuickLog },
  { id: 'area-picker', route: '#/journey/now', scope: '.area-picker', setup: openAreaPicker },
  { id: 'entity-page', route: '#/journey/area', scope: '.entity-overlay', setup: openEntityPage },
]

/* ------------------------------------------------------------------- runner */

async function launchBrowser() {
  const tries = [{ channel: 'msedge' }, { channel: 'chrome' }]
  let lastErr
  for (const opts of tries) {
    try {
      const browser = await chromium.launch({ channel: opts.channel })
      return { browser, channel: opts.channel }
    } catch (err) {
      lastErr = err
    }
  }
  throw new Error(`Could not launch an installed Chromium (msedge/chrome): ${lastErr?.message || lastErr}`)
}

function diffSnippet(before, after) {
  let i = 0
  while (i < before.length && i < after.length && before[i] === after[i]) i++
  return after.slice(i, i + 80).replace(/\s+/g, ' ').trim()
}

function classify(before, after, res, errors) {
  const errorsOut = errors.map((e) => e.text || String(e))
  if (res.acted === 'external') {
    return { kind: 'external', external: res.external, errors: errorsOut }
  }
  if (res.acted === 'error') {
    return { kind: 'error', errors: [...errorsOut, res.error || 'evaluate failed'] }
  }
  if (res.acted === 'disabled') {
    return { kind: 'disabled', errors: errorsOut }
  }
  const pathOf = (u) => {
    try {
      return new URL(u).pathname
    } catch {
      return ''
    }
  }
  if (pathOf(before.url) !== pathOf(after.url)) {
    return { kind: 'navigation', from: before.url, to: after.url, errors: errorsOut }
  }
  if (before.hash !== after.hash) {
    return { kind: 'hash', from: before.hash, to: after.hash, errors: errorsOut }
  }
  const opened = after.overlays.filter((o) => !before.overlays.includes(o))
  if (opened.length) return { kind: 'opened', opened, errors: errorsOut }
  const closed = before.overlays.filter((o) => !after.overlays.includes(o))
  if (closed.length) return { kind: 'closed', closed, errors: errorsOut }

  const nodesDelta = after.nodeCount - before.nodeCount
  const textDelta = after.textLen - before.textLen
  const toggled =
    before.checkedCount !== after.checkedCount || before.openDetails !== after.openDetails
  if (Math.abs(nodesDelta) > 2 || Math.abs(textDelta) > 2 || toggled) {
    return {
      kind: 'dom',
      nodesDelta,
      textDelta,
      snippet: diffSnippet(before.text, after.text),
      errors: errorsOut,
    }
  }
  if (res.acted === 'input' || res.acted === 'select') {
    return { kind: 'input', sample: res.sample, errors: errorsOut }
  }
  if (errorsOut.length) return { kind: 'error', errors: errorsOut }
  return { kind: 'nothing', errors: errorsOut }
}

async function waitReady(page) {
  await page
    .waitForFunction(
      () => {
        if (!document.querySelector('.app')) return false
        if (document.querySelector('.section-skeleton, .dock-skeleton, .lib-skel, .skel-bar')) return false
        const main =
          document.querySelector('.workspace') || document.querySelector('main') || document.body
        return ((main && main.innerText) || '').trim().length > 20
      },
      { timeout: 15000 },
    )
    .catch(() => {})
  await page.waitForTimeout(150)
}

async function hardLoad(page, route) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForSelector('.app', { timeout: 20000 }).catch(() => {})
  await page.evaluate((r) => { if (location.hash !== r) location.hash = r }, route).catch(() => {})
  await waitReady(page)
}

/**
 * A cheap route to bounce through that is different from the screen's own
 * route. Prefer another sub-view of the same section so shared/lazy data stays
 * warm; `gideon` has no subs, so it gets bounced through Journey.
 */
function neutralFor(screen) {
  const route = screen.route.split('?')[0]
  if (route.startsWith('#/library')) return route === '#/library/pvp' ? '#/library/builds' : '#/library/pvp'
  if (route.startsWith('#/journey')) return route === '#/journey/quests' ? '#/journey/now' : '#/journey/quests'
  if (route.startsWith('#/me')) return route === '#/me/profiles' ? '#/me/setup' : '#/me/profiles'
  return '#/journey/quests'
}

async function resetBaseline(page, screen) {
  // Header menu and help only close on an outside mousedown / Escape.
  await page
    .evaluate(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    .catch(() => {})
  // QuickLog lives in AppShell state and survives hash routing; close it via its
  // own Close control so it does not hover over the next screen.
  await page
    .evaluate(() => {
      const sheet = document.querySelector('.quicklog-sheet')
      if (!sheet) return
      const close = Array.prototype.slice
        .call(sheet.querySelectorAll('button'))
        .find((b) => /^\s*close\s*$/i.test(b.textContent || ''))
      if (close) close.click()
    })
    .catch(() => {})
  // Flip to a neutral route and back: this unmounts/remounts the current view
  // (resetting filters, expansions, selected cards) without a full reload.
  // Stay inside the same section where possible — crossing into another section
  // makes the app recompute heavy cross-section data on every reset.
  const neutral = neutralFor(screen)
  await page.evaluate((n) => { location.hash = n }, neutral).catch(() => {})
  await page.waitForTimeout(140)
  const alive = await page.evaluate(() => !!document.querySelector('.app')).catch(() => false)
  if (!alive) {
    await page.goto(`${BASE}/${screen.route}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.waitForTimeout(500)
    return
  }
  await page.evaluate((r) => { location.hash = r }, screen.route).catch(() => {})
  await page.waitForTimeout(160)
}

async function runScreen(browser, runCfg, screen, runDir) {
  const context = await browser.newContext(runCfg.context)
  const vault = seedVault()
  await context.addInitScript(installCrawl, { vault })
  const page = await context.newPage()

  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push({ text: m.text(), location: m.location() })
  })
  page.on('pageerror', (e) => errors.push({ text: `pageerror: ${e.message}` }))

  const record = {
    id: screen.id,
    route: screen.route,
    scope: screen.scope || 'main.workspace',
    controls: [],
    found: 0,
    words: 0,
    chars: 0,
    textBlocks: [],
    setupErrors: [],
    truncated: false,
  }

  try {
    await hardLoad(page, screen.route)
    if (screen.setup) {
      await screen.setup(page)
      await page.waitForTimeout(250)
    }
    await waitReady(page)

    // Screen-level stats (after setup, so an open sheet counts).
    record.words = await page.evaluate(() => window.__crawl.stats().words).catch(() => 0)
    record.chars = await page.evaluate(() => window.__crawl.stats().chars).catch(() => 0)
    record.textBlocks = await page.evaluate(() => window.__crawl.textBlocks(20)).catch(() => [])

    const first = await page.evaluate((s) => window.__crawl.enumerate(s), screen.scope || null)
    record.found = first.controls.length
    record.truncated = first.controls.length > CAP

    let i = 0
    while (!DRY && i < CAP) {
      const { controls } = await page.evaluate((s) => window.__crawl.enumerate(s), screen.scope || null)
      if (i >= controls.length) break

      errors.length = 0
      const before = await page.evaluate(() => window.__crawl.snapshot())
      let res
      try {
        res = await page.evaluate(
          ({ scope, index }) => window.__crawl.clickAt(scope, index),
          { scope: screen.scope || null, index: i },
        )
      } catch (err) {
        res = { found: true, desc: controls[i], acted: 'error', error: String(err?.message || err) }
      }
      await page.waitForTimeout(260)
      const after = await page.evaluate(() => window.__crawl.snapshot())
      const errs = errors.splice(0)
      const desc = (res && res.desc) || controls[i]
      const outcome = classify(before, after, res || { acted: 'click' }, errs)

      record.controls.push({
        ...desc,
        outcome,
      })

      if (outcome.kind === 'opened') {
        const file = `${String(i + 1).padStart(3, '0')}-${slug(desc.label || desc.tag)}-${slug(outcome.opened.join('-'))}.png`
        await page
          .screenshot({ path: path.join(runDir, file) })
          .then(() => { record.controls[record.controls.length - 1].screenshot = file })
          .catch(() => {})
      }

      await resetBaseline(page, screen)
      if (screen.setup) {
        await screen.setup(page).catch((err) => record.setupErrors.push(String(err?.message || err)))
      }
      await waitReady(page)
      i++
    }
  } catch (err) {
    record.setupErrors.push(`fatal: ${String(err?.message || err)}`)
  } finally {
    await context.close().catch(() => {})
  }

  return record
}

async function runViewport(browser, runCfg) {
  const runDir = path.join(OUT, runCfg.name)
  fs.mkdirSync(runDir, { recursive: true })
  const screens = []
  const list = ONLY.length ? SCREENS.filter((s) => ONLY.includes(s.id)) : SCREENS
  for (const screen of list) {
    console.log(`[ui-crawl] ${runCfg.name} · ${screen.id} …`)
    const record = await runScreen(browser, runCfg, screen, runDir)
    console.log(`[ui-crawl] ${runCfg.name} · ${screen.id}: ${record.found} found, ${record.controls.length} clicked`)
    screens.push(record)
  }
  return { name: runCfg.name, label: runCfg.label, viewport: runCfg.context, screens }
}

/* ---------------------------------------------------------------- summaries */

function summarize(run) {
  const dead = []
  const errored = []
  const byLabel = new Map()
  const perScreen = []

  for (const screen of run.screens) {
    perScreen.push({
      screen: screen.id,
      controls: screen.found ?? screen.controls.length,
      clicked: screen.controls.length,
      words: screen.words,
    })
    for (const c of screen.controls) {
      const outcome = c.outcome || {}
      if (outcome.kind === 'nothing') {
        dead.push({ screen: screen.id, label: c.label || '(no label)', selector: c.selector, tag: c.tag })
      }
      if ((outcome.errors || []).length) {
        errored.push({ screen: screen.id, label: c.label || '(no label)', selector: c.selector, errors: outcome.errors })
      }
      const label = (c.label || '').trim()
      if (!label) continue
      const key = `${label}\u0000${outcome.kind}`
      if (!byLabel.has(key)) byLabel.set(key, { label, kind: outcome.kind, screens: new Map() })
      const entry = byLabel.get(key)
      entry.screens.set(screen.id, (entry.screens.get(screen.id) || 0) + 1)
    }
  }

  const duplicates = []
  for (const entry of byLabel.values()) {
    const counts = [...entry.screens.entries()]
    const total = counts.reduce((n, [, c]) => n + c, 0)
    const maxOnOne = Math.max(...counts.map(([, c]) => c))
    if (counts.length >= 2 || maxOnOne >= 2) {
      duplicates.push({
        label: entry.label,
        kind: entry.kind,
        total,
        screens: counts.map(([id, c]) => (c > 1 ? `${id} x${c}` : id)),
      })
    }
  }
  duplicates.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  return { dead, errored, duplicates, perScreen }
}

/* ----------------------------------------------------------------- reporting */

function mdTable(headers, rows) {
  const out = [``, `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]
  for (const r of rows) out.push(`| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|')).join(' | ')} |`)
  return out.join('\n')
}

function outcomeDetail(o) {
  if (!o) return ''
  switch (o.kind) {
    case 'hash':
      return `${o.from} → ${o.to}`
    case 'opened':
      return `opened ${o.opened.join(', ')}`
    case 'closed':
      return `closed ${o.closed.join(', ')}`
    case 'dom':
      return `DOM Δ${o.nodesDelta} nodes, Δ${o.textDelta} chars${o.snippet ? ` \u201c${o.snippet}\u201d` : ''}`
    case 'external':
      return `external → ${o.external}`
    case 'navigation':
      return `navigation ${o.from} → ${o.to}`
    case 'disabled':
      return 'disabled (skipped)'
    case 'input':
      return `input \u2192 “${o.sample}”`
    case 'error':
      return 'error'
    case 'nothing':
      return 'nothing happened'
    default:
      return o.kind
  }
}

function buildReport(runs, meta) {
  const lines = []
  lines.push(`# UI Crawl \u2014 ${meta.stamp}`)
  lines.push('')
  lines.push(`- URL: ${meta.base}`)
  lines.push(`- Browser channel: ${meta.channel}`)
  lines.push(`- Runs: ${runs.map((r) => r.label).join(', ')}`)
  lines.push(`- Generated: ${meta.generatedAt}`)
  lines.push(`- Output: ${meta.out}`)
  lines.push('')

  for (const run of runs) {
    const sum = summarize(run)
    lines.push(`## ${run.label}`)
    lines.push('')

    for (const screen of run.screens) {
      lines.push(`### ${screen.id}  \`${screen.route}\``)
      lines.push('')
      lines.push(`Scope: \`${screen.scope}\` · controls found: ${screen.found ?? screen.controls.length} · clicked: ${screen.controls.length}${screen.truncated ? ` (capped at ${CAP})` : ''} · words on screen: ${screen.words} · chars: ${screen.chars}`)
      lines.push('')
      if (screen.setupErrors.length) {
        lines.push(`Setup notes: ${screen.setupErrors.join('; ')}`)
        lines.push('')
      }
      if (!screen.controls.length) {
        lines.push('_No visible interactive controls (or surface unavailable at this viewport)._')
        lines.push('')
      } else {
        lines.push(
          mdTable(
            ['#', 'Tag', 'Label', 'Selector', 'Size', 'Pos', 'Outcome', 'Detail', 'Errors', 'Shot'],
            screen.controls.map((c, i) => [
              i + 1,
              c.tag + (c.type ? `[${c.type}]` : ''),
              c.label || '(no label)',
              c.selector,
              `${c.w}\u00d7${c.h}`,
              `${c.x},${c.y}`,
              (c.outcome || {}).kind || '',
              (c.outcome || {}).kind === 'dom'
                ? outcomeDetail(c.outcome)
                : outcomeDetail(c.outcome),
              ((c.outcome || {}).errors || []).length,
              c.screenshot || '',
            ]),
          ),
        )
        lines.push('')
      }
    }

    lines.push(`### Summaries \u2014 ${run.label}`)
    lines.push('')

    lines.push(`#### Dead controls (nothing happened) — ${sum.dead.length}`)
    lines.push('')
    lines.push(
      mdTable(
        ['Screen', 'Label', 'Selector'],
        sum.dead.slice(0, 200).map((d) => [d.screen, d.label, d.selector]),
      ),
    )
    lines.push('')

    lines.push(`#### Error controls — ${sum.errored.length}`)
    lines.push('')
    lines.push(
      mdTable(
        ['Screen', 'Label', 'Selector', 'Error'],
        sum.errored.slice(0, 200).map((d) => [d.screen, d.label, d.selector, (d.errors || []).join(' \u00b7 ')]),
      ),
    )
    lines.push('')

    lines.push(`#### Duplicates (same label \u2192 same outcome on 2+ screens, or 2+ times on one screen) — ${sum.duplicates.length}`)
    lines.push('')
    lines.push(
      mdTable(
        ['Label', 'Outcome', 'Total', 'Screens'],
        sum.duplicates.slice(0, 200).map((d) => [d.label, d.kind, d.total, d.screens.join(', ')]),
      ),
    )
    lines.push('')

    lines.push('#### Controls per screen')
    lines.push('')
    lines.push(
      mdTable(
        ['Screen', 'Controls found', 'Clicked'],
        sum.perScreen.map((p) => [p.screen, p.controls, p.clicked]),
      ),
    )
    lines.push('')

    lines.push('#### Words on screen')
    lines.push('')
    lines.push(
      mdTable(
        ['Screen', 'Words'],
        sum.perScreen.map((p) => [p.screen, p.words]),
      ),
    )
    lines.push('')

    lines.push('#### 20 longest text blocks per screen (prose that could be cut)')
    lines.push('')
    for (const screen of run.screens) {
      lines.push(`**${screen.id}**`)
      lines.push('')
      lines.push(
        mdTable(
          ['#', 'Chars', 'Selector', 'Text'],
          (screen.textBlocks || []).map((b, i) => [i + 1, b.len, b.selector, b.text]),
        ),
      )
      lines.push('')
    }

    // Cross-run summary
    lines.push(`#### At a glance \u2014 ${run.label}`)
    lines.push('')
    const totalControls = sum.perScreen.reduce((n, p) => n + p.controls, 0)
    const totalWords = sum.perScreen.reduce((n, p) => n + p.words, 0)
    lines.push(
      mdTable(
        ['Metric', 'Value'],
        [
          ['Screens', run.screens.length],
          ['Controls crawled', totalControls],
          ['Words across screens', totalWords],
          ['Dead controls', sum.dead.length],
          ['Error controls', sum.errored.length],
          ['Duplicate label\u2192outcome groups', sum.duplicates.length],
        ],
      ),
    )
    lines.push('')
  }

  return lines.join('\n')
}

/* ---------------------------------------------------------------------- main */

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  console.log(`[ui-crawl] target ${BASE}`)
  console.log(`[ui-crawl] output ${OUT}`)

  const { browser, channel } = await launchBrowser()
  console.log(`[ui-crawl] browser ${channel}`)
  const runs = []
  try {
    const runList = ONLY_RUNS.length ? RUNS.filter((r) => ONLY_RUNS.includes(r.name)) : RUNS
    for (const runCfg of runList) {
      console.log(`[ui-crawl] run ${runCfg.name} …`)
      runs.push(await runViewport(browser, runCfg))
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const generatedAt = new Date().toISOString()
  const doc = { url: BASE, channel, stamp: STAMP, generatedAt, runs }
  fs.writeFileSync(path.join(OUT, 'crawl.json'), JSON.stringify(doc, null, 2))

  const md = buildReport(runs, { stamp: STAMP, base: BASE, channel, generatedAt, out: OUT })
  fs.writeFileSync(path.join(OUT, 'crawl.md'), md)

  console.log(`[ui-crawl] wrote ${path.join(OUT, 'crawl.json')}`)
  console.log(`[ui-crawl] wrote ${path.join(OUT, 'crawl.md')}`)

  for (const run of runs) {
    const sum = summarize(run)
    const totalControls = sum.perScreen.reduce((n, p) => n + p.controls, 0)
    console.log(
      `[ui-crawl] ${run.name}: ${totalControls} controls, ${sum.dead.length} dead, ${sum.errored.length} error, ${sum.duplicates.length} duplicate groups`,
    )
  }
}

main().catch((err) => {
  console.error('[ui-crawl] fatal:', err?.stack || err)
  process.exitCode = 1
})
