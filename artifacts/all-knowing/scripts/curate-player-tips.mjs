// Task 195 §1 — curate the Reddit/forum player-knowledge corpus into a small
// set of actionable player tips, one JSON file the app can render.
//
// Input : public/sourced/open/player-knowledge.json  (Task 170 collector)
//         public/sourced/entity-index.json           (resolved page content)
// Output: src/data/player-tips.json
//
// A row is kept only when it is ALL of:
//   - current patch (`possiblyOutdated` false)
//   - about a resolved entity (one of its ids is in the entity index)
//   - actionable advice (an advice cue or an imperative opener)
//   - not already stated on that entity's page (description/strategy/sections)
//   - free of usernames; URLs are stripped, never rendered
//
// Every rejected row is logged with the first reason that fired, so the report
// can state counts per reason. Run: `node scripts/curate-player-tips.mjs`.
//
// Do not hand-edit src/data/player-tips.json — edit this script and re-run.

import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))

const corpus = read('public/sourced/open/player-knowledge.json')
const indexDoc = read('public/sourced/entity-index.json')
const records = indexDoc.records ?? {}

// ---------------------------------------------------------------------------
// entity kinds
// ---------------------------------------------------------------------------

const BOSS_KINDS = new Set(['boss', 'enemy', 'hunt', 'invader'])
const GEAR_KINDS = new Set([
  'item',
  'weapon',
  'shield',
  'armor',
  'talisman',
  'spell',
  'ash',
  'spirit',
  'material',
])
const MECHANIC_KINDS = new Set(['mechanic'])
const REGION_KINDS = new Set(['region', 'dungeon', 'grace'])
// Kinds that are not a resolution artefact and can carry a real tip.
const SUBSTANTIVE = new Set([
  ...BOSS_KINDS,
  ...GEAR_KINDS,
  ...MECHANIC_KINDS,
  ...REGION_KINDS,
  'npc',
  'merchant',
  'quest',
  'gate',
  'ending',
  'build',
])
// Collector artefacts that resolve to a record but are not a real entity.
const ARTEFACT = /^(damage|line):|^item:(wait|rest|note-|about-|no-skill|torrent|the-ring)$/

// ---------------------------------------------------------------------------
// text hygiene
// ---------------------------------------------------------------------------

const USERNAME = /(?<![A-Za-z0-9])u\/[A-Za-z0-9_-]{2,}/i
const URL = /https?:\/\/\S+/gi
const DELETED = /\[(?:deleted|removed|image)\]/i

/** Strip markdown/reddit noise and any URL; collapse whitespace. */
function cleanText(raw) {
  let t = raw
    .replace(URL, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [label](url) -> label
    .replace(/[*_`~]+/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Drop a leading "Edit:" / "edit:" aside.
  t = t.replace(/^(?:edit|update|tldr)\s*:?\s*/i, '')
  return t.trim()
}

/** Truncate to <= max chars on a sentence/word boundary. */
function clamp(text, max = 400) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (stop > max * 0.5) return cut.slice(0, stop + 1).trim()
  const sp = cut.lastIndexOf(' ')
  return `${(sp > 0 ? cut.slice(0, sp) : cut).trimEnd()}…`
}

// ---------------------------------------------------------------------------
// classification rules (mirrors docs/tasks/179-report.md, then tightened)
// ---------------------------------------------------------------------------

const QUESTION = /\?/

const REQUEST =
  /\b(need help|looking for|drop me|drop a|summon me|co-?op|anyone (wanna|want|down|able|willing|around)|can (someone|anyone)|who can join|trade|mule|add me|password|please help|help me|any tips|some help|any advice|\[?(ps5|ps4|xbox|pc|switch)\b|on switch\b|pm me)\b/i

const ART =
  /\b(painting|painting|drawing|drew|drawn|tattoo|cosplay|lego|merch|hoodie|artwork|ash ?tray|bleach|digital art|i (made|painted|built|drew|sketched))\b/i

const JOKE =
  /\b(git gud|lmao|lmfao|praise the sun|skill issue|touch grass|maidenless|joking|meme|😂|🤣|💀|outdrip|flavor)\b/i

const COMPLAINT =
  /\b(nerf|unpopular opinion|netcode|fps|lag|unplayable|cheater|casul|cope|ratio|camera is|bad camera)\b/i

const OPINION =
  /\b(i think|i feel|in my opinion|imo|my favou?rite|tier list|hot take|best (game|boss|weapon) ever|underrated|overrated|rate my|i (love|like|prefer|enjoy)|i'?d (say|argue))\b/i

const NIGHTREIGN = /\b(nightreign|nightlord|nightfarer|expedition)\b/i

const LORE = /\b(lore|canon|thematically|symbolis|symboliz|foreshadow|story of|backstory|head ?canon)\b/i

// A concrete, actionable instruction (the tip's spine).
const ADVICE_CUE =
  /\b(you (should|can|want|need|gotta|have to|'?ll want|really want)|make sure|be sure|don'?t forget|just use|use the|use a|equip|put (on|points|levels)|infuse|two.?hand|respec|is weak to|are weak to|weak (to|against)|stacks? with|works (on|against|for)|recommend|try (using|the|a|to)|farm (at|the|by)|lure (him|them|it)|cheese (him|them|it|by)|heal(?:ing)? works|bring (a|the)|always (roll|use|keep|stay|have)|never (roll|use|waste|sleep)|aim (for|to)|wait for|punish|roll (in|into|forward|toward|through)|dodge (the|into)|guard counter|jump attack|backstab|parry (the|a)|block the|keep a|switch to|swap to|instead of|avoid|watch out|snack on|think of it|lure him)\b/i

const IMPERATIVE =
  /^(use|try|get|grab|equip|keep|put|take|swap|buy|kill|parry|roll|jump|dodge|cast|apply|stack|build|invest|level|pick|avoid|don'?t|make|open|talk|go|run|head|farm|respec|two.?hand|infuse|upgrade|hold|stay|move|wait|watch|learn|practice|always|never|think|heal|lure|bring|eat|drink|sprint|block|walk|summon|start|leave|come|finish|press|remain)\b/i

// A story/achievement/opinion post: first-person narration, not a directive to
// the reader. "I'd recommend" is advice, so it is deliberately not matched.
const NARRATIVE =
  /\b(i (beat|finally|defeated|did|got|made|painted|finished|managed|tried|cleared|soloed|completed|started|stopped|quit|love|like|wish|hope|want|just|recently|literally|remember|found|found out|learned|knew|noticed|think|feel|dunno|imagine|assume|guess)|idk|i'?m (not sure|new|scared|stuck)|my (first|favourite|favorite|own|new|current|only|main|personnal|personal|take|character|run)|we (beat|did|ran)|took me|no ?hit|hitless|\brl ?1\b|\bng\+?\d*|playthrough|first (time|playthrough|run)|after \d+ ?(hours|tries|attempts)|hours (in|of|played|into)|tier list|this (is|was) my|rate my|ranking)\b/i

// A build/showcase title or a shared-video blurb, not advice.
const SHOWCASE = /(\bbuild[)!.]|eld(?:en)? ring:|\(strongest|one.?shot|showcase|clip\b|video\b|braindead|easy mode)/i

const PVP_RE = /\b(pvp|invasion|invader|invasions|duel|colosseum|gank|gankers|badredman|host|phantom|red sign|taunter)\b/i

// ---------------------------------------------------------------------------
// duplicate detection against the entity's own page
// ---------------------------------------------------------------------------

const STOP = new Set([
  'the', 'and', 'for', 'you', 'your', 'that', 'this', 'with', 'have', 'from',
  'are', 'was', 'were', 'will', 'would', 'there', 'their', 'them', 'they',
  'what', 'when', 'where', 'which', 'while', 'about', 'into', 'than', 'then',
  'just', 'like', 'also', 'very', 'much', 'more', 'most', 'some', 'such',
  'only', 'even', 'over', 'because', 'been', 'being', 'does', 'doing', 'done',
  'gets', 'getting', 'got', 'can', 'could', 'should', 'thing', 'things',
  'really', 'actually', 'basically', 'pretty', 'still', 'make', 'makes',
  'made', 'want', 'need', 'know', 'think', 'going', 'game', 'elden', 'ring',
])

function words(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP.has(w))
}

function pageWords(record) {
  const parts = [
    record.name,
    record.description,
    record.strategy,
    record.location,
    ...(record.drops ?? []),
    ...(record.sections ?? []).flatMap((s) => [s.heading, s.text]),
    ...Object.values(record.stats ?? {}),
  ]
  return new Set(words(parts.filter(Boolean).join(' ')))
}

const pageCache = new Map()
function dupScore(record, tip) {
  if (!pageCache.has(record.id)) pageCache.set(record.id, pageWords(record))
  const page = pageCache.get(record.id)
  const tw = [...new Set(words(tip))]
  if (tw.length < 3) return 0
  const hits = tw.filter((w) => page.has(w)).length
  return hits / tw.length
}

// ---------------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------------

const KEEP = []
const REJECT = []

function reject(row, reason) {
  REJECT.push({ permalink: row.permalink, reason })
}

function primaryEntity(row) {
  const ids = (row.entities ?? []).filter(
    (id) => records[id] && SUBSTANTIVE.has(records[id].kind) && !ARTEFACT.test(id),
  )
  if (!ids.length) return null
  // Prefer the kind that owns a dedicated placement: boss > item > mechanic >
  // region > everything else. Ties keep the collector's order.
  const rank = (id) => {
    const k = records[id].kind
    if (BOSS_KINDS.has(k)) return 5
    if (GEAR_KINDS.has(k)) return 4
    if (MECHANIC_KINDS.has(k)) return 3
    if (REGION_KINDS.has(k)) return 2
    return 1
  }
  return ids.slice().sort((a, b) => rank(b) - rank(a))[0]
}

function kindFor(row, entityId) {
  const rk = records[entityId].kind
  if (PVP_RE.test(row.text) || row.topic === 'pvp') return 'pvp'
  if (BOSS_KINDS.has(rk)) return 'boss'
  if (GEAR_KINDS.has(rk)) return 'item'
  if (MECHANIC_KINDS.has(rk)) return 'mechanic'
  if (REGION_KINDS.has(rk)) return 'region'
  return 'general'
}

function classify(row) {
  const text = row.text ?? ''
  const clean = cleanText(text)

  if (text.length < 25 || DELETED.test(text)) return reject(row, 'deleted/too-short')
  if (QUESTION.test(text)) return reject(row, 'question')
  if (USERNAME.test(text)) return reject(row, 'username')
  if (clean.length < 40) return reject(row, 'link-only/too-short')
  if (row.possiblyOutdated) return reject(row, 'outdated/patched')
  if (NIGHTREIGN.test(text)) return reject(row, 'nightreign')
  if (row.topic === 'lore' || LORE.test(text)) return reject(row, 'lore')
  if (REQUEST.test(text)) return reject(row, 'request/co-op/trade')
  if (ART.test(text)) return reject(row, 'art/showcase')
  if (SHOWCASE.test(text)) return reject(row, 'build/showcase')
  if (JOKE.test(text)) return reject(row, 'joke/meme')
  if (COMPLAINT.test(text) && !ADVICE_CUE.test(text)) return reject(row, 'complaint/meta')

  const entityId = primaryEntity(row)
  if (!entityId) return reject(row, 'no resolved entity')

  const firstLine = clean.split(/(?<=[.!?])\s+/)[0] ?? clean
  const imperative = IMPERATIVE.test(firstLine)
  const cue = ADVICE_CUE.test(clean)

  if (!cue && !imperative) return reject(row, 'not a directive')

  // First-person narration ("I beat X", "my first run", "took me 8 hours") is
  // an anecdote, not a tip. An imperative opener still passes.
  if (NARRATIVE.test(clean) && !imperative) return reject(row, 'story/achievement')
  if (OPINION.test(clean) && !imperative && !/recommend/i.test(clean)) return reject(row, 'opinion/discussion')

  const cleaned = clamp(clean, 400)
  if (cleaned.length < 40) return reject(row, 'link-only/too-short')

  const record = records[entityId]
  if (dupScore(record, cleaned) >= 0.6) return reject(row, 'already on page')

  const kind = kindFor(row, entityId)
  const id = `tip:${createHash('sha1').update(`${entityId}|${cleaned}`).digest('hex').slice(0, 10)}`
  KEEP.push({
    id,
    entityId,
    kind,
    text: cleaned,
    patch: row.patch,
    score: row.score ?? 0,
  })
  return undefined
}

for (const row of corpus.rows) classify(row)

// ---------------------------------------------------------------------------
// owner review (Task 179 recommendation #1)
//
// The mechanical rules above only reach ~50% precision (Task 179), so every
// shortlisted row was read end to end here and the survivors listed below.
// A candidate absent from this table is dropped as "review: not a tip". The
// optional `kind` overrides the classifier when the advice is PvP tech that
// happens to be attached to an item record.
// ---------------------------------------------------------------------------

const REVIEW_KEEP = [
  // Boss / enemy page — strategy section.
  ['e10351f8cd'], // Mohg bleeds fast; bleed gives him a damage buff.
  ['939df11009'], // Mohg: haemorrhage procs easily, viable strategy.
  ['41c8e24c7e'], // Godskin Apostle: can be baited into a fireball by flasking.
  ['e2d04c2334'], // Consort Radahn: parrying is the clean answer.
  ['087063ba63'], // Rennala: quality build + no affinity; respec dex.
  ['08735b53bc'], // Troll: quit-out load trick to break it.
  ['2f0ca46c3b'], // Tree Sentinel: get more scadutree fragments.
  ['22b46a1ef0'], // Guard counters + pickled turtle neck stamina.
  ['c00b95032f'], // Out of MP: jump/heavy rather than L2.
  ['9c26fc256d'], // Rennala: meteorite staff + rock sling, then respec.
  ['d6e4d4fbda'], // Leontiel: summon for Radahn Festival, invades after.
  ['9d46095550'], // Magma sorceries count as spells; talismans stack.
  ['18de5b1dc4'], // Vulgar Militia: strong early farm, hits hard.
  ['b306a2a143'], // Cheese Commander O'Neil by luring him into the rot geysers.

  // Item page — "How players use it" usage notes / builds.
  ['87ed7c52a8'], // Kick breaks scion/crucible/enemy shields for a free crit.
  ['a3a540b4eb'], // Barricade Shield raises stability and shield hardness.
  ['56d7c17913'], // Haligtree shield + Pearl talisman + Divine Fortification.
  ['3f4562938d'], // Fake Glintblade Phalanx with Miriam's Vanishing.
  ['4f8e4f475c'], // Hip lantern lights without using a hand.
  ['4e1ba4e1f8'], // Torch off-hand scalds Basilisks while two-handing fire.
  ['268c1c3526'], // Kick true-combos; keep a dagger first for shield-breaking.
  ['39de6f394a'], // Square Off on sword + No Skill shield for guard counters.
  ['a7cdbeeecd'], // Pickaxe for pierce + stance; Executioner crit, Anchor pierce.
  ['620037ed9a'], // Milady wing stance works on most infusions; multihit kit.
  ['687e8823db'], // STR/faith: use a STR/faith weapon and matching talismans.
  ['b390be60a6'], // 76-poise weight-to-poise set with Bull-Goat Talisman.
  ['eb6e7d7608'], // Cragblade adds stance damage; keep Wild Strikes off Anchor.
  ['bf3f30ea74'], // Nagakiba: have the stats to cast Bloodflame Blade.
  ['2857e68673'], // Respec STR/ARC: heavy armour, greatshield, bleed infuse.
  ['4eb43dec22'], // Never run uninfused non-somber weapons past early game.
  ['3c69126196'], // Dragon Communion Seal scales arcane + faith and boosts incants.

  // Library › PvP tech/matchups.
  ['25c8f77eec', 'pvp'], // Roll into collapsing stars; never roll away.
  ['1c49064d34', 'pvp'], // Parry buff: daggers/curved/thrusting/med shields viable.

  // Mechanic page / Guides.
  ['b13207834f'], // High-poise enemies stagger to big weapons; punish leaps.
  ['50ff6c4d31'], // Jump attacks cannot be parried.
  ['a57caf51cc'], // Health regen stacks with talisman, shield and incantations.
  ['ec4970a4b1'], // Stop panic rolling — it drains the stamina you need to attack.
  ['4d4c0b86ae'], // Bloodhound's Step + max upgrade before Altus.

  // Journey › Now "Before you go" (region warnings).
  ['9814f90292'], // Volcano Manor: jump the gap after teleporting from Raya Lucaria.
  ['8d36d5e056'], // Limgrave: talk to the Golden Knight on entry.
  ['a7dd95289c'], // The pit: roll forward, not backwards.

  // Guides › general topic.
  ['8f80e13134'], // Renna's tower skip is consistent but needs a good jump.
]

const reviewed = []
let droppedByReview = 0
for (const [id, kindOverride] of REVIEW_KEEP) {
  const tip = KEEP.find((t) => t.id === `tip:${id}`)
  if (!tip) continue
  reviewed.push(kindOverride ? { ...tip, kind: kindOverride } : tip)
}
for (const tip of KEEP) if (!REVIEW_KEEP.some(([id]) => `tip:${id}` === tip.id)) droppedByReview++

// Deduplicate identical tips (same entity + text) that arrived from different rows.
const seen = new Set()
const tips = reviewed.filter((t) => {
  if (seen.has(t.id)) return false
  seen.add(t.id)
  return true
}).sort((a, b) => {
  const order = { boss: 0, item: 1, pvp: 2, mechanic: 3, region: 4, general: 5 }
  return (order[a.kind] - order[b.kind]) || (b.score - a.score)
})

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

const meta = {
  source: 'public/sourced/open/player-knowledge.json',
  generatedAt: new Date().toISOString(),
  patchLine: corpus.patchTable?.[corpus.patchTable.length - 1]?.version ?? '',
  totalRows: corpus.rows.length,
  kept: tips.length,
  rejected: REJECT.length,
  byKind: tips.reduce((acc, t) => ((acc[t.kind] = (acc[t.kind] ?? 0) + 1), acc), {}),
  rejectionReasons: REJECT.reduce((acc, r) => ((acc[r.reason] = (acc[r.reason] ?? 0) + 1), acc), {}),
  droppedByReview,
}

const doc = { meta, tips }

writeFileSync(join(root, 'src/data/player-tips.json'), `${JSON.stringify(doc, null, 2)}\n`)
console.log(JSON.stringify(meta, null, 2))
