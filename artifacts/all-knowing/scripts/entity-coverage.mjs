#!/usr/bin/env node
// Task 119 §1/§4 — measure entity coverage and write docs/ENTITY-COVERAGE.md.
//
//   node scripts/entity-coverage.mjs --snapshot docs/entity-coverage-before.json
//        # capture the "before" numbers (run before building the index)
//   node scripts/entity-coverage.mjs
//        # write the doc, joining the saved before snapshot with the current after
//
// The coverage computation lives in `src/lib/entityCoverage.ts` and is loaded
// through Vite's in-process SSR transform (no server, no port).
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const indexFile = path.join(root, 'public/sourced/entity-index.json')
const beforeFile = path.join(root, 'docs/entity-coverage-before.json')
const docFile = path.join(root, 'docs/ENTITY-COVERAGE.md')

const args = process.argv.slice(2)
const snapshotAt = args.indexOf('--snapshot')
const snapshotPath = snapshotAt >= 0 ? args[snapshotAt + 1] : null

async function main() {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
  try {
    const mod = await server.ssrLoadModule('/src/lib/entityCoverage.ts')
    const doc = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { records: {}, unmatched: {}, counts: {} }
    const report = mod.computeEntityCoverage(doc.records ?? {})

    if (snapshotPath) {
      fs.mkdirSync(path.dirname(path.resolve(root, snapshotPath)), { recursive: true })
      fs.writeFileSync(path.resolve(root, snapshotPath), JSON.stringify(report, null, 2))
      console.log(`coverage snapshot written: ${snapshotPath}`)
    } else {
      const before = fs.existsSync(beforeFile) ? JSON.parse(fs.readFileSync(beforeFile, 'utf8')) : null
      fs.writeFileSync(docFile, renderMarkdown(report, before, doc, mod.GUARD_MINIMUMS, mod.GUARD_MINIMUMS && doc.records))
      console.log('coverage doc written: docs/ENTITY-COVERAGE.md')
      const violations = mod.violations(report)
      console.log(violations.length ? `VIOLATIONS: ${violations.join('; ')}` : 'all guard minimums met')
    }
  } finally {
    await server.close()
  }
}

const ROWS = [
  ['boss', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['stats', 'Stats'], ['hpNegationLocation', 'HP+Neg+Loc'], ['drops', 'Drops'], ['strategy', 'Strategy']]],
  ['weapon', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['requirementsScalingLocation', 'Req+Scale+Loc']]],
  ['shield', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['requirementsScalingLocation', 'Req+Scale+Loc']]],
  ['armor', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['stats', 'Stats'], ['descriptionLocation', 'Desc+Loc']]],
  ['talisman', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['effect', 'Effect'], ['descriptionLocation', 'Desc+Loc']]],
  ['spell', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['effect', 'Effect'], ['descriptionLocation', 'Desc+Loc']]],
  ['ash', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['descriptionLocation', 'Desc+Loc']]],
  ['spirit', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['descriptionLocation', 'Desc+Loc']]],
  ['item', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['stats', 'Stats'], ['descriptionLocation', 'Desc+Loc']]],
  ['material', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image']]],
  ['npc', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['stats', 'Stats']]],
  ['grace', [['description', 'Desc'], ['location', 'Location'], ['map', 'Coords']]],
  ['dungeon', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image']]],
  ['region', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map']]],
  ['enemy', [['description', 'Desc'], ['location', 'Location'], ['map', 'Map'], ['image', 'Image'], ['stats', 'Stats'], ['hpNegationLocation', 'HP+Neg+Loc'], ['drops', 'Drops'], ['strategy', 'Strategy']]],
]

const COLUMNS = ['Desc', 'Location', 'Map', 'Coords', 'Image', 'Stats', 'Effect', 'HP+Neg+Loc', 'Drops', 'Strategy', 'Req+Scale+Loc', 'Desc+Loc']

function reportMap(report) {
  const map = new Map()
  for (const kind of report.kinds) map.set(kind.kind, kind)
  return map
}

function renderKindTable(report) {
  const map = reportMap(report)
  const lines = ['| kind | entities | ' + COLUMNS.join(' | ') + ' |', '| --- | --- | ' + COLUMNS.map(() => '---').join(' | ') + ' |']
  for (const [kind, fields] of ROWS) {
    const entry = map.get(kind)
    const cells = COLUMNS.map((col) => {
      const field = fields.find(([, label]) => label === col)
      if (!entry || entry.total === 0) return '—'
      if (!field) return '·'
      const value = entry.fields[field[0]]
      return value ? `${value.pct}%` : '—'
    })
    lines.push(`| ${kind} | ${entry ? entry.total : 0} | ${cells.join(' | ')} |`)
  }
  return lines.join('\n')
}

function renderUnmatched(unmatched) {
  const rows = Object.entries(unmatched ?? {}).sort((a, b) => b[1] - a[1])
  if (!rows.length) return '_None recorded._'
  const lines = ['| source | unmatched rows |', '| --- | --- |']
  for (const [source, count] of rows) lines.push(`| ${source} | ${count} |`)
  return lines.join('\n')
}

function renderGuards(report, guards) {
  const map = reportMap(report)
  const lines = ['| guard | target | actual | status |', '| --- | --- | --- | --- |']
  for (const guard of guards) {
    const entry = map.get(guard.kind)
    if (!entry || entry.total === 0) {
      lines.push(`| ${guard.kind}: ${guard.label} | ≥ ${guard.min}% | n/a (no entities) | n/a |`)
      continue
    }
    const value = entry.fields[guard.field]
    const actual = value ? value.pct : 0
    lines.push(`| ${guard.kind}: ${guard.label} | ≥ ${guard.min}% | ${actual}% | ${actual >= guard.min ? 'PASS' : 'FAIL'} |`)
  }
  return lines.join('\n')
}

const SPOT_CHECKS = [
  ['Margit', 'boss:margit'],
  ['Malenia', 'boss:malenia'],
  ['Radahn', 'boss:radahn'],
  ['Godrick', 'boss:godrick'],
  ['Moonveil', 'item:moonveil'],
  ['Rivers of Blood', 'item:rivers-of-blood'],
  ['Mimic Tear Ash', 'item:mimic-tear-ashes'],
  ["Radagon's Soreseal", 'item:radagon-s-soreseal'],
  ['Iron Fist Alexander', 'npc:alexander'],
  ['Church of Elleh grace', 'grace:elleh'],
]

function renderSpotChecks(records) {
  const lines = []
  for (const [label, id] of SPOT_CHECKS) {
    const record = records[String(id)]
    if (!record) {
      lines.push(`### ${label} (\`${id}\`)\n\n_missing._\n`)
      continue
    }
    const bits = []
    if (record.description) bits.push(`**Description:** ${record.description}`)
    if (record.location) bits.push(`**Location:** ${record.location}`)
    if (record.map) bits.push(`**Coords:** ${record.map.x}, ${record.map.y}${record.map.map ? ` (${record.map.map})` : ''}`)
    if (record.stats) for (const [k, v] of Object.entries(record.stats)) bits.push(`**${k}:** ${v}`)
    if (record.drops?.length) bits.push(`**Drops:** ${record.drops.join(' · ')}`)
    if (record.strategy) bits.push(`**Strategy:** ${record.strategy}`)
    if (record.related?.length) bits.push(`**Related:** ${record.related.join(' · ')}`)
    lines.push(`### ${label} (\`${id}\`)\n\n${bits.join('\n\n')}\n`)
  }
  return lines.join('\n')
}

function renderMarkdown(after, before, doc, guards, records) {
  const today = new Date().toISOString().slice(0, 10)
  const beforeSection = before
    ? `## Before (no enrichment index)\n\n${renderKindTable(before)}\n`
    : '_No before snapshot found (`docs/entity-coverage-before.json`)._'
  return `# Entity coverage (Task 119)

Generated by \`npm run coverage:entities\` from \`src/lib/entityCoverage.ts\`; it
walks every entity in the entity graph (\`src/lib/entityGraph.ts\`) and asks which
carry an enriched field in \`public/sourced/entity-index.json\`. The \`before\`
numbers were captured with no enrichment index; the \`after\` numbers reflect the
current build.

## Minimums (Task 119 §4)

${renderGuards(after, guards ?? [])}

${beforeSection}
## After (enriched)

${renderKindTable(after)}

## Spot checks

The ten records Task 119 names, printed straight from the built index.

${renderSpotChecks(records ?? {})}

## Unmatched rows per source

Rows a dataset carries that did not resolve to a known entity. These are mostly
items/entities the graph does not track and are logged for transparency, not
dropped silently.

${renderUnmatched(doc.unmatched)}

_Regenerated ${today}._
`
}

main().catch((error) => {
  console.error("entity-coverage failed:", error)
  process.exitCode = 1
})
