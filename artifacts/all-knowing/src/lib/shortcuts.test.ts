import { beforeAll, describe, expect, it } from 'vitest'
import {
  hasSeenHelp,
  HELP_SEEN_KEY,
  markHelpSeen,
  resolveHotkey,
  SHORTCUT_GROUPS,
  type Hotkey,
} from './shortcuts'

const ALL_TYPES: Hotkey['type'][] = ['search', 'packet', 'undo', 'module', 'help']

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
  } as unknown as Storage
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
})

describe('resolveHotkey', () => {
  it('maps the room digits to modules', () => {
    const rooms = { '1': 'reckon', '2': 'map', '3': 'build', '4': 'quests', '5': 'codex' } as const
    for (const [digit, id] of Object.entries(rooms)) {
      expect(resolveHotkey({ key: digit }, { typing: false, helpOpen: false })).toEqual({ type: 'module', id })
    }
  })

  it('treats Ctrl and ⌘ the same', () => {
    expect(resolveHotkey({ key: 'k', ctrlKey: true }, { typing: false, helpOpen: false })).toEqual({ type: 'search' })
    expect(resolveHotkey({ key: 'k', metaKey: true }, { typing: false, helpOpen: false })).toEqual({ type: 'search' })
  })

  it('does not fire character hotkeys while typing', () => {
    const typing = { typing: true, helpOpen: false }
    expect(resolveHotkey({ key: '?' }, typing)).toBeNull()
    expect(resolveHotkey({ key: '1' }, typing)).toBeNull()
    expect(resolveHotkey({ key: 's' }, typing)).toBeNull()
    expect(resolveHotkey({ key: '/' }, typing)).toBeNull()
  })

  it('still lets save/search/undo through while typing', () => {
    const typing = { typing: true, helpOpen: false }
    expect(resolveHotkey({ key: 'k', ctrlKey: true }, typing)?.type).toBe('search')
    expect(resolveHotkey({ key: 's', ctrlKey: true }, typing)?.type).toBe('packet')
    expect(resolveHotkey({ key: 'z', ctrlKey: true }, typing)?.type).toBe('undo')
  })

  it('only closes help on Escape when it is open', () => {
    expect(resolveHotkey({ key: 'Escape' }, { typing: false, helpOpen: false })).toBeNull()
    expect(resolveHotkey({ key: 'Escape' }, { typing: false, helpOpen: true })).toEqual({ type: 'help' })
  })

  it('ignores shifted undo and unknown keys', () => {
    expect(resolveHotkey({ key: 'z', ctrlKey: true, shiftKey: true }, { typing: false, helpOpen: false })).toBeNull()
    expect(resolveHotkey({ key: 'q' }, { typing: false, helpOpen: false })).toBeNull()
  })
})

describe('shortcut help catalog', () => {
  it('documents every action the resolver can produce', () => {
    const documented = new Set(SHORTCUT_GROUPS.flatMap((g) => g.items.map((s) => s.action)))
    for (const type of ALL_TYPES) {
      expect(documented.has(type), `no help entry maps to "${type}"`).toBe(true)
    }
  })

  it('every keyboard entry with a probe resolves to its documented action', () => {
    for (const group of SHORTCUT_GROUPS) {
      for (const item of group.items) {
        if (!item.probe || !item.action) continue
        const hit = resolveHotkey(item.probe, {
          typing: false,
          helpOpen: Boolean(item.needsHelpOpen),
        })
        expect(hit?.type, `${item.keys} — ${item.label}`).toBe(item.action)
      }
    }
  })

  it('has no empty groups or duplicate key+label rows', () => {
    const seen = new Set<string>()
    for (const group of SHORTCUT_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        const id = `${group.title}:${item.keys}:${item.label}`
        expect(seen.has(id), `duplicate help row ${id}`).toBe(false)
        seen.add(id)
      }
    }
  })
})

describe('help seen flag', () => {
  it('round-trips through storage', () => {
    localStorage.clear()
    expect(hasSeenHelp()).toBe(false)
    markHelpSeen()
    expect(localStorage.getItem(HELP_SEEN_KEY)).toBe('1')
    expect(hasSeenHelp()).toBe(true)
  })

  it('is safe when storage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } },
      configurable: true,
    })
    expect(hasSeenHelp()).toBe(false)
    expect(() => markHelpSeen()).not.toThrow()
    Object.defineProperty(globalThis, 'localStorage', original!)
  })
})
