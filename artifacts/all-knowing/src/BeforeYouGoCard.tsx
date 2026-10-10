import { useMemo } from 'react'
import { areaDontMiss } from './lib/areaHub'
import { regionTipsFor } from './lib/playerTips'
import { useWorkspace } from './state'
import { PlayerTips } from './PlayerTip'
import { Card, ListRow } from './ui'
import { SeeAllButton, useRowReveal } from './shell/rows'

/**
 * Task 92 row 2 / Task 127 §2: "Before you leave this area" is missables only,
 * and only when the character actually has a current area. It is scoped by
 * region via `areaDontMiss` (authored missable loot plus world-state gates that
 * touch the area) and shows the thing plus *why* it is missable — no source
 * tags, no unrelated questline steps.
 *
 * Task 195 §2: curated region player tips ("Before you go") are shown here too,
 * with the "Player tip · patch X" tag, so a warning the corpus carries lands in
 * the existing card rather than a new one.
 */
export function BeforeYouGoCard() {
  const { character, currentArea } = useWorkspace()
  const area = currentArea?.region ?? null
  const misses = useMemo(() => areaDontMiss(character, area), [character, area])
  const tips = useMemo(() => regionTipsFor(area), [area])
  const reveal = useRowReveal(misses.length)

  // Render nothing without an area, or when there is nothing missable here.
  if (!area || (misses.length === 0 && tips.length === 0)) return null

  return (
    <Card title="Before you leave this area" subtitle={area}>
      {misses.slice(0, reveal.visible).map((m) => (
        <ListRow key={m.id} title={m.name} subtitle={m.why} icon={m.kind === 'gate' ? '⚠' : undefined} />
      ))}
      <SeeAllButton total={misses.length} expanded={reveal.expanded} onToggle={reveal.toggle} />
      <PlayerTips tips={tips} />
    </Card>
  )
}
