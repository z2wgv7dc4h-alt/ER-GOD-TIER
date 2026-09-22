import type { ModuleId } from '../types'

/**
 * The single source of truth for what the keyboard actually does.
 *
 * `resolveHotkey` is the pure decision function the global listener uses, and
 * `SHORTCUT_GROUPS` is the in-app help. `shortcuts.test.ts` asserts the two stay
 * in sync, so a new key can never ship without being documented here.
 */

export type KeyLike = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

export type Hotkey =
  | { type: 'search' }
  | { type: 'packet' }
  | { type: 'undo' }
  | { type: 'module'; id: ModuleId }
  | { type: 'sit' }
  | { type: 'help' }

export type HotkeyContext = {
  typing: boolean
  helpOpen: boolean
}

const ROOMS: Record<string, ModuleId> = {
  '1': 'reckon',
  '2': 'map',
  '3': 'build',
  '4': 'quests',
  '5': 'codex',
}

export function resolveHotkey(e: KeyLike, ctx: HotkeyContext): Hotkey | null {
  const mod = Boolean(e.metaKey || e.ctrlKey)
  const key = e.key.toLowerCase()

  if (mod && key === 'k') return { type: 'search' }
  if (mod && key === 's') return { type: 'packet' }
  if (mod && !e.shiftKey && key === 'z') return { type: 'undo' }
  if (ctx.helpOpen && e.key === 'Escape') return { type: 'help' }
  if (ctx.typing) return null
  if (e.key === '?') return { type: 'help' }
  if (ROOMS[e.key]) return { type: 'module', id: ROOMS[e.key] }
  if (e.key === '/') return { type: 'search' }
  if (!mod && key === 's') return { type: 'sit' }
  return null
}

export type Shortcut = {
  keys: string
  label: string
  note?: string
  /** A synthetic key event proving this entry maps to `action` (tested). */
  probe?: KeyLike
  action?: Hotkey['type']
  /** Some keys (Esc) only fire while the help overlay is already open. */
  needsHelpOpen?: boolean
}

export type ShortcutGroup = {
  title: string
  items: Shortcut[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Search & rooms',
    items: [
      { keys: '/', label: 'Focus the search bar', probe: { key: '/' }, action: 'search' },
      { keys: 'Ctrl / ⌘ K', label: 'Focus the search bar', note: 'command palette', probe: { key: 'k', ctrlKey: true }, action: 'search' },
      { keys: '↑ ↓', label: 'Move through the command palette results', note: 'while the search is focused' },
      { keys: 'Enter', label: 'Open the highlighted search result', note: 'command palette' },
      { keys: 'Esc', label: 'Clear the search and close the results', note: 'command palette' },
      { keys: '1', label: 'Reckoning', probe: { key: '1' }, action: 'module' },
      { keys: '2', label: 'Atlas', probe: { key: '2' }, action: 'module' },
      { keys: '3', label: 'Build lab', probe: { key: '3' }, action: 'module' },
      { keys: '4', label: 'Quest graph', probe: { key: '4' }, action: 'module' },
      { keys: '5', label: 'Codex', probe: { key: '5' }, action: 'module' },
    ],
  },
  {
    title: 'Character & data',
    items: [
      { keys: 'Ctrl / ⌘ S', label: 'Save this character to a packet file', probe: { key: 's', ctrlKey: true }, action: 'packet' },
      { keys: 'Ctrl / ⌘ Z', label: 'Undo the last character change', probe: { key: 'z', ctrlKey: true }, action: 'undo' },
      { keys: 'Paste image', label: 'Add a clipboard screenshot to Reckoning', note: 'Ctrl / ⌘ V anywhere' },
      { keys: 'Drop ER0000.sl2', label: 'Read a PC save locally — stats, bosses, graces', note: 'rail' },
      { keys: 'Drop / paste images', label: 'OCR a PS5 screenshot on-device', note: 'Reckoning' },
    ],
  },
  {
    title: 'View',
    items: [
      { keys: 'S', label: 'Toggle sit mode', probe: { key: 's' }, action: 'sit' },
      { keys: '?', label: 'Open this help', probe: { key: '?' }, action: 'help' },
      { keys: 'Esc', label: 'Close this help', probe: { key: 'Escape' }, action: 'help', needsHelpOpen: true },
    ],
  },
  {
    title: 'Also worth knowing',
    items: [
      { keys: 'Enter', label: 'Send a question to Gideon', note: 'his ask box' },
      { keys: 'Search', label: 'Jump straight to a grace, boss, item or shop', note: 'results appear above the room' },
      { keys: 'Missing only', label: 'Hide everything you already have', note: 'Atlas' },
      { keys: 'Tarnished menu', label: 'Switch, rename or forget profiles', note: 'rail' },
      { keys: 'Diff', label: 'Compare this character against another packet', note: 'rail' },
      { keys: 'Spoilers on / off', label: 'Hide or show what is still ahead', note: 'top bar' },
    ],
  },
]

export const HELP_SEEN_KEY = 'all-knowing.help.seen.v1'

export function hasSeenHelp(): boolean {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markHelpSeen(): void {
  try {
    localStorage.setItem(HELP_SEEN_KEY, '1')
  } catch {
    /* private mode / storage disabled — the hint just shows again */
  }
}
