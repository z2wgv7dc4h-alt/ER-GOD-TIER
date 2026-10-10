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
import { tipsFor } from '../lib/playerTips'
import { resolveEntityId } from '../lib/entityGraph'
import { useEnrichment } from '../lib/entityEnrich'
import { EntityLink } from '../EntityLink'
import { PlayerTips } from '../PlayerTip'
import { GuidesFor } from '../PackData'
import { WikiText } from '../WikiText'
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

/**
 * Task 165 §3 — one glance line for a boss: what it is weak to and what the
 * character's best armament actually does after negation. Returns null when the
 * data holds neither, so an empty fight never prints a template sentence.
 */
export function bossGlance(weakLabels: string[], best: { name: string; effective: number } | null): string | null {
  const parts: string[] = []
  if (weakLabels.length) parts.push(`Weak to ${weakLabels.join(' / ')}`)
  if (best) parts.push(`${best.name} does ${best.effective}`)
  return parts.length ? parts.join(' · ') : null
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

  const weakLabels = useMemo(() => weak.map((t) => damageTypeLabels[t]), [weak])
  const glance = bossGlance(weakLabels, best)
  // Task 195 §2 — curated community tips for this boss, shown in the strategy
  // section with the "Player tip" tag. Read-only from player-tips.json.
  const playerTips = useMemo(() => tipsFor(factId, 'boss'), [factId])

  if (!combat && !fext && !armory && !record && playerTips.length === 0) return null
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
      {/* Task 165 §3 — the mid-fight glance line, directly under the status
          strip: weakness and what the equipped armament actually deals. */}
      {glance && (
        <div className="lib-panel-block boss-glance">
          <p className="note boss-glance-line">{glance}</p>
        </div>
      )}

      {/* §2 block 1 — where / how to reach, inlined from the old Where tab. */}
      {(resolvedRegion || record?.location || record?.map || armory || fext?.locations?.length || enrichedLocation) && (
        <div className="lib-panel-block">
          <div className="kicker">Where to reach it</div>
          {resolvedRegion && (
            <p className="note">
              <strong>Region:</strong> {resolvedRegion}
            </p>
          )}
          {record?.location && <WikiText className="note" text={record.location} />}
          {fext?.locations?.length ? (
            <p className="note"><strong>Arena:</strong> {fext.locations.join(' · ')}</p>
          ) : enrichedLocation ? (
            <p className="note"><strong>Arena:</strong> {enrichedLocation}</p>
          ) : null}
          {record?.map && (
            <p className="note">
              <strong>Coords:</strong> {record.map.x}, {record.map.y}
              {record.map.map ? ` · ${record.map.map}` : ''}
            </p>
          )}
          {armory && (
            <p className="note">
              {armory.type ? `${armory.type} · ` : ''}
              {armory.parryable ? 'Parryable' : armory.parryable === false ? 'Not parryable' : ''}
              {armory.notes ? `${armory.parryable != null ? ' · ' : ''}${armory.notes}` : ''}
            </p>
          )}
        </div>
      )}

      {/* §2 block 2 — one combat profile. NpcParam when there is a real row, else
          the enriched record; never both (Task 165 §3 dedupe). */}
      {combat ? (
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
      ) : enrichedHp || enrichedNegation || enrichedPoise ? (
        <div className="lib-panel-block">
          <div className="kicker">Combat profile · enriched</div>
          <div className="lib-attack">
            {enrichedHp && <span className="lib-attack-chip">{BASE_HP_LABEL} <strong>{enrichedHp}</strong></span>}
            {enrichedPoise && <span className="lib-attack-chip">Poise <strong>{enrichedPoise}</strong></span>}
          </div>
          {enrichedNegation && <p className="note">{enrichedNegation}</p>}
          <p className="note">{BASE_HP_NOTE}</p>
        </div>
      ) : null}

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

      {/* §2 block 3 — strategy, then the full stored Fextralife sections.
          Task 181: the scraped page body is on disk, so render it in-app
          instead of linking out to the wiki. */}
      {(strategy || enrichedStrategy || fext?.sections?.length || playerTips.length > 0) && (
        <div className="lib-panel-block">
          <div className="kicker">Strategy · {strategy?.heading ?? 'Guide'}</div>
          {(strategy?.text || enrichedStrategy) && (
            <p className="note">{strategy?.text ?? enrichedStrategy}</p>
          )}
          {fext?.sections?.length ? (
            <details className="kit-sources">
              <summary>Full fight guide · {fext.sections.length} sections</summary>
              {fext.sections.map((s, i) => (
                <div key={`${s.heading}-${i}`}>
                  {s.heading && <div className="kicker">{s.heading}</div>}
                  <p className="note"><WikiText text={s.text} /></p>
                </div>
              ))}
            </details>
          ) : null}
          <PlayerTips tips={playerTips} />
        </div>
      )}

      <GuidesFor query={name} heading="Guides for this boss" />

      {/* §2 block 5 — drops, each linked to its item page where one resolves. */}
      {((!isEncounter && fext?.drops?.length) || enrichedDrops.length > 0) && (
        <div className="lib-panel-block">
          <div className="kicker">Drops</div>
          <div className="lib-scaling">
            {(isEncounter ? enrichedDrops : fext?.drops ?? enrichedDrops).map((d) => {
              const id = resolveEntityId(d)
              return id ? (
                <EntityLink key={d} id={id} className="lib-scaling-chip">{d}</EntityLink>
              ) : (
                <span key={d} className="lib-scaling-chip">{d}</span>
              )
            })}
          </div>
        </div>
      )}
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
