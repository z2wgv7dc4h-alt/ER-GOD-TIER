import { useMemo, useState } from 'react'
import { codex } from './data/seed'
import { awesomeResources } from './knowledge/awesome'
import { byId, matchMany } from './knowledge/catalog'
import { fieldHunts } from './knowledge/completion'
import { applyFacts } from './lib/infer'
import { labelOf } from './lib/links'
import { loot } from './knowledge/loot'
import { useArmory, useHunts } from './lib/armory'
import { matchOpen, useOpenData } from './lib/openData'
import { buildChestFacts, matchChests, useGraceRegions } from './lib/chestFacts'
import { matchCoords, useCoords } from './lib/coords'
import { matchGuide, useGuide } from './lib/guide'
import { achievementProgress } from './lib/achievements'
import { blessingLine, blessingProgress } from './lib/blessings'
import { conditionalUnlocks, stockForVendor } from './knowledge/merchantConditions'
import { flaskUpgrades, mapFragments, scadutreeFragments } from './knowledge/collectibles'
import { techTips } from './knowledge/tech'
import { npcDisplayCards } from './knowledge/npc-display'
import { iconFor } from './lib/sourcePack'
import { fanImage } from './lib/fanImage'
import { Related } from './Related'
import { DialogueHits, DialogueBySpeaker } from './Dialogue'
import { WeaponStatsSection } from './WeaponStats'
import { EngineItemSection, ErclSection, MedusaSection, NpcPlacementSection, BossDropsSection, GuidesSection, MetaBuildsSection } from './PackData'
import { RecipesSection, SecretsSection, AcquisitionSection, QuestStepsSection, WikiTextSection } from './CodexData'
import { DungeonChecklist } from './Dungeon'
import { useWorkspace } from './state'
import { matchGatheringNodes, useGatheringNodes } from './lib/gatheringNodes'
import {
  matchAmmos,
  matchArmors,
  matchAshes,
  matchBosses,
  matchClasses,
  matchCreatures,
  matchEquipment,
  matchItems,
  matchLocations,
  matchNpcs,
  matchSpells,
  matchTalismans,
  useFanapiData,
} from './lib/fanapiData'

type RefRow = { key: string; kicker: string; name: string; note: string }

function RefSection({ title, count, rows }: { title: string; count: number; rows: RefRow[] }) {
  if (rows.length === 0) return null
  return (
    <>
      <h3 className="codex-head">{title} · {count} in reference</h3>
      <div className="codex-grid">
        {rows.map((r) => (
          <article className="card" key={r.key}>
            <div className="kicker">{r.kicker}</div>
            <h3>{r.name}</h3>
            {r.note && <p className="note">{r.note}</p>}
          </article>
        ))}
      </div>
    </>
  )
}

function CodexThumb({ name, aliases }: { name: string; aliases?: string[] }) {
  const src = fanImage(name, aliases)
  if (!src) return null
  return <img className="codex-thumb" src={src} alt="" loading="lazy" decoding="async" />
}

export function CodexWorkspace() {
  const { query, setSelectedMarkerId, setModule, character, setCharacter, selectedMarkerId } = useWorkspace()
  const { weapons, bosses } = useArmory()
  const hunts = useHunts()
  const open = useOpenData()
  const coordRows = useCoords()
  const guide = useGuide()
  const regions = useGraceRegions()
  const gatheringNodes = useGatheringNodes()
  const fan = useFanapiData()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const q = query.trim().toLowerCase()
  const selectedFact = selectedMarkerId ? byId.get(selectedMarkerId) : undefined
  const catalogHits = useMemo(() => (q.length >= 2 ? matchMany(query) : []), [q, query])
  const guideHits = q.length >= 3 ? matchGuide(q, guide.items, guide.legs) : { items: [], legs: [] }
  const openHits = q.length >= 3 ? matchOpen(q, open.names, open.areas, open.shops, open.ashes, open.spells, open.lots, open.extra) : []
  const coordHits = q.length >= 3 ? matchCoords(q, coordRows) : []
  const chests = useMemo(() => buildChestFacts(open.lots, regions), [open.lots, regions])
  const chestHits = q.length >= 3 ? matchChests(q, chests) : []
  const gatheringHits = q.length >= 3 ? matchGatheringNodes(q, gatheringNodes) : []
  const talismanHits = q.length >= 3 ? matchTalismans(q, fan.talismans) : []
  const spellHits = q.length >= 3 ? matchSpells(q, fan.spells) : []
  const ashHits = q.length >= 3 ? matchAshes(q, fan.ashes) : []
  const armorHits = q.length >= 3 ? matchArmors(q, fan.armors) : []
  const itemHits = q.length >= 3 ? matchItems(q, fan.items) : []
  const locationHits = q.length >= 3 ? matchLocations(q, fan.locations) : []
  const bossHits = q.length >= 3 ? matchBosses(q, fan.bosses) : []
  const creatureHits = q.length >= 3 ? matchCreatures(q, fan.creatures) : []
  const npcHits = q.length >= 3 ? matchNpcs(q, fan.npcs) : []
  const ammoHits = q.length >= 3 ? matchAmmos(q, fan.ammos) : []
  const classHits = q.length >= 3 ? matchClasses(q, fan.classes) : []
  const weaponHits = q.length >= 3 ? matchEquipment(q, fan.weapons) : []
  const shieldHits = q.length >= 3 ? matchEquipment(q, fan.shields) : []
  const referenceSections: { title: string; count: number; rows: RefRow[] }[] = [
    { title: 'Talismans', count: fan.talismans.length, rows: talismanHits.map((t) => ({ key: t.name, kicker: 'Talisman', name: t.name, note: t.effect })) },
    {
      title: 'Spells',
      count: fan.spells.length,
      rows: spellHits.map((s) => ({
        key: `${s.type}:${s.name}`,
        kicker: `${s.type} · ${s.cost} FP · ${s.slots} slot${s.slots === 1 ? '' : 's'}`,
        name: s.name,
        note: `Requires ${Object.entries(s.requires).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}. ${s.effect}`,
      })),
    },
    { title: 'Ashes of War', count: fan.ashes.length, rows: ashHits.map((a) => ({ key: a.name, kicker: a.affinity || 'Ash of War', name: a.name, note: a.skill ? `Skill: ${a.skill}` : '' })) },
    {
      title: 'Armor',
      count: fan.armors.length,
      rows: armorHits.map((a) => ({
        key: a.name,
        kicker: `${a.category} · poise ${a.poise} · ${a.weight} wt`,
        name: a.name,
        note: `Negation ${Object.entries(a.dmgNegation).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
      })),
    },
    { title: 'Items', count: fan.items.length, rows: itemHits.map((i) => ({ key: i.name, kicker: i.type || 'Item', name: i.name, note: i.effect })) },
    { title: 'Locations', count: fan.locations.length, rows: locationHits.map((l) => ({ key: l.name, kicker: l.region || 'Location', name: l.name, note: '' })) },
    {
      title: 'Bosses',
      count: fan.bosses.length,
      rows: bossHits.map((b) => ({ key: b.name, kicker: `${b.region || 'Boss'}${b.hp ? ` · ${b.hp} HP` : ''}`, name: b.name, note: b.drops.join(' · ') })),
    },
    { title: 'Field enemies', count: fan.creatures.length, rows: creatureHits.map((c) => ({ key: c.name, kicker: c.location || 'Enemy', name: c.name, note: c.drops.join(' · ') })) },
    { title: 'NPCs', count: fan.npcs.length, rows: npcHits.map((n) => ({ key: n.name, kicker: (n.role ?? '').trim() || 'NPC', name: n.name, note: n.location })) },
    { title: 'Ammunition', count: fan.ammos.length, rows: ammoHits.map((a) => ({ key: a.name, kicker: a.type || 'Ammo', name: a.name, note: a.passive })) },
    {
      title: 'Classes',
      count: fan.classes.length,
      rows: classHits.map((c) => ({
        key: c.name,
        kicker: `Level ${c.level}`,
        name: c.name,
        note: Object.entries(c.stats).filter(([k]) => k !== 'level').map(([k, v]) => `${k} ${v}`).join(' · '),
      })),
    },
    { title: 'Weapons · weight', count: fan.weapons.length, rows: weaponHits.map((w) => ({ key: w.name, kicker: `${w.category} · ${w.weight} wt`, name: w.name, note: '' })) },
    { title: 'Shields · weight', count: fan.shields.length, rows: shieldHits.map((s) => ({ key: s.name, kicker: `${s.category} · ${s.weight} wt`, name: s.name, note: '' })) },
  ]
  const achievements = useMemo(
    () => achievementProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const blessings = useMemo(
    () => blessingProgress(guide.items, character.collectedItems),
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
      {selectedMarkerId && (
        <article className="card codex-detail">
          <div className="kicker">
            Selected · {selectedFact ? `${selectedFact.kind} · ${selectedFact.region} · ${selectedFact.campaign}` : 'linked entity'}
          </div>
          <h3>{selectedFact?.name || labelOf(selectedMarkerId)}</h3>
          {selectedFact?.note && <p className="note">{selectedFact.note}</p>}
          <Related id={selectedMarkerId} />
          <div className="opts">
            <button type="button" className="chip" onClick={() => setSelectedMarkerId(null)}>Close</button>
          </div>
        </article>
      )}
      {catalogHits.length > 0 && (
        <>
          <h3 className="codex-head">Catalog · {catalogHits.length} cross-linked facts</h3>
          <div className="codex-grid">
            {catalogHits.slice(0, 12).map((f) => (
              <article className="card" key={f.id}>
                <div className="kicker">{f.kind} · {f.region} · {f.campaign}</div>
                <h3>{f.name}</h3>
                {f.note && <p className="note">{f.note}</p>}
                <Related id={f.id} />
                <div className="opts">
                  <button type="button" className="chip" onClick={() => setSelectedMarkerId(f.id)}>Open detail</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <DialogueBySpeaker query={query} />
      <DialogueHits query={query} />
      <WeaponStatsSection query={query} />
      <EngineItemSection query={query} />
      <ErclSection query={query} />
      <MedusaSection query={query} />
      <NpcPlacementSection query={query} />
      <BossDropsSection query={query} />
      <GuidesSection query={query} />
      <MetaBuildsSection query={query} />
      <RecipesSection query={query} />
      <SecretsSection query={query} />
      <AcquisitionSection query={query} />
      <QuestStepsSection query={query} />
      <WikiTextSection query={query} />
      {(guideHits.items.length > 0 || guideHits.legs.length > 0) && (
        <>
          <h3 className="codex-head">Guide · {guide.items.length} items · {guide.legs.length} legs</h3>
          <div className="codex-grid">
            {guideHits.items.map((e) => (
              <article className="card" key={e.id}>
                <CodexThumb name={e.name} />
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
                <CodexThumb name={e.name} />
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
      {gatheringHits.length > 0 && (
        <>
          <h3 className="codex-head">
            Gathering nodes · {gatheringNodes.length} placements — unverified placement, model code only
          </h3>
          <p className="note" style={{ padding: '0 20px' }}>
            Placement records for gathering-node assets (bushes, rocks, pots, etc.). The model code is
            generic (e.g. AEG099_821) and the dump carries no item field, so this is not a material
            location — it is not drawn on the Atlas and Gideon will not answer “where is X” from it.
            Search by region, map, or model.
          </p>
          <div className="codex-grid">
            {gatheringHits.slice(0, 20).map((n) => (
              <article className="card" key={n.id}>
                <div className="kicker">{n.world} · {n.region || n.map} · area {n.area}</div>
                <h3>{n.model}</h3>
                <p className="note">
                  {n.map} · x {n.x.toFixed(1)}, y {n.y.toFixed(1)}, z {n.z.toFixed(1)}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
      {referenceSections.map((s) => (
        <RefSection key={s.title} title={s.title} count={s.count} rows={s.rows} />
      ))}
      <h3 className="codex-head">Tips &amp; tech · {techTips.length}</h3>
      <p className="note" style={{ padding: '0 20px' }}>
        Real, structured tech — jump attacks, stance breaks, buff stacking, spirit ashes, items and
        PvP counters. Numeric values are quoted only where a source states them. Sources per card
        (Fextralife, patch 1.17). See docs/research/op-builds-pvp-tricks-sources.md.
      </p>
      <div className="codex-grid">
        {techTips
          .filter((e) => !q || `${e.name} ${e.category} ${e.what} ${e.tags.join(' ')}`.toLowerCase().includes(q))
          .map((e) => (
            <article className="card" key={e.id}>
              <div className="kicker">{e.category}{e.patch ? ' · patch-sensitive' : ''}</div>
              <h3>{e.name}</h3>
              <p className="note">{e.what} {e.why}</p>
              <p className="note">How: {e.how}</p>
              {e.patch && <p className="note">{e.patch}</p>}
              <p><a className="ext" href={e.source} target="_blank" rel="noreferrer">Source</a></p>
            </article>
          ))}
      </div>
      <h3 className="codex-head">Scadutree / map fragments</h3>
      <div className="codex-grid">
        {[...scadutreeFragments, ...mapFragments, ...flaskUpgrades].filter((e) => !q || `${e.name} ${e.region} ${e.note}`.toLowerCase().includes(q)).slice(0, 10).map((e) => (
          <article className="card" key={e.id}>
            <CodexThumb name={e.name} />
            <div className="kicker">{e.campaign} · {e.region}</div>
            <h3>{e.name}</h3>
            <p className="note">{e.note}</p>
            <button type="button" className="chip" onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'collectible'))}>Mark</button>
          </article>
        ))}
      </div>
      <h3 className="codex-head">
        Blessing meters · {blessings.map(blessingLine).join(' · ')}
      </h3>
      {blessings.map((p) => {
        const left = p.remaining.filter((r) => !q || `${r.name} ${r.how}`.toLowerCase().includes(q))
        if (q && left.length === 0) return null
        const open = expanded[p.id]
        const shown = open ? left : left.slice(0, 12)
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
                {p.level < p.thresholds.length - 1
                  ? `Next level at ${p.thresholds[p.level + 1]} ${p.unit}.`
                  : 'Max level.'}{' '}
                {p.incomplete ? `List incomplete in-repo (${p.listCount}/${p.total} rows). ` : ''}
                Source: {p.source}
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
            {left.length > 12 && (
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
      <DungeonChecklist />
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
                <CodexThumb name={e.name} />
                <div className="kicker">{e.type}{e.dlc ? ' · DLC' : ''} · {e.skill}</div>
                <h3>{e.name}</h3>
                <p className="note">{e.where || 'Location in extract / wiki.'}</p>
              </article>
            ))}
            {bosses.filter((e) => `${e.name} ${e.region} ${e.notes}`.toLowerCase().includes(q)).slice(0, 4).map((e) => (
              <article className="card" key={e.name + String(e.phase)}>
                <CodexThumb name={e.name} />
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
            <CodexThumb name={e.name} />
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
            <CodexThumb name={e.name} aliases={e.aliases} />
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
            <Related id={e.id} />
          </article>
        ))}
      </div>
      <div className="codex-grid">
        {rows.map((e) => (
          <article className="card" key={e.id}>
            <CodexThumb name={e.name} />
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
