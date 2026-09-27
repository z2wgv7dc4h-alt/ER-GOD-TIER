import { useEffect, useMemo, useState } from 'react'
import { remembrances } from '../knowledge/remembrances'
import { findWeapon, loadWeapons, type Weapon } from '../lib/ar'
import { areaFromFactId } from '../lib/areaContext'
import { getEntity, type EntityKind } from '../lib/entityGraph'
import { applyFacts, denyFacts } from '../lib/infer'
import { rankRemembrance, type RemembranceOption } from '../lib/remembranceChoice'
import { gearVerdict, weaponVerdict, type Verdict } from '../lib/verdict'
import { useWorkspace } from '../state'
import { EntityPanel } from './EntityPanel'
import type { CategoryId, LibraryEntity } from './model'

/**
 * Task 97 — the universal entity panel overlay.
 *
 * Mounted once by the shell, it reads `entityId` off the workspace and shows the
 * shared `EntityPanel` for any graph entity — weapon, boss, grace, quest beat,
 * gate. It is the same panel the Library mounts, never a second one.
 *
 * Task 100 adds two pieces of the entity page here: the advisor verdict for a
 * weapon/armor/talisman, and the ranked Enia options for a remembrance.
 */

const CATEGORY_BY_KIND: Record<EntityKind, CategoryId> = {
  weapon: 'weapons',
  shield: 'shields',
  armor: 'armor',
  talisman: 'talismans',
  spell: 'sorceries',
  ash: 'ashes',
  spirit: 'spirits',
  item: 'items',
  material: 'items',
  boss: 'bosses',
  enemy: 'bosses',
  npc: 'npcs',
  grace: 'locations',
  region: 'locations',
  dungeon: 'locations',
  quest: 'guides',
  gate: 'guides',
  ending: 'guides',
  build: 'guides',
  merchant: 'npcs',
  mechanic: 'guides',
}

export function EntityOverlay() {
  const w = useWorkspace()
  const { entityId, character, setCharacter } = w
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadWeapons()
      .then((rows) => { if (!cancelled) setWeapons(rows) })
      .catch(() => { /* no regulation: no verdict, the rest of the panel still works */ })
    return () => { cancelled = true }
  }, [])

  const entity = useMemo<LibraryEntity | null>(() => {
    if (!entityId) return null
    const e = getEntity(entityId)
    return {
      id: e.id,
      factId: e.id,
      name: e.name,
      category: CATEGORY_BY_KIND[e.kind],
      subtype: e.kind,
      icon: e.icon,
      lore: e.summary,
    }
  }, [entityId])

  const verdict = useMemo<Verdict | null>(() => {
    if (!entityId || !entity) return null
    if (entity.subtype === 'armor' || entity.subtype === 'talisman') {
      return gearVerdict(character, entity.name, entity.subtype)
    }
    if (entity.subtype !== 'weapon' && entity.subtype !== 'shield') return null
    if (!weapons) return null
    const weapon = findWeapon(weapons, { id: entityId, name: entity.name, kind: 'armament' })
    return weapon ? weaponVerdict(character, weapons, weapon) : null
  }, [entityId, entity, weapons, character])

  const remembrance = useMemo<{ remembrance: (typeof remembrances)[number]; options: RemembranceOption[] } | null>(() => {
    if (!entityId || !entity) return null
    const row = remembrances.find((r) => r.id === entityId || r.id === entity.id)
    if (!row) return null
    return { remembrance: row, options: rankRemembrance(character, row) }
  }, [entityId, entity, character])

  if (!entityId || !entity) return null

  const changeOwned = (owned: boolean) => {
    setCharacter(
      owned
        ? applyFacts(character, [entityId], 'answer', 'entity-panel')
        : denyFacts(character, [entityId], 'entity-panel'),
    )
  }

  return (
    <div className="entity-overlay" role="dialog" aria-modal="true" aria-label={`${entity.name} details`}>
      <button type="button" className="entity-overlay-scrim" aria-label="Close details" onClick={w.closeEntity} />
      <div className="entity-overlay-panel">
        <EntityPanel
          entity={entity}
          factId={entityId}
          kind={entity.subtype as EntityKind}
          character={character}
          verdict={verdict}
          remembrance={remembrance}
          onClose={w.closeEntity}
          onOwnedChange={changeOwned}
          onTradeOption={(factId) => setCharacter(applyFacts(character, [factId], 'answer', 'Enia trade'))}
          onShowOnMap={() => {
            w.setSelectedMarkerId(entityId)
            w.setModule('map')
            w.closeEntity()
          }}
          onEquip={() => {
            w.setModule('build')
            w.closeEntity()
          }}
          onCompare={() => {
            w.setSelectedMarkerId(entityId)
            w.setModule('codex')
            w.closeEntity()
          }}
          onAskGideon={() => {
            setCharacter({
              ...character,
              answers: { ...character.answers, gideonAsk: `Tell me about ${entity.name}` },
            })
            w.go('gideon')
            w.closeEntity()
          }}
          onSetGoal={() => {
            setCharacter({
              ...character,
              answers: { ...character.answers, gideonGoal: entityId },
            })
            w.go('journey', 'now')
            w.closeEntity()
          }}
          onQuestline={() => {
            w.go('journey', 'quests')
            w.closeEntity()
          }}
          onImHere={() => {
            const area = areaFromFactId(entityId)
            setCharacter(applyFacts(character, [entityId], 'answer', "I'm here"))
            if (area) {
              w.setCurrentArea({ ...area, factId: entityId, source: 'map', at: Date.now() })
            }
            w.closeEntity()
          }}
        />
      </div>
    </div>
  )
}
