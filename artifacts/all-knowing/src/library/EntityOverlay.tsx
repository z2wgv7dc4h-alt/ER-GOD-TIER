import { useMemo } from 'react'
import { getEntity, type EntityKind } from '../lib/entityGraph'
import { applyFacts, denyFacts } from '../lib/infer'
import { useWorkspace } from '../state'
import { EntityPanel } from './EntityPanel'
import type { CategoryId, LibraryEntity } from './model'

/**
 * Task 97 — the universal entity panel overlay.
 *
 * Mounted once by the shell, it reads `entityId` off the workspace and shows the
 * shared `EntityPanel` for any graph entity — weapon, boss, grace, quest beat,
 * gate. It is the same panel the Library mounts, never a second one.
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
          character={character}
          onClose={w.closeEntity}
          onOwnedChange={changeOwned}
          onShowOnMap={() => {
            w.setSelectedMarkerId(entityId)
            w.setModule('map')
            w.closeEntity()
          }}
          onEquip={() => {
            w.setModule('build')
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
        />
      </div>
    </div>
  )
}
