import { Help } from '../Help'
import { sectionMeta } from '../lib/sections'
import { useWorkspace } from '../state'
import { SectionTabs } from './SectionTabs'

export function Header({
  searchOpen,
  onToggleSearch,
  dockOpen,
  onToggleDock,
}: {
  searchOpen: boolean
  onToggleSearch: () => void
  dockOpen: boolean
  onToggleDock: () => void
}) {
  const w = useWorkspace()
  const meta = sectionMeta(w.section)
  return (
    <header className="shell-header">
      <button
        type="button"
        className="brand-mark"
        aria-label="All-Knowing — Tarnished overview"
        onClick={() => w.go('me', 'overview')}
      />
      <span className="shell-title phone-only">{meta.label}</span>
      <SectionTabs />
      <input
        id="command-search"
        className="search header-search"
        placeholder="Search · / Ctrl+K · ? help"
        aria-label="Search everything"
        value={w.query}
        onChange={(e) => w.setQuery(e.target.value)}
      />
      <button
        type="button"
        className={searchOpen ? 'chip on search-toggle phone-only' : 'chip search-toggle phone-only'}
        aria-label="Search"
        aria-expanded={searchOpen}
        onClick={onToggleSearch}
      >
        find
      </button>
      <button
        type="button"
        className="char-chip"
        onClick={() => w.go('me', 'overview')}
        title="Open the Tarnished overview"
      >
        {w.character.name} · Lv.{w.character.level}
      </button>
      <Help />
      <button
        type="button"
        className={dockOpen ? 'chip on dock-toggle desktop-only' : 'chip dock-toggle desktop-only'}
        aria-pressed={dockOpen}
        title="Toggle the Gideon dock (g)"
        onClick={onToggleDock}
      >
        Gideon
      </button>
    </header>
  )
}
