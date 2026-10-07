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

// Task 160 — the enrichment index is the authority for a grace's real record id.
// A warp with no authored slug must map to the `grace:<warpId>` record the index
// already holds, never to a synthetic `grace:<name-slug>` stub the app cannot open.
let indexRecords = {}
try {
  indexRecords = read('public/sourced/entity-index.json').records ?? {}
} catch {
  indexRecords = {}
}
const indexGraceByName = new Map()
// Task 160 #15 — a warp the index classified as a region/dungeon (e.g. the
// "Prince of Death's Throne" grace the region plane also carries) must still map
// onto a real page, not a ghost `grace:{name}` stub.
const indexPlaceByName = new Map()
for (const [id, record] of Object.entries(indexRecords)) {
  if (!record.name) continue
  const key = String(record.name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!key) continue
  if (record.kind === 'grace' && !indexGraceByName.has(key)) indexGraceByName.set(key, id)
  if ((record.kind === 'region' || record.kind === 'dungeon') && !indexPlaceByName.has(key)) indexPlaceByName.set(key, id)
}

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
const hunts = read('src/data/hunts.json')
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

// Authored bosses only: per-encounter facts (`<id>--<place>`) are generated from
// the roster and resolved by flag/aka below, never by fuzzy name.
const catalogBosses = facts.filter((f) => f.id.startsWith('boss:') && !f.id.includes('--'))
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
  // Task 160: when the enrichment index already carries a real record for this
  // warp (its `grace:<warpId>` id), map the engine id onto that record instead
  // of minting a ghost slug the app has no page for.
  const indexed =
    (indexRecords[`grace:${g.warpId}`] && `grace:${g.warpId}`) ||
    indexGraceByName.get(g.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()) ||
    indexPlaceByName.get(g.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
  if (indexed) {
    emit(`grace:${g.warpId}`, indexed, g.name, rowAliases(g.name, [], g.name), 'entity-index')
    continue
  }
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
// A boss fought in several places has one fact per encounter (src/data/bosses.json
// `group`); its kill flag must resolve to that encounter, not the shared boss.
const encounterByFlag = new Map()
const rosterByName = new Map()
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
for (const row of read('src/data/bosses.json')) {
  // Ids a duplicate source gave the same fight (build-boss-roster SAME_FIGHT).
  for (const aka of row.aka ?? []) emit(aka, row.id, row.name, rowAliases(row.name, [], row.name), 'boss-roster')
  if (row.group && row.flag) encounterByFlag.set(row.flag, row)
  if (!row.group) {
    for (const n of [row.name, ...String(row.name).split(/\s*(?:\/|&)\s*/)]) {
      if (!rosterByName.has(normName(n))) rosterByName.set(normName(n), row)
    }
  }
}
for (const b of bossXyz) {
  const encounter = encounterByFlag.get(b.kill) ?? encounterByFlag.get(b.flag)
  if (encounter) {
    const label = `${encounter.name} (${encounter.location})`
    emit(b.id, encounter.id, label, [] /* flag mapping only: a bare name must resolve to the shared boss */, 'boss-roster')
    if (b.kill) emit(`bossflag:${b.kill}`, encounter.id, label, [], 'boss-roster')
    continue
  }
  // A composite fight ("Malenia, Blade of Miquella & Malenia, Goddess of Rot",
  // "Demi-Human Chief(x2)") resolves through its first part that is known.
  const parts = [b.name, ...String(b.name).split(/\s*&\s*/)].map((p) => p.replace(/\s*\(x\d+\)\s*$/i, '').trim())
  const seed = parts.map((p) => findSeed(p, catalogBosses)).find(Boolean)
  if (!seed) {
    const rosterPart = parts.map((p) => rosterByName.get(normName(p))).find(Boolean)
    if (rosterPart) {
      emit(b.id, rosterPart.id, b.name, rowAliases(b.name, [], b.name), 'boss-roster')
      if (b.kill) emit(`bossflag:${b.kill}`, rosterPart.id, b.name, rowAliases(b.name, [], b.name), 'boss-roster')
      continue
    }
    // Not an authored catalog boss: the roster still names it (field bosses,
    // dungeon bosses), so the flag resolves to the roster's own id.
    const rosterHit = rosterByName.get(normName(b.name))
    if (rosterHit) {
      emit(b.id, rosterHit.id, b.name, rowAliases(b.name, [], b.name), 'boss-roster')
      if (b.kill) emit(`bossflag:${b.kill}`, rosterHit.id, b.name, rowAliases(b.name, [], b.name), 'boss-roster')
      continue
    }
    unmatchedBosses.push(b)
    continue
  }
  emit(b.id, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
  if (b.kill) emit(`bossflag:${b.kill}`, seed.id, b.name, rowAliases(seed.name, seed.aliases, b.name), 'hosted-bosses')
}
// Task 150 §4 — partner kill flags. A duo fight lists one GameAreaParam row per
// member (Auriza's 30100800/30100801, Unsightly's 30120800/30120801, Altus
// Tunnel's 32050800/32050801), but `boss-xyz.json` carries only the primary flag,
// and two xyz names ("Demi-Human Chief ×2", "Nox Monk & Nox Swordstress") never
// matched their page by name. Point each at the encounter page so the PC-save
// kill flag resolves; the `area:` row gives the fight itself a page link.
for (const [flag, slug, name] of [
  [30100801, 'boss:crucible-ordovis', 'Crucible Knight & Crucible Knight Ordovis'],
  [30120801, 'boss:perfumer-tricia', 'Perfumer Tricia & Misbegotten Warrior'],
  [32050801, 'boss:crystalian-duo--altus-tunnel', 'Crystalian (Spear) & Crystalian (Ringblade) (Altus Tunnel)'],
  [31150800, 'boss:demi-human-chiefs', 'Demi-Human Chiefs'],
  [1049390800, 'boss:nox-swordstress-and-nox-monk', 'Nox Swordstress and Nox Monk'],
]) {
  emit(`bossflag:${flag}`, slug, name, [], 'boss-roster')
  emit(`area:${flag}`, slug, name, [], 'boss-roster')
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
const rosterAkaIds = new Set(read('src/data/bosses.json').flatMap((r) => r.aka ?? []))
for (const h of hunts) {
  // The roster already says which fight this hunt id is (its aka).
  if (rosterAkaIds.has(h.id)) continue
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

// Wiki redirects (Task 132 §1): each `from` title is a real wiki alias of its
// `to` page. Fold them onto the alias row whose fmgName matches the target, so
// the 2,730 redirects become searchable aliases on the canonical entity.
let redirects = []
try {
  redirects = read('public/sourced/open/wiki-db/redirects.json').redirects ?? []
} catch {
  redirects = []
}
if (redirects.length) {
  const rowByTarget = new Map()
  const addTarget = (name, row) => {
    if (!name) return
    for (const key of [rawNorm(name), norm(name)]) if (key && !rowByTarget.has(key)) rowByTarget.set(key, row)
  }
  for (const row of rows) {
    addTarget(row.fmgName, row)
    addTarget(row.slug.includes(':') ? row.slug.split(':').slice(1).join(':') : row.slug, row)
    for (const alias of row.aliases) addTarget(alias, row)
  }
  // Resolve redirect chains (a redirect may point at another redirect).
  const toByFrom = new Map(redirects.map((r) => [rawNorm(r.from), r.to]))
  const resolveTarget = (title, depth = 0) => {
    if (depth > 4) return title
    const next = toByFrom.get(rawNorm(title))
    return next && rawNorm(next) !== rawNorm(title) ? resolveTarget(next, depth + 1) : title
  }
  let attached = 0
  for (const redirect of redirects) {
    const target = resolveTarget(redirect.to)
    const row = rowByTarget.get(rawNorm(target)) ?? rowByTarget.get(norm(target))
    if (!row) continue
    // Keep parentheticals (rawNorm) so a disambiguation redirect like
    // "SM (Sword of Milos)" becomes "sm sword of milos", not the bare, ambiguous
    // "sm" that would substring-match every "smithing" query at runtime.
    const alias = rawNorm(redirect.from)
    if (alias.length >= 3 && !row.aliases.includes(alias)) {
      row.aliases.push(alias)
      row.aliases.sort()
      attached++
    }
  }
  console.log(`wiki redirect aliases attached: ${attached}/${redirects.length}`)
}

// Authored-only facts (quests, regions, uncovered items/graces/bosses): the
// generated index still carries their names/aliases so every category resolves.
const covered = new Set(rows.map((r) => r.slug))
for (const f of facts) {
  if (covered.has(f.id)) continue
  emit(f.id, f.id, f.name, rowAliases(f.name, f.aliases), 'authored')
}

// Task 146 — in-game spellings the PS5 reader sees. `game-name-aliases.json`
// maps each verbatim FMG name (NpcName / PlaceName) to the record it belongs to,
// so the reader resolves the string the game shows. The alias is stored in the
// app's own normal form (`norm` here strips possessives; the runtime `aliases.ts`
// norm does not) so `canonicalFactId` matches it exactly.
const gameNameAliases = (() => {
  try {
    return read('src/data/game-name-aliases.json')
  } catch {
    return {}
  }
})()
function appNorm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}
{
  const rowBySlug = new Map(rows.map((r) => [r.slug, r]))
  let attached = 0
  let minted = 0
  for (const [name, id] of Object.entries(gameNameAliases)) {
    const alias = appNorm(name)
    if (!alias) continue
    // The verbatim in-game spelling names exactly one record. Strip it from any
    // other row first, or a competing wiki redirect makes `canonicalFactId`
    // ambiguous and the name no longer resolves (Promised Consort Radahn).
    for (const r of rows) if (r.aliases.includes(alias)) r.aliases = r.aliases.filter((a) => a !== alias)
    const row = rowBySlug.get(id)
    if (row) {
      if (!row.aliases.includes(alias)) {
        row.aliases.push(alias)
        row.aliases.sort()
      }
      attached++
    } else {
      const fresh = { engineId: id, slug: id, kind: kindOf(id), fmgName: name, aliases: [alias], source: 'game-name-aliases' }
      rows.push(fresh)
      rowBySlug.set(id, fresh)
      minted++
    }
  }
  console.log(`game-name aliases: ${attached} attached, ${minted} rows minted (${Object.keys(gameNameAliases).length} names)`)
}

// Task 148 §1 — one page per enemy. The entity index is built first
// (`npm run index:entities`); every surviving `enemy:<slug>` record is the merge
// of all NpcParam rows that share its exact display name. Each old
// `enemy:<npcParamId>` engine id (from the combat dump and the item-lot drop
// table) is aliased onto that record, so links, photo matches and the enemy-drop
// test keep resolving after the per-name merge.
{
  let index = null
  try {
    index = read('public/sourced/entity-index.json')
  } catch {
    index = null
  }
  if (index?.records) {
    // rawNorm keeps parentheticals, so "Crab (Pot)" and "Crab" stay distinct.
    const enemyByKey = new Map()
    for (const [id, record] of Object.entries(index.records)) {
      if (record.kind !== 'enemy') continue
      const key = rawNorm(record.name)
      if (key && !enemyByKey.has(key)) enemyByKey.set(key, id)
    }
    let attached = 0
    const addEnemyAlias = (engineId, name) => {
      if (engineId == null || !name) return
      const target = enemyByKey.get(rawNorm(name))
      if (!target) return
      emit(engineId, target, name, [], 'enemy-name')
      attached++
    }
    for (const row of read('public/sourced/enemy-combat.json')) addEnemyAlias(row.factId, row.name)
    for (const row of read('public/sourced/open/enemy-drops.json').rows ?? []) addEnemyAlias(`enemy:${row.npcParamId}`, row.name)
    console.log(`enemy aliases attached: ${attached}`)
  }
}

// Task 148 §5 — the game's own FMG name tables and the wiki redirects. A real
// name (or redirect title) is attached to the one index record it names. A name
// two records could claim, an upgrade tier ("+N"), a weapon affinity variant and
// an alias another record already owns are all skipped.
{
  let index = null
  try {
    index = read('public/sourced/entity-index.json')
  } catch {
    index = null
  }
  if (index?.records) {
    const idsByKey = new Map()
    const addKey = (key, id) => {
      if (!key) return
      const set = idsByKey.get(key) ?? new Set()
      set.add(id)
      idsByKey.set(key, set)
    }
    for (const [id, record] of Object.entries(index.records)) {
      addKey(norm(record.name), id)
      addKey(rawNorm(record.name), id)
    }
    const rowBySlug = new Map(rows.map((r) => [r.slug, r]))
    const owned = new Set()
    const own = (value) => {
      for (const key of [norm(value), rawNorm(value)]) if (key) owned.add(key)
    }
    for (const row of rows) {
      own(row.fmgName)
      own(row.slug.includes(':') ? row.slug.split(':').slice(1).join(':') : row.slug)
      for (const alias of row.aliases) own(alias)
    }
    const singleTarget = (name) => {
      for (const key of [norm(name), rawNorm(name)]) {
        const set = idsByKey.get(key)
        if (set && set.size === 1) return [...set][0]
      }
      return undefined
    }
    const attachAlias = (aliasName, id) => {
      const key = rawNorm(aliasName)
      if (key.length < 3 || owned.has(key)) return false
      // Never point a name at a record other than the one it already names.
      const resolved = singleTarget(aliasName)
      if (resolved && resolved !== id) return false
      let aliasRow = rowBySlug.get(id)
      if (!aliasRow) {
        aliasRow = { engineId: id, slug: id, kind: kindOf(id), fmgName: aliasName, aliases: [], source: 'game-name-table' }
        rows.push(aliasRow)
        rowBySlug.set(id, aliasRow)
      }
      if (!aliasRow.aliases.includes(key)) {
        aliasRow.aliases.push(key)
        aliasRow.aliases.sort()
      }
      own(aliasName)
      return true
    }

    // Wiki redirects whose target was not already a row: attach the redirect
    // title to the one index record the target names.
    const toByFrom = new Map(redirects.map((r) => [rawNorm(r.from), r.to]))
    const resolveTarget = (title, depth = 0) => {
      if (depth > 4) return title
      const next = toByFrom.get(rawNorm(title))
      return next && rawNorm(next) !== rawNorm(title) ? resolveTarget(next, depth + 1) : title
    }
    let redirectsAttached = 0
    for (const redirect of redirects) {
      const id = singleTarget(resolveTarget(redirect.to))
      if (id && attachAlias(redirect.from, id)) redirectsAttached++
    }

    // The FMG name tables — only the real names the report names as missing
    // (maps, notes, cookbooks, DLC Ashes of War, NPC titles), plus redirects.
    // Upgrade tiers, affinity variants and "Smithing Stone [N]" are skipped.
    let namesAttached = 0
    for (const row of namesJson) {
      const name = String(row.name ?? '').trim()
      if (!name || /\+\s*\d+\s*$/.test(name) || /^smithing stone \[\d+\]$/i.test(name)) continue
      const category = kindOf(row.id)
      const isAsh = category === 'gems' && /^ash of war\b/i.test(name)
      const wanted = /^map\b/i.test(name) || /^note\b/i.test(name) || /cookbook/i.test(name) || isAsh || category === 'npcs'
      if (!wanted) continue
      const target = singleTarget(name)
      if (!target) continue
      if (attachAlias(name, target)) {
        emit(row.id, target, name, [], 'game-name-table')
        namesAttached++
      }
    }
    console.log(`game-name-table aliases: ${namesAttached} names, ${redirectsAttached} redirects`)
  }
}

// An engine id that names more than one fact (an NpcParam row shared by several
// fights: the Godskin Apostle, Godfrey) cannot say which; the resolver keeps the
// last row it reads, so it would pick one arbitrarily. Such rows are dropped.
{
  const targets = new Map()
  for (const r of rows) {
    if (r.engineId === r.slug) continue
    const set = targets.get(r.engineId) ?? new Set()
    set.add(r.slug)
    targets.set(r.engineId, set)
  }
  const ambiguous = new Set([...targets].filter(([, set]) => set.size > 1).map(([id]) => id))
  for (let i = rows.length - 1; i >= 0; i--) if (ambiguous.has(rows[i].engineId)) rows.splice(i, 1)
  if (ambiguous.size) console.log(`ambiguous engine ids dropped: ${[...ambiguous].join(', ')}`)
}

// ---------------------------------------------------------------------------
// Task 150 §3 — legacy ids. Every id in the pre-148 index (`07e7eb0`, snapshot
// at `src/data/legacy-entity-ids.json`) that no longer has a record or alias is
// mapped to the record it became: an upgrade "+N" to its base item page, a
// renamed id to the new id, a merged enemy to the merged page. An id with no
// honest current target is recorded in `src/data/legacy-alias-exceptions.json`
// rather than pointed at an unrelated record.
// ---------------------------------------------------------------------------
let legacyExceptions = []
{
  try {
    const legacy = JSON.parse(readFileSync(join(root, 'src/data/legacy-entity-ids.json'), 'utf8'))
    const index = read('public/sourced/entity-index.json')
    const currentIds = new Set(Object.keys(index.records))
    const byEngine = new Map()
    for (const r of rows) if (!byEngine.has(r.engineId)) byEngine.set(r.engineId, r.slug)
    const byName = new Map()
    const addName = (name, id) => {
      const k = rawNorm(name)
      if (!k || !currentIds.has(id)) return
      if (!byName.has(k)) byName.set(k, new Set())
      byName.get(k).add(id)
    }
    for (const [id, r] of Object.entries(index.records)) addName(r.name, id)
    for (const r of rows) {
      if (!currentIds.has(r.slug)) continue
      addName(r.fmgName, r.slug)
      for (const a of r.aliases || []) addName(a, r.slug)
    }
    const single = (name) => {
      const set = byName.get(rawNorm(name))
      return set && set.size === 1 ? [...set][0] : undefined
    }
    const stripUpgrade = (name) => String(name ?? '').replace(/\s*\+\s*\d+\s*$/, '').trim()
    const unresolved = []
    let attached = 0
    for (const leg of legacy) {
      const id = leg.id
      if (currentIds.has(id)) continue
      if (byEngine.has(id) && currentIds.has(byEngine.get(id))) continue
      let target = single(leg.name)
      if (!target && stripUpgrade(leg.name) !== leg.name) target = single(stripUpgrade(leg.name))
      if (!target) {
        const idBase = id.replace(/\+\d+$/, '').replace(/-\d+$/, '')
        if (idBase !== id && currentIds.has(idBase)) target = idBase
      }
      if (target && currentIds.has(target)) {
        emit(id, target, leg.name || target, [], 'legacy-id')
        attached++
      } else {
        unresolved.push(id)
      }
    }
    legacyExceptions = unresolved.sort()
    writeFileSync(join(root, 'src/data/legacy-alias-exceptions.json'), JSON.stringify(legacyExceptions, null, 1) + '\n')
    console.log(`legacy ids: ${attached} mapped, ${unresolved.length} with no honest target`)
  } catch (error) {
    console.warn(`legacy id pass skipped: ${error.message}`)
  }
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
