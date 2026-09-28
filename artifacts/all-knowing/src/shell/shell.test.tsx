import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleId, Section, Sub } from '../types'
import {
  SECTIONS,
  hashToLocation,
  isSub,
  locationToHash,
  locationToModule,
  moduleToLocation,
  preserveQuery,
} from '../lib/sections'

const MODULE_IDS: ModuleId[] = ['reckon', 'map', 'build', 'quests', 'codex']

describe('shell location model (Task 91)', () => {
  it('maps every old ModuleId to a real section/sub', () => {
    for (const id of MODULE_IDS) {
      const loc = moduleToLocation(id)
      expect(SECTIONS.some((s) => s.id === loc.section), `${id} section`).toBe(true)
      expect(isSub(loc.section, loc.sub), `${id} sub`).toBe(true)
    }
  })

  it('round-trips section/sub through the URL hash', () => {
    for (const s of SECTIONS) {
      for (const subView of s.subs) {
        const loc = hashToLocation(locationToHash(s.id, subView.id))
        expect(loc, `${s.id}/${subView.id}`).toEqual({ section: s.id, sub: subView.id })
      }
    }
    expect(hashToLocation('#/gideon')).toEqual({ section: 'gideon', sub: null })
    expect(hashToLocation('#/not-a-section')).toBeNull()
  })

  it('maps library/kit and the me views back to a legacy ModuleId', () => {
    expect(locationToModule('me', 'update')).toBe('reckon')
    expect(locationToModule('journey', 'map')).toBe('map')
    expect(locationToModule('journey', 'quests')).toBe('quests')
    expect(locationToModule('library', 'builds')).toBe('build')
    expect(locationToModule('library', 'pvp')).toBe('build')
    expect(locationToModule('library', 'kit')).toBe('build')
    expect(locationToModule('library', 'search')).toBe('codex')
  })

  it('redirects the old Library Kit / Reference hashes to Builds / Guides', () => {
    expect(hashToLocation('#/library/kit')).toEqual({ section: 'library', sub: 'builds' })
    expect(hashToLocation('#/library/reference')).toEqual({ section: 'library', sub: 'guides' })
    // The new model never emits the retired hashes.
    expect(locationToHash('library', 'builds')).toBe('#/library/builds')
    expect(locationToHash('library', 'pvp')).toBe('#/library/pvp')
    expect(locationToHash('library', 'guides')).toBe('#/library/guides')
  })

  it('keeps a Library deep-link query while staying on the same route (Task 130 §4)', () => {
    const base = locationToHash('library', 'search')
    expect(base).toBe('#/library/search')
    // The shell must not strip `?cat=bosses` before the Library reads it.
    expect(preserveQuery(base, base, '#/library/search?cat=bosses')).toBe('#/library/search?cat=bosses')
    // Leaving the route drops the query; an entity param is never doubled.
    expect(preserveQuery(base, base, '#/journey/map?e=boss%3Amargit')).toBe(base)
    expect(preserveQuery(base, '#/library/search?e=boss%3Amargit', '#/library/search')).toBe('#/library/search?e=boss%3Amargit')
  })
})

const ws = vi.hoisted(() => ({
  current: { section: 'me' as Section, sub: 'overview' as Sub | null, go: () => {} },
}))

vi.mock('../state', () => ({ useWorkspace: () => ws.current }))

import { SectionTabs } from './SectionTabs'
import { SubTabs } from './SubTabs'
import { TabBar } from './TabBar'

describe('all four sections render (Task 91)', () => {
  it('renders every section in the top tabs and the phone bar', () => {
    for (const s of SECTIONS) {
      ws.current = { section: s.id, sub: (s.subs[0]?.id ?? null) as Sub | null, go: () => {} }
      const tabs = renderToStaticMarkup(<SectionTabs />)
      expect(tabs, s.label).toContain(s.label)
      const bar = renderToStaticMarkup(<TabBar />)
      expect(bar, s.label).toContain(s.label)
    }
  })

  it('renders the sub-tabs for the three sections that have them and none for gideon', () => {
    for (const s of SECTIONS) {
      ws.current = { section: s.id, sub: (s.subs[0]?.id ?? null) as Sub | null, go: () => {} }
      const html = renderToStaticMarkup(<SubTabs />)
      if (s.subs.length === 0) {
        expect(html).toBe('')
      } else {
        for (const subView of s.subs) expect(html, `${s.id}/${subView.id}`).toContain(subView.label)
      }
    }
  })
})
