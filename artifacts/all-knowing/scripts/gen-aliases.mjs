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

/**
 * Loose normal form: lowercase, drop possessives/parentheticals/punctuation.
 * Used for the alias strings and the fallback name match.
 */
function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2019']s\b/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strict normal form that KEEPS parentheticals, so "Haligtree Secret Medallion
 * (Left)" is distinguishable from the bare "... Medallion". Preference order is
 * exact-strict first, then the loose form.
 */
function rawNorm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2019']s\b/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripArticle(s) {
  return s.replace(/^(the|a|an)\s+/, '')
}

/**
 * Deterministic slug for a name-derived grace stub (Task 73). A warp with no
 * authored slug still needs a stable `grace:{slug}` id, derived from its English
 * name. Only ascii letters/digits survive; runs collapse to one dash.
 */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Match an extracted engine name to a catalog/seed row. The loose fallback is
 * exact normalised equality only (possessives, parentheticals and articles are
 * normalised away). Containment was tried and rejected — a one-word alias like
 * "godrick" or "messmer" pulled in every spirit-summon and soldier variant, and
 * reverse containment turned "Dagger" into "Weathered Dagger". Precision matters
 * because canonicalFactId trusts these mappings.
 */
function nameMatches(engineName, phrase) {
  const e = norm(engineName)
  const f = norm(phrase)
  if (!e || !f) return false
  return e === f || stripArticle(e) === stripArticle(f)
}

function exactStrict(engineName, phrase) {
  const e = rawNorm(engineName)
  const f = rawNorm(phrase)
  return Boolean(e) && e === f
}

function matchesRow(engineName, row) {
  if (nameMatches(engineName, row.name)) return true
  return (row.aliases || []).some((a) => nameMatches(engineName, a))
}

/** Rows whose strict name/alias exactly equals the engine name. */
function strictRow(engineName, row) {
  if (exactStrict(engineName, row.name)) return true
  return (row.aliases || []).some((a) => exactStrict(engineName, a))
}

/**
 * Pick the catalog/seed row for an extracted name. Prefer a strict (parenthetical-
 * preserving) match so a "(Left)" row beats the bare item, then fall back to the
 * loose match used for everything else.
 */
function findSeed(engineName, rows) {
  return rows.find((r) => strictRow(engineName, r)) || rows.find((r) => matchesRow(engineName, r))
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
// Source dumps (all already in-repo; no remote fetch)
// ---------------------------------------------------------------------------
const namesJson = read('public/sourced/open/names.json')
const checklistsGraces = read('public/sourced/checklists/graces.json')
const bossXyz = read('public/sourced/open/boss-xyz.json')
const hunts = read('public/sourced/checklists/hunts.json')
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
const catalogGraces = facts.filter((f) => f.kind === 'grace')

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

// Graces: BonfireWarpParam rows (418) -> authored warp slug where one exists,
// otherwise the authored catalog grace fact of the same name. Task 73: a warp
// with neither gets a name-derived `grace:{slug}` stub (no pin, no implies), so
// every engine warp id canonicalises and is searchable. No coordinate is invented.
const authoredGraceIds = new Set([...warpGraces.map((g) => g.id), ...catalogGraces.map((f) => f.id)])
const unmatchedGraces = []
for (const g of checklistsGraces) {
  const seed = findSeed(g.name, warpGraces) || findSeed(g.name, catalogGraces)
  if (seed) {
    // Authored slug wins: a `graces.ts` seed (with a real pin) or a catalog grace.
    emit(`grace:${g.warpId}`, seed.id, g.name, rowAliases(seed.name, seed.aliases, g.name), 'hosted-graces')
    continue
  }
  // Task 73: no authored slug — emit a name-only `grace:{slug}` stub so the
  // engine warp id still canonicalises and search finds it. These carry no
  // implication edges and no pin; a pin exists only where `graces.ts`/`coords`
  // already names the grace.
  const slug = slugify(g.name)
  if (!slug) {
    unmatchedGraces.push(g)
    continue
  }
  const stubId = `grace:${slug}`
  // Authored ids still win: if the derived slug is an existing authored grace id
  // (the warp name is a variant of it), map onto that fact instead of stubbing.
  const authored = authoredGraceIds.has(stubId)
    ? catalogGraces.find((f) => f.id === stubId) || warpGraces.find((w) => w.id === stubId)
    : null
  if (authored) {
    emit(`grace:${g.warpId}`, stubId, g.name, rowAliases(authored.name, authored.aliases, g.name), 'hosted-graces')
    continue
  }
  emit(`grace:${g.warpId}`, stubId, g.name, rowAliases(g.name, [], g.name), 'grace-stub')
}

// Bosses: hosted boss flags + extracted NpcParam rows -> authored boss slug.
const unmatchedBosses = []
for (const b of bossXyz) {
  const seed = findSeed(b.name, catalogBosses)
  if (!seed) {
    unmatchedBosses.push(b)
    continue
  }
  emit(b.id, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
  if (b.kill) emit(`bossflag:${b.kill}`, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
}
for (const key of Object.keys(npcCombat)) {
  const r = npcCombat[key]
  const fact = facts.find((f) => f.id === r.factId)
  if (!fact) continue
  emit(`npc:${r.npcRow}`, fact.id, r.paramName || r.name || fact.name, rowAliases(fact.name, fact.aliases, r.paramName), 'npc-combat')
}

// Hunts: field-boss checklists. Map to the authored boss/invader slug by name;
// otherwise the `hunt:` row stands on its own (canonicalFactId leaves it as-is,
// and `prefixKind` already buckets `hunt` with bosses).
for (const h of hunts) {
  const seed = findSeed(h.name, catalogBosses) || findSeed(h.name, catalogInvaders)
  const slug = seed ? seed.id : h.id
  const factName = seed ? seed.name : h.name
  const factAliases = seed ? seed.aliases : []
  emit(h.id, slug, h.name, rowAliases(factName, factAliases, h.name), 'hunts')
}

// Items: FMG names -> authored item slug.
for (const row of namesJson) {
  const seed = findSeed(row.name, catalogItems)
  if (!seed) continue
  emit(row.id, seed.id, row.name, rowAliases(seed.name, seed.aliases, row.name), 'names')
}

// Invaders + extra bosses: NpcParam names -> authored slug. A generic enemy
// type can have dozens of placement rows; keep the first two per slug so the
// table stays a canonical-id map, not a full NpcParam dump.
const paramBySlug = new Map()
for (const p of paramNames('NpcParam.txt').sort((a, b) => a.row - b.row)) {
  const seed =
    findSeed(p.name, catalogInvaders) ||
    findSeed(p.name, catalogBosses)
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

// Deterministic ordering — plain code-unit comparison, not localeCompare, so a
// regeneration on any machine produces byte-identical output.
rows.sort((a, b) => {
  const ka = `${a.kind}\u0000${a.engineId}\u0000${a.slug}`
  const kb = `${b.kind}\u0000${b.engineId}\u0000${b.slug}`
  return ka < kb ? -1 : ka > kb ? 1 : 0
})

// ---------------------------------------------------------------------------
// Write + report
// ---------------------------------------------------------------------------
const json = JSON.stringify(rows, null, 1) + '\n'
const publicPath = join(root, 'public/sourced/aliases.json')
const dataPath = join(root, 'src/data/aliases.json')
writeFileSync(publicPath, json)
writeFileSync(dataPath, json)

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

// Honest unmatched report — never silently dropped. The full list is printed so
// it can be pasted into docs/ALIAS-PLANE.md; the count is what matters here.
console.log(`unmatched warps: ${unmatchedGraces.length}/${checklistsGraces.length} have no catalog slug`)
console.log(`unmatched bosses: ${unmatchedBosses.length}/${bossXyz.length} have no catalog slug`)
if (process.env.ALIAS_UNMATCHED === '1') {
  console.log('--- unmatched warp names ---')
  for (const g of unmatchedGraces) console.log(g.name)
  console.log('--- unmatched boss names ---')
  for (const b of unmatchedBosses) console.log(b.name)
}
