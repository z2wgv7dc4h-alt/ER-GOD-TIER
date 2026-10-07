#!/usr/bin/env node
// Task 167 — collect the real-world robustness set: phone photos of Elden Ring on
// a TV/monitor posted by players. Reddit's API is blocked from CI/datacenter IPs,
// so we harvest image results from DuckDuckGo's image endpoint (no login), then
// download politely (descriptive UA, >=2 s between requests). The images live in
// `.scratch/167/web-photos/` and are NEVER committed; only `index.json` (url,
// source page, guessed screen type) is the manifest the evaluator reads.
//
// Usage: node scripts/collect-web-photos.mjs [--max=150]

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const OUT = path.join(root, '.scratch/167/web-photos')
const UA = 'AllKnowingPhotoEval/0.1 (offline PWA research; contact: owner)'
const argv = process.argv.slice(2)
const maxArg = argv.find((a) => a.startsWith('--max='))
const MAX = maxArg ? Number(maxArg.slice(6)) : 150
const PER_QUERY = 14
const DELAY_MS = 2100

const QUERIES = [
  { q: '"elden ring" "character status" site:reddit.com', screen: 'status' },
  { q: '"elden ring" status screen runes site:reddit.com', screen: 'status' },
  { q: '"elden ring" character stats screen reddit photo', screen: 'status' },
  { q: '"elden ring" inventory screen site:reddit.com', screen: 'inventory' },
  { q: '"elden ring" "my inventory" site:reddit.com', screen: 'inventory' },
  { q: '"elden ring" inventory item screen reddit photo', screen: 'inventory' },
  { q: '"elden ring" "ashes of war" equipment site:reddit.com', screen: 'equipment' },
  { q: '"elden ring" equipment screen site:reddit.com', screen: 'equipment' },
  { q: '"elden ring" talisman equipment screen reddit', screen: 'equipment' },
  { q: '"elden ring" map screen site:reddit.com', screen: 'map' },
  { q: '"elden ring" "world map" photo site:reddit.com', screen: 'map' },
  { q: '"elden ring" map help screen reddit photo', screen: 'map' },
  { q: '"elden ring" "what is this item" reddit photo', screen: 'inventory' },
  { q: '"elden ring" item screen site:reddit.com', screen: 'inventory' },
  { q: 'site:imgur.com elden ring inventory status map screen', screen: 'unknown' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function ddgImages(query) {
  const h = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(query) + '&iax=images&ia=images', { headers: { 'User-Agent': UA } }).then((r) => r.text())
  const m = h.match(/vqd=['"]?([0-9-]+)/)
  if (!m) return []
  const j = await fetch('https://duckduckgo.com/i.js?l=us-en&o=json&q=' + encodeURIComponent(query) + '&vqd=' + m[1] + '&f=,,,&p=1', { headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/' } }).then((r) => r.text())
  try {
    return JSON.parse(j).results ?? []
  } catch {
    return []
  }
}

const isImage = (u) => /\.(jpe?g|png)(\?|$)/i.test(u) && !/\.webp(\?|$)/i.test(u)
const host = (u) => { try { return new URL(u).hostname } catch { return '' } }
const redditHost = (h) => /redd\.it|redditmedia|reddit\.com/.test(h)

function extOf(u) { return /\.png(\?|$)/i.test(u) ? 'png' : 'jpg' }

fs.mkdirSync(OUT, { recursive: true })
const seen = new Set()
const index = []
let nextId = 0

for (const { q, screen } of QUERIES) {
  let results
  try { results = await ddgImages(q) } catch (e) { console.log('[collect] query failed', q, e.message); continue }
  let kept = 0
  for (const r of results) {
    if (index.length >= MAX || kept >= PER_QUERY) break
    const url = r.image
    if (!url || !isImage(url)) continue
    const h = host(url)
    // The robustness set is player phone photos, so keep only Reddit/imgur image
    // hosts (the press-screenshot CDNs are clean renders, not what we must survive).
    if (!redditHost(h) && !/imgur\.com$/i.test(h)) continue
    // ...and only when the post title reads like a UI/help screenshot, not fan art.
    if (!/inventory|equip|status|stats|map|item|talisman|ashes|weapon|armou?r|rune|help|where|find|screen|build|level|stats|photo|tv|this|what/i.test(r.title ?? '')) continue
    const key = url.replace(/\?.*$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    const id = String(nextId++).padStart(3, '0')
    const file = `${id}-${screen}.${extOf(url)}`
    try {
      const buf = Buffer.from(await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }).then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.arrayBuffer() }))
      if (buf.length < 2000 || buf.length > 12 * 1024 * 1024) continue
      fs.writeFileSync(path.join(OUT, file), buf)
      index.push({ file, url, page: r.url ?? '', title: r.title ?? '', guess: screen, width: r.width, height: r.height })
      kept++
    } catch (e) { /* skip unfetchable */ }
    await sleep(DELAY_MS)
    if (index.length >= MAX) break
  }
  console.log(`[collect] ${q} -> kept ${kept}, total ${index.length}/${MAX}`)
  if (index.length >= MAX) break
  await sleep(DELAY_MS)
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ collectedAt: new Date().toISOString(), count: index.length, photos: index }, null, 2))
console.log(`[collect] wrote ${index.length} photos to ${OUT}`)
