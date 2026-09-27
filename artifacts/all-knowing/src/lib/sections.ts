import type { ModuleId, Section, Sub } from '../types'

/**
 * Task 91 — the shell model. One place knows the four sections, their sub-views,
 * the old ModuleId compatibility map, and the `#/section/sub` URL hash. The
 * workspace (`state.tsx`) and the shell components all read from here so the nav
 * model cannot drift.
 */

export type SubMeta = { id: Sub; label: string }
export type SectionMeta = { id: Section; label: string; subs: SubMeta[] }

export const SECTIONS: SectionMeta[] = [
  {
    id: 'me',
    label: 'Tarnished',
    subs: [
      { id: 'overview', label: 'Overview' },
      { id: 'update', label: 'Update' },
      { id: 'profiles', label: 'Profiles' },
    ],
  },
  {
    id: 'journey',
    label: 'Journey',
    subs: [
      { id: 'now', label: 'Now' },
      { id: 'map', label: 'Map' },
      { id: 'quests', label: 'Quests' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    subs: [
      { id: 'search', label: 'Search' },
      { id: 'builds', label: 'Builds' },
      { id: 'kit', label: 'Kit' },
      { id: 'reference', label: 'Reference' },
    ],
  },
  { id: 'gideon', label: 'Gideon', subs: [] },
]

export function sectionMeta(id: Section): SectionMeta {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0]
}

export function defaultSub(section: Section): Sub | null {
  return sectionMeta(section).subs[0]?.id ?? null
}

export function isSub(section: Section, sub: string): sub is Sub {
  return sectionMeta(section).subs.some((s) => s.id === sub)
}

/** The compat shim: every old ModuleId still maps to a (section, sub). */
export const MODULE_TO_LOCATION: Record<ModuleId, { section: Section; sub: Sub }> = {
  reckon: { section: 'me', sub: 'update' },
  map: { section: 'journey', sub: 'map' },
  quests: { section: 'journey', sub: 'quests' },
  build: { section: 'library', sub: 'builds' },
  codex: { section: 'library', sub: 'search' },
}

export function moduleToLocation(id: ModuleId): { section: Section; sub: Sub } {
  return MODULE_TO_LOCATION[id]
}

/** Map a location back to a ModuleId for vault persistence (lossy by design). */
export function locationToModule(section: Section, sub: Sub | null): ModuleId {
  if (section === 'journey' && sub === 'map') return 'map'
  if (section === 'journey' && sub === 'quests') return 'quests'
  if (section === 'library' && sub === 'builds') return 'build'
  if (section === 'library' && sub === 'reference') return 'codex'
  if (section === 'library' && sub === 'kit') return 'build'
  if (section === 'library' && sub === 'search') return 'codex'
  // The remaining sub-views fall back to the rooms that used to own them.
  if (section === 'me') return 'reckon'
  if (section === 'journey') return 'map'
  if (section === 'library') return 'codex'
  return 'map'
}

export type Location = { section: Section; sub: Sub | null }

export function locationToHash(section: Section, sub: Sub | null): string {
  if (section === 'gideon') return '#/gideon'
  return sub ? `#/${section}/${sub}` : `#/${section}`
}

/** Parse `#/journey/map`; unknown sections/sub-views fall back to the default. */
export function hashToLocation(hash: string): Location | null {
  const match = hash.match(/^#\/([a-z]+)(?:\/([a-z]+))?/)
  if (!match) return null
  const section = match[1] as Section
  if (!SECTIONS.some((s) => s.id === section)) return null
  if (section === 'gideon') return { section, sub: null }
  const sub = match[2]
  if (sub && isSub(section, sub)) return { section, sub }
  return { section, sub: defaultSub(section) }
}
