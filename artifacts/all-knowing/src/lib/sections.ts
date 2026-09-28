import type { ModuleId, Section, Sub } from '../types'

/**
 * Task 91 — the shell model. One place knows the four sections, their sub-views,
 * the old ModuleId compatibility map, and the `#/section/sub` URL hash. The
 * workspace (`state.tsx`) and the shell components all read from here so the nav
 * model cannot drift.
 */

export type SubMeta = { id: Sub; label: string; purpose: string }
export type SectionMeta = { id: Section; label: string; subs: SubMeta[]; purpose: string }

export const SECTIONS: SectionMeta[] = [
  {
    id: 'me',
    label: 'Tarnished',
    purpose: 'Your character and setup — stats, gear, save and profiles.',
    subs: [
      { id: 'overview', label: 'Overview', purpose: 'Where this character stands: level, completion and what changed.' },
      { id: 'gear', label: 'Gear', purpose: 'What you are wearing, slot by slot, and what the pieces do.' },
      { id: 'setup', label: 'Setup', purpose: 'Load a save, answer the interview, or paste what you just did.' },
      { id: 'profiles', label: 'Profiles', purpose: 'Keep several Tarnished side by side and switch between them.' },
    ],
  },
  {
    id: 'journey',
    label: 'Journey',
    purpose: 'What to do now, where you are, and the map.',
    subs: [
      { id: 'now', label: 'Now', purpose: 'Your current goal and the next concrete step.' },
      { id: 'area', label: 'Area', purpose: 'What is in the area around you, including what you cannot miss.' },
      { id: 'map', label: 'Map', purpose: 'Every pin you have found and what is still missing.' },
      { id: 'quests', label: 'Quests', purpose: 'NPC quest lines, their steps and the points that lock them.' },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    purpose: 'Look anything up, plan builds, and read the mechanics.',
    subs: [
      { id: 'search', label: 'Search', purpose: 'Look up any weapon, boss, NPC, item or place and open its page.' },
      { id: 'builds', label: 'Builds', purpose: 'Plan your character, find stronger gear, and browse OP PvE kits.' },
      { id: 'pvp', label: 'PvP', purpose: 'Invasion and duel builds, matchup counters and PvP tech.' },
      { id: 'guides', label: 'Guides', purpose: 'Mechanics, guides, recipes, secrets, dialogue and wiki.' },
    ],
  },
  { id: 'gideon', label: 'Gideon', purpose: 'Ask anything and get an answer grounded in your save.', subs: [] },
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
  reckon: { section: 'me', sub: 'setup' },
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
  if (section === 'library' && sub === 'pvp') return 'build'
  if (section === 'library' && sub === 'kit') return 'build'
  if (section === 'library' && sub === 'guides') return 'codex'
  if (section === 'library' && sub === 'reference') return 'codex'
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

/**
 * Task 117 — resolve a legacy alias to the sub-view that replaced it, then clamp
 * anything unknown to the section's default. Used by both the URL hash and the
 * persisted vault location, so an old `kit` / `reference` link never lands on a
 * blank view.
 */
export function normalizeLocation(section: Section, sub: string | null | undefined): Location {
  if (section === 'gideon') return { section, sub: null }
  let next = sub ?? null
  // Task 94: `#/me/update` is kept as an alias that resolves to `setup`.
  if (section === 'me' && next === 'update') next = 'setup'
  // Task 117: the old Library Kit / Reference views split into Builds / Guides.
  if (section === 'library' && next === 'kit') next = 'builds'
  if (section === 'library' && next === 'reference') next = 'guides'
  return { section, sub: next && isSub(section, next) ? next : defaultSub(section) }
}

/** Parse `#/journey/map`; unknown sections/sub-views fall back to the default. */
export function hashToLocation(hash: string): Location | null {
  const match = hash.match(/^#\/([a-z]+)(?:\/([a-z]+))?/)
  if (!match) return null
  const section = match[1] as Section
  if (!SECTIONS.some((s) => s.id === section)) return null
  if (section === 'gideon') return { section, sub: null }
  return normalizeLocation(section, match[2])
}
