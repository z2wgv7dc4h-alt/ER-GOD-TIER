import { useEffect, useMemo, useState } from 'react'
import { beforeYouGo } from './lib/beforeYouGo'
import { loadRegionLevels, type RegionLevel } from './lib/regionLevels'
import { SeeAllButton, useRowReveal } from './shell/rows'
import { useWorkspace } from './state'

/**
 * Task 92 row 2: missables / points of no return / "before I go" as a card on
 * Journey → Now, level-aware. Same pure `beforeYouGo` advice Gideon already
 * gives, scoped to the character's current region. Task 100 caps the open list
 * at three rows behind a "See all (N)" control.
 */
export function BeforeYouGoCard() {
  const { character } = useWorkspace()
  const [areas, setAreas] = useState<RegionLevel[]>([])

  useEffect(() => {
    let cancelled = false
    void loadRegionLevels()
      .then((doc) => { if (!cancelled) setAreas(doc.areas) })
      .catch(() => { /* no bands: the advice still lists what is open */ })
    return () => { cancelled = true }
  }, [])

  const advice = useMemo(() => beforeYouGo(character, 'here', areas), [character, areas])
  const open = useRowReveal(advice.open.length)

  // Render nothing when there is no area and nothing open — no empty advice card.
  if (!advice.region && advice.open.length === 0) return null

  return (
    <section className="panel before-you-go">
      <div className="kicker">Before you leave this area</div>
      {advice.region && (
        <p className="note" style={{ margin: '4px 0 6px' }}>
          Region: <strong>{advice.region}</strong>
          {advice.band
            ? ` · Lv ${advice.band.levelMin}-${advice.band.levelMax}`
            : ' · no level band on file'}
          {` · you are Lv ${advice.level}`}
        </p>
      )}
      <p className="note">{advice.advice}</p>
      {advice.open.length > 0 && (
        <ul className="list" style={{ marginTop: 8 }}>
          {advice.open.slice(0, open.visible).map((o) => (
            <li key={`${o.name}-${o.source}`} style={{ cursor: 'default' }}>
              <span>{o.name}</span>
              <span className="note">{o.source}</span>
            </li>
          ))}
        </ul>
      )}
      <SeeAllButton total={advice.open.length} expanded={open.expanded} onToggle={open.toggle} />
    </section>
  )
}
