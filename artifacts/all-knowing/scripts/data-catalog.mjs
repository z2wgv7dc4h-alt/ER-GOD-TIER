#!/usr/bin/env node
// Task 131 §2 — generated data catalog.
//
//   npm run data:catalog      # writes docs/DATA-CATALOG.md
//
// Walks every in-repo data source (public/sourced/**, src/data/**, the
// src/knowledge/*.ts exports, vendor/elden-ring-map/data/**, and every table in
// data/raw/er-mcp.db), describes its shape, infers the entity kinds it covers,
// and greps src/ + scripts/ for the modules that actually load it. A source no
// module loads is flagged **UNUSED**. The run ends with a Gaps section: entity
// kinds where the app's entity graph holds fewer records than the richest
// source available in the tree.
//
// Consumer detection is deliberately grep-based and heuristic: it matches the
// quoted string literals, fetch URLs and path fragments loader modules use. It
// is a map to go read, not a type checker.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs', 'DATA-CATALOG.md')
const DB_FILE = path.join(ROOT, 'data', 'raw', 'er-mcp.db')
const INDEX_FILE = path.join(ROOT, 'public', 'sourced', 'entity-index.json')

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'])

const posix = (p) => p.split(path.sep).join('/')
const rel = (p) => posix(path.relative(ROOT, p))
const bytes = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function walk(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const readText = (p) => fs.readFileSync(p, 'utf8')
const readJson = (p) => JSON.parse(readText(p))
const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1)
const sorted = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])

// ---------------------------------------------------------------------------
// Consumer index
// ---------------------------------------------------------------------------

const CONSUMER_ROOTS = ['src', 'scripts', 'vendor/elden-ring-map/tools', 'vendor/elden-ring-map/server']
const loaders = []
for (const rootName of CONSUMER_ROOTS) {
  for (const file of walk(path.join(ROOT, rootName))) {
    if (file.includes('__pycache__')) continue
    const ext = path.extname(file).toLowerCase()
    if (!['.ts', '.tsx', '.mjs', '.js', '.py', '.sh'].includes(ext)) continue
    const relPath = rel(file)
    if (relPath === 'scripts/data-catalog.mjs') continue // this generator is not a consumer
    const text = readText(file)
    const literals = new Set()
    for (const m of text.matchAll(/['"`]([^'"`\n]{4,200})['"`]/g)) literals.add(m[1])
    loaders.push({ rel: relPath, text, literals })
  }
}

/** Directory-level loaders that reach a whole family generically. */
function specialConsumers(sourceRel) {
  if (sourceRel.startsWith('public/sourced/open/text/') && sourceRel.endsWith('.json')) {
    return ['src/lib/gameText.ts (dynamic table loader)']
  }
  if (sourceRel.startsWith('public/sourced/images/')) {
    return ['src/data/image-index.json (generated)', 'src/lib/fanImage.ts', 'scripts/ingest-images.py']
  }
  if (sourceRel.startsWith('public/sourced/open/paramdex/')) {
    return ['scripts/gen-aliases.mjs', 'scripts/extract-paramdex-names.py']
  }
  if (sourceRel.startsWith('public/sourced/open/fanapi/') && sourceRel.endsWith('.json')) {
    return ['src/lib/fanapiData.ts (dynamic 14-set loader)']
  }
  if (sourceRel.startsWith('vendor/elden-ring-map/data/paramdefs/')) {
    return ['vendor/elden-ring-map paramdef reader (scripts/erlib/paramdef.py)']
  }
  if (sourceRel.startsWith('vendor/elden-ring-map/data/mfg/')) {
    return ['vendor/elden-ring-map/tools/extract_items.py', 'vendor/elden-ring-map/tools/extract_pieces.py']
  }
  if (sourceRel.endsWith('vendor/elden-ring-map/data/eventflag_bst.txt')) {
    return ['vendor/elden-ring-map/tools/er_save.py', 'vendor/elden-ring-map/server/index.js']
  }
  return null
}

/** Which loader modules load `sourceRel`? */
function consumersFor(sourceRel, kind) {
  const base = path.posix.basename(sourceRel)
  const dirHint = path.posix.dirname(sourceRel)
  const hits = new Set(specialConsumers(sourceRel) || [])
  for (const loader of loaders) {
    let hit = false
    for (const lit of loader.literals) {
      if (path.posix.basename(lit) !== base) continue
      if (kind === 'srcdata') {
        if (!lit.includes('data/') && !lit.startsWith('.')) continue
      } else if (kind === 'public') {
        if (!lit.includes('sourced/') && !lit.includes('/sourced')) continue
      } else if (dirHint && !lit.endsWith(base)) {
        continue
      }
      hit = true
      break
    }
    if (hit) hits.add(loader.rel)
  }
  return [...hits].sort()
}

// ---------------------------------------------------------------------------
// JSON shape + kinds
// ---------------------------------------------------------------------------

function sampleOf(value) {
  if (Array.isArray(value)) return value.find((v) => v && typeof v === 'object') ?? value[0]
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) {
      if (Array.isArray(v) && v.length) return v[0]
    }
  }
  return value
}

function countOf(value) {
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') {
    const arrays = Object.values(value).filter(Array.isArray)
    if (arrays.length) return arrays.reduce((n, a) => n + a.length, 0)
    const nested = Object.values(value).filter((v) => v && typeof v === 'object')
    if (nested.length === 1 && Object.keys(value).length === 1) return Object.keys(nested[0]).length
    return Object.keys(value).length
  }
  return 0
}

function shapeOf(value) {
  if (Array.isArray(value)) {
    const sample = value.find((v) => v && typeof v === 'object')
    const fields = sample ? Object.keys(sample).slice(0, 12) : []
    return `array[${value.length}]${fields.length ? ` · ${fields.join(', ')}` : ''}`
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      const first = value[keys[0]]
      return `id→${first && typeof first === 'object' ? 'object' : typeof first} map[${keys.length}]`
    }
    const arrays = Object.entries(value).filter(([, v]) => Array.isArray(v))
    const inner = arrays.filter(([, v]) => v.length).map(([k, v]) => `${k}[${v.length}]`).join(', ')
    const sample = arrays.find(([, v]) => v.length)?.[1][0]
    const fields = sample && typeof sample === 'object' ? ` · ${Object.keys(sample).slice(0, 12).join(', ')}` : ''
    const nested = keys.length === 1 && value[keys[0]] && typeof value[keys[0]] === 'object'
    if (nested) return `object{${keys[0]}[${Object.keys(value[keys[0]]).length}]}`
    return `object{${keys.slice(0, 8).join(', ')}}${inner ? ` · ${inner}` : ''}${fields}`
  }
  return typeof value
}

const KIND_PATTERNS = [
  [/\bweapon|armory-weapons|equipweapon/, 'weapon'],
  [/shield/, 'shield'],
  [/armou?r|protector/, 'armor'],
  [/talisman|accessor/, 'talisman'],
  [/sorcer|incant|\bspell|magic\b/, 'spell'],
  [/\bashes?\b|ash-of-war|aow/, 'ash'],
  [/spirit/, 'spirit'],
  [/ammo|arrow|bolt/, 'ammo'],
  [/cookbook/, 'cookbook'],
  [/bell.?bearing/, 'bell-bearing'],
  [/whetblade/, 'whetblade'],
  [/gesture/, 'gesture'],
  [/crystal.?tear/, 'crystal-tear'],
  [/\bboss/, 'boss'],
  [/enemy|creature|combat|msb-|npc-combat|gathering/, 'enemy'],
  [/\bnpc|character|dialogue|companion/, 'npc'],
  [/\bquest|storyline|ending|gate/, 'quest'],
  [/\bgrace|bonfire|warp/, 'grace'],
  [/dungeon|evergaol|catacomb|cave|tunnel/, 'dungeon'],
  [/location|place|region|subregion|area|landmark|banner|map-|wmp/, 'location'],
  [/merchant|\bshop|vendor/, 'merchant'],
  [/recipe|craft/, 'recipe'],
  [/material/, 'material'],
  [/\bitem|goods|loot|drop|acquisition|collectible|key.?item/, 'item'],
  [/\bclass/, 'class'],
  [/build/, 'build'],
  [/\bhunt|invader/, 'hunt'],
  [/\bsave|hex.?id/, 'save-id'],
  [/regulation|\bparam/, 'params'],
  [/alias/, 'alias'],
  [/\bimage|thumbnail|icon/, 'image'],
  [/text|dialog|caption|linehelp|menutext|talk/, 'text'],
]

function inferKinds(sourceRel, value) {
  const sample = sampleOf(value)
  if (sample && typeof sample === 'object' && 'kind' in sample && Array.isArray(value)) {
    const kinds = new Set()
    for (const row of value) if (row && typeof row === 'object' && row.kind) kinds.add(String(row.kind))
    if (kinds.size) return `by \`kind\`: ${[...kinds].sort().join(', ')}`
  }
  const hay = `${sourceRel} ${sample ? JSON.stringify(sample).slice(0, 1500) : ''}`.toLowerCase()
  const found = []
  for (const [re, kind] of KIND_PATTERNS) if (re.test(hay) && !found.includes(kind)) found.push(kind)
  return found.length ? found.join(', ') : '—'
}

// ---------------------------------------------------------------------------
// Source rows
// ---------------------------------------------------------------------------

const rows = []
const unused = []

function addFile(file, kind) {
  const stat = fs.statSync(file)
  const sourceRel = rel(file)
  const ext = path.extname(file).toLowerCase()
  let records = '—'
  let shape = '—'
  let kinds = '—'
  if (ext === '.json') {
    try {
      const value = readJson(file)
      records = String(countOf(value))
      shape = shapeOf(value)
      kinds = inferKinds(sourceRel, value)
    } catch (e) {
      shape = `unparseable: ${e.message}`
    }
  } else if (ext === '.ts') {
    shape = 'TypeScript module'
  } else if (ext === '.txt' || ext === '.jsonl') {
    const lines = readText(file).split(/\r?\n/).filter((l) => l.trim())
    records = String(lines.length)
    const first = lines.find((l) => l && !l.startsWith('#')) || ''
    shape = `text · ${first.split(/\s+/).slice(0, 4).join(' ')}`
  } else if (ext === '.xml') {
    const text = readText(file)
    const fields = (text.match(/<Field\b/g) || []).length
    const type = text.match(/<ParamType>([^<]+)</)?.[1] || 'paramdef'
    records = String(fields)
    shape = `paramdef XML · ${type}`
  } else {
    shape = ext || 'binary'
  }
  const consumers = consumersFor(sourceRel, kind)
  const entry = { sourceRel, size: stat.size, records, shape, kinds, consumers }
  rows.push(entry)
  if (!consumers.length) unused.push(entry)
  return entry
}

// public/sourced/** — images aggregated (map plates listed).
const sourcedRoot = path.join(ROOT, 'public', 'sourced')
const imageGroups = new Map()
for (const file of walk(sourcedRoot).sort()) {
  const ext = path.extname(file).toLowerCase()
  const sourceRel = rel(file)
  const isImage = IMAGE_EXT.has(ext)
  const isMapPlate = sourceRel.startsWith('public/sourced/maps/')
  if (isImage && !isMapPlate) {
    const dir = path.posix.dirname(sourceRel)
    const key = `${dir} · ${ext}`
    const g = imageGroups.get(key) || { count: 0, size: 0, dir, ext }
    g.count += 1
    g.size += fs.statSync(file).size
    imageGroups.set(key, g)
    continue
  }
  addFile(file, 'public')
}

// src/data/**
for (const file of walk(path.join(ROOT, 'src', 'data')).sort()) addFile(file, 'srcdata')

// vendor/elden-ring-map/data/**
const vendorRows = []
for (const file of walk(path.join(ROOT, 'vendor', 'elden-ring-map', 'data')).sort()) {
  vendorRows.push(addFile(file, 'vendor'))
}

// ---------------------------------------------------------------------------
// src/knowledge/*.ts exports
// ---------------------------------------------------------------------------

function exportsOf(text) {
  const names = new Set()
  const decl = /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g
  for (const m of text.matchAll(decl)) names.add(m[1])
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim()
      if (name && name !== 'default') names.add(name)
    }
  }
  return [...names]
}

const knowledgeRows = []
for (const file of walk(path.join(ROOT, 'src', 'knowledge')).sort()) {
  if (!file.endsWith('.ts')) continue
  const sourceRel = rel(file)
  const stem = path.basename(file).replace(/\.ts$/, '')
  const importRe = new RegExp(`(knowledge/${stem}|(^|/)\\./${stem})['"]`)
  const importers = loaders
    .filter((l) => l.rel !== sourceRel && /\.(ts|tsx)$/.test(l.rel))
    .filter((l) => importRe.test(l.text))
    .map((l) => l.rel)
    .sort()
  knowledgeRows.push({ sourceRel, size: fs.statSync(file).size, exports: exportsOf(readText(file)), importers })
}

// ---------------------------------------------------------------------------
// SQLite wiki DB
// ---------------------------------------------------------------------------

const DB_TABLE_NOTES = {
  pages: 'One row per Fandom wiki page (title, url, revid, wikitext, DLC flags).',
  sections: 'Ordered wikitext sections; the prose half of every page.',
  redirects: 'Wiki redirect titles → target title + fragment. **Unused** — Task 131 §3 mines these as aliases.',
  entities: 'Typed pages (weapon/armor/spell/boss/talisman). **Unused** — no src/script reads it.',
  weapons: 'Parsed weapon infobox rows (type, weight, requirements, scaling, skill). **Unused.**',
  armor: 'Parsed armor infobox rows (slot, weight, poise, effects). **Unused.**',
  spells: 'Parsed sorcery/incantation rows (FP/stamina, slots, requirements, effect). **Unused.**',
  talismans: 'Parsed talisman rows (weight, effect, summary). **Unused.**',
  bosses: 'Parsed boss rows (location, HP, runes, drops). **Unused.**',
  acquisition: 'Item → how obtained (method, location, nearest grace, prereqs, missable).',
  quests: 'NPC quest steps (order, location, action, breaks quest).',
  extract_failures: 'Extraction error log (currently empty).',
  sync_state: 'Last sync timestamp + page count per source.',
  dlc_report: 'DLC signal counts from the scrape.',
  dlc_categories: 'Category titles flagged as Shadow of the Erdtree.',
  sections_fts: 'FTS5 full-text index over sections (title, heading, markdown).',
}

const DB_TABLE_CONSUMERS = {
  pages: ['scripts/export-mcp-db.py', '→ open/wiki-sections.json', '→ open/acquisition.json', '→ open/npc-quests.json', '→ open/recipes.json', '→ open/secrets.json'],
  sections: ['scripts/export-mcp-db.py', '→ open/wiki-sections.json', '→ open/recipes.json', '→ open/secrets.json'],
  acquisition: ['scripts/export-mcp-db.py', '→ open/acquisition.json', '→ src/lib/acquisition.ts'],
  quests: ['scripts/export-mcp-db.py', '→ open/npc-quests.json', '→ src/lib/npcQuests.ts'],
  sections_fts: ['(tooling / human search only)'],
}

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return { stats: null, tables: [], infobox: [], categories: [] }
  }
  const stat = fs.statSync(DB_FILE)
  const db = new DatabaseSync(DB_FILE, { readOnly: true })
  const master = db.prepare(`select name, type from sqlite_master where type in ('table','view') order by name`).all()
  const tables = []
  for (const t of master) {
    let count = 0
    let columns = []
    try {
      count = db.prepare(`select count(*) c from "${t.name}"`).get().c
      const info = db.prepare(`select * from "${t.name}" limit 1`).all()
      columns = info[0] ? Object.keys(info[0]) : []
    } catch (e) {
      columns = [`<${e.message}>`]
    }
    tables.push({ name: t.name, type: t.type, count, columns })
  }
  const pages = db.prepare(`select wikitext from pages where wikitext is not null`).all()
  const infobox = new Map()
  const categories = new Map()
  const boxRe = /\{\{\s*[Ii]nfobox[\s_]+([A-Za-z0-9_ -]+)/g
  const catRe = /\[\[Category:\s*([^\]|#]+)/g
  for (const { wikitext } of pages) {
    for (const m of wikitext.matchAll(boxRe)) inc(infobox, m[1].trim())
    for (const m of wikitext.matchAll(catRe)) inc(categories, m[1].trim())
  }
  const meta = {}
  for (const name of ['sync_state', 'dlc_report']) {
    try {
      meta[name] = db.prepare(`select * from "${name}"`).all()
    } catch {
      meta[name] = []
    }
  }
  db.close()
  return {
    stats: { size: stat.size, pagesRows: pages.length, meta },
    tables,
    infobox: sorted(infobox),
    categories: sorted(categories).slice(0, 40),
    infoboxMap: new Map(sorted(infobox)),
  }
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

function sourceCount(file) {
  try {
    return countOf(readJson(path.join(ROOT, file)))
  } catch {
    return 0
  }
}

function indexCounts() {
  try {
    const idx = readJson(INDEX_FILE)
    return { byKind: idx.counts?.byKind ?? {}, generatedAt: idx.generatedAt }
  } catch {
    return { byKind: {}, generatedAt: null }
  }
}

let NAMES_KINDS = null
function countByNamesKind(kind) {
  if (!NAMES_KINDS) {
    NAMES_KINDS = {}
    try {
      for (const row of readJson(path.join(ROOT, 'public/sourced/open/names.json'))) {
        if (row && row.kind) NAMES_KINDS[row.kind] = (NAMES_KINDS[row.kind] || 0) + 1
      }
    } catch {
      NAMES_KINDS = {}
    }
  }
  return NAMES_KINDS[kind] || 0
}
function countWrapped(file, key) {
  try {
    return (readJson(path.join(ROOT, file))[key] || []).length
  } catch {
    return 0
  }
}
function countSaveIds(key) {
  try {
    const ids = readJson(path.join(ROOT, 'public/sourced/open/save-ids.json')).ids || {}
    const v = ids[key]
    if (Array.isArray(v)) return v.length
    if (v && typeof v === 'object') return Object.keys(v).length
  } catch {
    /* ignore */
  }
  return 0
}
function countDialogueSpeakers() {
  try {
    const doc = readJson(path.join(ROOT, 'public/sourced/open/dialogue-owners.json'))
    return doc.npcs ? Object.keys(doc.npcs).length : 0
  } catch {
    return 0
  }
}

function buildGaps(db) {
  const app = indexCounts()
  const k = app.byKind
  const tableCount = (name) => db.tables.find((t) => t.name === name)?.count ?? 0
  const shieldRows = (() => {
    if (!db.stats) return 0
    try {
      const d = new DatabaseSync(DB_FILE, { readOnly: true })
      const n = d.prepare(`select count(*) c from weapons where lower(weapon_type) like '%shield%'`).get().c
      d.close()
      return n
    } catch {
      return 0
    }
  })()
  const infobox = (name) => db.infoboxMap?.get(name) || 0
  return [
    { kind: 'weapon', app: k.weapon ?? 0, richest: 'names.json kind=weapon (FMG rows)', richestCount: countByNamesKind('weapon'), note: `Typed DB weapons: ${tableCount('weapons')} (${shieldRows} shields); EquipParamWeapon names: 3529.` },
    { kind: 'shield', app: k.shield ?? 0, richest: 'data/raw/er-mcp.db weapons (shield types)', richestCount: shieldRows, note: 'DB weapon rows whose weapon_type contains "shield".' },
    { kind: 'armor', app: k.armor ?? 0, richest: 'data/raw/er-mcp.db armor', richestCount: tableCount('armor'), note: `FMG protector rows: ${countByNamesKind('protector')}; save-ids armor: ${countSaveIds('armor')}.` },
    { kind: 'talisman', app: k.talisman ?? 0, richest: 'data/raw/er-mcp.db talismans', richestCount: tableCount('talismans'), note: `FMG accessory rows: ${countByNamesKind('accessories')}; save-ids talisman: ${countSaveIds('talisman')}.` },
    { kind: 'spell', app: k.spell ?? 0, richest: 'public/sourced/open/magic.json', richestCount: sourceCount('public/sourced/open/magic.json'), note: `DB spells: ${tableCount('spells')}; FanAPI spells: ${sourceCount('public/sourced/open/fanapi/spells.json')}.` },
    { kind: 'ash', app: k.ash ?? 0, richest: 'public/sourced/open/save-ids.json ids.aow', richestCount: countSaveIds('aow'), note: `FanAPI/checklist ashes: ${sourceCount('public/sourced/checklists/ashes.json')}; FMG arts rows: ${countByNamesKind('arts')}.` },
    { kind: 'spirit', app: k.spirit ?? 0, richest: 'public/sourced/checklists/spirits.json', richestCount: sourceCount('public/sourced/checklists/spirits.json'), note: `FanAPI spirits: ${sourceCount('public/sourced/open/fanapi/spirits.json')}.` },
    { kind: 'item', app: k.item ?? 0, richest: 'data/raw/er-mcp.db acquisition', richestCount: tableCount('acquisition'), note: `guide items: ${sourceCount('public/sourced/guide/items.json')}; FMG goods: ${countByNamesKind('goods')}; DB Infobox Item pages: ${infobox('Item')}.` },
    { kind: 'boss', app: k.boss ?? 0, richest: 'public/sourced/open/boss-xyz.json / checklists/bosses.json', richestCount: Math.max(sourceCount('public/sourced/open/boss-xyz.json'), sourceCount('public/sourced/checklists/bosses.json')), note: `hosted-bosses: ${sourceCount('src/data/hosted-bosses.json')}; hunts: ${sourceCount('src/data/hunts.json')}; DB bosses: ${tableCount('bosses')}; Fextralife: ${countWrapped('public/sourced/open/bosses-fextralife.json', 'bosses')}.` },
    { kind: 'npc', app: k.npc ?? 0, richest: 'names.json kind=npcs / DB Infobox Character', richestCount: countByNamesKind('npcs'), note: `DB Infobox Character pages: ${infobox('Character')}; dialogue speakers: ${countDialogueSpeakers()}; FanAPI npcs: ${sourceCount('public/sourced/open/fanapi/npcs.json')}.` },
    { kind: 'location/region', app: k.region ?? 0, richest: 'DB Infobox Location', richestCount: infobox('Location'), note: `checklists locations: ${sourceCount('public/sourced/checklists/locations.json')}; FMG places: ${countByNamesKind('places')}.` },
    { kind: 'grace', app: k.grace ?? 0, richest: 'checklists/graces.json (BonfireWarpParam)', richestCount: sourceCount('public/sourced/checklists/graces.json'), note: 'Every warp row.' },
    { kind: 'dungeon', app: k.dungeon ?? 0, richest: 'src/data/dungeons.json', richestCount: sourceCount('src/data/dungeons.json'), note: `DB dungeon+evergaol pages: ${infobox('Dungeon') + infobox('Evergaol')}.` },
    { kind: 'quest', app: k.quest ?? 0, richest: 'data/raw/er-mcp.db quests (steps)', richestCount: tableCount('quests'), note: `Step rows across ${countWrapped('public/sourced/open/npc-quests.json', 'quests')} NPCs.` },
    { kind: 'enemy', app: 0, richest: 'public/sourced/enemy-combat.json', richestCount: sourceCount('public/sourced/enemy-combat.json'), note: `MSB placements: ${sourceCount('public/sourced/open/msb-enemies.json')}; no enemy entities in the index.` },
  ]
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function table(head, body) {
  const lines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`]
  for (const r of body) lines.push(`| ${r.join(' | ')} |`)
  return lines.join('\n')
}

function renderSourceTable(entries) {
  return table(
    ['path', 'size', 'records', 'shape / fields', 'entity kinds', 'consumed by'],
    entries.map((e) => [
      `\`${e.sourceRel}\``,
      bytes(e.size),
      e.records,
      e.shape,
      e.kinds,
      e.consumers.length ? e.consumers.map((c) => `\`${c}\``).join('<br>') : '**UNUSED**',
    ]),
  )
}

function main() {
  const db = readDb()
  const gaps = buildGaps(db)
  const sourced = rows.filter((r) => r.sourceRel.startsWith('public/sourced/'))
  const srcdata = rows.filter((r) => r.sourceRel.startsWith('src/data/'))
  const today = new Date().toISOString().slice(0, 10)
  const lines = []

  lines.push('# Data catalog (Task 131 §2)')
  lines.push('')
  lines.push(
    'Generated by `npm run data:catalog` (`scripts/data-catalog.mjs`). This is the map of **every data source in the tree**: what it holds, how big it is, which entity kinds it covers, and which `src/`/`scripts/` module loads it. A source no module resolves is flagged **UNUSED**. Read this before concluding a fact is "missing".',
  )
  lines.push('')
  lines.push(
    'Consumer detection greps the quoted literals, fetch URLs and path fragments loader modules use; dynamic loaders (`gameText.ts` tables, the image index, paramdex) are attributed via their generated consumers. It is a directory, not a proof — treat **UNUSED** as "nothing in `src/` or `scripts/` references this", not as "safe to delete".',
  )
  lines.push('')
  const totalBytes = rows.reduce((n, r) => n + r.size, 0)
  const imageBytes = [...imageGroups.values()].reduce((n, g) => n + g.size, 0)
  const imageCount = [...imageGroups.values()].reduce((n, g) => n + g.count, 0)
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **${rows.length}** data files catalogued, **${bytes(totalBytes)}** (plus **${imageCount}** images in ${imageGroups.size} groups, **${bytes(imageBytes)}**).`)
  lines.push(`- **${unused.length}** flagged **UNUSED** (no \`src/\`/\`scripts/\` consumer).`)
  if (db.stats) {
    lines.push(`- **SQLite wiki DB** \`data/raw/er-mcp.db\` — **${bytes(db.stats.size)}**, ${db.tables.length} tables/views, ${db.stats.pagesRows} pages. Gitignored; see \`data/raw/README.md\`.`)
  }
  const idx = indexCounts()
  lines.push(`- Entity index snapshot${idx.generatedAt ? ` (${idx.generatedAt})` : ''}: ${Object.entries(idx.byKind).map(([kk, v]) => `${kk} ${v}`).join(' · ')}.`)
  lines.push('')
  lines.push('## Unused sources (quick list)')
  lines.push('')
  if (!unused.length) lines.push('_None — every catalogued file is referenced somewhere._')
  else for (const u of unused) lines.push(`- \`${u.sourceRel}\` (${bytes(u.size)}, ${u.records} records)`)
  lines.push('')
  lines.push('---')
  lines.push('')

  lines.push('## SQLite wiki database — `data/raw/er-mcp.db`')
  lines.push('')
  if (!db.stats) {
    lines.push('_DB not present. Copy it to `data/raw/er-mcp.db` (gitignored) — see `data/raw/README.md`._')
  } else {
    lines.push(
      'A versioned Fandom-wiki snapshot (source `teoucsb82/elden-ring-mcp`, release `data-2026.09.21`). Tables below are the typed views; `scripts/export-mcp-db.py` currently mines only pages/sections/acquisition/quests. **Task 131 §3** extends `scripts/build-entity-index.mjs` to mine the rest.',
    )
    lines.push('')
    const sync = db.stats.meta?.sync_state?.[0]
    if (sync) lines.push(`Last sync: **${sync.last_run}**, source \`${sync.source}\`, ${sync.pages} pages.`)
    lines.push('')
    lines.push('### Tables')
    lines.push('')
    lines.push(
      table(
        ['table', 'rows', 'columns', 'notes / consumers'],
        db.tables.map((t) => {
          const note = DB_TABLE_NOTES[t.name] || (t.name.startsWith('sections_fts_') ? 'FTS5 shadow table (auto-maintained).' : '')
          const consumers = (DB_TABLE_CONSUMERS[t.name] || []).map((x) => (x.startsWith('→') ? x : `\`${x}\``)).join(' ')
          return [`\`${t.name}\``, String(t.count), t.columns.slice(0, 10).join(', ') || '—', [note, consumers].filter(Boolean).join(' ')]
        }),
      ),
    )
    lines.push('')
    if (db.stats.meta?.dlc_report?.length) {
      lines.push('### DLC signals')
      lines.push('')
      lines.push(table(['signal', 'hits'], db.stats.meta.dlc_report.map((r) => [`\`${r.signal}\``, String(r.hits)])))
      lines.push('')
    }
    lines.push('### Infobox types in `pages.wikitext`')
    lines.push('')
    lines.push('Counts of `{{Infobox <Type>}}` across all 4,939 pages (a page can carry one infobox). This is the per-kind page census Task 131 §3 classifies against.')
    lines.push('')
    lines.push(table(['infobox type', 'pages'], db.infobox.map(([name, n]) => [`\`{{Infobox ${name}}}\``, String(n)])))
    lines.push('')
    lines.push('### Top categories in `pages.wikitext`')
    lines.push('')
    lines.push(table(['category', 'pages'], db.categories.map(([name, n]) => [name, String(n)])))
  }
  lines.push('')

  lines.push('## `public/sourced/**`')
  lines.push('')
  lines.push('### Image groups (counts only)')
  lines.push('')
  lines.push(
    table(
      ['directory · ext', 'files', 'size'],
      [...imageGroups.values()]
        .sort((a, b) => (a.dir + a.ext).localeCompare(b.dir + b.ext))
        .map((g) => [`\`${g.dir}\` · ${g.ext}`, String(g.count), bytes(g.size)]),
    ),
  )
  lines.push('')
  lines.push('### Files')
  lines.push('')
  lines.push(renderSourceTable(sourced))
  lines.push('')

  lines.push('## `src/data/**`')
  lines.push('')
  lines.push(renderSourceTable(srcdata))
  lines.push('')

  lines.push('## `src/knowledge/*.ts` exports')
  lines.push('')
  lines.push(
    table(
      ['module', 'size', 'exports', 'imported by'],
      knowledgeRows.map((k) => [
        `\`${k.sourceRel}\``,
        bytes(k.size),
        k.exports.length ? k.exports.map((e) => `\`${e}\``).join(', ') : '—',
        k.importers.length ? k.importers.map((i) => `\`${i}\``).join('<br>') : '**UNUSED**',
      ]),
    ),
  )
  lines.push('')
  lines.push(
    '`src/knowledge/*.test.ts` companions are test modules, not data sources. Generated data the app reads also lives under `src/data/**` above.',
  )
  lines.push('')

  lines.push('## `vendor/elden-ring-map/data/**`')
  lines.push('')
  lines.push(
    'Committed engine inputs (paramdefs, MFG category maps, event-flag BST). The engine’s **generated** outputs (`markers.json`, `items.json`, `place-names.json`, `map-banners.json`, tiles, icons, `cache/`) are gitignored and extracted from a local game install with `npm run map:setup`; they are not present in a clean checkout.',
  )
  lines.push('')
  lines.push(renderSourceTable(vendorRows))
  lines.push('')

  lines.push('## Gaps — app records vs richest source')
  lines.push('')
  lines.push(
    'Entity kinds where the application’s entity graph (`public/sourced/entity-index.json` `counts.byKind`) holds **fewer records than a source already in the tree**. A negative gap means the graph already tracks at least as many as that source.',
  )
  lines.push('')
  lines.push(
    table(
      ['kind', 'app records', 'richest source', 'source records', 'gap', 'note'],
      gaps.map((g) => {
        const gap = g.richestCount - g.app
        return [g.kind, String(g.app), g.richest, String(g.richestCount), gap > 0 ? `**+${gap}**` : String(gap), g.note]
      }),
    ),
  )
  lines.push('')
  lines.push(`_Regenerated ${today}._`)
  lines.push('')

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, lines.join('\n'))
  console.log('data catalog written: docs/DATA-CATALOG.md')
  console.log(`sources: ${rows.length}  unused: ${unused.length}  image groups: ${imageGroups.size}`)
  for (const u of unused) console.log(`  UNUSED ${u.sourceRel}`)
}

main()
