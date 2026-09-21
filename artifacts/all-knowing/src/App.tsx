import { useEffect, useMemo, useRef, useState } from 'react'
import { demoCharacter, markers, quests, codex } from './data/seed'
import { awesomeResources } from './knowledge/awesome'
import {
  characterFromEngine,
  fetchEngineMarkers,
  shownEngineCharacter,
  subscribeEngine,
} from './lib/mapEngine'
import { mergeCharacter } from './lib/merge'
import { ingestSave } from './lib/save'
import { AtlasWorkspace } from './Atlas'
import { FirstSit } from './FirstSit'
import { Gideon } from './Gideon'
import { fieldHunts } from './knowledge/completion'
import { leftovers } from './lib/leftovers'
import { applyFacts, summarize } from './lib/infer'
import { worldBanners } from './lib/worldState'
import { opBuilds } from './knowledge/builds'
import { loot } from './knowledge/loot'
import { useArmory, useHunts } from './lib/armory'
import { matchOpen, useOpenData } from './lib/openData'
import { matchCoords, useCoords } from './lib/coords'
import { matchGuide, useGuide } from './lib/guide'
import { flaskUpgrades, mapFragments, scadutreeFragments } from './knowledge/collectibles'
import { iconFor } from './lib/sourcePack'
import { CommandHits, PacketBar, SitToggle, softCapMark, useClipboardShots, useHotkeys } from './QoL'
import { allLines } from './knowledge/storylines'
import { ReckonWorkspace } from './Reckon'
import { Thread } from './Thread'
import { WorkspaceProvider, isCollected, useWorkspace } from './state'
import { art } from './art'
import type { Character, MapMarker, ModuleId, Stats } from './types'

const modules: { id: ModuleId; label: string }[] = [
  { id: 'reckon', label: 'Reckoning' },
  { id: 'map', label: 'Atlas' },
  { id: 'build', label: 'Build lab' },
  { id: 'quests', label: 'Quest graph' },
  { id: 'codex', label: 'Codex' },
]

const layerOrder: MapMarker['kind'][] = ['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon']

function EngineBridge() {
  const w = useWorkspace()
  const characterRef = useRef(w.character)
  characterRef.current = w.character
  useEffect(() => {
    let cancelled = false
    void fetchEngineMarkers()
      .then((list) => { if (!cancelled) w.setEngineMarkers(list) })
      .catch(() => { /* engine not up yet */ })
    const stop = subscribeEngine(
      (state) => {
        w.setEngineState(state)
        const shown = shownEngineCharacter(state)
        if (shown) {
          w.setCharacter(mergeCharacter(characterRef.current, characterFromEngine(shown, state.savePath)))
        }
      },
      w.setEngineStatus,
    )
    return () => {
      cancelled = true
      stop()
    }
    // Subscribe once for the life of the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function AppShell() {
  const w = useWorkspace()
  useHotkeys()
  useClipboardShots()
  return (
    <div className={w.sitMode ? 'app sit' : 'app'}>
      <EngineBridge />
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <h1>All-Knowing</h1>
            <p>All things conjoined</p>
          </div>
        </div>
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.id} className={w.module === m.id ? 'active' : ''} onClick={() => w.setModule(m.id)}>
              <img src={art.room[m.id]} alt="" />
              {m.label}
            </button>
          ))}
        </nav>
        <CharacterCard />
        <PacketBar />
        <SaveDrop />
      </aside>
      <main className="workspace">
        <header className="topbar">
          <h2>{modules.find((m) => m.id === w.module)?.label}</h2>
          <input
            className="search"
            placeholder="Search · / Ctrl+K · 1–5 rooms · S sit · paste shot"
            value={w.query}
            onChange={(e) => w.setQuery(e.target.value)}
          />
          {w.module === 'map' && (
            <div className="toggles">
              <button className={w.missingOnly ? 'chip on' : 'chip'} onClick={() => w.setMissingOnly(!w.missingOnly)}>
                Missing only
              </button>
              {layerOrder.map((id) => (
                <button key={id} className={w.layers[id] ? 'chip on' : 'chip'} onClick={() => w.toggleLayer(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
          <SitToggle />
        </header>
        <WorldRibbon />
        <CommandHits />
        <div className="stage">
          <FirstSit />
          {w.module === 'reckon' && <ReckonWorkspace />}
          {w.module === 'map' && <AtlasWorkspace />}
          {w.module === 'build' && <BuildWorkspace />}
          {w.module === 'quests' && <QuestWorkspace />}
          {w.module === 'codex' && <CodexWorkspace />}
        </div>
      </main>
      <aside className="guide">
        <Gideon />
      </aside>
    </div>
  )
}

function WorldRibbon() {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const banners = worldBanners(character)
  const spoil = character.answers.spoil !== '0'
  const miss = spoil ? leftovers(character) : []
  if (!banners.length && !miss.length) return null
  return (
    <div className="world-ribbon">
      {banners.map((b) => (
        <span key={b.id} className={b.tone === 'warn' ? 'warn chip' : 'chip on'}>{b.text}</span>
      ))}
      {miss.slice(0, 2).map((e) => (
        <button key={e.id} type="button" className="chip" onClick={() => { if (e.grace) setSelectedMarkerId(e.grace); setModule('map') }}>
          Still in {e.region}: {e.name}
        </button>
      ))}
    </div>
  )
}

function CharacterCard() {
  const { character, engineStatus, setSelectedMarkerId, setModule } = useWorkspace()
  const s = character.stats
  const tot = summarize(character)
  const recent = [...character.evidence].slice(-3).reverse()
  return (
    <section className="char-card">
      <div className="label">
        {engineStatus === 'live'
          ? 'Map engine · live save'
          : engineStatus === 'connecting'
            ? 'Map engine · connecting'
            : character.source === 'empty'
              ? 'No save bound'
              : character.source === 'demo'
                ? 'Demo character'
                : 'Save (local)'}
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

function SaveDrop() {
  const { setCharacter, setModule } = useWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hot, setHot] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file?: File) {
    if (!file) return
    setError(null)
    try {
      const character = await ingestSave(file)
      setCharacter(character)
      setModule('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read save')
    }
  }

  return (
    <div
      className={hot ? 'drop hot' : 'drop'}
      onDragOver={(e) => { e.preventDefault(); setHot(true) }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHot(false)
        void onFile(e.dataTransfer.files[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sl2,.co2"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <div>
        .sl2 parsing is not available yet. PS5: use Reckoning — questions + screenshots.
        PC: run <code>npm run map</code> against a local install for live flags, or Load demo below.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <button className="ghost" type="button" onClick={() => inputRef.current?.click()}>Open save (not available yet)</button>
        <button
          className="ghost gold"
          type="button"
          onClick={() => {
            setCharacter(demoCharacter)
            setModule('map')
          }}
        >
          Load demo
        </button>
      </div>
      {error && <div className="warn" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}

function estimateAR(character: Character) {
  const weapon = character.loadout.find((s) => s.kind === 'armament')
  if (!weapon) return { ar: 0, poise: 0, load: 0, label: 'No armament' }
  const upgrade = weapon.upgrade ?? 0
  const dex = character.stats.dexterity
  const str = character.stats.strength
  const keen = weapon.affinity === 'Keen' ? 1.15 : 1
  const blood = weapon.affinity === 'Blood' ? 0.92 : 1
  const ar = Math.round((110 + upgrade * 12 + dex * 3.1 + str * 1.2) * keen * blood)
  const poise = 28 + (character.startingClass === 'heavy-knight' ? 49 : 8)
  const load = 48 + character.stats.endurance * 0.8
  return { ar, poise, load, label: `${weapon.name} +${upgrade} ${weapon.affinity ?? ''}`.trim() }
}

function BuildWorkspace() {
  const { character, setCharacter, setModule, setSelectedMarkerId } = useWorkspace()
  const preview = estimateAR(character)

  function patchStat(key: keyof Stats, value: number) {
    setCharacter({
      ...character,
      stats: { ...character.stats, [key]: Math.max(1, Math.min(99, value || 1)) },
    })
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Character sheet</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>Stats drive every other pane</h3>
        <p className="note">Change a number here and the atlas / quest advice still talk about the same person. Real AR will use Thomas Clark’s calculator + ERDB regulation data.</p>
        <div className="stat-grid">
          {(Object.keys(character.stats) as (keyof Stats)[]).map((key) => (
            <div className="stat" key={key}>
              <label htmlFor={key}>{key}</label>
              <input
                id={key}
                type="number"
                min={1}
                max={99}
                value={character.stats[key]}
                onChange={(e) => patchStat(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <div className="kicker" style={{ marginTop: 18 }}>OP kits</div>
        <div className="opts">
          {opBuilds.map((b) => (
            <button
              key={b.id}
              type="button"
              className="chip"
              onClick={() => setCharacter({ ...character, stats: b.stats, level: b.level, loadout: b.kit })}
            >
              {b.name}
            </button>
          ))}
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          Kits set stats and a shopping list. They do not invent AR. Locations are in the Codex and Gideon.
        </p>
        <div className="gear">
          {character.loadout.length === 0 && <p className="note">Load a save, an OP kit, or the demo character.</p>}
          {character.loadout.map((slot) => (
            <div className="gear-row" key={slot.id}>
              <em>{slot.kind}</em>
              <span>{slot.name}</span>
              <span>{slot.affinity ? `${slot.affinity} +${slot.upgrade ?? 0}` : ''}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="kicker">Against the next wall</div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 6 }}>{preview.label}</h3>
        <div className="meters" style={{ marginTop: 18 }}>
          <div className="meter">
            <label><span>Attack rating (sketch)</span><span>{preview.ar}</span></label>
            <div className="bar"><span style={{ width: `${Math.min(100, preview.ar / 9)}%` }} /></div>
          </div>
          <div className="meter">
            <label><span>Poise (sketch)</span><span>{preview.poise}</span></label>
            <div className="bar"><span style={{ width: `${Math.min(100, preview.poise)}%` }} /></div>
          </div>
          <div className="meter">
            <label><span>Equip load budget</span><span>{preview.load.toFixed(1)}</span></label>
            <div className="bar"><span style={{ width: `${Math.min(100, preview.load)}%` }} /></div>
          </div>
        </div>
        <p className="note" style={{ marginTop: 18 }}>
          Next boss still standing:{' '}
          {markers.find((m) => m.kind === 'boss' && !isCollected(character, m))?.name ?? 'None in seed data.'}
        </p>
        <button
          className="ghost gold"
          type="button"
          style={{ marginTop: 12 }}
          onClick={() => {
            const next = markers.find((m) => m.kind === 'boss' && !isCollected(character, m))
            if (!next) return
            setSelectedMarkerId(next.id)
            setModule('map')
          }}
        >
          Show on atlas
        </button>
      </section>
    </div>
  )
}

function QuestWorkspace() {
  const { character, setCharacter, query, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const [activeId, setActiveId] = useState(quests[0]?.id)
  const active = quests.find((q) => q.id === activeId) ?? quests[0]
  const filtered = quests.filter((q) => `${q.npc} ${q.summary}`.toLowerCase().includes(query.trim().toLowerCase()))

  function toggleStep(id: string) {
    const has = character.completedQuestSteps.includes(id)
    const step = active.steps.find((s) => s.id === id)
    if (!has && step?.lockout) {
      const ok = confirm(`This can lock a line:\n\n${step.lockout}\n\nMark it done anyway?`)
      if (!ok) return
    }
    setCharacter({
      ...character,
      completedQuestSteps: has
        ? character.completedQuestSteps.filter((s) => s !== id)
        : [...character.completedQuestSteps, id],
    })
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Lines that can break</div>
        <div className="quest-list" style={{ marginTop: 14 }}>
          {filtered.map((q) => {
            const done = q.steps.filter((s) => character.completedQuestSteps.includes(s.id)).length
            return (
              <button key={q.id} className={q.id === activeId ? 'quest active' : 'quest'} onClick={() => setActiveId(q.id)}>
                <header>
                  <strong>{q.npc}</strong>
                  <span className="note">{done}/{q.steps.length}</span>
                </header>
                <div className="note" style={{ marginTop: 6 }}>{q.campaign}{q.ending ? ' · ending' : ''}</div>
              </button>
            )
          })}
        </div>
      </section>
      <section className="panel">
        <div className="kicker">{active.campaign}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 8px' }}>{active.npc}</h3>
        <p className="note">{active.summary}</p>
        {selectedMarkerId && <Thread id={selectedMarkerId} onOpen={setSelectedMarkerId} />}
        <ul className="steps">
          {active.steps.map((step) => (
            <li key={step.id}>
              <input
                type="checkbox"
                checked={character.completedQuestSteps.includes(step.id)}
                onChange={() => toggleStep(step.id)}
              />
              <div>
                <div>{step.text}</div>
                {step.location && <div className="note">{step.location}</div>}
                {step.lockout && <div className="warn">{step.lockout}</div>}
                <button type="button" className="chip" onClick={() => setSelectedMarkerId(step.id)}>Thread</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function CodexWorkspace() {
  const { query, setSelectedMarkerId, setModule, character, setCharacter } = useWorkspace()
  const { weapons, bosses } = useArmory()
  const hunts = useHunts()
  const open = useOpenData()
  const coordRows = useCoords()
  const guide = useGuide()
  const q = query.trim().toLowerCase()
  const guideHits = q.length >= 3 ? matchGuide(q, guide.items, guide.legs) : { items: [], legs: [] }
  const openHits = q.length >= 3 ? matchOpen(q, open.names, open.areas, open.shops, open.ashes, open.spells, open.lots, open.extra) : []
  const coordHits = q.length >= 3 ? matchCoords(q, coordRows) : []
  const rows = useMemo(
    () => codex.filter((e) => `${e.name} ${e.category} ${e.snippet}`.toLowerCase().includes(q)),
    [q],
  )
  const sources = useMemo(
    () =>
      awesomeResources.filter((e) =>
        `${e.name} ${e.blurb} ${e.use} ${e.role}`.toLowerCase().includes(q),
      ),
    [q],
  )
  const drops = useMemo(
    () => loot.filter((e) => `${e.name} ${e.how} ${e.region} ${e.kind}`.toLowerCase().includes(q)),
    [q],
  )
  return (
    <div className="codex-wrap">
      {(guideHits.items.length > 0 || guideHits.legs.length > 0) && (
        <>
          <h3 className="codex-head">Guide · {guide.items.length} items · {guide.legs.length} legs</h3>
          <div className="codex-grid">
            {guideHits.items.map((e) => (
              <article className="card" key={e.id}>
                <div className="kicker">{e.category}{e.missable ? ' · missable' : ''}{e.quest ? ` · ${e.quest}` : ''}</div>
                <h3>{e.name}</h3>
                <p className="note">{e.how}</p>
                <button type="button" className="chip" onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'guide'))}>Log</button>
              </article>
            ))}
            {guideHits.legs.map((e) => (
              <article className="card" key={e.id}>
                <div className="kicker">{e.region}</div>
                <h3>{e.from} → {e.to}</h3>
                <p className="note">{e.summary}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {coordHits.length > 0 && (
        <>
          <h3 className="codex-head">Map pins · web coords</h3>
          <div className="codex-grid">
            {coordHits.map((e) => (
              <article className="card" key={e.id}>
                <div className="kicker">{e.world} · {e.x},{e.y}</div>
                <h3>{e.name}</h3>
                <p className="note">{e.how}</p>
                <button type="button" className="chip" onClick={() => { setModule('map'); setSelectedMarkerId(e.id) }}>Pin</button>
              </article>
            ))}
          </div>
        </>
      )}
      {openHits.length > 0 && (
        <>
          <h3 className="codex-head">Open dumps · {open.names.length} names</h3>
          <div className="codex-grid">
            {openHits.map((e) => (
              <article className="card" key={e.id}>
                <div className="kicker">{e.detail}</div>
                <h3>{e.name}</h3>
                <button type="button" className="chip" onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'open dump'))}>Log</button>
              </article>
            ))}
          </div>
        </>
      )}
      <h3 className="codex-head">Scadutree / map fragments</h3>
      <div className="codex-grid">
        {[...scadutreeFragments, ...mapFragments, ...flaskUpgrades].filter((e) => !q || `${e.name} ${e.region} ${e.note}`.toLowerCase().includes(q)).slice(0, 10).map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">{e.campaign} · {e.region}</div>
            <h3>{e.name}</h3>
            <p className="note">{e.note}</p>
            <button type="button" className="chip" onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'collectible'))}>Mark</button>
          </article>
        ))}
      </div>
      {q.length >= 2 && (
        <>
          <h3 className="codex-head">Armory</h3>
          <div className="codex-grid">
            {weapons.filter((e) => `${e.name} ${e.type} ${e.where} ${e.skill}`.toLowerCase().includes(q)).slice(0, 8).map((e) => (
              <article className="card" key={e.name}>
                <div className="kicker">{e.type}{e.dlc ? ' · DLC' : ''} · {e.skill}</div>
                <h3>{e.name}</h3>
                <p className="note">{e.where || 'Location in extract / wiki.'}</p>
              </article>
            ))}
            {bosses.filter((e) => `${e.name} ${e.region} ${e.notes}`.toLowerCase().includes(q)).slice(0, 4).map((e) => (
              <article className="card" key={e.name + String(e.phase)}>
                <div className="kicker">{e.type} · {e.region}{e.parryable ? ' · parryable' : ''}</div>
                <h3>{e.name}</h3>
                <p className="note">{e.notes || 'Remembrance / field boss.'}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <h3 className="codex-head">Hunts · {hunts.length || '…'} with flags</h3>
      <div className="codex-grid">
        {(hunts.length ? hunts : fieldHunts.map((e) => ({ ...e, place: '', flag: 0 }))).filter((e) => !q || `${e.name} ${e.region} ${(e as {place?: string}).place || ''}`.toLowerCase().includes(q)).slice(0, 16).map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">{e.campaign} · {e.region}{(e as {place?: string}).place ? ` · ${(e as {place: string}).place}` : ''}{(e as {flag?: number}).flag ? ` · flag ${(e as {flag: number}).flag}` : ''}</div>
            <h3>{e.name}</h3>
            <button
              type="button"
              className="chip"
              onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'field hunt'))}
            >
              Mark down
            </button>
          </article>
        ))}
      </div>
      <h3 className="codex-head">Locations</h3>
      <div className="codex-grid">
        {drops.map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">
              <img src={iconFor(e.name, 'item').url} alt="" style={{ width: 18, height: 18, verticalAlign: 'middle', marginRight: 6 }} />
              {e.kind} · {e.region} · {e.campaign}{e.missable ? ' · missable' : ''}
            </div>
            <h3>{e.name}</h3>
            <p className="note">{e.how}</p>
            {e.grace && (
              <button type="button" className="chip" onClick={() => { setSelectedMarkerId(e.grace!); setModule('map') }}>
                Open nearest grace
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="codex-grid">
        {rows.map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">{e.category} · {e.campaign}</div>
            <h3>{e.name}</h3>
            <p className="note">{e.snippet}</p>
          </article>
        ))}
      </div>
      <h3 className="codex-head">Awesome list — EanNewton</h3>
      <p className="note" style={{ padding: '0 20px' }}>
        Icons and stats are not copied out of Drive. Each entry has a job: extract locally first, use the dump to fill holes.
      </p>
      <div className="codex-grid">
        {sources.map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">{e.section} · {e.role}{e.by ? ` · ${e.by}` : ''}</div>
            <h3>{e.name}</h3>
            <p className="note">{e.blurb}</p>
            <p className="note">{e.use}</p>
            <p><a className="ext" href={e.href} target="_blank" rel="noreferrer">Open source</a></p>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  )
}
