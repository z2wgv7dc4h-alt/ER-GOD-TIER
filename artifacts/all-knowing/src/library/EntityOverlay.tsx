import { useEffect, useMemo, useState } from 'react'
import { remembrances } from '../knowledge/remembrances'
import type { Weapon } from '../lib/ar'
import { areaFromFactId } from '../lib/areaContext'
import { getEntity, type EntityKind } from '../lib/entityGraph'
import { useEntityIndex } from '../lib/entityIndex'
import { wikiPageForEntity } from '../lib/wikiSearch'
import { applyFacts, denyFacts } from '../lib/infer'
import { rankRemembrance, type RemembranceOption } from '../lib/remembranceChoice'
import { gearVerdict, type Verdict } from '../lib/verdict'
import { useWorkspace } from '../state'
import { EntityPanel } from './EntityPanel'
import type { LibraryEntity } from './model'
import { overlayEntity } from './pageModel'

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

export function EntityOverlay() {
  const w = useWorkspace()
  const { entityId, character, setCharacter } = w
  const [weapons, setWeapons] = useState<Weapon[] | null>(null)
  const [weaponCalc, setWeaponCalc] = useState<{
    findWeapon: typeof import('../lib/ar')['findWeapon']
    weaponVerdict: typeof import('../lib/weaponVerdict')['weaponVerdict']
  } | null>(null)
  const [wikiTitle, setWikiTitle] = useState<string | null>(null)
  const { ready: indexReady } = useEntityIndex()

  // Task 137 §4 — load the attack-rating calculator only when the open entity is
  // actually a weapon/shield, so the main entry never imports it.
  useEffect(() => {
    if (!entityId) return
    const e = getEntity(entityId)
    if (e.kind !== 'weapon' && e.kind !== 'shield') return
    let cancelled = false
    void Promise.all([import('../lib/ar'), import('../lib/weaponVerdict')])
      .then(([ar, wv]) => {
        if (cancelled) return
        setWeaponCalc({ findWeapon: ar.findWeapon, weaponVerdict: wv.weaponVerdict })
        return ar.loadWeapons().then((rows) => { if (!cancelled) setWeapons(rows) })
      })
      .catch(() => { /* no regulation: no verdict, the rest of the panel still works */ })
    return () => { cancelled = true }
  }, [entityId])

  // Task 133 §2 — a wiki-only page (`openEntity('wiki:<slug>')`) has no graph
  // record; show the real wiki title once the corpus manifest resolves.
  useEffect(() => {
    let cancelled = false
    setWikiTitle(null)
    if (entityId?.startsWith('wiki:')) {
      void wikiPageForEntity(entityId).then((found) => { if (!cancelled && found) setWikiTitle(found.page.title) })
    }
    return () => { cancelled = true }
  }, [entityId])

  // indexReady: re-resolve once the enrichment index arrives (better names/regions).
  const entity = useMemo<LibraryEntity | null>(
    () => (entityId ? overlayEntity(entityId, wikiTitle) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityId, wikiTitle, indexReady],
  )

  const verdict = useMemo<Verdict | null>(() => {
    if (!entityId || !entity) return null
    if (entity.subtype === 'armor' || entity.subtype === 'talisman') {
      return gearVerdict(character, entity.name, entity.subtype)
    }
    if (entity.subtype !== 'weapon' && entity.subtype !== 'shield') return null
    if (!weapons || !weaponCalc) return null
    const weapon = weaponCalc.findWeapon(weapons, { id: entityId, name: entity.name, kind: 'armament' })
    return weapon ? weaponCalc.weaponVerdict(character, weapons, weapon) : null
  }, [entityId, entity, weapons, weaponCalc, character])

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
