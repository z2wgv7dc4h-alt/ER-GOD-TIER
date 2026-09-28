#!/usr/bin/env node
// Task 138 §3 — dead links, unlinked mentions and per-kind edge coverage.
// Writes docs/LINKS-AUDIT.md.
//
//   npm run audit:links
//   npm run audit:links -- --snapshot docs/links-before.json
//
// The graph computation lives in `src/lib/linksAudit.ts`; this script installs the
// committed enrichment index into the graph (as the app does at runtime), scans
// renderer id literals, and renders the doc.
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docFile = path.join(root, 'docs/LINKS-AUDIT.md')
const beforeFile = path.join(root, 'docs/links-before.json')
const indexFile = path.join(root, 'public/sourced/entity-index.json')

const args = process.argv.slice(2)
const snapAt = args.indexOf('--snapshot')
const snapPath = snapAt >= 0 ? args[snapAt + 1] : null
// `--pre-task-138` captures the before snapshot as if the Quests renderer still
// printed step text plain, so the doc's before/after is apples-to-apples.
const preTask = args.includes('--pre-task-138')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full, out)
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const OPEN_ENTITY = /openEntity\(\s*['"]([^'"]+)['"]/g
const ENTITY_LINK = /<EntityLink[^>]*\bid=\s*(?:\{\s*)?['"]([^'"]+)['"]/g

function scanRendererLiterals() {
  const refs = []
  for (const file of walk(path.join(root, 'src'))) {
    const text = fs.readFileSync(file, 'utf8')
    const rel = path.relative(root, file).replace(/\\/g, '/')
    for (const re of [OPEN_ENTITY, ENTITY_LINK]) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text))) refs.push({ id: m[1], source: rel })
    }
  }
  return refs
}

function coverageTable(report) {
  const fields = new Set()
  for (const k of report) for (const f of Object.keys(k.fields)) fields.add(f)
  const cols = [...fields]
  const lines = ['| kind | entities | ' + cols.join(' | ') + ' |', '| --- | --- | ' + cols.map(() => '---').join(' | ') + ' |']
  for (const k of report) {
    const cells = cols.map((f) => (k.fields[f] ? `${k.fields[f].pct}%` : '·'))
    lines.push(`| ${k.kind} | ${k.total} | ${cells.join(' | ')} |`)
  }
  return lines.join('\n')
}

function deadTable(rows) {
  if (!rows.length) return '_None._'
  const lines = ['| id | source |', '| --- | --- |']
  for (const r of rows) lines.push(`| \`${r.id}\` | ${r.source} |`)
  return lines.join('\n')
}

function guardTable(report, guards) {
  const lines = ['| guard | min | actual | status |', '| --- | --- | --- | --- |']
  for (const g of guards) {
    const kind = report.find((k) => k.kind === g.kind)
    const pct = kind && kind.fields[g.field] ? kind.fields[g.field].pct : 0
    lines.push(`| ${g.kind}.${g.label} | ≥ ${g.min}% | ${kind ? `${pct}%` : 'n/a'} | ${pct >= g.min ? 'PASS' : 'FAIL'} |`)
  }
  return lines.join('\n')
}

function surfaceBeforeAfter(after, before) {
  const beforeByName = new Map((before?.surfaces ?? []).map((s) => [s.name, s]))
  const lines = ['| surface | linkable | unlinked before | unlinked after |', '| --- | --- | --- | --- |']
  for (const r of after) {
    const b = beforeByName.get(r.name)
    lines.push(`| ${r.name} | ${r.linkable} | ${b ? b.unlinked : '—'} | ${r.unlinked} |`)
  }
  return lines.join('\n')
}

function sample(list, n) {
  const out = []
  const step = Math.max(1, Math.floor(list.length / n))
  for (let i = 0; i < list.length && out.length < n; i += step) out.push(list[i])
  return out
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
  try {
    const indexMod = await server.ssrLoadModule('/src/lib/entityIndex.ts')
    await server.ssrLoadModule('/src/lib/entityGraph.ts')
    const audit = await server.ssrLoadModule('/src/lib/linksAudit.ts')

    const indexDoc = JSON.parse(fs.readFileSync(indexFile, 'utf8'))
    indexMod.setEntityIndex(new Map(Object.entries(indexDoc.records ?? {})))

    const graphMod = await server.ssrLoadModule('/src/lib/entityGraph.ts')
    const dataDead = audit.deadLinks()
    // `wiki:<slug>` is a virtual id EntityOverlay handles itself, not a graph id.
    const rendererDeadResolved = scanRendererLiterals().filter(
      (ref) => /^[a-z]+:/.test(ref.id) && !ref.id.startsWith('wiki:') && !graphMod.resolveEntityId(ref.id),
    )

    const coverage = audit.edgeCoverage()
    const violations = audit.coverageViolations(coverage)

    const wiki = readJson('public/sourced/open/wiki-sections.json')
    const acquisition = readJson('public/sourced/open/acquisition.json')
    const records = Object.values(indexDoc.records ?? {})

    const wikiSections = Array.isArray(wiki) ? wiki : wiki?.sections ?? []
    const wikiTexts = wikiSections.map((w) => `${w.heading ?? ''}\n${w.text ?? w.markdown ?? ''}`)
    const questTexts = audit.storylineStepTexts()
    const acqTexts = (acquisition?.rows ?? []).map((r) => `${r.method ?? ''} ${r.location ?? ''} ${r.near ?? ''}`)
    const descTexts = records.map((r) => r.description ?? '').filter(Boolean)

    const usesAutolink = (rel) => {
      if (preTask && rel === 'src/Quests.tsx') return false
      try {
        const text = fs.readFileSync(path.join(root, rel), 'utf8')
        return /<WikiText|WikiTextSection|autolink\(/.test(text)
      } catch {
        return false
      }
    }
    const surfaces = audit.unlinkedMentions([
      { name: 'entity descriptions', samples: sample(descTexts, 400), linked: usesAutolink('src/library/EntityPanel.tsx') },
      { name: 'wiki sections', samples: sample(wikiTexts, 400), linked: usesAutolink('src/WikiText.tsx') },
      { name: 'acquisition text', samples: sample(acqTexts, 400), linked: usesAutolink('src/library/EntityPanel.tsx') },
      { name: 'quest step actions', samples: sample(questTexts, 400), linked: usesAutolink('src/Quests.tsx') },
      { name: 'mechanics bodies', samples: audit.mechanicsBodies(400), linked: usesAutolink('src/library/Guides.tsx') },
    ])

    const report = {
      deadData: dataDead.length,
      deadRenderer: rendererDeadResolved.length,
      coverage,
      surfaces,
      generatedAt: new Date().toISOString(),
    }

    if (snapPath) {
      fs.mkdirSync(path.dirname(path.resolve(root, snapPath)), { recursive: true })
      fs.writeFileSync(path.resolve(root, snapPath), JSON.stringify(report, null, 2))
      console.log(`links snapshot written: ${snapPath}`)
      return
    }

    const before = fs.existsSync(beforeFile) ? JSON.parse(fs.readFileSync(beforeFile, 'utf8')) : null
    const today = new Date().toISOString().slice(0, 10)

    const doc = `# Links audit (Task 138 §3)

Generated by \`npm run audit:links\` from \`src/lib/linksAudit.ts\`, with the
committed enrichment index installed exactly as the app installs it at runtime.

## Dead links

An id in the data or in a renderer literal that resolves to no entity record.

| metric | before | after |
| --- | --- | --- |
| data ids unresolved | ${before ? before.deadData : '—'} | ${dataDead.length} |
| renderer literals unresolved | ${before ? before.deadRenderer : '—'} | ${rendererDeadResolved.length} |

### Unresolved data ids

${deadTable(dataDead)}

### Unresolved renderer literals

${deadTable(rendererDeadResolved)}

## Edge coverage per kind

Percent of each kind that carries the edge the Usage Model promises (only edges
the data can actually supply are measured). Guards below are a regression
tripwire at the achieved level, not a wish list.

${guardTable(coverage, audit.GUARD_MINIMUMS)}

${violations.length ? `**VIOLATIONS:** ${violations.join('; ')}` : 'All guard minimums met.'}

${coverageTable(coverage)}

## Unlinked mentions

Names \`glossary.autolink\` would link in each player-visible text surface. A
surface rendered through \`WikiText\` / \`autolink\` links all of them; the count is
the links a plain renderer still owes.

${surfaceBeforeAfter(surfaces, before)}

_Regenerated ${today}._
`
    fs.writeFileSync(docFile, doc)
    console.log(
      `links doc written: docs/LINKS-AUDIT.md (dead data ${dataDead.length}, dead renderer ${rendererDeadResolved.length}, guard violations ${violations.length})`,
    )
  } finally {
    await server.close()
  }
}

main().catch((error) => {
  console.error('links-audit failed:', error)
  process.exitCode = 1
})
