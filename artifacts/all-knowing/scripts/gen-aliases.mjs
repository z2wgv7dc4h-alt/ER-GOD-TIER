// Generate the alias plane: public/sourced/aliases.json + src/data/aliases.json.
//
// SCOPE.md item 2: "One generated aliases.json after extract. Every other plane
// keys off the slug." Rows map an engine row id (FMG / param table) to the
// authored catalog slug, the extracted FMG name, and the searchable aliases:
//
//   engineId   grace:100000
//   slug       grace:godrick-grace
//   fmgName    Godrick the Grafted
//   aliases    godrick the grafted, godrick grace
//
// Inputs are the game-derived dumps this repo already carries (all under
// public/sourced/ and src/data/). Refreshing those from the local install is
// documented in DATA.md ("Refresh") and docs/ALIAS-PLANE.md; this script turns
// them into the alias plane and is safe to re-run.
//
// Usage (from artifacts/all-knowing):
//   node scripts/gen-aliases.mjs
//
// Do not hand-edit aliases.json — edit the sources or this script and re-run.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { facts } from '../src/knowledge/catalog.ts'
import { warpGraces } from '../src/knowledge/graces.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))

const STOP = new Set(['the', 'of', 'a', 'an', 'and'])

/** Lowercase, drop possessives/parentheticals/punctuation. */
function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2019']s\b/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripArticle(s) {
  return s.replace(/^(the|a|an)\s+/, '')
}

/**
 * Match an extracted engine name to a catalog/seed row. Deliberately strict:
 * exact normalised equality only (possessives, parentheticals and articles are
 * already normalised away). Containment was tried and rejected — a one-word
 * alias like "godrick" or "messmer" pulled in every spirit-summon and soldier
 * variant, and reverse containment turned "Dagger" into "Weathered Dagger".
 * Precision matters because canonicalFactId trusts these mappings.
 */
function nameMatches(engineName, phrase) {
  const e = norm(engineName)
  const f = norm(phrase)
  if (!e || !f) return false
  return e === f || stripArticle(e) === stripArticle(f)
}

function matchesRow(engineName, row) {
  if (nameMatches(engineName, row.name)) return true
  return (row.aliases || []).some((a) => nameMatches(engineName, a))
}

function rowAliases(factName, factAliases, fmgName) {
  const out = new Set()
  const push = (s) => {
    const n = norm(s)
    if (n) out.add(n)
    const noArt = stripArticle(n)
    if (noArt) out.add(noArt)
  }
  push(factName)
  for (const a of factAliases || []) push(a)
  if (fmgName && norm(fmgName) !== norm(factName)) push(fmgName)
  return [...out].sort()
}

const kindOf = (id) => {
  const p = id.split(':')[0]
  if (p === 'invader') return 'invader'
  return p
}

// ---------------------------------------------------------------------------
// Source dumps
// ---------------------------------------------------------------------------
const namesJson = read('public/sourced/open/names.json')
const hostedGraces = read('src/data/hosted-graces.json')
const hostedBosses = read('src/data/hosted-bosses.json')
const npcCombat = read('public/sourced/npc-combat.json')

const paramNames = (file) => {
  const text = readFileSync(join(root, 'public/sourced/open/paramdex', file), 'utf8')
  const rows = []
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d+)\s+(.+?)\s*$/)
    if (m) rows.push({ row: Number(m[1]), name: m[2] })
  }
  return rows
}

const catalogBosses = facts.filter((f) => f.id.startsWith('boss:'))
const catalogInvaders = facts.filter((f) => f.id.startsWith('invader:'))
const catalogItems = facts.filter((f) => f.kind === 'item')

// ---------------------------------------------------------------------------
// Build rows
// ---------------------------------------------------------------------------
/** @type {{engineId:string,slug:string,kind:string,fmgName:string,aliases:string[],source:string}[]} */
const rows = []
const seen = new Set()
function emit(engineId, slug, fmgName, aliases, source) {
  const key = `${engineId}::${slug}`
  if (seen.has(key)) return
  seen.add(key)
  rows.push({ engineId, slug, kind: kindOf(slug), fmgName, aliases, source })
}

// Graces: BonfireWarpParam rows -> authored warp slug (the canonical grace slug).
const warpByName = []
for (const g of warpGraces) warpByName.push(g)
for (const g of hostedGraces) {
  const seed = warpByName.find((w) => matchesRow(g.name, w))
  if (!seed) continue
  emit(`grace:${g.warpId}`, seed.id, g.name, rowAliases(seed.name, seed.aliases, g.name), 'hosted-graces')
}

// Bosses: hosted boss flags + extracted NpcParam rows -> authored boss slug.
for (const b of hostedBosses) {
  const seed = catalogBosses.find((f) => matchesRow(b.name, f))
  if (!seed) continue
  emit(b.id, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
  if (b.kill) emit(`bossflag:${b.kill}`, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
}
for (const key of Object.keys(npcCombat)) {
  const r = npcCombat[key]
  const fact = facts.find((f) => f.id === r.factId)
  if (!fact) continue
  emit(`npc:${r.npcRow}`, fact.id, r.paramName || r.name || fact.name, rowAliases(fact.name, fact.aliases, r.paramName), 'npc-combat')
}

// Items: FMG names -> authored item slug.
for (const row of namesJson) {
  const seed = catalogItems.find((f) => matchesRow(row.name, f))
  if (!seed) continue
  emit(row.id, seed.id, row.name, rowAliases(seed.name, seed.aliases, row.name), 'names')
}

// Invaders + extra bosses: NpcParam names -> authored slug. A generic enemy
// type can have dozens of placement rows; keep the first two per slug so the
// table stays a canonical-id map, not a full NpcParam dump.
const paramBySlug = new Map()
for (const p of paramNames('NpcParam.txt').sort((a, b) => a.row - b.row)) {
  const seed =
    catalogInvaders.find((f) => matchesRow(p.name, f)) ||
    catalogBosses.find((f) => matchesRow(p.name, f))
  if (!seed) continue
  const list = paramBySlug.get(seed.id) || []
  if (list.length >= 2) continue
  list.push(p)
  paramBySlug.set(seed.id, list)
}
for (const [slug, list] of paramBySlug) {
  const fact = facts.find((f) => f.id === slug)
  for (const p of list) {
    emit(`npc:${p.row}`, slug, p.name, rowAliases(fact.name, fact.aliases, p.name), 'paramdex-npc')
  }
}

// Authored-only facts (quests, regions, uncovered items/graces/bosses): the
// generated index still carries their names/aliases so every category resolves.
const covered = new Set(rows.map((r) => r.slug))
for (const f of facts) {
  if (covered.has(f.id)) continue
  emit(f.id, f.id, f.name, rowAliases(f.name, f.aliases), 'authored')
}

rows.sort((a, b) => (a.kind + a.engineId + a.slug).localeCompare(b.kind + b.engineId + b.slug))

// ---------------------------------------------------------------------------
// Write + report
// ---------------------------------------------------------------------------
const json = JSON.stringify(rows, null, 1) + '\n'
const publicPath = join(root, 'public/sourced/aliases.json')
const dataPath = join(root, 'src/data/aliases.json')
writeFileSync(publicPath, json)
writeFileSync(dataPath, json)

const kinds = [...new Set(facts.map((f) => f.kind))]
const byPrefix = {}
for (const f of facts) {
  const k = kindOf(f.id)
  byPrefix[k] = byPrefix[k] || { total: 0, engine: 0 }
  byPrefix[k].total++
  if (rows.some((r) => r.slug === f.id && r.source !== 'authored')) byPrefix[k].engine++
}
console.log(`wrote ${rows.length} alias rows (${json.length} bytes) to:`)
console.log(`  ${publicPath}`)
console.log(`  ${dataPath}`)
console.log('engine-backed coverage by fact prefix:')
for (const [k, v] of Object.entries(byPrefix)) {
  console.log(`  ${k}: ${v.engine}/${v.total} engine-backed, ${v.total - v.engine} authored-only`)
}
