import type { MapMarker, ModuleId } from '../types'

/**
 * Room nav model shared by the desktop rail, the mobile bottom tab bar, and
 * the atlas layer controls. Kept in one place so the shell and the Atlas
 * can't drift on which rooms / layers exist.
 */
export const modules: { id: ModuleId; label: string; short: string }[] = [
  { id: 'reckon', label: 'Reckoning', short: 'Reckon' },
  { id: 'map', label: 'Atlas', short: 'Atlas' },
  { id: 'build', label: 'Build lab', short: 'Build' },
  { id: 'quests', label: 'Quest graph', short: 'Quests' },
  { id: 'codex', label: 'Codex', short: 'Codex' },
]

/** Order the map layer toggles render in. */
export const layerOrder: MapMarker['kind'][] = [
  'grace',
  'boss',
  'item',
  'npc',
  'fragment',
  'spirit-ash',
  'dungeon',
]
