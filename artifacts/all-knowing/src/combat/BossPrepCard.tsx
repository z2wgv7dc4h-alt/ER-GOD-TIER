import { useEffect, useMemo, useState } from 'react'
import { findWeapon, loadWeapons, type Weapon } from '../lib/ar'
import { bossPrep } from '../lib/combat'
import { negationText, useBossCombat, type DamageType } from '../lib/enemy'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { useWorkspaceOptional } from '../state'
import type { Character } from '../types'
import { StatusTable } from './StatusTable'
import './combat.css'

const DAMAGE_LABELS: Record<DamageType, string> = {
  physical: 'Physical',
  magic: 'Magic',
  fire: 'Fire',
  lightning: 'Lightning',
  holy: 'Holy',
}

/**
 * Task 105 — the whole "how do I beat this boss" card (Usage-model moment 4).
 * Self-contained, own CSS, not wired into the shell. Pass `bossId` to pin a
 * boss; otherwise it renders a picker from the loaded combat table.
 */
export function BossPrepCard({ bossId, character: characterProp }: { bossId?: string; character?: Character }) {
  const w = useWorkspaceOptional()
  const character = characterProp ?? w?.character ?? null
  const { bosses } = useBossCombat()
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [areas, setAreas] = useState<RegionLevel[]>([])
  const [selected, setSelected] = useState(bossId ?? '')

  useEffect(() => {
    let cancelled = false
    void loadWeapons().then((rows) => { if (!cancelled) setWeapons(rows) }).catch(() => {})
    void loadRegionLevels().then((data) => { if (!cancelled) setAreas(data.areas) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Derive the active boss so no effect has to sync state after the table loads.
  const activeId = bossId ?? (selected || bosses[0]?.factId || '')

  const prep = useMemo(
    () => (activeId && character ? bossPrep(activeId, character, { weapons: weapons ?? undefined, bosses, areas }) : null),
    [activeId, character, weapons, bosses, areas],
  )

  const bestWeapon = useMemo(
    () => (weapons && prep?.bestWeapon ? findWeapon(weapons, { id: 'best', name: prep.bestWeapon.name, kind: 'armament', affinity: prep.bestWeapon.affinity }) : undefined),
    [weapons, prep],
  )

  if (!character) {
    return (
      <div className="combat-prep">
        <p className="note">Load a character to see this matchup.</p>
      </div>
    )
  }

  return (
    <div className="combat-prep">
      {!bossId && (
        <label className="combat-boss-pick">
          <span>Boss</span>
          <select value={activeId} onChange={(e) => setSelected(e.target.value)}>
            {bosses.map((b) => (
              <option key={b.factId} value={b.factId}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {!prep ? (
        <p className="note">
          {weapons === null ? 'Loading regulation data…' : 'No combat row for this boss yet.'}
        </p>
      ) : (
        <>
          <section className="combat-block">
            <h3>{prep.name}</h3>
            <p className="note">
              {prep.region ? `${prep.region} · ` : ''}
              {prep.hp} HP
              {prep.poise != null ? ` · ${prep.poise} poise` : ''}
            </p>
          </section>

          <section className="combat-block">
            <div className="kicker">Weak to / resists</div>
            <div className="combat-chips">
              {prep.weakTo.map((t) => (
                <span key={t} className="combat-chip weak">
                  {DAMAGE_LABELS[t]} {negationText(prep.negation[t])}
                </span>
              ))}
              {prep.resists.map((t) => (
                <span key={t} className="combat-chip resist">
                  {DAMAGE_LABELS[t]} {negationText(prep.negation[t])}
                </span>
              ))}
              {prep.weakTo.length === 0 && prep.resists.length === 0 && <span className="note">Neutral to every damage type.</span>}
            </div>
          </section>

          <section className="combat-block">
            <div className="kicker">Your weapons vs this boss</div>
            {prep.weapons.length === 0 ? (
              <p className="note">No owned weapon has vanilla regulation data yet.</p>
            ) : (
              <ul className="combat-list">
                {prep.weapons.slice(0, 6).map((w) => (
                  <li key={`${w.weaponName}-${w.affinity}`}>
                    <div className="combat-row">
                      <span>
                        <strong>{w.name}</strong> {w.affinity !== 'Unique' ? `· ${w.affinity}` : ''} +{w.upgrade}
                        {w.equipped ? <span className="combat-chip on">equipped</span> : null}
                      </span>
                      <span className="note">{Math.floor(w.effectiveDamage)} after negation</span>
                    </div>
                    <div className="combat-chips">
                      <span className="combat-chip">{w.ar} AR</span>
                      {!w.meets && <span className="combat-chip warn">{w.requirement}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="combat-block">
            <div className="kicker">Status</div>
            <StatusTable
              target={bosses.find((b) => b.factId === prep.bossId)!}
              weapon={bestWeapon}
              upgrade={prep.bestWeapon?.upgrade ?? 0}
            />
          </section>

          <section className="combat-block">
            <div className="kicker">Spirit ashes you own</div>
            {prep.spirits.length === 0 ? (
              <p className="note">None of your logged spirit ashes are in the tier table.</p>
            ) : (
              <ul className="combat-list">
                {prep.spirits.map((s) => (
                  <li key={s.name}>
                    <div className="combat-row">
                      <span>
                        <span className={`combat-tier tier-${s.tier}`}>{s.tier}</span> <strong>{s.name}</strong>
                      </span>
                      <span className="note">{s.why}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="combat-block">
            <div className="kicker">Buffs &amp; talismans that help</div>
            {prep.helpers.length === 0 ? (
              <p className="note">Nothing you own tags onto this matchup.</p>
            ) : (
              <ul className="combat-list">
                {prep.helpers.map((h) => (
                  <li key={h.name}>
                    <div className="combat-row">
                      <span>
                        <strong>{h.name}</strong> <em className="dim">{h.kind}</em>
                      </span>
                      <span className="note">{h.why}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {prep.level && (
            <section className="combat-block">
              <div className="kicker">Recommended level</div>
              <p className="note">
                {prep.level.area} is Lv {prep.level.levelMin}-{prep.level.levelMax}. You are Lv {character.level}
                {prep.level.status === 'under' ? ' — under-levelled; clear the open items first.' : prep.level.status === 'over' ? ' — over-levelled; push on.' : ' — on band.'}
              </p>
            </section>
          )}

          {prep.summon && (
            <section className="combat-block">
              <div className="kicker">Summon</div>
              <p className="note">
                {prep.summon.name} — {prep.summon.note}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
