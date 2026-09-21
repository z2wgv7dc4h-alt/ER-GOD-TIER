import { art } from '../art'

/** Drive folders the Awesome list already points at. */
export const SOURCE_FOLDERS = {
  assets: {
    id: '15ymEOfn0_0L3x4ZQo-9Q5ZooZuC1U53c',
    href: 'https://drive.google.com/drive/folders/15ymEOfn0_0L3x4ZQo-9Q5ZooZuC1U53c',
    by: 'Ashelian',
    drop: '/sourced/sprites/',
    gives: 'HUD / sprite glyphs, artbooks. Not map tiles.',
  },
  icons: {
    id: '1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p',
    href: 'https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p',
    by: 'RubyRed',
    drop: '/sourced/icons/',
    gives: 'Item, spell, talisman, ash thumbnails including cut content and SotE.',
  },
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()

export type IconHit = { url: string; source: 'pack' | 'chrome' }

/** Replace with a generated index after the dump is copied into public/sourced/icons. */
export const iconIndex: Record<string, string> = {}

export const mapIcons: Record<string, string> = {
  grace: '/sourced/pack-icons/location-site-of-grace.png',
  boss: '/sourced/pack-icons/marker-generic-02-skull.png',
  npc: '/sourced/pack-icons/npc-small.png',
  dungeon: '/sourced/pack-icons/location-catacombs.png',
  cave: '/sourced/pack-icons/location-cave.png',
  catacombs: '/sourced/pack-icons/location-catacombs.png',
  item: '/sourced/map-icons/ER_Interactive_Map_Icon_Key_Item.png',
}

export function iconFor(name: string, kind?: string): IconHit {
  const key = norm(name)
  if (key && iconIndex[key]) return { url: iconIndex[key], source: 'pack' }
  if (kind && mapIcons[kind]) return { url: mapIcons[kind], source: 'pack' }
  if (kind === 'grace') return { url: art.kind.grace, source: 'chrome' }
  if (kind === 'boss') return { url: art.kind.boss, source: 'chrome' }
  return { url: art.sigil, source: 'chrome' }
}

export function packStatus() {
  const icons = Object.keys(iconIndex).length
  return {
    icons,
    ready: icons > 0,
    hint: icons
      ? `${icons} pack thumbs`
      : 'Using built-in icons (no custom icon pack installed)',
  }
}
