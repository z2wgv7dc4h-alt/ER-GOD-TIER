import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const ws = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  return { ...actual, useWorkspace: () => ws.current }
})

import { demoCharacter, emptyCharacter } from './data/seed'
import type { Character } from './types'
import { BuildFind, BuildWorkspace, BuildsPage } from './Build'
import { followBuild, isFollowing } from './build/buildGoal'

function workspace(character: Character) {
  return {
    module: 'build',
    setModule: () => {},
    section: 'library',
    sub: 'builds',
    go: () => {},
    character,
    setCharacter: () => {},
    selectedMarkerId: null,
    setSelectedMarkerId: () => {},
    focusOnMap: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    openEntity: () => {},
  }
}

describe('Task 197 §1 — an empty Tarnished gets one call to action', () => {
  it('offers setup (photo or manual) and a build to follow', () => {
    ws.current = workspace(emptyCharacter)
    const html = renderToStaticMarkup(<BuildWorkspace />)
    expect(html).toContain('Set up your Tarnished (photo or manual)')
    expect(html).toContain('Or pick a build to follow')
  })
})

describe('Task 197 §2 — following a build sets the goal and tracks it', () => {
  it('sets answers.buildKit', () => {
    const next = followBuild(demoCharacter, 'build:rivers')
    expect(next.answers.buildKit).toBe('build:rivers')
    expect(isFollowing(next, 'build:rivers')).toBe(true)
    expect(isFollowing(next, 'build:azur')).toBe(false)
  })

  it('offers Follow this build in Find a build', () => {
    ws.current = workspace(emptyCharacter)
    const html = renderToStaticMarkup(<BuildFind />)
    expect(html).toContain('Follow this build')
  })

  it('lists the followed build\u2019s stat targets and missing pieces in Your build', () => {
    const goal = followBuild(demoCharacter, 'build:rivers')
    ws.current = workspace(goal)
    const html = renderToStaticMarkup(<BuildWorkspace />)
    expect(html).toContain('Stat targets')
    expect(html).toContain('Missing pieces')
    expect(html).toContain('Rivers of Blood')
  })
})

describe('Task 197 §3 — the tabs say what they do', () => {
  it('renders Your build · Find a build · Plan · Calculator', () => {
    ws.current = workspace(emptyCharacter)
    const html = renderToStaticMarkup(<BuildsPage />)
    for (const label of ['Your build', 'Find a build', 'Plan', 'Calculator']) {
      expect(html, label).toContain(label)
    }
  })
})
