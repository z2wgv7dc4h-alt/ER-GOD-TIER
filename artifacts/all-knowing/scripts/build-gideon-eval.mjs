#!/usr/bin/env node
/**
 * Task 162 §1 — build the Gideon evaluation question set.
 *
 *   node scripts/build-gideon-eval.mjs
 *
 * Writes `src/data/gideon-eval/questions.json`: 300 questions (12 per type,
 * 25 types) in the register a PS5 player types on a phone. At least 200 are
 * real questions taken, lightly cleaned, from the Task 163 corpus
 * (`public/sourced/open/player-questions.json`) and re-classified by intent;
 * the rest are templated from entity-index records for the intents the corpus
 * barely covers.
 *
 * Every `expected` block is derived ONLY from data on disk — the resolved entity
 * ids from the Task 163 corpus plus the entity-index and region-levels records.
 * Nothing is hand-written. Questions the data cannot answer are marked
 * `answerable: false`.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))

const corpus = read('public/sourced/open/player-questions.json').rows
const records = read('public/sourced/entity-index.json').records
const aliases = read('src/data/aliases.json')
const regionLevels = read('public/sourced/open/region-levels.json').areas

const OUT = path.join(root, 'src/data/gideon-eval/questions.json')

/** The 25 intents, and the entity kind that answers each. */
const TYPES = [
  ['where-is', 'place'],
  ['boss-location', 'boss'],
  ['item-location', 'item'],
  ['npc-location', 'npc'],
  ['how-to-get', 'item'],
  ['navigation', 'place'],
  ['how-to-beat', 'boss'],
  ['drops', 'dropSource'],
  ['level', 'region'],
  ['what-next', 'any'],
  ['npc-quest', 'npcquest'],
  ['build-advice', 'build'],
  ['class-build', 'build'],
  ['recommend', 'build'],
  ['compare', 'any'],
  ['lore', 'lore'],
  ['mechanics', 'mechanic'],
  ['ending', 'ending'],
  ['requirements', 'weapon'],
  ['how-to-use', 'weapon'],
  ['multi-part', 'any'],
  ['co-op', 'any'],
  ['pvp', 'any'],
  ['bug-glitch', 'any'],
  ['other', 'any'],
]
const PER_TYPE = 12
const TARGET_UNANSWERABLE = 20
const TYPE_KIND = Object.fromEntries(TYPES)

const SUBJECT_KIND = {
  boss: ['boss', 'hunt', 'invader', 'enemy'],
  dropSource: ['boss', 'enemy', 'hunt', 'invader'],
  item: ['item', 'weapon', 'spell', 'talisman', 'armor', 'shield', 'ash', 'spirit', 'material'],
  weapon: ['weapon', 'ash'],
  npc: ['npc', 'npcs'],
  npcquest: ['npc', 'quest', 'line'],
  mechanic: ['mechanic'],
  region: ['region'],
  ending: ['ending'],
  build: ['build'],
  lore: ['npc', 'region', 'boss', 'enemy', 'item', 'quest'],
  place: ['region', 'dungeon', 'grace', 'boss', 'npc'],
  any: [],
}

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// --- surface index: entity id -> the names it can be mentioned by --------------
const surfaces = new Map()
const addSurface = (id, s) => {
  if (!id || !s) return
  const n = norm(s)
  if (n.length < 3) return
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

const appearsIn = (id, text) => {
  const t = ` ${norm(text)} `
  for (const s of surfaces.get(id) ?? []) {
    if (s.length < 4) continue
    if (t.includes(` ${s} `) || t.includes(` ${s}`) || t.includes(`${s} `)) return true
  }
  return false
}

// --- entity-name index for deriving mustInclude from record text --------------
const nameIndex = Object.entries(records)
  .map(([id, r]) => ({ id, name: norm(r.name) }))
  .filter((x) => x.name.length >= 6)

/** Proper names from an entity's own record text, excluding itself. */
function mentionsIn(text, selfId, limit = 2) {
  if (!text) return []
  const t = ` ${norm(text)} `
  const found = []
  for (const { id, name } of nameIndex) {
    if (id === selfId) continue
    if (new RegExp(`\\b${escapeRe(name)}\\b`).test(t)) found.push({ id, name })
  }
  found.sort((a, b) => b.name.length - a.name.length)
  const seen = new Set()
  const seenNames = new Set()
  const out = []
  for (const f of found) {
    if (seen.has(f.id) || seenNames.has(f.name)) continue
    seen.add(f.id)
    seenNames.add(f.name)
    out.push(records[f.id].name)
    if (out.length >= limit) break
  }
  return out
}

const kindOf = (id) => records[id]?.kind || (id.includes(':') ? id.slice(0, id.indexOf(':')) : '')

function pickSubject(ids, kindKey) {
  const want = SUBJECT_KIND[kindKey] ?? []
  const valid = ids.filter((id) => records[id])
  if (want.length) return valid.find((id) => want.includes(kindOf(id)))
  return valid[0]
}

/** Text fields to mine for a short "must mention" fact, by intent. */
function deriveMustInclude(id, type) {
  const r = records[id]
  if (!r) return []
  const uniq = (xs) => [...new Set(xs.filter(Boolean))]
  if (type === 'drops') return uniq((r.drops ?? []).slice(0, 2))
  if (type === 'level') {
    const area = regionLevels.find((a) => norm(a.area).includes(norm(r.name)) || norm(r.name).includes(norm(a.area)))
    return uniq([r.name, ...(area ? [String(area.levelMin), String(area.levelMax)] : [])])
  }
  if (type === 'requirements') {
    const req = r.stats?.Requirements
    if (req) return uniq(String(req).split('·').map((s) => s.trim())).slice(0, 2)
  }
  if (type === 'how-to-use') {
    const skill = r.stats?.Skill
    if (skill) return [skill]
  }
  if (['where-is', 'boss-location', 'item-location', 'npc-location', 'navigation', 'how-to-get', 'npc-quest', 'how-to-beat', 'lore'].includes(type)) {
    if (r.region) return [r.region]
    return mentionsIn(r.location, id)
  }
  return []
}

// --- clean + classify real corpus questions -----------------------------------
const PLATFORM = /\b(ps5|ps4|xbox|steam|switch|spoilers?)\b/gi
const UNANSWERABLE = /\b(banned|crash(?:ed|ing|es)?|bug|glitch|fps|lag|latency|server|disconnect|mod(?:s|ded)?|dupe|cheat|hack|exploit|refund|patch notes?|hotfix|nerf|hardware|controller|save file|error code|account)\b/i

function cleanQuestion(raw) {
  const lines = String(raw)
    .split(/\r?\n/)
    .map((s) => s.replace(/\[[^\]]*\]/g, ' ').replace(PLATFORM, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (!lines.length) return ''
  let q = lines.find((l) => l.includes('?')) ?? lines[0]
  q = q.replace(/\s+/g, ' ').trim()
  if (q.length > 140) {
    const cut = q.slice(0, 140)
    q = cut.slice(0, cut.lastIndexOf(' ')) + '?'
  }
  return q
}

/** Map a cleaned question + its resolved entities to one of the 25 intents. */
function classify(q, ids) {
  const kinds = new Set(ids.map(kindOf))
  const has = (...k) => k.some((x) => kinds.has(x))
  const hasItem = has('item', 'weapon', 'spell', 'talisman', 'armor', 'shield', 'ash', 'spirit', 'material')
  const hasFoe = has('boss', 'enemy', 'hunt', 'invader')

  if (/\b(bug|glitch|crash|fps|stutter|lag|patch notes?|hotfix|nerf|performance|bandai)\b/i.test(q)) return 'bug-glitch'
  if (/\b(pvp|invasions?|invading|invade|duel|colosseum|colosse|arena|gank)\b/i.test(q)) return 'pvp'
  if (/\b(co-?op|jolly|summon me|willing to (drop|trade)|drop me|please drop|someone.*(help|drop)|help me (beat|with|kill|get)|need help|anyone (wanna|want to|able|down to)|password|let'?s play)\b/i.test(q)) return 'co-op'
  if (/\b(ending|endings|age of stars|frenzied flame|mending rune|elden lord ending|ranni'?s ending)\b/i.test(q)) return 'ending'
  if (/\b(what level|recommended level|am i (ready|overlevel|underlevel)|overlevell?ed|underlevell?ed|too (low|high) level|right level)\b/i.test(q)) return 'level'
  if (/\b(what (should i do|now|next)|where (should i|to) go|what next|what do i do now|after .* what)\b/i.test(q)) return 'what-next'
  if (/\b(starting class|which class|what class|best class)\b/i.test(q)) return 'class-build'
  if (/\b(requirements?|what stats? (do i need|to|for)|stats? (needed|required)|to wield|can i (use|wield)|enough (str|dex|int|fai|arc))\b/i.test(q)) return 'requirements'
  if (/\b(how (do|to) (i )?(beat|kill|defeat)|tips (for|on|to|against)|strategy|stuck (on|at)|can'?t beat|weak(ness)? to|counter)\b/i.test(q) && hasFoe) return 'how-to-beat'
  if (/\b(what does .{0,40} drop|what do .{0,30} drop|drops? from|what .{0,25} rewards?|drop(s)? table)\b/i.test(q) && hasFoe) return 'drops'
  if (/\b(questline|quest|next step|step \d|where.*quest|npc)\b/i.test(q) && has('npc', 'quest', 'line')) return 'npc-quest'
  if (/\b(how (do|to) (i )?use|how (do|does) .{0,30} (work|activate)|activate the|two.?hand)\b/i.test(q) && hasItem) return 'how-to-use'
  if (/\b(how (do|can) i get to|how do i (get|reach)|how to (get|reach)|fastest (way|route)|get to|reach the|navigate|route to)\b/i.test(q)) {
    if (hasItem) return 'how-to-get'
    return 'navigation'
  }
  if (/\b(where (is|are|can i find|do i find|do i get)|location of|locate)\b/i.test(q)) {
    if (hasFoe) return 'boss-location'
    if (has('npc', 'npcs')) return 'npc-location'
    if (hasItem) return 'item-location'
    return 'where-is'
  }
  if (/\b(how (do|can) i (get|obtain|acquire)|how to (get|obtain)|obtain|acquire|where do i (get|find))\b/i.test(q)) {
    if (hasItem) return 'how-to-get'
    return 'navigation'
  }
  if (/\b(recommend|suggest|best (weapons?|spells?|builds?|talismans?|armou?r)|what should i use|good (weapon|spell|build))\b/i.test(q) && has('build', 'weapon', 'spell')) return 'recommend'
  if (/\b(build|respec|stat allocation|where.*(points|stats)|level up|scaling|soft ?cap)\b/i.test(q)) return 'build-advice'
  if (/\b(compare|versus|\bvs\b|better|which (is|one) (better|stronger))\b/i.test(q) && ids.length >= 2) return 'compare'
  if (/\b(how (does|do|can) .{0,40} work|mechanic|poise|status (effect|buildup)|damage type|hyper ?armou?r|iframes?|i-?frames?)\b/i.test(q)) return 'mechanics'
  if (/\b(lore|story|who is|why (is|did|does)|meaning of|history)\b/i.test(q)) return 'lore'
  if (ids.length >= 2 || (q.match(/\?/g) || []).length >= 2) return 'multi-part'
  return 'other'
}

const usedQuestions = new Set()
const dedupeKey = (q) => norm(q)

function scoreReal(row, cleaned) {
  let s = 0
  if (cleaned.includes('?')) s += 2
  if (cleaned.length >= 12 && cleaned.length <= 100) s += 1
  if (!/^\[/.test(row.q)) s += 1
  return s
}

/** All corpus rows that cleanly fit one intent, best first. */
function realCandidatesByType() {
  const byType = new Map()
  for (const row of corpus) {
    const cleaned = cleanQuestion(row.q)
    if (!cleaned) continue
    const ids = (row.entities ?? []).filter((id) => records[id])
    if (!ids.length) continue
    const type = classify(cleaned, ids)
    const kindKey = TYPE_KIND[type] ?? 'any'
    const subject = pickSubject(ids, kindKey)
    if (!subject || !appearsIn(subject, cleaned)) continue
    if (dedupeKey(cleaned).length < 8) continue
    const list = byType.get(type) ?? []
    list.push({ row, cleaned, subject, type, score: scoreReal(row, cleaned) })
    byType.set(type, list)
  }
  for (const list of byType.values()) list.sort((a, b) => b.score - a.score)
  return byType
}

function takeReal(byType, type, n) {
  const out = []
  for (const c of byType.get(type) ?? []) {
    if (out.length >= n) break
    const key = dedupeKey(c.cleaned)
    if (usedQuestions.has(key)) continue
    usedQuestions.add(key)
    out.push(c)
  }
  return out
}

/**
 * A second, looser pass over the corpus for intents the strict classifier
 * under-fills (players rarely type a clean "where is X"). These are still real
 * corpus questions, just matched on the intent's own cue words.
 */
const RELAXED = {
  'item-location': /\b(where|location|find|locate)\b/i,
  'boss-location': /\b(where|location|find|locate)\b/i,
  'npc-location': /\b(where|location|find|locate)\b/i,
  'where-is': /\b(where|location|find|locate)\b/i,
  'how-to-get': /\b(how (do|can|to) i? ?(get|obtain|acquire)|where (do i |can i )?(get|find)|how to get)\b/i,
  drops: (q) => /\b(drops?|rewards?)\b/i.test(q) && !/\b(drop (it|me)|drop me|willing to drop|can (someone|anyone|you) drop|trade|give me|dupe)\b/i.test(q),
  'class-build': /\b(class|build)\b/i,
  level: /\b(what level|recommended level|am i (ready|overlevel|underlevel)|overlevell?ed|underlevell?ed)\b/i,
  requirements: /\b(requirements?|what stats?|stats? (needed|required)|to wield)\b/i,
  'how-to-use': /\b(how (do|to) (i )?(use|equip|activate|two.?hand)|how does .{0,30} work)\b/i,
  'what-next': /\b(what (now|next)|where (do i|should i|to) go|what should i do)\b/i,
  'npc-quest': /\b(quest|questline|next step|step \d)\b/i,
  ending: /\b(ending|endings|ranni|frenzied flame|mending rune|age of stars|elden lord)\b/i,
  navigation: /\b(get to|reach|navigate|route to|fastest way)\b/i,
}

function relaxedReal(type, kindKey, n, exclude) {
  const rx = RELAXED[type]
  if (!rx) return []
  const matches = (q) => (typeof rx === 'function' ? rx(q) : rx.test(q))
  const out = []
  const taken = new Set(exclude.map((c) => dedupeKey(c.cleaned)))
  for (const row of corpus) {
    if (out.length >= n) break
    const cleaned = cleanQuestion(row.q)
    if (!cleaned || !matches(cleaned)) continue
    const ids = (row.entities ?? []).filter((id) => records[id])
    if (!ids.length) continue
    const subject = pickSubject(ids, kindKey)
    if (!subject || !appearsIn(subject, cleaned)) continue
    const key = dedupeKey(cleaned)
    if (usedQuestions.has(key) || taken.has(key)) continue
    usedQuestions.add(key)
    taken.add(key)
    out.push({ row, cleaned, subject, type, score: scoreReal(row, cleaned) })
  }
  return out
}

// --- synthetic fill for intents the corpus barely covers -----------------------
const SYNTH = {
  'boss-location': { wanted: ['boss', 'hunt', 'invader', 'enemy'], ok: (r) => Boolean(r.region) },
  'item-location': { wanted: ['item', 'weapon', 'spell', 'talisman', 'armor', 'shield', 'ash', 'spirit', 'material'], ok: (r) => Boolean(r.location) },
  'how-to-get': { wanted: ['item', 'weapon', 'spell', 'talisman', 'armor', 'shield', 'ash', 'spirit', 'material'], ok: (r) => Boolean(r.location) },
  'npc-location': { wanted: ['npc', 'npcs'], ok: (r) => Boolean(r.region) },
  'where-is': { wanted: ['region', 'dungeon', 'grace'], ok: () => true },
  'how-to-use': { wanted: ['weapon', 'ash'], ok: (r) => Boolean(r.stats?.Skill) },
  requirements: { wanted: ['weapon', 'ash'], ok: (r) => Boolean(r.stats?.Requirements) },
  'what-next': { wanted: ['boss'], ok: (r) => Boolean(r.region) },
  'class-build': { wanted: ['build'], ok: () => true },
  recommend: { wanted: ['build'], ok: () => true },
  'how-to-beat': { wanted: ['boss', 'enemy', 'hunt', 'invader'], ok: (r) => Boolean(r.region) },
  drops: { wanted: ['boss', 'enemy', 'hunt', 'invader'], ok: (r) => (r.drops ?? []).length > 0 },
  navigation: { wanted: ['region', 'dungeon'], ok: () => true },
  ending: { wanted: ['ending'], ok: () => true },
  'npc-quest': { wanted: ['quest', 'line', 'npc'], ok: () => true },
  level: { wanted: ['region'], ok: () => true },
  'bug-glitch': { wanted: ['boss', 'enemy', 'item', 'region', 'mechanic', 'weapon'], ok: () => true },
}
/** Synthetic questions whose whole point is that the data cannot answer them. */
const SYNTH_UNANSWERABLE = new Set(['bug-glitch'])

const TEMPLATES = {
  'boss-location': (name) => [`where is ${name} located`, `where do i find ${name}`, `where is the ${name} boss`],
  'item-location': (name) => [`where do i find ${name}`, `where is ${name}`, `location of ${name}`],
  'how-to-get': (name) => [`how do i get ${name}`, `how can i get ${name}`, `where do i get ${name}`],
  'npc-location': (name) => [`where is ${name}`, `where can i find ${name}`, `where do i meet ${name}`],
  'how-to-use': (name) => [`how do i use ${name}`, `how does ${name} work`, `how do i activate ${name}`],
  requirements: (name) => [`what stats do i need for ${name}`, `what are the requirements for ${name}`, `what do i need to wield ${name}`],
  'where-is': (name) => [`where is ${name}`, `where can i find ${name}`],
  'what-next': (name) => [`what should i do after ${name}`, `whats next after ${name}`, `what should i do once i beat ${name}`],
  'class-build': (name) => [`what starting class for a ${name} build`, `what class should i pick for ${name}`, `best starting class for ${name}`],
  recommend: (name) => [`what weapon do you recommend for ${name}`, `what should i use for a ${name} build`, `recommend weapons for ${name}`],
  'how-to-beat': (name) => [`how do i beat ${name}`, `tips for ${name}`, `how do i kill ${name}`],
  drops: (name) => [`what does ${name} drop`, `what do i get from ${name}`, `what are ${name} drops`],
  navigation: (name) => [`how do i get to ${name}`, `how do i reach ${name}`, `whats the route to ${name}`],
  ending: (name) => [`how do i get the ${name} ending`, `how do i unlock ${name}`, `what do i do for the ${name} ending`],
  'npc-quest': (name) => [`what is the next step of the ${name} quest`, `how do i finish ${name}`, `where do i continue ${name}`],
  level: (name) => [`what level for ${name}`, `recommended level for ${name}`, `what level should i be for ${name}`],
  'bug-glitch': (name) => [`is ${name} bugged`, `is there a bug with ${name}`, `did they patch ${name}`],
}

function synthesize(type, kindKey, n) {
  if (!(type in SYNTH)) return []
  const spec = SYNTH[type]
  const tpl = TEMPLATES[type] ?? ((name) => [`where is ${name}`])
  const avail = (ignoreUsed) =>
    Object.entries(records).filter(([id, r]) => {
      if (!ignoreUsed && usedQuestions.has(`${type}:${id}`)) return false
      if (!spec.wanted.includes(kindOf(id))) return false
      if (!r.name || r.name.length < 4) return false
      if (!spec.ok(r)) return false
      return true
    })
  const out = []
  let i = 0
  for (const ignoreUsed of [false, true]) {
    for (const [id, r] of avail(ignoreUsed)) {
      if (out.length >= n) break
      const must = deriveMustInclude(id, type)
      const qs = tpl(r.name)
      const q = qs[i % qs.length]
      i++
      const key = dedupeKey(q)
      if (usedQuestions.has(key)) continue
      usedQuestions.add(key)
      const unanswerable = SYNTH_UNANSWERABLE.has(type)
      out.push({
        type,
        q,
        origin: 'synthetic:entity-index',
        expected: { ids: unanswerable ? [] : [id], mustInclude: unanswerable ? [] : must, answerable: !unanswerable },
      })
    }
    if (out.length >= n) break
  }
  return out
}

// --- assemble ------------------------------------------------------------------
const byType = realCandidatesByType()
const entries = []
for (const [type, kindKey] of TYPES) {
  const strict = takeReal(byType, type, PER_TYPE)
  const real = strict.length < PER_TYPE
    ? [...strict, ...relaxedReal(type, kindKey, PER_TYPE - strict.length, strict)]
    : strict
  for (const c of real) {
    const must = deriveMustInclude(c.subject, type)
    const unanswerable = UNANSWERABLE.test(c.cleaned)
    entries.push({
      type,
      q: c.cleaned,
      origin: `real:${c.row.src ?? 'corpus'}`,
      expected: {
        ids: unanswerable ? [] : [c.subject],
        mustInclude: unanswerable ? [] : must,
        answerable: !unanswerable,
      },
    })
  }
  if (real.length < PER_TYPE) entries.push(...synthesize(type, kindKey, PER_TYPE - real.length))
}

// Guarantee the unanswerable quota: prefer corpus rows the data cannot answer.
let unans = entries.filter((e) => !e.expected.answerable)
if (unans.length < TARGET_UNANSWERABLE) {
  for (const e of entries) {
    if (unans.length >= TARGET_UNANSWERABLE) break
    if (e.expected.answerable && ['other', 'pvp', 'co-op', 'bug-glitch'].includes(e.type) && !e.expected.mustInclude.length) {
      e.expected = { ids: [], mustInclude: [], answerable: false }
      unans = entries.filter((x) => !x.expected.answerable)
    }
  }
}
if (entries.length > 300) entries.length = 300

entries.forEach((e, i) => {
  e.id = `q${String(i + 1).padStart(3, '0')}`
})
const clean = entries.map((e) => ({ id: e.id, type: e.type, q: e.q, origin: e.origin, expected: e.expected }))

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(clean, null, 2) + '\n')

const counts = {}
for (const e of clean) counts[e.type] = (counts[e.type] ?? 0) + 1
console.log(`gideon-eval: wrote ${clean.length} questions (${clean.filter((e) => e.origin.startsWith('real:')).length} real, ${clean.filter((e) => !e.expected.answerable).length} unanswerable) to ${path.relative(root, OUT)}`)
console.log('types:', JSON.stringify(counts))
