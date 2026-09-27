import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * Task 103 §6 — Quests must render without any React warning. Duplicate child
 * keys are a client-reconciler warning, and this suite renders with
 * `react-dom/server` (no DOM), so we intercept the automatic JSX runtime and
 * assert every static/dynamic children array has unique keys before React
 * flattens it. That catches the same `Encountered two children with the same
 * key` bug the audit saw, and `console.error` is asserted empty regardless.
 */
const keyCalls: string[] = []
vi.mock('react/jsx-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react/jsx-runtime')>()
  const check = (children: unknown) => {
    if (!Array.isArray(children)) return
    const seen = new Set<string>()
    for (const child of children) {
      const key = (child as { key?: string | null } | null)?.key
      if (key == null) continue
      if (seen.has(key)) keyCalls.push(String(key))
      seen.add(key)
    }
  }
  const wrap = (fn: (...args: unknown[]) => unknown) =>
    (type: unknown, props: unknown, key: unknown) => {
      check((props as { children?: unknown } | undefined)?.children)
      return fn(type, props, key)
    }
  return {
    ...actual,
    jsx: wrap(actual.jsx as unknown as (...args: unknown[]) => unknown),
    jsxs: wrap(actual.jsxs as unknown as (...args: unknown[]) => unknown),
  }
})

// Vitest compiles JSX with the development runtime, so wrap that entry point
// as well; both call `check` on every children array.
vi.mock('react/jsx-dev-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react/jsx-dev-runtime')>()
  const check = (children: unknown) => {
    if (!Array.isArray(children)) return
    const seen = new Set<string>()
    for (const child of children) {
      const key = (child as { key?: string | null } | null)?.key
      if (key == null) continue
      if (seen.has(key)) keyCalls.push(String(key))
      seen.add(key)
    }
  }
  const wrap = (fn: (...args: unknown[]) => unknown) =>
    (type: unknown, props: unknown, key: unknown, staticChildren: unknown, source: unknown, self: unknown) => {
      check((props as { children?: unknown } | undefined)?.children)
      return fn(type, props, key, staticChildren, source, self)
    }
  return { ...actual, jsxDEV: wrap(actual.jsxDEV as unknown as (...args: unknown[]) => unknown) }
})

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    character: emptyCharacter,
    setCharacter: () => {},
    setModule: () => {},
    setSelectedMarkerId: () => {},
    selectedMarkerId: 'item:fingerslayer',
    query: '',
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { QuestWorkspace } from './Quests'
import { relatedFor } from './lib/related'

describe('QuestWorkspace renders without console errors (Task 103 §6)', () => {
  it('never emits a duplicate-key error and renders the line', () => {
    keyCalls.length = 0
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToStaticMarkup(<QuestWorkspace />)
    const errors = error.mock.calls.map((c) => String(c[0]))
    error.mockRestore()
    expect(keyCalls, `duplicate JSX keys: ${keyCalls.join(', ')}`).toEqual([])
    expect(errors, `console.error: ${errors.join(' | ')}`).toEqual([])
    expect(html).toContain('Ranni')
  })

  it('every related group exposes unique link ids, so the render key cannot collide', () => {
    for (const id of ['item:fingerslayer', 'quest:ranni:service', 'boss:radahn', 'boss:radagon']) {
      for (const group of relatedFor(id).groups) {
        const ids = group.links.map((l) => `${group.key}:${l.id}`)
        expect(new Set(ids).size, `${id} · ${group.key}`).toBe(ids.length)
      }
    }
  })
})
