#!/usr/bin/env node
/**
 * Task 102 — automated phone playtest + UI audit harness.
 *
 * Drives the already-running dev server (http://localhost:5173, override with
 * AUDIT_URL) through the fresh-PS5-player scenario twice (phone + desktop) and
 * writes viewport screenshots + report.json/report.md under
 * `.scratch/ui-audit/<timestamp>/`.
 *
 * It never starts a server and never downloads a browser: it launches the
 * installed Edge (falling back to Chrome) through `playwright-core`.
 *
 * Every step is best-effort: a missing control is recorded as a note and the
 * run continues. The audit itself runs inside the page and never throws.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright-core'

const BASE = (process.env.AUDIT_URL || 'http://localhost:5173')
  .replace(/#.*$/, '')
  .replace(/\/$/, '')
const OUT_ROOT = path.join(process.cwd(), '.scratch', 'ui-audit')
const STAMP = timestamp()
const OUT = path.join(OUT_ROOT, STAMP)

const RUNS = [
  {
    name: 'phone',
    label: 'phone 375\u00d7812',
    context: {
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  },
  {
    name: 'desktop',
    label: 'desktop 1440\u00d7900',
    context: { viewport: { width: 1440, height: 900 } },
  },
]

/* ------------------------------------------------------------------ helpers */

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* ------------------------------------------------------------- page audit fn */

/**
 * Runs in the page. Must be fully self-contained (Playwright serialises only
 * this function body): no closures over Node scope.
 */
function auditPage() {
  const INTERACTIVE =
    'a, button, input, select, textarea, [role="button"], [role="tab"], [tabindex]'
  const MAX = 500

  function style(el) {
    try {
      return getComputedStyle(el)
    } catch {
      return null
    }
  }

  /**
   * The rect actually showing on screen: intersect the element with every
   * clipping ancestor. Content scrolled out of an `overflow:auto` pane (the
   * Gideon log, the library rail) keeps its layout rect otherwise and produced
   * false "overlap"/"covered" hits, so clip it away here.
   */
  function shownRect(el) {
    const r = el.getBoundingClientRect()
    let left = r.left
    let top = r.top
    let right = r.right
    let bottom = r.bottom
    let node = el.parentElement
    let guard = 0
    while (node && guard++ < 60) {
      const cs = style(node)
      if (cs) {
        const clipX = cs.overflowX !== 'visible'
        const clipY = cs.overflowY !== 'visible'
        if (clipX || clipY) {
          const nr = node.getBoundingClientRect()
          if (clipX) {
            left = Math.max(left, nr.left)
            right = Math.min(right, nr.right)
          }
          if (clipY) {
            top = Math.max(top, nr.top)
            bottom = Math.min(bottom, nr.bottom)
          }
        }
      }
      node = node.parentElement
    }
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
  }

  /** The element's own layout box, independent of any clipping ancestor. */
  function rect(el) {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }

  function isVisible(el) {
    const cs = style(el)
    if (!cs) return false
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false
    if (parseFloat(cs.opacity || '1') === 0) return false
    // A closed `<details>` keeps its light-DOM children laid out in Chromium, so
    // exclude everything except the summary — otherwise collapsed Reference
    // sections report phantom overlaps.
    const closedDetails = el.closest('details:not([open])')
    if (closedDetails) {
      const summary = closedDetails.querySelector(':scope > summary')
      if (!summary || !summary.contains(el)) return false
    }
    const r = shownRect(el)
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
    const raw = el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || ''
    return raw.replace(/\s+/g, ' ').trim().slice(0, 80)
  }

  function overlapArea(a, b) {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    return x * y
  }

  /**
   * Task 103 §12: the section's own scroll container, i.e. the element that
   * actually has `overflow-y: auto|scroll` and the largest `scrollHeight` —
   * never `body`/`html` (the shell is fixed-height and the window does not
   * scroll). Shared by the length metric and `scrollMain`.
   */
  function mainScroller() {
    const sels = [
      '.workspace', '.shell-body', '.stage', 'main', '.split', '.side',
      '.panel', '.me-overview', '.me-update', '.me-profiles', '.now-page',
      '.gideon-page', '.me-setup', '.me-gear', '.codex-wrap', '.quests-page', '.lib-results',
      '.lib-panel-body', '.lib-rail', '.gear-picker-box', '.quicklog-sheet',
    ]
    let best = null
    let score = -1
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = style(el)
        if (!cs) continue
        if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue
        // The page scroller is one that actually scrolls…
        if (el.scrollHeight <= el.clientHeight + 1) continue
        // …and is substantially on screen (a closed phone drawer is not).
        const box = el.getBoundingClientRect()
        const visibleH = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0)
        if (box.height > 0 && visibleH < box.height * 0.5) continue
        const s = el.scrollHeight
        if (s > score) {
          score = s
          best = el
        }
      }
    }
    return best || document.scrollingElement || document.documentElement
  }

  const counts = {
    overlap: 0,
    tapSize: 0,
    offscreen: 0,
    hScroll: 0,
    covered: 0,
    dead: 0,
    tinyText: 0,
    transparent: 0,
    blank: 0,
    interactive: 0,
  }
  const items = { overlap: [], tapSize: [], offscreen: [], covered: [], dead: [], tinyText: [], transparent: [] }
  const bump = (kind, obj) => {
    counts[kind] += 1
    if (items[kind] && items[kind].length < MAX) items[kind].push(obj)
  }

  // ---- overlays -----------------------------------------------------------
  // When a dialog/menu/popover is open it owns the screen: the content behind
  // it is intentionally covered, so only audit the overlay's own controls.
  const OVERLAY_SELECTOR =
    '.entity-overlay, .quicklog-overlay, .area-picker, .header-more-menu, ' +
    '.help-overlay, .gear-picker, .lockout-overlay, .qr-overlay, .lib-detail'
  const overlays = Array.prototype.slice.call(document.querySelectorAll(OVERLAY_SELECTOR)).filter((el) => {
    if (!isVisible(el)) return false
    // `.lib-detail` is a normal column on desktop but a fixed sheet on phone.
    if (el.matches('.lib-detail') && style(el)?.position !== 'fixed') return false
    return true
  })
  const scope = overlays.length ? overlays[overlays.length - 1] : null
  const root = scope || document

  // Floating action buttons are deliberate overlays, never "content that
  // overlaps" — exclude them from the interactive scan. Task 107 §12: they are
  // NOT forgiven by the covered check any more, so a FAB hiding a form row is
  // reported; only a modal's own scrim is (the content behind it is intended).
  const EXEMPT = '.quicklog-fab, .quicklog-toast, .entity-overlay-scrim, .glance-exit'
  const isExempt = (el) => !!el.closest(EXEMPT)
  const MODAL_SCRIM =
    '.entity-overlay-scrim, .quicklog-overlay, .area-picker, .help-overlay, ' +
    '.gear-picker, .lockout-overlay, .qr-overlay, .lib-detail'
  const isModalScrim = (el) => !!el.closest(MODAL_SCRIM)

  // ---- collect visible interactive elements -------------------------------
  const rawEls = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE))
  if (scope && scope.matches(INTERACTIVE)) rawEls.push(scope)
  const els = rawEls.filter((el) => !isExempt(el) && isVisible(el))
  const boxes = els.map((el) => ({ el, r: shownRect(el), full: rect(el), sel: cssPath(el), text: textOf(el) }))
  counts.interactive = boxes.length

  // An inline prose link (a wikilink in an answer, an entity name mid-sentence)
  // may stay text-sized; it only gets the 8px pseudo-element hit padding.
  const INLINE_LINK = '.entity-link, .wikilink'
  function isInlineProseLink(el) {
    if (!el.matches(INLINE_LINK)) return false
    if (el.closest('h1, h2, h3, h4, h5, h6')) return false
    return true
  }

  // ---- overlap ------------------------------------------------------------
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      if (overlapArea(a.r, b.r) > 4) {
        bump('overlap', { a: { sel: a.sel, text: a.text }, b: { sel: b.sel, text: b.text } })
      }
    }
  }

  // ---- tap size (phone only) ---------------------------------------------
  const phone = window.innerWidth <= 500
  if (phone) {
    for (const b of boxes) {
      if (isInlineProseLink(b.el)) continue
      if (b.full.width < 40 || b.full.height < 40) {
        bump('tapSize', { sel: b.sel, text: b.text, w: Math.round(b.full.width), h: Math.round(b.full.height) })
      }
    }
  }

  // ---- off-screen / horizontal scroll ------------------------------------
  for (const b of boxes) {
    if (b.r.left < -0.5 || b.r.right > window.innerWidth + 0.5) {
      bump('offscreen', { sel: b.sel, text: b.text, left: Math.round(b.r.left), right: Math.round(b.r.right) })
    }
  }
  const docEl = document.scrollingElement || document.documentElement
  if (docEl.scrollWidth > docEl.clientWidth + 1) counts.hScroll = 1
  const mainEl = mainScroller()
  if (mainEl && mainEl.scrollWidth > mainEl.clientWidth + 1) counts.hScroll = 1

  // ---- covered ------------------------------------------------------------
  for (const b of boxes) {
    const cx = b.r.left + b.r.width / 2
    const cy = b.r.top + b.r.height / 2
    if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) continue
    const hit = document.elementFromPoint(cx, cy)
    if (!hit) continue
    if (hit === b.el || b.el.contains(hit)) continue
    if (isModalScrim(hit)) continue
    bump('covered', { sel: b.sel, text: b.text, by: cssPath(hit), byText: textOf(hit), cx: Math.round(cx), cy: Math.round(cy), w: Math.round(b.full.width), h: Math.round(b.full.height) })
  }

  // ---- transparent overlays (Task 107 §12) -------------------------------
  // A fixed/absolute layer that paints its own text but no background lets the
  // page bleed through it (the Task 103 "Where are you?" defect). Report it.
  for (const el of Array.prototype.slice.call(root.querySelectorAll('*'))) {
    if (counts.transparent >= MAX) break
    const cs = style(el)
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') continue
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue
    if (isExempt(el)) continue
    // Own text only: a wrapper that merely contains textful children is not the
    // layer a reader sees as transparent.
    const ownText = Array.prototype.some.call(
      el.childNodes,
      (n) => n.nodeType === 3 && (n.nodeValue || '').trim().length > 0,
    )
    if (!ownText) continue
    const bg = cs.backgroundColor || ''
    let alpha = bg === 'transparent' ? 0 : 1
    const m = bg.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const parts = m[1].split(',').map((s) => parseFloat(s))
      if (parts.length === 4) alpha = parts[3]
    }
    if (alpha > 0.05) continue
    const r = shownRect(el)
    if (r.width < 0.5 || r.height < 0.5) continue
    let overlaps = ''
    for (const b of boxes) {
      if (b.el === el || el.contains(b.el) || b.el.contains(el)) continue
      if (overlapArea(r, b.r) > 8) {
        overlaps = b.sel
        break
      }
    }
    if (overlaps) bump('transparent', { sel: cssPath(el), text: textOf(el), overlaps })
  }

  // ---- dead links / empty buttons ----------------------------------------
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href')
    if ((href === '' || href === '#') && !a.onclick) {
      bump('dead', { sel: cssPath(a), text: textOf(a), reason: `href="${href}"` })
    }
  }
  for (const btn of document.querySelectorAll('button, [role="button"]')) {
    if (!isVisible(btn)) continue
    const hasText = (btn.textContent || '').trim().length > 0
    const hasLabel = !!(btn.getAttribute('aria-label') || '').trim()
    if (!hasText && !hasLabel) {
      bump('dead', { sel: cssPath(btn), text: '(no text)', reason: 'no text / no aria-label' })
    }
  }

  // ---- tiny text ----------------------------------------------------------
  const walker = document.createTreeWalker(scope || document.body, NodeFilter.SHOW_TEXT)
  let visited = 0
  let node
  while ((node = walker.nextNode()) && visited++ < 20000) {
    const t = (node.nodeValue || '').replace(/\s+/g, ' ').trim()
    if (!t) continue
    const parent = node.parentElement
    if (!parent) continue
    const cs = style(parent)
    if (!cs || cs.display === 'none' || cs.visibility === 'hidden') continue
    const size = parseFloat(cs.fontSize)
    if (!Number.isFinite(size) || size >= 11) continue
    const r = shownRect(parent)
    if (r.width < 0.5 || r.height < 0.5) continue
    bump('tinyText', { sel: cssPath(parent), text: t.slice(0, 80), px: Math.round(size * 10) / 10 })
  }

  // ---- page length --------------------------------------------------------
  const scroller = mainScroller()
  const screens = scroller ? scroller.scrollHeight / window.innerHeight : 0
  const pageLength = {
    screens: Math.round(screens * 100) / 100,
    flagged: screens > 4,
    selector: cssPath(scroller),
    scrollHeight: scroller ? scroller.scrollHeight : 0,
    clientHeight: scroller ? scroller.clientHeight : 0,
  }

  return { counts, pageLength, items }
}

/* ------------------------------------------------------------------- runner */

async function launchBrowser() {
  const tries = [
    { channel: 'msedge' },
    { channel: 'chrome' },
  ]
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

async function runScenario(browser, runCfg) {
  const runDir = path.join(OUT, runCfg.name)
  fs.mkdirSync(runDir, { recursive: true })

  const context = await browser.newContext(runCfg.context)
  const page = await context.newPage()

  const buffers = { console: [], requests: [] }
  page.on('console', (m) => {
    if (m.type() === 'error') buffers.console.push({ text: m.text(), location: m.location() })
  })
  page.on('pageerror', (e) => buffers.console.push({ text: `pageerror: ${e.message}` }))
  page.on('requestfailed', (r) =>
    buffers.requests.push({ method: r.method(), url: r.url(), failure: r.failure()?.errorText || 'failed' }),
  )
  page.on('response', (r) => {
    if (r.status() >= 400) {
      buffers.requests.push({ method: r.request().method(), url: r.url(), failure: `HTTP ${r.status()}` })
    }
  })

  const sleep = (ms) => page.waitForTimeout(ms)
  const steps = []

  // Task 103 §11: a section is "ready" once its skeleton is gone, the app root
  // is present and the main region has real text. Capped at 10s; if it never
  // arrives the step is flagged blank.
  async function contentReady() {
    return page
      .waitForFunction(
        () => {
          if (!document.querySelector('.app')) return false
          if (document.querySelector('.section-skeleton, .dock-skeleton, .lib-skel, .skel-bar')) return false
          const main = document.querySelector('.workspace') || document.querySelector('main') || document.body
          return ((main && main.innerText) || '').trim().length > 50
        },
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false)
  }

  async function step(label, action, check) {
    buffers.console.length = 0
    buffers.requests.length = 0
    const notes = []
    try {
      await action(notes)
    } catch (err) {
      notes.push(`action error: ${err?.message || err}`)
    }
    const blank = !(await contentReady())
    if (blank) notes.push('blank section — no real content within 10s')
    await sleep(150)
    // Task 107 §12: each step states whether it actually reached its target.
    let reached = true
    if (typeof check === 'function') {
      try {
        reached = (await check(notes)) === true
      } catch (err) {
        reached = false
        notes.push(`check error: ${err?.message || err}`)
      }
      if (!reached) notes.push('did not reach target')
    } else if (blank) {
      reached = false
    }
    const index = steps.length + 1
    const file = `${String(index).padStart(2, '0')}-${slug(label)}.png`
    let shot = file
    try {
      await page.screenshot({ path: path.join(runDir, file) })
    } catch (err) {
      shot = null
      notes.push(`screenshot failed: ${err?.message || err}`)
    }
    let audit
    try {
      audit = await page.evaluate(auditPage)
    } catch (err) {
      audit = { error: String(err?.message || err) }
      notes.push(`audit failed: ${err?.message || err}`)
      audit = {
        error: String(err?.message || err),
        counts: { overlap: 0, tapSize: 0, offscreen: 0, hScroll: 0, covered: 0, dead: 0, tinyText: 0, transparent: 0, blank: 0, interactive: 0 },
        pageLength: { screens: 0, flagged: false, selector: '', scrollHeight: 0, clientHeight: 0 },
        items: { overlap: [], tapSize: [], offscreen: [], covered: [], dead: [], tinyText: [], transparent: [] },
      }
    }
    if (audit && audit.counts) audit.counts.blank = blank ? 1 : 0
    steps.push({
      index,
      label,
      file: shot,
      notes,
      reached,
      audit,
      consoleErrors: buffers.console.splice(0),
      networkFailures: buffers.requests.splice(0),
    })
  }

  async function clickText(text, { selector = 'button, a, [role="tab"], [role="button"]', exact = true } = {}) {
    const filtered = exact
      ? page.locator(selector).filter({ hasText: new RegExp(`^\\s*${escapeRe(text)}\\s*$`) })
      : page.locator(selector).filter({ hasText: text })
    const n = await filtered.count().catch(() => 0)
    for (let i = 0; i < n; i++) {
      const c = filtered.nth(i)
      if (!(await c.isVisible().catch(() => false))) continue
      try {
        await c.scrollIntoViewIfNeeded().catch(() => {})
        await c.click({ timeout: 3000 })
        return true
      } catch {
        try {
          await c.click({ timeout: 2000, force: true })
          return true
        } catch {
          /* fall through to DOM path */
        }
      }
    }
    return page.evaluate(
      ({ text, exact }) => {
        const els = Array.prototype.slice.call(
          document.querySelectorAll('button, a, [role="tab"], [role="button"]'),
        )
        const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
        const m = els.find((el) => {
          const t = norm(el.getAttribute('aria-label') || el.textContent || '')
          return exact ? t === text : t.toLowerCase().includes(text.toLowerCase())
        })
        if (!m) return false
        m.scrollIntoView({ block: 'center' })
        m.click()
        return true
      },
      { text, exact },
    )
  }

  async function clickLocator(locator, notes, label) {
    const n = await locator.count().catch(() => 0)
    if (!n) {
      notes.push(`not found: ${label}`)
      return false
    }
    for (let i = 0; i < n; i++) {
      const c = locator.nth(i)
      if (!(await c.isVisible().catch(() => false))) continue
      try {
        await c.scrollIntoViewIfNeeded().catch(() => {})
        await c.click({ timeout: 3000 })
        return true
      } catch {
        try {
          await c.click({ timeout: 2000, force: true })
          return true
        } catch {
          /* next */
        }
      }
    }
    notes.push(`not clickable: ${label}`)
    return false
  }

  async function alive() {
    return page.evaluate(() => !!document.querySelector('.app')).catch(() => false)
  }

  async function reloadTo(hash, notes) {
    notes.push(`app crashed — reloading ${hash}`)
    // Same-URL hash changes are same-document navigations and do NOT remount a
    // crashed React root, so set the hash then force a full reload.
    await page.evaluate((h) => { if (location.hash !== h) location.hash = h }, hash).catch(() => {})
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(async () => {
      await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    })
    await page.waitForSelector('.app', { timeout: 10000 }).catch(() => {})
    await sleep(700)
  }

  async function nav(sectionId, sectionLabel, subId, subLabel, notes) {
    const want = subId ? `#/${sectionId}/${subId}` : `#/${sectionId}`
    // A crashed render (e.g. the Library Search lazy failure) unmounts the whole
    // tree, so tab clicks can no longer work. Remount by loading the route.
    if (!(await alive())) {
      await reloadTo(want, notes)
    } else {
      await clickText(sectionLabel, { selector: '.section-tabs button, .tabbar button' })
      await sleep(400)
      if (subLabel) {
        await clickText(subLabel, { selector: '.subtabs button' })
        await sleep(650)
      }
    }
    const got = await page.evaluate(() => location.hash).catch(() => '')
    if (!got.startsWith(`#/${sectionId}`) && (await alive())) {
      notes.push(`nav fallback to ${want} (was ${got || 'none'})`)
      await page.evaluate((h) => {
        location.hash = h
      }, want)
      await sleep(350)
    }
  }

  async function scrollMain(frac) {
    await page.evaluate((f) => {
      const sels = [
        '.workspace', '.shell-body', '.stage', 'main', '.split', '.side',
        '.panel', '.me-overview', '.me-update', '.me-profiles', '.now-page',
        '.gideon-page', '.me-setup', '.me-gear', '.codex-wrap', '.quests-page', '.lib-results',
        '.lib-panel-body', '.lib-rail', '.gear-picker-box', '.quicklog-sheet',
      ]
      let best = null
      let score = -1
      for (const sel of sels) {
        for (const el of document.querySelectorAll(sel)) {
          const cs = getComputedStyle(el)
          if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue
          if (el.scrollHeight <= el.clientHeight + 1) continue
          const box = el.getBoundingClientRect()
          const visibleH = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0)
          if (box.height > 0 && visibleH < box.height * 0.5) continue
          const s = el.scrollHeight
          if (s > score) {
            score = s
            best = el
          }
        }
      }
      const el = best || document.scrollingElement
      if (el) el.scrollTop = (el.scrollHeight - el.clientHeight) * f
    }, frac)
    await sleep(250)
  }

  async function setStats(notes) {
    let opened = await clickText('Edit stats', { selector: 'button' })
    if (!opened) {
      await nav('me', 'Tarnished', 'overview', 'Overview', notes)
      opened = await clickText('Edit stats', { selector: 'button' })
    }
    const inputs = page.locator('.stat-edit .stats input')
    const count = await inputs.count().catch(() => 0)
    if (!count) {
      notes.push('stat editor not found')
    } else {
      const vals = [15, 10, 12, 12, 18, 9, 8, 10]
      const n = Math.min(count, vals.length)
      for (let i = 0; i < n; i++) {
        await inputs.nth(i).fill(String(vals[i])).catch(() => {})
      }
      notes.push(`set ${n} stats`)
    }
    const lvl = page.locator(
      '.stat-edit input[type="number"], input[name*="level" i], input[id*="level" i], input[aria-label*="level" i]',
    )
    if (await lvl.count().catch(() => 0)) {
      await lvl.first().fill('30').catch(() => {})
      notes.push('set level 30')
    } else {
      notes.push('no level field')
    }
  }

  async function ensureGideon(notes) {
    if (!(await alive())) {
      await reloadTo('#/gideon', notes)
      return
    }
    if (await page.locator('.gideon .pickup-row input').first().count().catch(() => 0)) return
    // The first answer can route the app away from Gideon (e.g. "where is
    // moonveil" opens the map). Go back through the shell, or reload.
    await clickText('Gideon', { selector: '.section-tabs button, .tabbar button' })
    await sleep(400)
    if (!(await page.locator('.gideon .pickup-row input').first().count().catch(() => 0))) {
      await reloadTo('#/gideon', notes)
    }
  }

  async function askGideon(text, timeoutMs, notes) {
    await ensureGideon(notes)
    const input = page.locator('.gideon .pickup-row input').first()
    await input.waitFor({ state: 'visible', timeout: 6000 }).catch(() => notes.push('gideon input not visible'))
    const before = await page.locator('.gideon-log > div').count().catch(() => 0)
    await input.fill(text).catch(() => {})
    await input.press('Enter').catch(() => {})
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const rows = await page.locator('.gideon-log > div').count().catch(() => before)
      const stillGideon = await page.locator('.gideon').count().catch(() => 0)
      if (rows > before || !stillGideon) {
        notes.push(stillGideon ? 'gideon replied' : 'gideon answered by navigating away')
        return
      }
      await sleep(200)
    }
    notes.push(`no gideon response within ${timeoutMs}ms`)
  }

  try {
    // --- Step 1: open the app ---------------------------------------------
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.app', { timeout: 20000 }).catch(() => {})
    await sleep(800)
    await step('landing', async () => {})

    // --- Step 2: Tarnished > Overview -------------------------------------
    await step('tarnished-overview', async (notes) => {
      await nav('me', 'Tarnished', 'overview', 'Overview', notes)
    })

    // --- Step 3: Tarnished > Update + stat editor -------------------------
    await step('tarnished-update-stats', async (notes) => {
      await nav('me', 'Tarnished', 'update', 'Update', notes)
      await sleep(300)
      await setStats(notes)
    })

    // --- Step 4: omnibox search -------------------------------------------
    await step('search-margit-results', async (notes) => {
      // A phone hides the field behind the magnifier; desktop has it inline.
      if (!(await page.locator('#command-search').isVisible().catch(() => false))) {
        await clickLocator(page.locator('.search-toggle'), notes, 'search toggle')
        await sleep(300)
      }
      await page.locator('#command-search').fill('Margit').catch(() => notes.push('search input not found'))
      await page.waitForSelector('.command-hits', { timeout: 6000 }).catch(() => notes.push('no command hits'))
      await sleep(300)
    }, async () => {
      const hits = await page.locator('.command-hits').isVisible().catch(() => false)
      const groups = await page.locator('.command-hits .command-group').count().catch(() => 0)
      return hits && groups > 0
    })

    await step('search-margit-open-boss', async (notes) => {
      const opened = await page.evaluate(() => {
        const groups = Array.prototype.slice.call(document.querySelectorAll('.command-hits .command-group'))
        const boss = groups.find((g) => /Bosses/i.test(g.querySelector('.kicker')?.textContent || ''))
        const group = boss || groups[0]
        const btn = group?.querySelector('button.quest, .quest')
        if (!btn) return null
        btn.scrollIntoView({ block: 'center' })
        btn.click()
        return (btn.querySelector('strong')?.textContent || btn.textContent || '').trim()
      })
      if (opened) notes.push(`opened hit: ${opened}`)
      else notes.push('no boss hit found')
      await sleep(500)
    }, async () => page.locator('.entity-overlay .lib-panel').first().isVisible().catch(() => false))

    // --- Step 5: Journey > Now (top, 50%, 100%) ---------------------------
    await step('journey-now-top', async (notes) => {
      // The entity panel opened above owns the screen; close it before the nav.
      await page.locator('.entity-overlay .lib-panel-close').first().click({ timeout: 1500 }).catch(() => {})
      await page.keyboard.press('Escape').catch(() => {})
      await sleep(200)
      await nav('journey', 'Journey', 'now', 'Now', notes)
    })
    await step('journey-now-scroll-50', async () => {
      await scrollMain(0.5)
    })
    await step('journey-now-scroll-100', async () => {
      await scrollMain(1)
    })

    // --- Step 6: Journey > Map + world selector ---------------------------
    await step('journey-map', async (notes) => {
      await nav('journey', 'Journey', 'map', 'Map', notes)
      await sleep(400)
      try {
        await Promise.race([
          page.waitForSelector('.engine-frame', { timeout: 8000 }),
          page.waitForSelector('.atlas-plate, .atlas-art', { timeout: 8000 }),
          page.waitForTimeout(8500),
        ])
      } catch {
        notes.push('map surface not detected')
      }
      await sleep(500)
    })

    await step('journey-map-world-selector', async (notes) => {
      const sideVisible = await page.locator('.side').isVisible().catch(() => false)
      if (!sideVisible) {
        await clickText('Filters & details', { selector: 'button' })
        await sleep(300)
      }
      let tapped = false
      for (const label of ['Overworld', 'Shadow', 'Underground']) {
        if (await clickText(label, { selector: '.side button, .opts button', exact: true })) {
          tapped = true
          notes.push(`tapped world: ${label}`)
          break
        }
      }
      if (!tapped) notes.push('world selector not present (engine live or hidden)')
      await sleep(400)
    })

    // --- Step 7: Journey > Quests -----------------------------------------
    await step('journey-quests', async (notes) => {
      await nav('journey', 'Journey', 'quests', 'Quests', notes)
    })

    // --- Step 8: Library > Search -----------------------------------------
    await step('library-search', async (notes) => {
      await nav('library', 'Library', 'search', 'Search', notes)
      await sleep(700)
    })

    await step('library-search-weapons-meets', async (notes) => {
      await clickLocator(page.locator('.lib-rail-item').filter({ hasText: /Weapons/ }), notes, 'Weapons category')
      await sleep(300)
      await clickText('I meet requirements', { selector: '.lib-toolbar button', exact: true })
      await sleep(300)
    })

    await step('library-search-open-detail', async (notes) => {
      await clickLocator(page.locator('.lib-card'), notes, 'first result')
      await sleep(400)
    }, async () => page.locator('.lib-panel').first().isVisible().catch(() => false))

    await step('library-search-close-detail', async (notes) => {
      await clickLocator(page.locator('.lib-panel-close'), notes, 'close detail')
      await sleep(200)
    })

    // --- Step 9: Library > Builds / Kit / Reference -----------------------
    await step('library-builds-top', async (notes) => {
      await nav('library', 'Library', 'builds', 'Builds', notes)
      await sleep(800)
    })
    await step('library-builds-scrolled', async () => {
      await scrollMain(1)
    })
    await step('library-kit', async (notes) => {
      await nav('library', 'Library', 'kit', 'Kit', notes)
    })
    await step('library-reference', async (notes) => {
      await nav('library', 'Library', 'reference', 'Reference', notes)
    })

    // --- Step 11: Journey > Area ------------------------------------------
    await step('journey-area', async (notes) => {
      await nav('journey', 'Journey', 'area', 'Area', notes)
    })

    // --- Step 12: Quick-log sheet, log Margit -----------------------------
    await step('quicklog-log-margit', async (notes) => {
      await clickLocator(page.locator('.quicklog-fab:visible, .quicklog-open:visible').first(), notes, 'quick-log opener')
      await page.waitForSelector('.quicklog-sheet', { timeout: 6000 }).catch(() => notes.push('quick-log sheet not shown'))
      await page.locator('.quicklog-input').fill('Margit').catch(() => notes.push('quick-log input not found'))
      await sleep(400)
      await clickLocator(page.locator('.quicklog-row input[type="checkbox"]').first(), notes, 'first quick-log row')
      await clickLocator(page.locator('.quicklog-sheet button').filter({ hasText: /^\s*Log\s*$/ }), notes, 'quick-log commit')
      await sleep(400)
    })

    // --- Step 13: Area picker ---------------------------------------------
    await step('area-picker', async (notes) => {
      await clickLocator(page.locator('.area-chip'), notes, 'area chip')
      await sleep(400)
    })

    // --- Step 14: Tarnished > Setup (step 1) and Gear ---------------------
    await step('tarnished-setup', async (notes) => {
      await nav('me', 'Tarnished', 'setup', 'Setup', notes)
    })
    await step('tarnished-gear', async (notes) => {
      await nav('me', 'Tarnished', 'gear', 'Gear', notes)
    })

    // --- Step 15: Gideon --------------------------------------------------
    await step('gideon-where-is-moonveil', async (notes) => {
      await nav('gideon', 'Gideon', null, null, notes)
      await askGideon('where is moonveil', 8000, notes)
    }, async () => {
      const inGideon = await page.locator('.gideon').count().catch(() => 0)
      if (!inGideon) return false
      return (await page.locator('.gideon-log > div').count().catch(() => 0)) >= 3
    })

    await step('gideon-what-should-i-do-now', async (notes) => {
      await askGideon('what should I do now', 8000, notes)
    }, async () => {
      const inGideon = await page.locator('.gideon').count().catch(() => 0)
      if (!inGideon) return false
      return (await page.locator('.gideon-log > div').count().catch(() => 0)) >= 5
    })
  } finally {
    await context.close().catch(() => {})
  }

  return { name: runCfg.name, label: runCfg.label, viewport: runCfg.context, steps }
}

/* ----------------------------------------------------------------- reporting */

const TYPE_ROWS = [
  { key: 'overlap', label: 'Overlap' },
  { key: 'tapSize', label: 'Tap < 40px' },
  { key: 'offscreen', label: 'Off-screen' },
  { key: 'covered', label: 'Covered' },
  { key: 'dead', label: 'Dead' },
  { key: 'tinyText', label: 'Tiny text <11px' },
  { key: 'transparent', label: 'Transparent overlay' },
]

function stepCounts(s) {
  const c = s.audit?.counts || {}
  return {
    overlap: c.overlap || 0,
    tapSize: c.tapSize || 0,
    offscreen: c.offscreen || 0,
    hScroll: c.hScroll || 0,
    covered: c.covered || 0,
    dead: c.dead || 0,
    tinyText: c.tinyText || 0,
    transparent: c.transparent || 0,
    blank: c.blank || 0,
    console: (s.consoleErrors || []).length,
    net: (s.networkFailures || []).length,
    screens: s.audit?.pageLength?.screens ?? 0,
    flagged: !!s.audit?.pageLength?.flagged,
    reached: s.reached !== false,
  }
}

function mdTable(headers, rows) {
  const out = []
  out.push(`| ${headers.join(' | ')} |`)
  out.push(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const r of rows) out.push(`| ${r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`)
  return out.join('\n')
}

function cmp(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function buildReport(runs, meta) {
  const lines = []
  lines.push(`# UI Audit \u2014 ${meta.stamp}`)
  lines.push('')
  lines.push(`- URL: ${meta.base}`)
  lines.push(`- Browser channel: ${meta.channel}`)
  lines.push(`- Runs: ${runs.map((r) => r.label).join(', ')}`)
  lines.push(`- Generated: ${meta.generatedAt}`)
  lines.push('')

  for (const run of runs) {
    lines.push(`## ${run.label}`)
    lines.push('')
    const rows = run.steps.map((s) => {
      const c = stepCounts(s)
      const screens = `${c.screens}${c.flagged ? ' \u26a0' : ''}`
      return [
        `${s.index}. ${s.label}`,
        s.file || '(none)',
        c.overlap,
        c.tapSize,
        c.offscreen,
        c.hScroll,
        c.covered,
        c.dead,
        c.tinyText,
        c.transparent,
        c.blank,
        c.reached ? 'yes' : 'NO',
        c.console,
        c.net,
        screens,
      ]
    })
    lines.push(
      mdTable(
        ['Step', 'Screenshot', 'Overlap', 'Tap<40', 'Off-screen', 'H-Scroll', 'Covered', 'Dead', 'Tiny<11', 'Transparent', 'Blank', 'Reached', 'Console', 'Net', 'Screens'],
        rows,
      ),
    )
    lines.push('')
    const addressed = run.steps.filter((s) => s.notes.length)
    if (addressed.length) {
      lines.push('Notes:')
      lines.push('')
      for (const s of addressed) lines.push(`- ${s.index}. ${s.label}: ${s.notes.join('; ')}`)
      lines.push('')
    }
  }

  // ---- top issues per type (all runs) ------------------------------------
  const top = {}
  const gather = (kind) => {
    const seen = new Set()
    const rows = []
    for (const run of runs) {
      for (const s of run.steps) {
        for (const it of s.audit?.items?.[kind] || []) {
          const key = JSON.stringify(it)
          if (seen.has(key)) continue
          seen.add(key)
          rows.push({ run: run.name, step: s.label, it })
        }
      }
    }
    rows.sort((a, b) => cmp(a.run, b.run) || cmp(a.step, b.step) || cmp(JSON.stringify(a.it), JSON.stringify(b.it)))
    top[kind] = rows.slice(0, 15)
  }
  for (const t of TYPE_ROWS) gather(t.key)

  lines.push('## Top issues per type (top 15, both runs)')
  lines.push('')

  lines.push('### Overlap')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector A', 'Selector B'],
      top.overlap.map((r) => [r.run, r.step, r.it.a.sel, r.it.b.sel]),
    ),
  )
  lines.push('')

  lines.push('### Tap size < 40px (phone only)')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'Size'],
      top.tapSize.map((r) => [r.run, r.step, r.it.sel, r.it.text, `${r.it.w}\u00d7${r.it.h}`]),
    ),
  )
  lines.push('')

  lines.push('### Off-screen / clipped')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'Left/Right'],
      top.offscreen.map((r) => [r.run, r.step, r.it.sel, r.it.text, `${r.it.left}/${r.it.right}`]),
    ),
  )
  lines.push('')

  lines.push('### Covered')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'Covered by'],
      top.covered.map((r) => [r.run, r.step, r.it.sel, r.it.text, r.it.by]),
    ),
  )
  lines.push('')

  lines.push('### Dead / empty controls')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'Reason'],
      top.dead.map((r) => [r.run, r.step, r.it.sel, r.it.text, r.it.reason]),
    ),
  )
  lines.push('')

  lines.push('### Tiny text < 11px')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'px'],
      top.tinyText.map((r) => [r.run, r.step, r.it.sel, r.it.text, r.it.px]),
    ),
  )
  lines.push('')

  lines.push('### Transparent overlay (fixed/absolute text with no background)')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Selector', 'Text', 'Overlaps'],
      top.transparent.map((r) => [r.run, r.step, r.it.sel, r.it.text, r.it.overlaps]),
    ),
  )
  lines.push('')

  // ---- console + failed requests -----------------------------------------
  const consoles = []
  const nets = []
  for (const run of runs) {
    for (const s of run.steps) {
      for (const c of s.consoleErrors) consoles.push({ run: run.name, step: s.label, text: c.text })
      for (const n of s.networkFailures) nets.push({ run: run.name, step: s.label, ...n })
    }
  }
  lines.push('## Console errors')
  lines.push('')
  lines.push(mdTable(['Run', 'Step', 'Message'], consoles.slice(0, 40).map((c) => [c.run, c.step, c.text])))
  lines.push('')
  lines.push('## Failed network requests')
  lines.push('')
  lines.push(
    mdTable(
      ['Run', 'Step', 'Method', 'URL', 'Failure'],
      nets.slice(0, 40).map((n) => [n.run, n.step, n.method, n.url, n.failure]),
    ),
  )
  lines.push('')
  return lines.join('\n')
}

/* ---------------------------------------------------------------------- main */

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  console.log(`[ui-audit] target ${BASE}`)
  console.log(`[ui-audit] output ${OUT}`)

  const { browser, channel } = await launchBrowser()
  console.log(`[ui-audit] browser ${channel}`)
  const runs = []
  try {
    for (const runCfg of RUNS) {
      console.log(`[ui-audit] run ${runCfg.name} …`)
      const result = await runScenario(browser, runCfg)
      runs.push(result)
      console.log(`[ui-audit] run ${runCfg.name}: ${result.steps.length} steps`)
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const generatedAt = new Date().toISOString()
  const report = {
    url: BASE,
    channel,
    stamp: STAMP,
    generatedAt,
    runs,
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))

  const md = buildReport(runs, { stamp: STAMP, base: BASE, channel, generatedAt })
  fs.writeFileSync(path.join(OUT, 'report.md'), md)

  console.log(`[ui-audit] wrote ${path.join(OUT, 'report.md')}`)
}

main().catch((err) => {
  console.error('[ui-audit] fatal:', err?.stack || err)
  process.exitCode = 1
})
