import { markers } from '../data/seed'
import { scadutreeFragments } from '../knowledge/collectibles'
import { canonicalHunts } from '../knowledge/completion'
import { warpGraces } from '../knowledge/graces'
import { allLines } from '../knowledge/storylines'
import { summarize } from '../lib/infer'
import { sourceLabel } from '../lib/sourceLabel'
import { Recents, StatEdit, softCapMark } from '../QoL'
import { factState, useWorkspace } from '../state'
import { WorldRibbon } from './WorldRibbon'

function Meter({ label, have, total }: { label: string; have: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((have / total) * 100)) : 0
  return (
    <div className="meter">
      <label>
        <span>{label}</span>
        <span>{have}/{total}</span>
      </label>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function CharacterCard() {
  const { character, go, setSelectedMarkerId, setModule } = useWorkspace()
  const s = character.stats
  const tot = summarize(character)
  const recent = [...character.evidence].slice(-3).reverse()
  return (
    <section className="char-card">
      <div className="char-card-head">
        <div className="label">{sourceLabel(character)}</div>
        <button
          type="button"
          className="chip"
          title="Add a save or screenshot"
          onClick={() => go('me', 'update')}
        >
          Update
        </button>
      </div>
      <h2>{character.name}</h2>
      <div className="meta">
        Lv. {character.level} · {character.startingClass.replace('-', ' ')}
        {typeof character.answers.gideonGoal === 'string' && (
          <> · {allLines.find((l) => l.id === character.answers.gideonGoal)?.name ?? character.answers.gideonGoal}</>
        )}
      </div>
      <div className="stats">
        <div><span>Vig</span> <strong>{s.vigor}{softCapMark('vigor', s.vigor)}</strong></div>
        <div><span>Mnd</span> <strong>{s.mind}{softCapMark('mind', s.mind)}</strong></div>
        <div><span>End</span> <strong>{s.endurance}{softCapMark('endurance', s.endurance)}</strong></div>
        <div><span>Str</span> <strong>{s.strength}{softCapMark('strength', s.strength)}</strong></div>
        <div><span>Dex</span> <strong>{s.dexterity}{softCapMark('dexterity', s.dexterity)}</strong></div>
        <div><span>Int</span> <strong>{s.intelligence}{softCapMark('intelligence', s.intelligence)}</strong></div>
        <div><span>Fth</span> <strong>{s.faith}{softCapMark('faith', s.faith)}</strong></div>
        <div><span>Arc</span> <strong>{s.arcane}{softCapMark('arcane', s.arcane)}</strong></div>
      </div>
      <div className="tally">
        <span>{tot.graces} graces</span>
        <span>{tot.bosses} bosses</span>
        <span>{tot.items} items</span>
      </div>
      {recent.map((e) => (
        <button
          key={e.id}
          type="button"
          className="chip"
          style={{ marginTop: 4 }}
          onClick={() => { setSelectedMarkerId(e.fact); setModule('map') }}
        >
          {e.fact.replace(/^[a-z]+:/, '')}
        </button>
      ))}
    </section>
  )
}

export function MeOverview() {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const graces = new Set(character.discoveredGraces)
  const bosses = new Set(character.defeatedBosses)
  const items = new Set(character.collectedItems)
  const totalBosses = markers.filter((m) => m.kind === 'boss').length
  const totalItems = markers.filter((m) => m.kind === 'item').length
  // Task 92 row 4: the full completion picture — graces, bosses, items,
  // fragments and field hunts — from the same collections the rest of the app
  // uses. Field hunts are the canonical `hunts.json` ids (deduped across spawns).
  const fragmentIds = scadutreeFragments.map((f) => f.id)
  const fragmentsHave = fragmentIds.filter((id) => character.collectedItems.includes(id)).length
  const huntIds = [...new Set(canonicalHunts.map((h) => h.id))]
  const huntsHave = huntIds.filter((id) => factState(character, id) === 'true').length
  return (
    <div className="me-overview">
      <WorldRibbon />
      <CharacterCard />
      <StatEdit />
      <section className="panel">
        <div className="kicker">Progress</div>
        <div className="meters">
          <Meter label="Graces" have={graces.size} total={warpGraces.length} />
          <Meter label="Bosses" have={bosses.size} total={totalBosses} />
          <Meter label="Items found" have={items.size} total={totalItems} />
          <Meter label="Fragments" have={fragmentsHave} total={fragmentIds.length} />
          <Meter label="Field hunts" have={huntsHave} total={huntIds.length} />
        </div>
        <div className="opts" style={{ marginTop: 12 }}>
          <button type="button" className="chip" onClick={() => { setSelectedMarkerId(null); setModule('map') }}>
            Open the map
          </button>
        </div>
      </section>
      <Recents />
    </div>
  )
}
