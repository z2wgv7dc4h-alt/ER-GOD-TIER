import type { ShotKind } from '../types'

/**
 * Task 92: the shot-type catalogue, moved out of `Reckon.tsx` so both the
 * screenshot reader and the Tarnished → Update card can name what each shot
 * type reads without statically importing the lazy Reckon workspace.
 */
export type ShotSource = { id: ShotKind; label: string; ask: string }

export const shotKinds: ShotSource[] = [
  { id: 'warp-list', label: 'Warp / grace list', ask: 'Map menu → a Site of Grace list. Best single shot a PS5 player can give.' },
  { id: 'map', label: 'World map', ask: 'Opened map with gold grace icons. Fog still matters — only visible pins count.' },
  { id: 'inventory', label: 'Inventory / Great Runes', ask: 'Key items and Great Runes reconstruct shardbearers and quests.' },
  { id: 'equipment', label: 'Equipment screen', ask: 'Weapons and armor currently worn.' },
  { id: 'pickup', label: 'Item pickup banner', ask: 'The name plate after you pick something up.' },
  { id: 'boss', label: 'Boss remembrance / arena', ask: 'A remembrance or the “legend felled” banner.' },
]
