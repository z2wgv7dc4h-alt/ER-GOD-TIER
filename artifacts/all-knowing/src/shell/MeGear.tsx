import { useEffect, useMemo, useState } from 'react'
import { EntityPanel } from '../library/EntityPanel'
import { useLibraryCatalog } from '../library/catalog'
import { findWeapon, loadWeapons, attackRatingForSlot, type Weapon } from '../lib/ar'
import {
  arrangeLoadout,
  clearSlot,
  equipLoad,
  equipSlot,
  GEAR_SLOTS,
  gearSlotMeta,
  ownedInventory,
  pickerCandidates,
  slotFromEntity,
  type GearSlotGroup,
} from '../lib/gearSheet'
import { applyFacts, denyFacts } from '../lib/infer'
import type { LibraryEntity } from '../library/model'
import { Term } from '../peek/Term'
import { useWorkspace } from '../state'
import type { GearSlot, LoadoutSlot } from '../types'

/**
 * Task 94 — the Gear sheet. Equipped weapons (L/R ×3) with AR at the current
 * stats, armor ×4 with weight/poise and equip-load %, talismans ×4 and spells,
 * then the Owned inventory grouped and searchable. Every item opens the shared
 * entity panel (Task 95); an empty slot opens a picker and updates `loadout`.
 */

const GROUPS: { id: GearSlotGroup; label: string }[] = [
  { id: 'armament', label: 'Armaments' },
  { id: 'armor', label: 'Armor' },
  { id: 'talisman', label: 'Talismans' },
  { id: 'spell', label: 'Spells' },
]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

function statNumber(entity: LibraryEntity | undefined, label: string): number {
  const row = entity?.stats?.find((s) => s.label.toLowerCase() === label.toLowerCase())
  if (!row) return 0
  const n = Number.parseFloat(row.value)
  return Number.isFinite(n) ? n : 0
}

export function MeGear() {
  const { character, setCharacter } = useWorkspace()
  const catalog = useLibraryCatalog('items')
  const [weapons, setWeapons] = useState<Weapon[]>([])
  const [selected, setSelected] = useState<LibraryEntity | null>(null)
  const [pickerSlot, setPickerSlot] = useState<GearSlot | null>(null)
  const [pickerQuery, setPickerQuery] = useState('')
  const [ownedQuery, setOwnedQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => { if (!cancelled) setWeapons(rows) })
      .catch(() => { /* regulation data unavailable — AR simply hides */ })
    return () => { cancelled = true }
  }, [])

  const byName = useMemo(() => {
    const map = new Map<string, LibraryEntity>()
    for (const e of catalog.entities) map.set(norm(e.name), e)
    return map
  }, [catalog.entities])

  const arranged = useMemo(() => arrangeLoadout(character.loadout), [character.loadout])

  function entityFor(slot: LoadoutSlot): LibraryEntity | undefined {
    return catalog.entities.find((e) => e.factId === slot.id) ?? byName.get(norm(slot.name))
  }

  function arFor(slot: LoadoutSlot): { now: number; max: number } | null {
    if (!weapons.length) return null
    const now = attackRatingForSlot(weapons, slot, character.stats, false)
    if (now.status !== 'ok') return null
    const weapon = findWeapon(weapons, slot)
    const maxLevel = weapon ? Math.max(0, weapon.attack.length - 1) : (slot.upgrade ?? 0)
    const max = attackRatingForSlot(weapons, { ...slot, upgrade: maxLevel }, character.stats, false)
    return { now: now.total, max: max.status === 'ok' ? max.total : now.total }
  }

  const totals = useMemo(() => {
    let weight = 0
    let poise = 0
    for (const meta of GEAR_SLOTS) {
      const slot = arranged[meta.id]
      if (!slot) continue
      const entity = catalog.entities.find((e) => e.factId === slot.id) ?? byName.get(norm(slot.name))
      weight += entity?.weight ?? 0
      if (meta.group === 'armor') poise += statNumber(entity, 'Poise')
    }
    return { weight: Math.round(weight * 10) / 10, poise }
  }, [arranged, byName, catalog.entities])

  const load = equipLoad(totals.weight, character.stats.endurance)
  const owned = useMemo(() => ownedInventory(catalog.entities, character, ownedQuery), [catalog.entities, character, ownedQuery])

  function choose(entity: LibraryEntity) {
    if (!pickerSlot) return
    const previous = arranged[pickerSlot]
    setCharacter({ ...character, loadout: equipSlot(character.loadout, pickerSlot, slotFromEntity(entity, pickerSlot), previous) })
    setPickerSlot(null)
    setPickerQuery('')
  }

  function panelAr(entity: LibraryEntity): { now: number; max: number } | null {
    if (!weapons.length || !entity.weaponName) return null
    return arFor({ id: entity.factId, name: entity.weaponName, kind: 'armament' })
  }

  return (
    <div className="me-gear">
      <header className="gear-head">
        <h2 className="shell-page-title">Gear</h2>
        <div className="gear-load">
          <span><Term id="mechanic:equip-load">Equip load</Term></span>
          <strong>{totals.weight.toFixed(1)} / {load.max.toFixed(1)}</strong>
          <span className={`chip${load.loadClass === 'light' ? ' on' : ''}`}>{load.pct}% · {load.loadClass}</span>
        </div>
        <div className="gear-totals">
          <span>Weight {totals.weight.toFixed(1)}</span>
          <span><Term id="mechanic:poise">Poise</Term> {totals.poise}</span>
        </div>
      </header>

      {GROUPS.map((group) => (
        <section className="panel gear-group" key={group.id}>
          <div className="kicker">{group.label}</div>
          <div className="gear-slots">
            {GEAR_SLOTS.filter((m) => m.group === group.id).map((meta) => {
              const slot = arranged[meta.id]
              const entity = slot ? entityFor(slot) : undefined
              const ar = slot && meta.group === 'armament' ? arFor(slot) : null
              return (
                <div key={meta.id} className={slot ? 'gear-slot filled' : 'gear-slot'}>
                  {slot ? (
                    <>
                      <div className="gear-slot-label">{meta.label}</div>
                      <button type="button" className="gear-item" onClick={() => entity && setSelected(entity)}>
                        <strong>{slot.name}</strong>
                        {slot.upgrade ? <span className="note"> +{slot.upgrade}</span> : null}
                      </button>
                      <div className="note">
                        {meta.group === 'armament' &&
                          (ar ? (
                            <>
                              <Term id="mechanic:attack-rating">AR</Term> {ar.now} (max {ar.max})
                            </>
                          ) : (
                            'AR —'
                          ))}
                        {meta.group === 'armor' && (
                          <>
                            wt {entity?.weight ?? 0} · <Term id="mechanic:poise">poise</Term> {statNumber(entity, 'Poise')}
                          </>
                        )}
                      </div>
                      <div className="opts">
                        <button type="button" className="chip" aria-label={`Change ${meta.label}`} onClick={() => { setPickerSlot(meta.id); setPickerQuery('') }}>Change</button>
                        <button type="button" className="chip" aria-label={`Clear ${meta.label}`} onClick={() => setCharacter({ ...character, loadout: clearSlot(character.loadout, meta.id, slot) })}>Clear</button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="gear-empty"
                      aria-label={`Equip ${meta.label}`}
                      onClick={() => { setPickerSlot(meta.id); setPickerQuery('') }}
                    >
                      <span className="gear-empty-name">{meta.label}</span>
                      <span className="gear-empty-cta">Equip</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="panel gear-owned">
        <div className="kicker">Owned</div>
        <input
          className="search"
          style={{ width: '100%' }}
          placeholder="Search owned items…"
          aria-label="Search owned items"
          value={ownedQuery}
          onChange={(e) => setOwnedQuery(e.target.value)}
        />
        {owned.length === 0 && <p className="note">Nothing owned yet — read an inventory page in Setup.</p>}
        {owned.map((group) => (
          <details key={group.category} className="gear-owned-group" open>
            <summary>{group.label} · {group.count}</summary>
            <ul className="list">
              {group.items.map((entity) => (
                <li key={entity.id}>
                  <button type="button" className="chip" onClick={() => setSelected(entity)}>{entity.name}</button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {selected && (
        <div className="gear-panel-wrap">
          <EntityPanel
            entity={selected}
            character={character}
            ar={panelAr(selected)}
            onClose={() => setSelected(null)}
            onOwnedChange={(isOwnedNow) =>
              setCharacter(
                isOwnedNow
                  ? applyFacts(character, [selected.factId], 'answer', 'gear sheet')
                  : denyFacts(character, [selected.factId], 'gear sheet'),
              )
            }
            onEquip={() => {
              const target = GEAR_SLOTS.find((m) => m.categories.includes(selected.category) && !arranged[m.id])
              if (target) {
                setPickerSlot(target.id)
                setPickerQuery('')
                setSelected(null)
              }
            }}
          />
        </div>
      )}

      {pickerSlot && (
        <div className="gear-picker" role="dialog" aria-label={`Choose ${gearSlotMeta(pickerSlot).label}`}>
          <div className="gear-picker-box">
            <header>
              <strong>{gearSlotMeta(pickerSlot).label}</strong>
              <button type="button" className="chip" onClick={() => setPickerSlot(null)}>Close</button>
            </header>
            <input
              className="search"
              style={{ width: '100%' }}
              autoFocus
              placeholder="Search owned first, then everything…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
            />
            <ul className="list gear-picker-list">
              {pickerCandidates(catalog.entities, character, pickerSlot)
                .filter((e) => (pickerQuery ? e.name.toLowerCase().includes(pickerQuery.toLowerCase()) : true))
                .slice(0, 60)
                .map((entity) => {
                  const isOwned = character.collectedItems.includes(entity.factId) || character.collectedItems.includes(entity.id)
                  return (
                    <li key={entity.id}>
                      <button type="button" className={isOwned ? 'chip on' : 'chip'} onClick={() => choose(entity)}>
                        {entity.name}{isOwned ? ' ✓' : ''}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
