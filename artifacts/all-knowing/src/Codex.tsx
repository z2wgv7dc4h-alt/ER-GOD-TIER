import { useMemo, useState } from 'react'
import { codex } from './data/seed'
import { awesomeResources } from './knowledge/awesome'
import { fieldHunts } from './knowledge/completion'
import { applyFacts } from './lib/infer'
import { loot } from './knowledge/loot'
import { useArmory, useHunts } from './lib/armory'
import { matchOpen, useOpenData } from './lib/openData'
import { buildChestFacts, matchChests, useGraceRegions } from './lib/chestFacts'
import { matchCoords, useCoords } from './lib/coords'
import { matchGuide, useGuide } from './lib/guide'
import { achievementProgress } from './lib/achievements'
import { conditionalUnlocks, stockForVendor } from './knowledge/merchantConditions'
import { flaskUpgrades, mapFragments, scadutreeFragments } from './knowledge/collectibles'
import { npcDisplayCards } from './knowledge/npc-display'
import { iconFor } from './lib/sourcePack'
import { useWorkspace } from './state'

export function CodexWorkspace() {
  const { query, setSelectedMarkerId, setModule, character, setCharacter } = useWorkspace()
  const { weapons, bosses } = useArmory()
  const hunts = useHunts()
  const open = useOpenData()
  const coordRows = useCoords()
  const guide = useGuide()
  const regions = useGraceRegions()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const q = query.trim().toLowerCase()
  const guideHits = q.length >= 3 ? matchGuide(q, guide.items, guide.legs) : { items: [], legs: [] }
  const openHits = q.length >= 3 ? matchOpen(q, open.names, open.areas, open.shops, open.ashes, open.spells, open.lots, open.extra) : []
  const coordHits = q.length >= 3 ? matchCoords(q, coordRows) : []
  const chests = useMemo(() => buildChestFacts(open.lots, regions), [open.lots, regions])
  const chestHits = q.length >= 3 ? matchChests(q, chests) : []
  const achievements = useMemo(
    () => achievementProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const conditionalHits = useMemo(() => {
    const rows = conditionalUnlocks.map((u) => ({ ...u, items: stockForVendor(u.vendor) }))
    if (!q) return rows
    return rows.filter((u) =>
      `${u.soldBy} ${u.vendor} ${u.trigger} ${u.note} ${u.items.join(' ')}`.toLowerCase().includes(q),
    )
  }, [q])
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
  const npcModelNotes = useMemo(
    () => npcDisplayCards.filter((e) => !q || `${e.name} ${e.modelId}`.toLowerCase().includes(q)).slice(0, 12),
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
      {chestHits.length > 0 && (
        <>
          <h3 className="codex-head">Chests &amp; pickups · {chests.length} real facts from world-lots</h3>
          <div className="codex-grid">
            {chestHits.map((c) => (
              <article className="card" key={c.id}>
                <div className="kicker">{c.region || c.map} · {c.map} · {c.x.toFixed(1)}, {c.y.toFixed(1)}, {c.z.toFixed(1)}</div>
                <h3>{c.items.join(' · ')}</h3>
                <p className="note">
                  {c.category}{c.catalogIds.length ? ` · catalog ${c.catalogIds.join(', ')}` : ' · no catalog match'} · flag {c.flag}
                </p>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setCharacter(applyFacts(character, c.catalogIds.length ? c.catalogIds : [c.id], 'answer', `chest ${c.region || c.map}`))}
                >
                  Log items
                </button>
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
      <h3 className="codex-head">
        Achievement sets ·{' '}
        {achievements.map((p) => `${p.name} ${p.done}/${p.total}`).join(' · ')}
      </h3>
      {guide.items.length === 0 && <p className="note" style={{ padding: '0 20px' }}>Loading guide catalog…</p>}
      {achievements.map((set) => {
        const left = set.remaining.filter((r) => !q || `${r.name} ${r.how}`.toLowerCase().includes(q))
        if (q && left.length === 0) return null
        const open = expanded[set.id]
        const shown = open ? left : left.slice(0, 12)
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
            {left.length > 12 && (
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
      <h3 className="codex-head">
        Merchant conditionals · {conditionalHits.length} of {conditionalUnlocks.length}
      </h3>
      <p className="note" style={{ padding: '0 20px' }}>
        “What does X sell after I give Y.” Stock stays in the merchant table; this is the unlock condition.
      </p>
      <div className="codex-grid">
        {(expanded['merchant-conditional'] ? conditionalHits : conditionalHits.slice(0, 12)).map((u) => (
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
      {conditionalHits.length > 12 && (
        <button
          type="button"
          className="chip"
          style={{ margin: '0 20px' }}
          onClick={() => setExpanded((cur) => ({ ...cur, 'merchant-conditional': !cur['merchant-conditional'] }))}
        >
          {expanded['merchant-conditional'] ? 'Show fewer' : `Show all ${conditionalHits.length}`}
        </button>
      )}
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
        {(hunts.length ? hunts : fieldHunts.map((e) => ({ ...e, flag: 0 }))).filter((e) => !q || `${e.name} ${e.region} ${(e as {place?: string}).place || ''}`.toLowerCase().includes(q)).slice(0, 16).map((e) => (
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
      <h3 className="codex-head">NPC model notes · cosmetic</h3>
      <p className="note" style={{ padding: '0 20px' }}>
        Player-model level and stat allocation from the EanNewton sheet. Display flavor only —
        not enemy absorb, resistances, or damage. See docs/REVIEW.md.
      </p>
      <div className="codex-grid">
        {npcModelNotes.map((e) => (
          <article className="card" key={e.id}>
            <div className="kicker">Model notes · NPC {e.modelId} · Lv {e.level}</div>
            <h3>{e.name}</h3>
            <p className="note">
              VIG {e.stats.vigor} · MND {e.stats.mind} · END {e.stats.endurance} · STR {e.stats.strength} · DEX {e.stats.dexterity} · INT {e.stats.intelligence} · FAI {e.stats.faith} · ARC {e.stats.arcane}
            </p>
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
