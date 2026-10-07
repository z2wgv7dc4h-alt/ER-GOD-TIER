#!/usr/bin/env node
/**
 * Task 162 §2/§3 — offline Gideon evaluation harness.
 *
 *   npm run eval:gideon
 *
 * Runs every question in `src/data/gideon-eval/questions.json` through the
 * deterministic + wiki-fallback `askGideon` path (no API key) for an empty
 * character and the mid-game scenario character, scores each answer against the
 * question's data-grounded `expected` block, records latency, and writes
 * `docs/GIDEON-EVAL.md`.
 *
 * The TS modules are loaded through Vite's in-process SSR transform (the same
 * trick `scripts/page-audit.mjs` uses). `envDir` points at an empty temp folder
 * and `VITE_GIDEON_API_KEY` is deleted, so the key path can never run; global
 * `fetch` is stubbed to read `/sourced/**` from disk so the offline fallbacks
 * get their real data. Nothing here touches the network.
 */
import { createServer } from 'vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const questions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/gideon-eval/questions.json'), 'utf8'))
const records = JSON.parse(fs.readFileSync(path.join(root, 'public/sourced/entity-index.json'), 'utf8')).records
const aliases = JSON.parse(fs.readFileSync(path.join(root, 'src/data/aliases.json'), 'utf8'))
const OUT = path.join(root, 'docs/GIDEON-EVAL.md')

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// id -> the names an answer can mention it by
const surfaces = new Map()
const addSurface = (id, s) => {
  const n = norm(s)
  if (!id || n.length < 4) return
  if (!surfaces.has(id)) surfaces.set(id, new Set())
  surfaces.get(id).add(n)
}
for (const [id, r] of Object.entries(records)) {
  addSurface(id, r.name)
  addSurface(id, id.includes(':') ? id.slice(id.indexOf(':') + 1).replace(/-/g, ' ') : '')
}
for (const a of aliases) {
  const id = a.slug || a.engineId
  if (!id || !records[id]) continue
  addSurface(id, a.fmgName)
  for (const al of a.aliases ?? []) addSurface(id, al)
}

const HEDGE = /\b(i (don'?t|do not) know|not sure|no idea|i can'?t|cannot|can'?t help|don'?t have|no data|isn'?t (in|available)|not in (my|the)|i'?m not able|unable|sorry|nothing i can|no (info|information)|outside (what|the)|don'?t cover|not something i|say an ending|name an ending|nothing (seeded|else)|what is still available)\b/i

function sayNorm(act) {
  return norm([act.say, (act.links ?? []).join(' '), act.factId, act.offer?.factId].filter(Boolean).join(' '))
}

function mentioned(act, id) {
  if (act.factId === id || act.offer?.factId === id || (act.links ?? []).includes(id)) return true
  const hay = ` ${sayNorm(act)} `
  for (const s of surfaces.get(id) ?? []) {
    if (hay.includes(` ${s} `) || hay.includes(` ${s}`) || hay.includes(`${s} `)) return true
  }
  return false
}

function mustPresent(act, fact) {
  const f = norm(fact)
  if (!f) return true
  return sayNorm(act).includes(f)
}

function score(question, act) {
  const exp = question.expected
  if (!exp.answerable) {
    return { verdict: HEDGE.test(act.say) ? 'honest' : 'madeUp', cause: HEDGE.test(act.say) ? null : 'overconfident' }
  }
  const ids = exp.ids ?? []
  const musts = exp.mustInclude ?? []
  const idHits = ids.filter((id) => mentioned(act, id))
  const mustHits = musts.filter((m) => mustPresent(act, m))
  const allIds = idHits.length === ids.length
  const allMust = mustHits.length === musts.length
  if (allIds && allMust) return { verdict: 'correct', cause: null, idHits, mustHits }
  if (idHits.length || mustHits.length) {
    const cause = idHits.length === 0 ? 'entity-not-recognised' : allIds ? 'answer-buried' : 'intent-misread'
    return { verdict: 'partial', cause, idHits, mustHits }
  }
  if (HEDGE.test(act.say) || act.say.trim().length < 3) {
    return { verdict: 'noAnswer', cause: 'data-missing' }
  }
  const cause = act.module === 'codex' ? 'wiki-snippet-irrelevant' : 'entity-not-recognised'
  return { verdict: 'wrong', cause }
}

// --- load the app's TS through Vite SSR ---------------------------------------
delete process.env.VITE_GIDEON_API_KEY
const emptyEnv = fs.mkdtempSync(path.join(os.tmpdir(), 'gideon-eval-env-'))

const server = await createServer({
  root,
  envDir: emptyEnv,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
})

globalThis.fetch = async (url) => {
  const u = String(url)
  if (u.startsWith('/')) {
    const p = path.join(root, 'public', decodeURIComponent(u.split('?')[0]))
    if (fs.existsSync(p)) {
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(fs.readFileSync(p, 'utf8')),
        text: async () => fs.readFileSync(p, 'utf8'),
      }
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' }
  }
  throw new Error('offline: blocked fetch ' + u)
}

const rows = []
try {
  const gideon = await server.ssrLoadModule('/src/lib/gideon.ts')
  const muse = await server.ssrLoadModule('/src/lib/muse.ts')
  const seed = await server.ssrLoadModule('/src/data/seed.ts')
  const progression = await server.ssrLoadModule('/src/lib/__fixtures__/scenarios/progression.ts')

  if (muse.hasGideonKey()) throw new Error('a Gideon API key is present; refusing to run online')

  const characters = [
    { name: 'empty', character: seed.emptyCharacter },
    { name: 'mid', character: progression.progressionScenarios[1].character() },
  ]

  for (const c of characters) {
    for (const question of questions) {
      const t = Date.now()
      let act
      try {
        act = await gideon.askGideon(question.q, c.character, {}, [])
      } catch (err) {
        act = { say: `[error] ${err && err.message ? err.message : err}` }
      }
      const ms = Date.now() - t
      const s = score(question, act)
      rows.push({ question, character: c.name, ms, act, ...s })
    }
  }
} finally {
  await server.close()
  fs.rmSync(emptyEnv, { recursive: true, force: true })
}

// --- aggregate -----------------------------------------------------------------
const answerable = rows.filter((r) => r.question.expected.answerable)
const unanswerable = rows.filter((r) => !r.question.expected.answerable)
const tally = (list, key) => {
  const m = {}
  for (const r of list) m[r.verdict] = (m[r.verdict] ?? 0) + 1
  return m
}
const overall = tally(answerable)
const honesty = tally(unanswerable)
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + '%' : '—')

const byType = new Map()
for (const r of rows) {
  const t = r.question.type
  const o = byType.get(t) ?? { n: 0, correct: 0, partial: 0, wrong: 0, noAnswer: 0, honest: 0, madeUp: 0, ms: [] }
  o.n++
  o[r.verdict] = (o[r.verdict] ?? 0) + 1
  o.ms.push(r.ms)
  byType.set(t, o)
}

const byCharacter = new Map()
for (const r of rows) {
  const k = r.character
  const o = byCharacter.get(k) ?? { n: 0, correct: 0, partial: 0, wrong: 0, noAnswer: 0, honest: 0, madeUp: 0, ms: [] }
  o.n++
  o[r.verdict] = (o[r.verdict] ?? 0) + 1
  o.ms.push(r.ms)
  byCharacter.set(k, o)
}

const causes = new Map()
for (const r of rows) {
  if (r.verdict === 'correct' || r.verdict === 'honest') continue
  const c = r.cause ?? 'other'
  causes.set(c, (causes.get(c) ?? 0) + 1)
}

const median = (xs) => {
  if (!xs.length) return 0
  const a = [...xs].sort((x, y) => x - y)
  return a[Math.floor(a.length / 2)]
}
const p95 = (xs) => {
  if (!xs.length) return 0
  const a = [...xs].sort((x, y) => x - y)
  return a[Math.min(a.length - 1, Math.ceil(a.length * 0.95) - 1)]
}

// worst misses: partial/wrong first, noAnswer last, then by how few expected items matched
const rank = { wrong: 0, partial: 1, noAnswer: 2, madeUp: 3 }
const missed = rows
  .filter((r) => !['correct', 'honest'].includes(r.verdict))
  .sort((a, b) => {
    const ra = rank[a.verdict] ?? 9
    const rb = rank[b.verdict] ?? 9
    if (ra !== rb) return ra - rb
    const ma = (a.idHits?.length ?? 0) + (a.mustHits?.length ?? 0)
    const mb = (b.idHits?.length ?? 0) + (b.mustHits?.length ?? 0)
    return ma - mb
  })
  .slice(0, 30)

const trunc = (s, n = 180) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

// --- render --------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10)
const typeTable = ['| intent | runs | correct | partial | wrong | noAnswer | honest | madeUp |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for (const [t, o] of [...byType.entries()].sort((a, b) => b[1].n - a[1].n)) {
  typeTable.push(`| ${t} | ${o.n} | ${o.correct ?? 0} | ${o.partial ?? 0} | ${o.wrong ?? 0} | ${o.noAnswer ?? 0} | ${o.honest ?? 0} | ${o.madeUp ?? 0} |`)
}
const charTable = ['| character | runs | correct | partial | wrong | noAnswer | honest | madeUp | median ms |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for (const [k, o] of byCharacter) {
  charTable.push(`| ${k} | ${o.n} | ${o.correct ?? 0} | ${o.partial ?? 0} | ${o.wrong ?? 0} | ${o.noAnswer ?? 0} | ${o.honest ?? 0} | ${o.madeUp ?? 0} | ${median(o.ms)} |`)
}
const causeTable = ['| failure cause | count | share of misses | example |', '| --- | ---: | ---: | --- |']
const missTotal = rows.filter((r) => !['correct', 'honest'].includes(r.verdict)).length
for (const [c, n] of [...causes.entries()].sort((a, b) => b[1] - a[1])) {
  const ex = rows.find((r) => r.cause === c)
  causeTable.push(`| ${c} | ${n} | ${missTotal ? ((100 * n) / missTotal).toFixed(1) : '0'}% | ${ex ? trunc(ex.question.q, 60) : ''} |`)
}
const unansTable = ['| intent | question | Gideon said |', '| --- | --- | --- |']
for (const r of rows.filter((x) => !x.question.expected.answerable && x.character === 'empty')) {
  unansTable.push(`| ${r.question.type} | ${trunc(r.question.q, 70)} | ${trunc(r.act.say, 140)} |`)
}
const missTable = ['| # | character | intent | question | expected | Gideon said |', '| ---: | --- | --- | --- | --- | --- |']
missed.forEach((r, i) => {
  const exp = `ids ${JSON.stringify(r.question.expected.ids)}; must ${JSON.stringify(r.question.expected.mustInclude)}`
  missTable.push(`| ${i + 1} | ${r.character} | ${r.question.type} | ${trunc(r.question.q, 70)} | ${trunc(exp, 70)} | ${trunc(r.act.say, 160)} |`)
})

const realCount = questions.filter((q) => q.origin.startsWith('real:')).length
const answerableN = questions.filter((q) => q.expected.answerable).length
const md = `# Offline Gideon evaluation (Task 162)

Generated by \`npm run eval:gideon\` (\`scripts/gideon-eval.mjs\`). It runs every
question in \`src/data/gideon-eval/questions.json\` through \`askGideon\` with **no
API key** — the deterministic router and the wiki fallback — for an empty
character and the mid-game scenario character, then scores the answer against the
question's data-grounded \`expected\` block.

- **Question set:** ${questions.length} questions, ${realCount} from the Task 163 player corpus, ${answerableN} answerable, ${questions.length - answerableN} marked unanswerable.
- **Runs:** ${rows.length} (${questions.length} × 2 characters).
- **Scoring:** \`correct\` = every expected id mentioned/linked **and** every mustInclude fact present; \`partial\` = some matched; \`wrong\` = confident but no expected fact; \`noAnswer\` = Gideon declines. Unanswerable questions are scored \`honest\` (declines/hedges) or \`madeUp\` (answers anyway).

## Headline

| metric | value |
| --- | ---: |
| answerable questions — correct | **${overall.correct ?? 0}/${answerable.length} (${pct(overall.correct ?? 0, answerable.length)})** |
| answerable questions — partial | ${overall.partial ?? 0} (${pct(overall.partial ?? 0, answerable.length)}) |
| answerable questions — wrong | ${overall.wrong ?? 0} (${pct(overall.wrong ?? 0, answerable.length)}) |
| answerable questions — no answer | ${overall.noAnswer ?? 0} (${pct(overall.noAnswer ?? 0, answerable.length)}) |
| unanswerable — honest | ${honesty.honest ?? 0}/${unanswerable.length} (${pct(honesty.honest ?? 0, unanswerable.length)}) |
| unanswerable — made up | ${honesty.madeUp ?? 0} (${pct(honesty.madeUp ?? 0, unanswerable.length)}) |
| latency — median | ${median(rows.map((r) => r.ms))} ms |
| latency — p95 | ${p95(rows.map((r) => r.ms))} ms |

## By intent

${typeTable.join('\n')}

## By character

${charTable.join('\n')}

## Failure causes

"Misses" are every run that was not \`correct\` (answerable) or \`honest\`
(unanswerable), i.e. ${missTotal} of ${rows.length} runs.

${causeTable.join('\n')}

## Unanswerable questions — what Gideon actually said

${unansTable.join('\n')}

## 30 worst misses

Ranked with confident wrong answers first, then partial, then declines. The
\`expected\` column lists the entity ids and mustInclude facts derived from the
project data; \`Gideon said\` is the first part of the real answer.

${missTable.join('\n')}

_Regenerated ${today}._
`

fs.writeFileSync(OUT, md)
console.log('gideon eval written: docs/GIDEON-EVAL.md')
console.log(`answerable: ${overall.correct ?? 0}/${answerable.length} correct (${pct(overall.correct ?? 0, answerable.length)}), ${overall.partial ?? 0} partial, ${overall.wrong ?? 0} wrong, ${overall.noAnswer ?? 0} noAnswer`)
console.log(`unanswerable: ${honesty.honest ?? 0}/${unanswerable.length} honest, ${honesty.madeUp ?? 0} madeUp`)
console.log(`latency median ${median(rows.map((r) => r.ms))}ms p95 ${p95(rows.map((r) => r.ms))}ms`)
console.log('top causes:', JSON.stringify([...causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)))
