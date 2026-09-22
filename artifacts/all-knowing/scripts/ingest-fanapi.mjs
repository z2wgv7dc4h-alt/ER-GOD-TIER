// Pull the structured FanAPI reference data the app was missing (armor poise/
// negation, talisman effects, spell costs/requirements, Ash of War skill/affinity,
// spirit-ash FP/HP) into slim JSON under public/sourced/open/fanapi/.
//
// FanAPI is the JSON source already listed in HANDOFF-CLAUSE §4 / awesome.ts; this
// script commits only the structured fields, never the article/description bodies.
// Deterministic: rows are sorted by name, so a second run is byte-identical.
//
// Run:  node scripts/ingest-fanapi.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const BASE = 'https://eldenring.fanapis.com/api'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sourced/open/fanapi')

async function pullAll(endpoint, limit = 100) {
  const rows = []
  for (let page = 0; ; page += 1) {
    const res = await fetch(`${BASE}/${endpoint}?limit=${limit}&page=${page}`)
    if (!res.ok) throw new Error(`${endpoint} page ${page}: HTTP ${res.status}`)
    const body = await res.json()
    rows.push(...(body.data ?? []))
    if (!body.data || body.data.length < limit || rows.length >= body.total) break
  }
  return rows
}

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
const kv = (list) => Object.fromEntries((list ?? []).map((x) => [x.name, x.amount]))

async function main() {
  await mkdir(OUT, { recursive: true })

  const armors = (await pullAll('armors')).map((a) => ({
    name: a.name,
    category: a.category,
    weight: a.weight,
    poise: kv(a.resistance).Poise ?? 0,
    dmgNegation: kv(a.dmgNegation),
    resistance: kv(a.resistance),
  })).sort(byName)

  const talismans = (await pullAll('talismans')).map((t) => ({
    name: t.name,
    effect: t.effect ?? '',
  })).sort(byName)

  const spells = [
    ...(await pullAll('sorceries')).map((s) => ({ ...s, type: 'Sorcery' })),
    ...(await pullAll('incantations')).map((s) => ({ ...s, type: 'Incantation' })),
  ].map((s) => ({
    name: s.name,
    type: s.type,
    cost: s.cost ?? 0,
    slots: s.slots ?? 0,
    requires: kv(s.requires),
    effect: s.effects ?? '',
  })).sort(byName)

  const ashes = (await pullAll('ashes')).map((a) => ({
    name: a.name.replace(/^Ash Of War:\s*/i, ''),
    affinity: a.affinity ?? '',
    skill: a.skill ?? '',
  })).sort(byName)

  const spirits = (await pullAll('spirits')).map((s) => ({
    name: s.name,
    fpCost: Number.parseInt(String(s.fpCost ?? '0'), 10) || 0,
    hpCost: Number.parseInt(String(s.hpCost ?? '0'), 10) || 0,
    effect: s.effect ?? '',
  })).sort(byName)

  // Task 68: the rest of the FanAPI categories. Structured/reference fields only —
  // weapons and shields deliberately drop the attack/defence numbers so nothing here
  // can be mistaken for the in-repo regulation AR source.
  const items = (await pullAll('items')).map((i) => ({
    name: i.name,
    type: i.type ?? '',
    effect: i.effect ?? '',
  })).sort(byName)

  const locations = (await pullAll('locations')).map((l) => ({
    name: l.name,
    region: l.region ?? '',
  })).sort(byName)

  const creatures = (await pullAll('creatures')).map((c) => ({
    name: c.name,
    location: c.location ?? '',
    drops: c.drops ?? [],
  })).sort(byName)

  const bosses = (await pullAll('bosses')).map((b) => ({
    name: b.name,
    region: b.region ?? '',
    location: b.location ?? '',
    hp: b.healthPoints ?? 0,
    drops: b.drops ?? [],
  })).sort(byName)

  const npcs = (await pullAll('npcs')).map((n) => ({
    name: n.name,
    location: n.location ?? '',
    role: n.role ?? '',
  })).sort(byName)

  const ammos = (await pullAll('ammos')).map((a) => ({
    name: a.name,
    type: a.type ?? '',
    passive: a.passive ?? '',
  })).sort(byName)

  const classes = (await pullAll('classes')).map((c) => ({
    name: c.name,
    level: Number.parseInt(String(c.stats?.level ?? '1'), 10) || 1,
    stats: c.stats ?? {},
  })).sort(byName)

  const weapons = (await pullAll('weapons')).map((w) => ({
    name: w.name,
    category: w.category ?? '',
    weight: w.weight ?? 0,
  })).sort(byName)

  const shields = (await pullAll('shields')).map((s) => ({
    name: s.name,
    category: s.category ?? '',
    weight: s.weight ?? 0,
  })).sort(byName)

  const files = {
    'armors.json': armors,
    'talismans.json': talismans,
    'spells.json': spells,
    'ashes.json': ashes,
    'spirits.json': spirits,
    'items.json': items,
    'locations.json': locations,
    'creatures.json': creatures,
    'bosses.json': bosses,
    'npcs.json': npcs,
    'ammos.json': ammos,
    'classes.json': classes,
    'weapons.json': weapons,
    'shields.json': shields,
  }
  for (const [file, rows] of Object.entries(files)) {
    await writeFile(resolve(OUT, file), `${JSON.stringify(rows, null, 2)}\n`)
    console.log(`${file}: ${rows.length} rows`)
  }
  // A tiny provenance file so the data's origin is in-repo, not just in the script.
  await writeFile(
    resolve(OUT, 'SOURCE.json'),
    `${JSON.stringify({ source: 'https://eldenring.fanapis.com (deliton/eldenring-api)', fields: 'structured stats only; descriptions/images not committed' }, null, 2)}\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
