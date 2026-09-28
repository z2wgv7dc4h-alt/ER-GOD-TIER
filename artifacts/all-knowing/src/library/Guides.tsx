import { useMemo, useState, type ReactNode } from 'react'
import { mechanics, type MechanicCard } from '../knowledge/mechanics'
import { GuidesSection } from '../PackData'
import { RecipesSection, SecretsSection, WikiTextSection } from '../CodexData'
import { DialogueHits, DialogueBySpeaker } from '../Dialogue'
import { DungeonChecklist } from '../Dungeon'
import { EntityLink } from '../EntityLink'
import { ShowMore } from '../ShowMore'
import { achievementProgress } from '../lib/achievements'
import { blessingLine, blessingProgress } from '../lib/blessings'
import { conditionalUnlocks, stockForVendor } from '../knowledge/merchantConditions'
import { flaskUpgrades, mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { applyFacts } from '../lib/infer'
import { useGuide } from '../lib/guide'
import { sectionMeta } from '../lib/sections'
import { useWorkspace } from '../state'
import { Card, Chip } from '../ui'

/**
 * Task 117 — Library › Guides.
 *
 * Guides is where the long-form reference lives: the mechanics cards plus the
 * guides / recipes / secrets / dialogue / wiki corpora that used to be unique to
 * `LegacyCodex` (which this replaces). It is a browse surface first — pick a
 * corpus — and a filter surface when the header search has a query.
 */

type Corpus = 'guides' | 'recipes' | 'secrets' | 'dialogue' | 'wiki'

const CORPORA: { id: Corpus; label: string }[] = [
  { id: 'guides', label: 'Guides' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'secrets', label: 'Secrets' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'wiki', label: 'Wiki' },
]

function matchesCard(card: MechanicCard, q: string): boolean {
  if (!q) return true
  const haystack = `${card.title} ${card.category} ${card.body} ${card.aliases.join(' ')} ${card.numbers.join(' ')}`
  return haystack.toLowerCase().includes(q)
}

function firstSentence(text: string): string {
  const match = text.trim().match(/^(.+?[.!?])(\s|$)/)
  return match ? match[1] : text.trim()
}

/**
 * Task 126 §3 / 127 §3: a topic card leads with one short line; the full text
 * opens behind "More". Truncating the string (not CSS-clamping) is deliberate —
 * the collapsed words must not load on first paint.
 */
function oneLine(text: string, max = 92): string {
  const sentence = firstSentence(text)
  if (sentence.length <= max) return sentence
  const cut = sentence.slice(0, max)
  const at = cut.lastIndexOf(' ')
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trim()}…`
}

function MechanicsSection({ query }: { query: string }) {
  const q = query.trim().toLowerCase()
  const [limit, setLimit] = useState(6)
  const cards = useMemo(() => mechanics.filter((m) => matchesCard(m, q)), [q])
  if (cards.length === 0) return null
  const shown = cards.slice(0, limit)
  return (
    <Collapsed title="Mechanics" count={cards.length} defaultOpen>
      <div className="codex-grid">
        {shown.map((m) => {
          const lead = oneLine(m.body)
          const hasMore = lead.length < m.body.trim().length
          return (
            <Card key={m.id} kicker={m.category} title={<EntityLink id={m.id}>{m.title}</EntityLink>}>
              <p className="note">{lead}</p>
              {hasMore && (
                <details className="codex-more">
                  <summary className="kicker" aria-label={`More about ${m.title}`}>More</summary>
                  <p className="note">{m.body}</p>
                  {m.numbers.length > 0 && (
                    <ul className="list" style={{ marginTop: 6 }}>
                      {m.numbers.map((n) => (
                        <li key={n} style={{ cursor: 'default' }}>{n}</li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
            </Card>
          )
        })}
      </div>
      <ShowMore total={cards.length} shown={limit} onMore={() => setLimit((n) => n + 12)} />
    </Collapsed>
  )
}

/** A collapsed reference block, matching the old Codex section pattern. */
function Collapsed({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="codex-section" open={defaultOpen}>
      <summary className="codex-head codex-summary">
        {title}
        {count != null ? ` · ${count}` : ''}
      </summary>
      {children}
    </details>
  )
}

/**
 * The progression tools that used to live only in `LegacyCodex` — blessing
 * meters, achievement sets, the dungeon checklist, merchant conditionals and the
 * DLC fragment mark cards. They are folded in here so deleting the old file does
 * not remove a feature.
 */
function ProgressionSection({ query }: { query: string }) {
  const { character, setCharacter } = useWorkspace()
  const guide = useGuide()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const q = query.trim().toLowerCase()
  const blessings = useMemo(
    () => blessingProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const achievements = useMemo(
    () => achievementProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const conditionals = useMemo(
    () => conditionalUnlocks.map((u) => ({ ...u, items: stockForVendor(u.vendor) })),
    [],
  )
  const frags = [...scadutreeFragments, ...mapFragments, ...flaskUpgrades]
    .filter((e) => !q || `${e.name} ${e.region} ${e.note}`.toLowerCase().includes(q))
    .slice(0, 6)

  return (
    <>
      <Collapsed title="Blessing meters" count={blessings.length}>
        {blessings.map((p) => {
          const left = p.remaining.filter((r) => !q || `${r.name} ${r.how}`.toLowerCase().includes(q))
          if (q && left.length === 0) return null
          const open = expanded[p.id]
          const shown = open ? left : left.slice(0, 6)
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
          return (
            <div key={p.id}>
              <div className="meter" style={{ padding: '0 20px', maxWidth: 460 }}>
                <label>
                  <span>{blessingLine(p)}</span>
                  <span>{pct}%</span>
                </label>
                <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                <p className="note" style={{ marginTop: 6 }}>
                  {p.note}{' '}
                  {p.incomplete ? `List incomplete in-repo (${p.listCount}/${p.total} rows). ` : ''}
                  Reference: {p.source}
                </p>
              </div>
              <div className="codex-grid">
                {shown.map((r) => (
                  <article className="card" key={r.id}>
                    <div className="kicker">{p.name}{r.dlc ? ' · DLC' : ''}</div>
                    <h3>{r.name}</h3>
                    <p className="note">{r.how}</p>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setCharacter(applyFacts(character, [r.id], 'answer', `${p.name} meter`))}
                    >
                      Mark
                    </button>
                  </article>
                ))}
              </div>
              {left.length > 6 && (
                <button
                  type="button"
                  className="chip"
                  style={{ margin: '0 20px' }}
                  onClick={() => setExpanded((cur) => ({ ...cur, [p.id]: !open }))}
                >
                  {open ? 'Show fewer' : `Show all ${left.length} left`}
                </button>
              )}
            </div>
          )
        })}
      </Collapsed>

      <Collapsed title="Achievement sets" count={achievements.length}>
        {achievements.map((set) => {
          const left = set.remaining.filter((r) => !q || `${r.name} ${r.how}`.toLowerCase().includes(q))
          if (q && left.length === 0) return null
          const open = expanded[set.id]
          const shown = open ? left : left.slice(0, 6)
          return (
            <div key={set.id}>
              <div className="kicker" style={{ padding: '0 20px' }}>
                {set.name} · {set.done}/{set.total} · {set.remaining.length} left — {set.note}
              </div>
              <div className="codex-grid">
                {shown.map((r) => (
                  <article className="card" key={r.id}>
                    <div className="kicker">
                      {set.name}{r.dlc ? ' · DLC' : ''}{r.missable ? ` · missable: ${r.missable}` : ''}
                    </div>
                    <h3>{r.name}</h3>
                    <p className="note">{r.how}</p>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setCharacter(applyFacts(character, [r.id], 'answer', `${set.name} set`))}
                    >
                      Mark
                    </button>
                  </article>
                ))}
              </div>
              {left.length > 6 && (
                <button
                  type="button"
                  className="chip"
                  style={{ margin: '0 20px' }}
                  onClick={() => setExpanded((cur) => ({ ...cur, [set.id]: !open }))}
                >
                  {open ? 'Show fewer' : `Show all ${left.length} left`}
                </button>
              )}
            </div>
          )
        })}
      </Collapsed>

      <Collapsed title="Dungeon checklist">
        <DungeonChecklist />
      </Collapsed>

      <Collapsed title="Merchant conditionals" count={conditionals.length}>
        <div className="codex-grid">
          {conditionals.slice(0, 6).map((u) => (
            <article className="card" key={u.vendor}>
              <div className="kicker">{u.soldBy} · conditional</div>
              <h3>{u.trigger}</h3>
              <p className="note">{u.items.join(', ') || 'Stock row missing.'}</p>
              <p className="note">{u.note}</p>
              {u.triggerId && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => setCharacter(applyFacts(character, [u.triggerId as string], 'answer', 'merchant condition'))}
                >
                  Log trigger
                </button>
              )}
            </article>
          ))}
        </div>
      </Collapsed>

      <Collapsed title="Fragments &amp; flasks" count={frags.length}>
        <div className="codex-grid">
          {frags.map((e) => (
            <article className="card" key={e.id}>
              <div className="kicker">{e.campaign} · {e.region}</div>
              <h3>{e.name}</h3>
              <p className="note">{e.note}</p>
              <button
                type="button"
                className="chip"
                onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'collectible'))}
              >
                Mark
              </button>
            </article>
          ))}
        </div>
      </Collapsed>
    </>
  )
}

export function Guides() {
  const { query } = useWorkspace()
  const [corpus, setCorpus] = useState<Corpus | null>(null)
  const q = query.trim()
  // A short query is a search; anything else browses one corpus at a time.
  const searching = q.length >= 3
  const purpose =
    sectionMeta('library').subs.find((s) => s.id === 'guides')?.purpose ??
    'Mechanics, guides, recipes, secrets, dialogue and wiki.'

  return (
    <div className="codex-wrap guides-page">
      {!searching && (
        <Card title="Guides & mechanics" subtitle={purpose}>
          <div className="opts">
            {corpus && (
              <Chip on onClick={() => setCorpus(null)}>
                All guides
              </Chip>
            )}
            {CORPORA.map((c) => (
              <Chip key={c.id} on={corpus === c.id} onClick={() => setCorpus(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <MechanicsSection query={searching ? query : ''} />

      {searching ? (
        <>
          <GuidesSection query={query} />
          <RecipesSection query={query} />
          <SecretsSection query={query} />
          <DialogueBySpeaker query={query} />
          <DialogueHits query={query} />
          <WikiTextSection query={query} />
        </>
      ) : corpus === 'guides' ? (
        <GuidesSection query="" browse />
      ) : corpus === 'recipes' ? (
        <RecipesSection query="" browse />
      ) : corpus === 'secrets' ? (
        <SecretsSection query="" browse />
      ) : corpus === 'dialogue' ? (
        <>
          <DialogueBySpeaker query="" browse />
          <DialogueHits query="" browse />
        </>
      ) : corpus === 'wiki' ? (
        <WikiTextSection query="" browse />
      ) : null}

      <ProgressionSection query={searching ? query : ''} />
    </div>
  )
}
