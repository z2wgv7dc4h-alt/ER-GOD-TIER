import { useEffect, useMemo, useState } from 'react'
import { byId } from '../knowledge/catalog'
import { attackRatingForSlot, findWeapon, loadWeapons, type Weapon } from '../lib/ar'
import { canonicalFactId } from '../lib/aliases'
import { useArmory, type ArmoryBoss } from '../lib/armory'
import {
  BASE_HP_LABEL,
  BASE_HP_NOTE,
  bestDamageType,
  combatByName,
  combatTargetFor,
  damageTypeLabels,
  damageTypes,
  effectiveDamage,
  negationText,
  useCombatTargets,
  type CombatStats,
} from '../lib/enemy'
import { loadBossDrops, type FextBoss } from '../lib/bosses'
import { useEnrichment } from '../lib/entityEnrich'
import { bandFor, loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import type { Character } from '../types'

/**
 * Task 103 §3 — the boss facts block on an entity page.
 *
 * The graph's boss rows only carry a name and a summary, so this reads the real
 * NpcParam combat data (`npc-combat.json` / `enemy-combat.json`), the armory boss
 * index, the Fextralife boss pages (strategy excerpt + drops) and the region
 * level bands, then wires them into the shared `EntityPanel`. It also runs the
 * character's own armaments through the AR engine against the boss' negations to
 * name "your best weapon vs this boss". Everything shown is grounded in a repo
 * dataset; nothing is invented.
 */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function sentenceExcerpt(text: string, max = 260): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`
}

type BestWeapon = {
  name: string
  effective: number
  ar: number
  damageType: string
}

export function BossFacts({
  factId,
  name,
  region,
  character,
}: {
  factId: string
  name: string
  region?: string
  character: Character
}) {
  const { targets } = useCombatTargets()
  const { bosses: armoryBosses } = useArmory()
  const record = useEnrichment(factId)
  const [fext, setFext] = useState<FextBoss | null>(null)
  const [areas, setAreas] = useState<RegionLevel[]>([])
  const [weapons, setWeapons] = useState<Weapon[]>([])

  useEffect(() => {
    let cancelled = false
    void loadBossDrops()
      .then((doc) => {
        if (cancelled) return
        const wanted = norm(name)
        setFext(doc.bosses.find((b) => norm(b.name) === wanted) ?? null)
      })
      .catch(() => { /* optional */ })
    void loadRegionLevels()
      .then((doc) => { if (!cancelled) setAreas(doc.areas) })
      .catch(() => { /* optional */ })
    void loadWeapons()
      .then((rows) => { if (!cancelled) setWeapons(rows) })
      .catch(() => { /* no regulation: best weapon simply hides */ })
    return () => { cancelled = true }
  }, [name])

  const canonical = canonicalFactId(factId)
  const combat: CombatStats | undefined = useMemo(
    () => combatTargetFor(targets, canonical) ?? combatByName(targets, name),
    [targets, name, canonical],
  )

  const armory: ArmoryBoss | undefined = useMemo(() => {
    const wanted = norm(name)
    return armoryBosses.find((b) => norm(b.name) === wanted)
  }, [armoryBosses, name])

  const resolvedRegion = region || byId.get(canonical)?.region || armory?.region || fext?.locations?.[0]
  const band = useMemo(() => bandFor(areas, resolvedRegion), [areas, resolvedRegion])

  const strategy = useMemo(() => {
    const sections = fext?.sections ?? []
    if (!sections.length) return null
    const want = /strategy|fight|guide|combat|tips|attack/i
    const hit = sections.find((s) => want.test(s.heading)) ?? sections[0]
    if (!hit?.text) return null
    return { heading: hit.heading, text: sentenceExcerpt(hit.text) }
  }, [fext])

  const best = useMemo<BestWeapon | null>(() => {
    if (!combat || !weapons.length) return null
    let top: BestWeapon | null = null
    for (const slot of character.loadout) {
      if (slot.kind !== 'armament') continue
      const rating = attackRatingForSlot(weapons, slot, character.stats, false)
      if (rating.status !== 'ok') continue
      const dealt = effectiveDamage(rating.breakdown, combat)
      if (!top || dealt.total > top.effective) {
        top = {
          name: findWeapon(weapons, slot)?.weaponName ?? slot.name,
          effective: Math.floor(dealt.total),
          ar: rating.total,
          damageType: damageTypeLabels[bestDamageType(combat)],
        }
      }
    }
    return top
  }, [combat, weapons, character.loadout, character.stats])

  const weak = useMemo(
    () => (combat ? damageTypes.filter((t) => combat.negation[t] < 0) : []),
    [combat],
  )
  const resist = useMemo(
    () => (combat ? damageTypes.filter((t) => combat.negation[t] > 0) : []),
    [combat],
  )

  if (!combat && !fext && !armory && !record) return null
  const enrichedHp = !combat && record?.stats?.HP
  const enrichedNegation = !combat && record?.stats?.Negation
  const enrichedPoise = !combat && record?.stats?.Poise
  // One encounter of a boss fought in several places: the name-matched Fextralife
  // page lists every copy's drops, so show this encounter's own list instead.
  const isEncounter = canonical.includes('--')
  const enrichedDrops = isEncounter || !fext?.drops?.length ? record?.drops ?? [] : []
  const enrichedStrategy = !strategy && record?.strategy ? record.strategy : null
  const enrichedLocation = !armory?.region && !fext?.locations?.length ? record?.location : undefined

  return (
    <>
      {enrichedHp && (
        <div className="lib-panel-block">
          <div className="kicker">Combat profile · enriched</div>
          <div className="lib-attack">
            <span className="lib-attack-chip">{BASE_HP_LABEL} <strong>{enrichedHp}</strong></span>
            {enrichedPoise && <span className="lib-attack-chip">Poise <strong>{enrichedPoise}</strong></span>}
          </div>
          <p className="note">{BASE_HP_NOTE}</p>
        </div>
      )}

      {enrichedNegation && (
        <div className="lib-panel-block">
          <div className="kicker">Damage negation</div>
          <p className="note">{enrichedNegation}</p>
        </div>
      )}

      {combat && (
        <div className="lib-panel-block">
          <div className="kicker">Combat profile · NpcParam</div>
          <div className="lib-attack">
            {typeof combat.baseHp === 'number' && (
              <span className="lib-attack-chip">{BASE_HP_LABEL} <strong>{combat.baseHp}</strong></span>
            )}
            {combat.poise != null && (
              <span className="lib-attack-chip">Poise <strong>{combat.poise}</strong></span>
            )}
            {fext?.hp && !combat.baseHp && (
              <span className="lib-attack-chip">HP (listed) <strong>{fext.hp}</strong></span>
            )}
          </div>
          <p className="note">{BASE_HP_NOTE}</p>
        </div>
      )}

      {combat && (
        <div className="lib-panel-block">
          <div className="kicker">Weak to / Resists</div>
          <div className="lib-scaling">
            {weak.length ? (
              weak.map((t) => (
                <span key={t} className="lib-scaling-chip boss-weak">
                  Weak to <strong>{damageTypeLabels[t]}</strong> {negationText(combat.negation[t])}
                </span>
              ))
            ) : (
              <span className="note">No damage type is a weakness.</span>
            )}
            {resist.map((t) => (
              <span key={t} className="lib-scaling-chip">
                Resists <strong>{damageTypeLabels[t]}</strong> {negationText(combat.negation[t])}
              </span>
            ))}
          </div>
        </div>
      )}

      {combat && (
        <div className="lib-panel-block">
          <div className="kicker">Status resist</div>
          <dl className="lib-stat-grid">
            {statusRows(combat.resist).map((r) => (
              <div key={r.label} className="lib-stat">
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {(band || resolvedRegion) && (
        <div className="lib-panel-block">
          <div className="kicker">Recommended level</div>
          {band ? (
            <p className="note">
              <strong>{band.area}</strong> — Lv {band.levelMin}-{band.levelMax}
              {band.upgradeMin != null ? ` · upgrade +${band.upgradeMin} to +${band.upgradeMax}` : ''}
            </p>
          ) : (
            <p className="note">{resolvedRegion} — no level band in the progress-route data.</p>
          )}
        </div>
      )}

      {(strategy || enrichedStrategy) && (
        <div className="lib-panel-block">
          <div className="kicker">Strategy · {strategy?.heading ?? 'Guide'}</div>
          <p className="note">{strategy?.text ?? enrichedStrategy}</p>
          {fext?.url && (
            <p className="note">
              <a className="ext" href={fext.url} target="_blank" rel="noreferrer">Full fight guide</a>
            </p>
          )}
        </div>
      )}

      {((!isEncounter && fext?.drops?.length) || enrichedDrops.length > 0) && (
        <div className="lib-panel-block">
          <div className="kicker">Drops</div>
          <div className="lib-scaling">
            {(isEncounter ? enrichedDrops : fext?.drops ?? enrichedDrops).map((d) => (
              <span key={d} className="lib-scaling-chip">{d}</span>
            ))}
          </div>
        </div>
      )}

      {(armory || fext?.locations?.length || enrichedLocation) && (
        <div className="lib-panel-block">
          <div className="kicker">Arena</div>
          <p className="note">
            {armory?.type ? `${armory.type} · ` : ''}
            {armory?.parryable ? 'Parryable' : armory?.parryable === false ? 'Not parryable' : ''}
            {armory?.notes ? `${armory.parryable != null ? ' · ' : ''}${armory.notes}` : ''}
          </p>
          {fext?.locations?.length ? <p className="note">{fext.locations.join(' · ')}</p> : enrichedLocation ? <p className="note">{enrichedLocation}</p> : null}
        </div>
      )}

      <div className="lib-panel-block">
        <div className="kicker">Your best weapon vs this boss</div>
        {best ? (
          <p className="note">
            <strong>{best.name}</strong> — {best.effective} effective damage after negation (AR {best.ar}),
            leaning on <strong>{best.damageType}</strong>.
          </p>
        ) : combat && !weapons.length ? (
          <p className="note">Loading weapon data…</p>
        ) : combat ? (
          <p className="note">Equip an armament (or load one) to see the best pick here.</p>
        ) : (
          <p className="note">No combat profile yet, so no matchup can be computed.</p>
        )}
      </div>
    </>
  )
}

function statusRows(resist: CombatStats['resist']): { label: string; value: number }[] {
  return [
    { label: 'Poison', value: resist.poison },
    { label: 'Scarlet Rot', value: resist.scarletRot },
    { label: 'Bleed', value: resist.bleed },
    { label: 'Sleep', value: resist.sleep },
    { label: 'Madness', value: resist.madness },
    { label: 'Curse', value: resist.curse },
  ]
}
