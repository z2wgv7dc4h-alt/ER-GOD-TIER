import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { mechanics, type MechanicCard } from '../knowledge/mechanics'
import { awesomeResources, type AwesomeResource } from '../knowledge/awesome'
import { GuidesSection } from '../PackData'
import { RecipesSection, SecretsSection, WikiTextSection } from '../CodexData'
import { DialogueHits, DialogueBySpeaker } from '../Dialogue'
import { EntityLink } from '../EntityLink'
import { PlayerTips } from '../PlayerTip'
import { ShowMore } from '../ShowMore'
import { sectionMeta } from '../lib/sections'
import { tipsByKind, tipsFor } from '../lib/playerTips'
import { listWikiPages, type WikiPageRow } from '../lib/wikiSearch'
import { useWorkspace } from '../state'
import { Card, Chip } from '../ui'
import { WikiSearchResults } from './WikiSearchResults'

/**
 * Task 117 — Library › Guides.
 *
 * Guides is where the long-form reference lives: the mechanics cards plus the
 * guides / recipes / secrets / dialogue / wiki corpora that used to be unique to
 * `LegacyCodex` (which this replaces). It is a browse surface first — pick a
 * corpus — and a filter surface when the header search has a query.
 */

type Corpus = 'guides' | 'recipes' | 'secrets' | 'dialogue' | 'wiki' | 'resources'

const CORPORA: { id: Corpus; label: string }[] = [
  { id: 'guides', label: 'Guides' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'secrets', label: 'Secrets' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'wiki', label: 'Wiki' },
  { id: 'resources', label: 'Resources' },
]

const RESOURCE_SECTIONS: { id: AwesomeResource['section']; label: string }[] = [
  { id: 'tools', label: 'Tools' },
  { id: 'lore', label: 'Lore' },
  { id: 'youtube', label: 'Video' },
  { id: 'community', label: 'Community' },
  { id: 'assets', label: 'Data & assets' },
]

/**
 * Community tools and references (EanNewton's Awesome Elden Ring Resources,
 * `knowledge/awesome.ts`) — the external sites people actually use alongside
 * the game. Links open in a new tab.
 */
function ResourcesSection({ query }: { query: string }) {
  const q = query.trim().toLowerCase()
  const rows = awesomeResources.filter((r) => !q || `${r.name} ${r.blurb} ${r.by ?? ''} ${r.role}`.toLowerCase().includes(q))
  if (!rows.length) return null
  return (
    <Card title="Community resources" subtitle="Tools, lore channels and references players use alongside the game.">
      {RESOURCE_SECTIONS.map((section) => {
        const list = rows.filter((r) => r.section === section.id)
        if (!list.length) return null
        return (
          <div key={section.id} className="lib-panel-block">
            <div className="kicker">{section.label}</div>
            <ul className="area-list">
              {list.map((r) => (
                <li key={r.id}>
                  <a href={r.href} target="_blank" rel="noreferrer noopener">{r.name}</a>
                  {r.by ? <span className="note"> · {r.by}</span> : null}
                  <div className="note">{r.blurb}</div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </Card>
  )
}

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
              {/* Task 195 §2 — a mechanic's curated player tips sit in its own
                  card, same styling as the numbers above. */}
              <PlayerTips tips={tipsFor(m.id, 'mechanic')} />
            </Card>
          )
        })}
      </div>
      <ShowMore total={cards.length} shown={limit} onMore={() => setLimit((n) => n + 12)} />
    </Collapsed>
  )
}

/**
 * Task 195 §2 — the leftover "general" tips, which have no single entity page,
 * are listed under Guides with the same tag.
 */
function GeneralTipsSection() {
  const tips = tipsByKind('general')
  if (!tips.length) return null
  return (
    <Collapsed title="Player tips" count={tips.length}>
      <PlayerTips tips={tips} />
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

const WIKI_KINDS = [
  { id: 'faction', label: 'Factions' },
  { id: 'lore', label: 'Lore' },
  { id: 'mechanic', label: 'Mechanics' },
  { id: 'region', label: 'Locations' },
  { id: 'npc', label: 'Characters' },
  { id: 'boss', label: 'Bosses' },
  { id: 'enemy', label: 'Enemies' },
  { id: 'dungeon', label: 'Dungeons' },
  { id: 'item', label: 'Items' },
  { id: 'spell', label: 'Spells' },
]

/**
 * Task 133 §3 — "Search the wiki" plus browse-by-category. Full-text search is
 * the exported corpus; the categories are the wiki's own kind classification.
 */
function WikiBrowser() {
  const w = useWorkspace()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string | null>(null)
  const [pages, setPages] = useState<WikiPageRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!kind) {
      setPages([])
      return
    }
    let cancelled = false
    setLoading(true)
    void listWikiPages(kind).then((rows) => {
      if (cancelled) return
      setPages(rows.slice(0, 80))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [kind])

  return (
    <Card title="Search the wiki" subtitle="Every word of the Fandom snapshot — factions, lore, mechanics, locations and more.">
      <div className="opts">
        <input
          className="search wiki-search-box"
          type="search"
          value={q}
          placeholder="e.g. frenzied flame proscription, how to get to Mohgwyn…"
          aria-label="Search the wiki"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="opts">
        {WIKI_KINDS.map((option) => (
          <Chip key={option.id} on={kind === option.id} onClick={() => setKind(kind === option.id ? null : option.id)}>
            {option.label}
          </Chip>
        ))}
      </div>
      {q.trim().length >= 3 ? (
        <WikiSearchResults query={q} onPick={(id) => w.openEntity(id)} heading="Wiki search" />
      ) : kind ? (
        <div className="wiki-browse">
          {loading ? (
            <p className="note">Loading…</p>
          ) : pages.length ? (
            pages.map((page) => (
              <button key={page.id} type="button" className="wiki-result" onClick={() => w.openEntity(page.entityId)}>
                <header>
                  <strong>{page.title}</strong>
                  <span className="note"> · {page.sections} sections</span>
                </header>
              </button>
            ))
          ) : (
            <p className="note">No pages in this category.</p>
          )}
        </div>
      ) : (
        <p className="note">Type a question, or pick a category to browse.</p>
      )}
    </Card>
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

      {!searching && <WikiBrowser />}

      <MechanicsSection query={searching ? query : ''} />

      {!searching && <GeneralTipsSection />}

      {searching ? (
        <>
          <GuidesSection query={query} />
          <RecipesSection query={query} />
          <SecretsSection query={query} />
          <DialogueBySpeaker query={query} />
          <DialogueHits query={query} />
          <WikiTextSection query={query} />
          <ResourcesSection query={query} />
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
      ) : corpus === 'resources' ? (
        <ResourcesSection query="" />
      ) : null}
    </div>
  )
}
