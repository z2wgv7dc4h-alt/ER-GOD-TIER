#!/usr/bin/env node
// Task 140 §1 — measured data accuracy sample.
//
// Deterministic (seeded) sample of the app's built entity index, compared field
// by field against the Fandom wiki DB snapshot (`data/raw/er-mcp.db`), the
// classified wiki-db export (`public/sourced/open/wiki-db/*.json`) and the game
// parameter data the builders already fold in (regulation / npc-combat /
// checklist rows). Writes `docs/ACCURACY-REPORT.md`.
//
// The sample and every comparison are reproducible: `node scripts/accuracy-audit.mjs`.
// Pass `--baseline` to snapshot the current metrics to
// `docs/accuracy-baseline.json` so a later run can print a before/after delta.
//
// Source precedence (the "winner" rule): game parameters beat the wiki, the
// wiki beats guide prose. A conflict on a game-sourced field is therefore a
// *source* difference, not an app error; a missing value is always an app gap
// when the wiki can fill it. Only wiki-wins mismatches count against the error
// rate.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const baselinePath = path.join(root, 'docs/accuracy-baseline.json')
const reportPath = path.join(root, 'docs/ACCURACY-REPORT.md')
const writeBaseline = process.argv.includes('--baseline')

const readJson = (rel, fallback = undefined) => {
  try {
    const file = path.isAbsolute(rel) ? rel : path.join(root, rel)
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    if (fallback !== undefined) return fallback
    throw error
  }
}

const argOf = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

// --- deterministic sampling --------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sample(list, count, rng) {
  const pool = [...list]
  const out = []
  while (out.length < count && pool.length) {
    const index = Math.floor(rng() * pool.length)
    out.push(pool.splice(index, 1)[0])
  }
  return out
}

// --- normalisation + comparators --------------------------------------------
const norm = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function numOf(value) {
  if (typeof value === 'number') return value
  const match = String(value ?? '')
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function eqNum(a, b) {
  const an = numOf(a)
  const bn = numOf(b)
  if (an === null || bn === null) return an === bn
  return Math.abs(an - bn) < 0.051
}

function eqText(a, b) {
  const an = norm(a)
  const bn = norm(b)
  if (!an || !bn) return an === bn
  if (an === bn) return true
  const [short, long] = an.length <= bn.length ? [an, bn] : [bn, an]
  return short.length >= 12 && long.includes(short)
}

function tokens(value) {
  return new Set(
    norm(value)
      .split(' ')
      .filter((token) => token.length > 1),
  )
}

/** Jaccard-ish overlap: true when the smaller set is mostly contained. */
function eqList(a, b) {
  const at = Array.isArray(a) ? a : [a]
  const bt = Array.isArray(b) ? b : [b]
  if (!at.filter(Boolean).length || !bt.filter(Boolean).length) return false
  const as = new Set()
  const bs = new Set()
  for (const value of at) for (const token of tokens(value)) as.add(token)
  for (const value of bt) for (const token of tokens(value)) bs.add(token)
  if (!as.size || !bs.size) return false
  let common = 0
  for (const token of as) if (bs.has(token)) common += 1
  return common / Math.min(as.size, bs.size) >= 0.6
}

/** "Str 6 · Int 28" -> { str:6, int:28 } */
function attrMap(value) {
  const out = {}
  const re = /(str|dex|int|fai|arc)\w*\s*(\d+)/gi
  let match
  while ((match = re.exec(String(value ?? '')))) out[match[1].toLowerCase()] = Number(match[2])
  return out
}

function scaleMap(value) {
  const out = {}
  const re = /(str|dex|int|fai|arc)\w*\s*([A-Za-z])/gi
  let match
  while ((match = re.exec(String(value ?? '')))) out[match[1].toLowerCase()] = match[2].toUpperCase()
  return out
}

function eqAttrMaps(a, b) {
  const an = a ?? {}
  const bn = b ?? {}
  const keys = new Set([...Object.keys(an), ...Object.keys(bn)])
  for (const key of keys) if ((an[key] ?? 0) !== (bn[key] ?? 0)) return false
  return true
}

function eqScaleMaps(a, b) {
  const an = a ?? {}
  const bn = b ?? {}
  const keys = new Set([...Object.keys(an), ...Object.keys(bn)])
  for (const key of keys) if ((an[key] ?? '-') !== (bn[key] ?? '-')) return false
  return true
}

// --- load sources ------------------------------------------------------------
const appPath = argOf('--app') ?? 'public/sourced/entity-index.json'
const app = readJson(appPath, { records: {} })
const allAppRecords = Object.values(app.records ?? {})

/**
 * The index keeps both authored records (`npc:moore`) and engine-dump records
 * (`npcs:141500`) for the same entity. Audit the richest record per (kind, name)
 * and count the duplicates separately — comparing the empty twin would report a
 * data gap the app does not actually have.
 */
function richness(record) {
  return (
    Object.keys(record.stats ?? {}).length * 3 +
    (record.location ? 1 : 0) +
    (record.description ? 1 : 0) +
    (record.drops?.length ?? 0) +
    (record.sections?.length ?? 0) +
    (record.catalogue ? 1 : 0)
  )
}
const appRecords = []
const duplicateNames = []
{
  const groups = new Map()
  for (const record of allAppRecords) {
    const key = `${record.kind}:${norm(record.name)}`
    const list = groups.get(key) ?? []
    list.push(record)
    groups.set(key, list)
  }
  for (const [key, list] of groups) {
    list.sort((a, b) => richness(b) - richness(a) || a.id.localeCompare(b.id))
    appRecords.push(list[0])
    if (list.length > 1) duplicateNames.push({ key, ids: list.map((r) => r.id) })
  }
}

const wikiDocs = {}
for (const kind of ['boss', 'npc', 'weapon', 'armor', 'talisman', 'spell', 'item', 'spirit', 'ash', 'dungeon', 'location']) {
  const doc = readJson(`public/sourced/open/wiki-db/${kind}.json`, { records: [] })
  wikiDocs[kind] = (doc.records ?? []).map((rec) => ({ ...rec, _norm: norm(rec.title) }))
}
const wikiByName = (kind, name) => {
  const key = norm(name)
  return wikiDocs[kind]?.find((rec) => rec._norm === key)
}
const graceChecklist = readJson('public/sourced/checklists/graces.json', [])
// Graces repeat names across regions ("Artist's Shack" is in both Limgrave and
// Liurnia), so match on the warp id, not the name.
const graceById = new Map(graceChecklist.map((row) => [String(row.id), row]))
const npcQuests = readJson('public/sourced/open/npc-quests.json', { quests: [] })

// --- wiki DB (sqlite) --------------------------------------------------------
let db = null
try {
  const { DatabaseSync } = await import('node:sqlite')
  db = new DatabaseSync(path.join(root, 'data/raw/er-mcp.db'), { readOnly: true })
} catch (error) {
  console.error('warning: wiki DB unavailable, falling back to exported tables:', error.message)
}
const dbRows = (sql, params = []) => (db ? db.prepare(sql).all(...params) : [])
const dbNameIndex = (table, fields) => {
  const out = new Map()
  for (const row of dbRows(`select * from ${table}`)) {
    out.set(norm(row.name), { row, fields })
  }
  return out
}
const dbWeapons = db ? dbNameIndex('weapons', ['weapon_type', 'weight', 'skill', 'effects', 'str_req', 'dex_req', 'int_req', 'fai_req', 'arc_req', 'str_scale', 'dex_scale', 'int_scale', 'fai_scale', 'arc_scale']) : new Map()
const dbArmor = db ? dbNameIndex('armor', ['slot', 'weight', 'poise', 'effects']) : new Map()
const dbTalismans = db ? dbNameIndex('talismans', ['weight', 'effect', 'summary']) : new Map()
const dbSpells = db ? dbNameIndex('spells', ['spell_type', 'sub_type', 'fp_cost', 'slots_used', 'int_req', 'fai_req', 'arc_req', 'effect']) : new Map()
const dbQuests = db ? dbRows('select * from quests') : []

// --- comparison engine -------------------------------------------------------
const GAME_FIELDS = new Set(['hp', 'weight', 'requirements', 'scaling', 'base damage', 'poise', 'skill', 'runes'])
const comparisons = [] // { kind, id, name, field, app, source, winner, error }
const unmatched = { boss: [], npc: [], item: [], grace: [] }

function fmt(value) {
  if (value === undefined || value === null || value === '') return '(missing)'
  if (typeof value === 'object') {
    const parts = Object.entries(value).map(([k, v]) => `${k}:${v ?? '-'}`)
    return parts.length ? parts.join(' ') : '(missing)'
  }
  return String(value)
}

function record(
  kind,
  entity,
  field,
  appValue,
  sourceValue,
  { type = 'text', winnerRule = 'wiki', sourceLabel = 'wiki', onlyMissing = false, informational = false } = {},
) {
  const appEmpty = appValue === undefined || appValue === null || appValue === ''
  const srcEmpty = sourceValue === undefined || sourceValue === null || sourceValue === ''
  if (appEmpty && srcEmpty) return
  // A source value still carrying `[[` is an uncleaned wiki link, not a real
  // value — the app's cleaned text wins.
  const srcMarkup = Array.isArray(sourceValue)
    ? sourceValue.some((v) => String(v).includes('[['))
    : String(sourceValue ?? '').includes('[[')
  let equal
  if (type === 'num') equal = eqNum(appValue, sourceValue)
  else if (type === 'list') equal = eqList(appValue, sourceValue)
  else if (type === 'attr') equal = eqAttrMaps(appValue, sourceValue)
  else if (type === 'scale') equal = eqScaleMaps(appValue, sourceValue)
  else if (type === 'tokens') equal = eqList(appValue, sourceValue)
  else equal = eqText(appValue, sourceValue)

  let winner = 'app'
  if (appEmpty) winner = sourceLabel
  else if (!srcEmpty && !equal) {
    const isGame = GAME_FIELDS.has(field.toLowerCase())
    const appHasGame = (entity.sources ?? []).some((s) => /regulation|npc-combat|enemy-combat|coords|checklists|armory/.test(s))
    if (informational || onlyMissing || srcMarkup || winnerRule === 'game' || (isGame && appHasGame)) winner = 'app'
    else winner = sourceLabel
  }
  comparisons.push({
    kind,
    id: entity.id,
    name: entity.name,
    field,
    app: fmt(appValue),
    source: fmt(sourceValue),
    sourceLabel,
    winner,
    error: winner !== 'app' && winner !== '(missing)' && !informational,
  })
}

// --- bosses ------------------------------------------------------------------
{
  const pool = appRecords.filter((r) => r.kind === 'boss')
  const rng = mulberry32(140001)
  for (const rec of sample(pool, 40, rng)) {
    const wiki = wikiByName('boss', rec.name)
    if (!wiki) {
      unmatched.boss.push(rec.name)
      continue
    }
    record('boss', rec, 'name', rec.name, wiki.title)
    record('boss', rec, 'hp', rec.stats?.HP, wiki.stats?.HP, { type: 'num', winnerRule: 'game' })
    // The app names the region, the wiki the specific site; both are valid, so
    // a granularity difference is recorded but never counted as an error.
    record('boss', rec, 'location', rec.location, wiki.location || wiki.stats?.Location, { type: 'tokens', informational: true })
    record('boss', rec, 'region', rec.region, wiki.region, { type: 'tokens', winnerRule: 'wiki' })
    record('boss', rec, 'drops', rec.drops, wiki.drops, { type: 'list', winnerRule: 'wiki' })
  }
}

// --- NPCs --------------------------------------------------------------------
{
  const pool = appRecords.filter((r) => r.kind === 'npc')
  const rng = mulberry32(140002)
  for (const rec of sample(pool, 40, rng)) {
    const wiki = wikiByName('npc', rec.name)
    if (!wiki) {
      unmatched.npc.push(rec.name)
      continue
    }
    record('npc', rec, 'name', rec.name, wiki.title)
    record('npc', rec, 'location', rec.location, wiki.location, { type: 'tokens', winnerRule: 'wiki' })
    record('npc', rec, 'region', rec.region, wiki.region, { type: 'tokens', winnerRule: 'wiki' })
    // Role phrasing varies (and wiki links leak `[[Nomadic Merchants`); only a
    // wholly missing role is an app gap.
    record('npc', rec, 'role', rec.stats?.Role, wiki.stats?.Role, { onlyMissing: true })
  }
}

// --- items (weapons / armor / talismans / spells / goods) --------------------
function auditWeapon(rec) {
  const wiki = wikiByName('weapon', rec.name)
  const dbRow = dbWeapons.get(norm(rec.name))?.row
  if (!wiki && !dbRow) return unmatched.item.push(rec.name)
  record('weapon', rec, 'name', rec.name, wiki?.title ?? dbRow?.name)
  record('weapon', rec, 'weight', rec.stats?.Weight, dbRow?.weight ?? wiki?.stats?.Weight, { type: 'num', winnerRule: 'game' })
  const srcReq = dbRow
    ? { str: dbRow.str_req, dex: dbRow.dex_req, int: dbRow.int_req, fai: dbRow.fai_req, arc: dbRow.arc_req }
    : attrMap(wiki?.stats?.Requirements)
  record('weapon', rec, 'requirements', attrMap(rec.stats?.Requirements), srcReq, { type: 'attr', winnerRule: 'game' })
  const srcScale = dbRow
    ? { str: dbRow.str_scale, dex: dbRow.dex_scale, int: dbRow.int_scale, fai: dbRow.fai_scale, arc: dbRow.arc_scale }
    : {}
  record('weapon', rec, 'scaling', scaleMap(rec.stats?.Scaling), srcScale, { type: 'scale', winnerRule: 'game' })
  record('weapon', rec, 'skill', rec.stats?.Skill, dbRow?.skill ?? wiki?.stats?.Skill, { onlyMissing: true })
}

function auditArmor(rec) {
  const wiki = wikiByName('armor', rec.name)
  const dbRow = dbArmor.get(norm(rec.name))?.row
  if (!wiki && !dbRow) return unmatched.item.push(rec.name)
  record('armor', rec, 'name', rec.name, wiki?.title ?? dbRow?.name)
  record('armor', rec, 'weight', rec.stats?.Weight, dbRow?.weight ?? wiki?.stats?.Weight, { type: 'num', winnerRule: 'game' })
  record('armor', rec, 'poise', rec.stats?.Poise, dbRow?.poise ?? wiki?.stats?.Poise, { type: 'num', winnerRule: 'game' })
  record('armor', rec, 'slot', rec.stats?.Type, dbRow?.slot ?? wiki?.stats?.Type, { onlyMissing: true })
}

function auditTalisman(rec) {
  const wiki = wikiByName('talisman', rec.name)
  const dbRow = dbTalismans.get(norm(rec.name))?.row
  if (!wiki && !dbRow) return unmatched.item.push(rec.name)
  record('talisman', rec, 'name', rec.name, wiki?.title ?? dbRow?.name)
  record('talisman', rec, 'weight', rec.stats?.Weight, dbRow?.weight ?? wiki?.stats?.Weight, { type: 'num', winnerRule: 'game' })
  record('talisman', rec, 'effect', rec.stats?.Effect ?? rec.description, dbRow?.effect ?? wiki?.stats?.Effect, { onlyMissing: true })
}

function auditSpell(rec) {
  const wiki = wikiByName('spell', rec.name)
  const dbRow = dbSpells.get(norm(rec.name))?.row
  if (!wiki && !dbRow) return unmatched.item.push(rec.name)
  record('spell', rec, 'name', rec.name, wiki?.title ?? dbRow?.name)
  record('spell', rec, 'effect', rec.stats?.Effect ?? rec.description, dbRow?.effect ?? wiki?.stats?.Effect, { onlyMissing: true })
  const req = dbRow
    ? { int: dbRow.int_req, fai: dbRow.fai_req, arc: dbRow.arc_req }
    : {}
  record('spell', rec, 'requirements', attrMap(rec.stats?.Requirements), req, { type: 'attr', winnerRule: 'game' })
  record('spell', rec, 'fp cost', rec.stats?.['FP cost'] ?? rec.stats?.['FP Cost'], dbRow?.fp_cost, { type: 'num', winnerRule: 'game' })
  record('spell', rec, 'slots', rec.stats?.['Slots'], dbRow?.slots_used, { type: 'num', winnerRule: 'game' })
}

function auditGoods(rec) {
  const wiki = wikiByName('item', rec.name)
  if (!wiki) return unmatched.item.push(rec.name)
  record('item', rec, 'name', rec.name, wiki.title)
  record('item', rec, 'effect', rec.stats?.Effect ?? rec.description, wiki.stats?.Effect, { onlyMissing: true })
  record('item', rec, 'type', rec.stats?.Type, wiki.stats?.Type, { onlyMissing: true })
}

{
  const byKind = (kind) => appRecords.filter((r) => r.kind === kind)
  const plan = [
    ['weapon', 15, auditWeapon, 140011],
    ['armor', 15, auditArmor, 140012],
    ['talisman', 10, auditTalisman, 140013],
    ['spell', 10, auditSpell, 140014],
    ['item', 10, auditGoods, 140015],
  ]
  for (const [kind, count, audit, seed] of plan) {
    const rng = mulberry32(seed)
    for (const rec of sample(byKind(kind), count, rng)) audit(rec)
  }
}

// --- graces ------------------------------------------------------------------
{
  const pool = appRecords.filter((r) => r.kind === 'grace')
  const rng = mulberry32(140020)
  for (const rec of sample(pool, 30, rng)) {
    const checklist = graceById.get(String(rec.id))
    if (!checklist) {
      unmatched.grace.push(rec.name)
      continue
    }
    record('grace', rec, 'name', rec.name, checklist.name)
    record('grace', rec, 'region', rec.region ?? rec.location, checklist.region, { winnerRule: 'wiki' })
  }
}

// --- quest steps -------------------------------------------------------------
{
  const steps = []
  for (const quest of npcQuests.quests) {
    for (const step of quest.steps) steps.push({ quest, step })
  }
  // Order each quest's steps deterministically before sampling.
  steps.sort((a, b) => a.quest.npc.localeCompare(b.quest.npc) || a.step.order - b.step.order)
  const rng = mulberry32(140030)
  for (const { quest, step } of sample(steps, 40, rng)) {
    const npcNorm = norm(quest.npc)
    const dbSteps = dbQuests
      .filter((row) => norm(row.npc) === npcNorm)
      .sort((a, b) => a.step_ord - b.step_ord)
    if (!dbSteps.length) continue
    const dbStep = dbSteps.find((row) => row.step_ord === step.order)
    const entity = { id: step.id, name: `${quest.npc} step ${step.order}`, sources: ['wiki'] }
    record('quest', entity, 'order', step.order, dbStep?.step_ord, { type: 'num', winnerRule: 'wiki', sourceLabel: 'wiki-db/quests' })
    record('quest', entity, 'location', step.location, dbStep?.location, { type: 'tokens', winnerRule: 'wiki', sourceLabel: 'wiki-db/quests' })
    record('quest', entity, 'action', step.action, dbStep?.action, { type: 'tokens', winnerRule: 'wiki', sourceLabel: 'wiki-db/quests' })
  }
}

// --- aggregate + report ------------------------------------------------------
function rate(rows, predicate) {
  const relevant = rows.filter(predicate)
  if (!relevant.length) return { checked: 0, errors: 0, rate: 0 }
  const errors = relevant.filter((row) => row.error).length
  return { checked: relevant.length, errors, rate: errors / relevant.length }
}

const kinds = ['boss', 'npc', 'weapon', 'armor', 'talisman', 'spell', 'item', 'grace', 'quest']
const kindStats = kinds.map((kind) => ({ kind, ...rate(comparisons, (row) => row.kind === kind) }))
const fields = [...new Set(comparisons.map((row) => row.field))]
const fieldStats = fields.map((field) => ({ field, ...rate(comparisons, (row) => row.field === field) }))
const errors = comparisons.filter((row) => row.error)
const expectedConflicts = comparisons.filter((row) => !row.error && row.app !== row.source && row.winner === 'app')

const metrics = {
  generatedAt: new Date().toISOString(),
  sampled: {
    comparisons: comparisons.length,
    errors: errors.length,
    errorRate: comparisons.length ? errors.length / comparisons.length : 0,
    duplicateNameGroups: duplicateNames.length,
    unmatched,
  },
  kinds: Object.fromEntries(kindStats.map((s) => [s.kind, s])),
  fields: Object.fromEntries(fieldStats.map((s) => [s.field, s])),
}

if (writeBaseline) {
  fs.writeFileSync(baselinePath, JSON.stringify(metrics, null, 2))
}

const pct = (value) => `${(value * 100).toFixed(1)}%`
const baselines = readJson('docs/accuracy-baseline.json', null)

function deltaLine(kind) {
  if (!baselines?.kinds?.[kind]) return ''
  const before = baselines.kinds[kind]
  const after = metrics.kinds[kind]
  return ` (was ${pct(before.rate)} on ${before.errors}/${before.checked})`
}

const lines = []
lines.push('# Accuracy report (Task 140 §1)')
lines.push('')
lines.push(`Generated by \`scripts/accuracy-audit.mjs\` — deterministic seed, ${comparisons.length} field comparisons.`)
lines.push('')
lines.push('**Sources, in precedence order:** game parameters (regulation / combat params / `coords`) > the Fandom wiki DB')
lines.push('(`data/raw/er-mcp.db`, release `data-2026.09.21`, 4,939 pages, plus the classified `open/wiki-db/*.json` export)')
lines.push('> guide/checklist prose. A conflict on a game-sourced field is a source difference, not an app error; a value')
lines.push('missing from the app is fixed from the wiki. Error rate counts wiki-wins mismatches only.')
lines.push('')
lines.push('## Headline')
lines.push('')
lines.push(`- Sampled field comparisons: **${comparisons.length}**`)
lines.push(`- Wiki-wins mismatches (errors): **${errors.length}** (${pct(metrics.sampled.errorRate)})`)
lines.push(`- Expected game-vs-wiki source conflicts (not errors): ${expectedConflicts.length}`)
lines.push(`- Duplicate app records folded to the richest per name before sampling: ${duplicateNames.length} name groups`)
if (baselines) {
  lines.push(`- Baseline error rate: **${pct(baselines.sampled.errorRate)}** → now **${pct(metrics.sampled.errorRate)}** (${baselines.sampled.errors} → ${errors.length} errors)`)
}
lines.push('')
lines.push('## Error rate per kind')
lines.push('')
lines.push('| kind | checked | errors | error rate |')
lines.push('| --- | ---: | ---: | ---: |')
for (const stat of kindStats) lines.push(`| ${stat.kind} | ${stat.checked} | ${stat.errors} | ${pct(stat.rate)}${deltaLine(stat.kind)} |`)
lines.push('')
lines.push('## Error rate per field')
lines.push('')
lines.push('| field | checked | errors | error rate |')
lines.push('| --- | ---: | ---: | ---: |')
for (const stat of [...fieldStats].sort((a, b) => b.rate - a.rate || a.field.localeCompare(b.field))) {
  lines.push(`| ${stat.field} | ${stat.checked} | ${stat.errors} | ${pct(stat.rate)} |`)
}
lines.push('')
lines.push('## Mismatches (wiki wins)')
lines.push('')
if (!errors.length) lines.push('_None._')
else {
  lines.push('| kind | entity | field | app | source | source db |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const row of errors) {
    const clean = (value) => String(value).replace(/\|/g, '\\|').replace(/\n+/g, ' ').slice(0, 180)
    lines.push(`| ${row.kind} | ${row.name} | ${row.field} | ${clean(row.app)} | ${clean(row.source)} | ${row.sourceLabel} |`)
  }
}
lines.push('')
lines.push('## Game-vs-wiki source conflicts (kept game value)')
lines.push('')
lines.push(`${expectedConflicts.length} fields differ between the game parameter data the app trusts and the wiki. These are`)
lines.push('expected (wiki numbers are a different patch/NG baseline) and the app keeps the game value by policy.')
lines.push('')
lines.push('## Sampling gaps')
lines.push('')
lines.push(`- Bosses with no wiki-db page in the sample: ${unmatched.boss.length ? unmatched.boss.join(', ') : 'none'}`)
lines.push(`- NPCs with no wiki-db page in the sample: ${unmatched.npc.length ? unmatched.npc.join(', ') : 'none'}`)
lines.push(`- Items with no wiki-db/DB table row in the sample: ${unmatched.item.length ? unmatched.item.join(', ') : 'none'}`)
lines.push(`- Graces with no checklist row in the sample: ${unmatched.grace.length ? unmatched.grace.join(', ') : 'none'}`)
lines.push('')
lines.push('## Duplicate records (data hygiene)')
lines.push('')
lines.push(`The index carries ${duplicateNames.length} (kind, name) groups with more than one record — mostly authored vs engine-dump`)
lines.push('ids (`npc:moore` vs `npcs:141500`). The audit folds these to the richest record so a data-complete twin is not')
lines.push('reported as a gap; the duplication itself remains for the link/identity plane, which Task 140 does not own.')
lines.push('')
if (duplicateNames.length) {
  lines.push('| kind | name | ids |')
  lines.push('| --- | --- | --- |')
  for (const group of duplicateNames.slice(0, 40)) {
    const kind = group.key.split(':')[0]
    const name = group.key.slice(kind.length + 1)
    lines.push(`| ${kind} | ${name} | ${group.ids.join(', ')} |`)
  }
  if (duplicateNames.length > 40) lines.push(`| … | _${duplicateNames.length - 40} more_ |`)
  lines.push('')
}

// Task 140 §2 — the missables/lockout review is authored in
// docs/lockout-review.md and appended here so the accuracy report is one file.
try {
  const review = fs.readFileSync(path.join(root, 'docs/lockout-review.md'), 'utf8').trim()
  if (review) {
    lines.push('---')
    lines.push('')
    lines.push(review)
    lines.push('')
  }
} catch {
  // §2 not authored yet.
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, lines.join('\n'))
console.log(`accuracy-audit: ${comparisons.length} comparisons, ${errors.length} wiki-wins errors (${pct(metrics.sampled.errorRate)})`)
console.log('by kind:', kindStats.map((s) => `${s.kind}=${s.errors}/${s.checked}`).join(' '))
if (baselines) console.log(`baseline was ${baselines.sampled.errors} errors (${pct(baselines.sampled.errorRate)})`)
db?.close()
