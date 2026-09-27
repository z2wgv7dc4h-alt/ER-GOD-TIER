import { Help } from '../Help'
import { sectionMeta } from '../lib/sections'
import { useWorkspace } from '../state'
import { AreaChip } from './AreaChip'
import { SectionTabs } from './SectionTabs'

export function Header({
  searchOpen,
  onToggleSearch,
  dockOpen,
  onToggleDock,
  onOpenLog,
}: {
  searchOpen: boolean
  onToggleSearch: () => void
  dockOpen: boolean
  onToggleDock: () => void
  onOpenLog?: () => void
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
      <AreaChip />
      <button
        type="button"
        className={w.glance ? 'chip on glance-toggle' : 'chip glance-toggle'}
        aria-pressed={w.glance}
        title="Glance mode — full-screen map (Usage model moment 15)"
        onClick={() => w.setGlance(!w.glance)}
      >
        Glance
      </button>
      <button
        type="button"
        className="char-chip"
        onClick={() => w.go('me', 'overview')}
        title="Open the Tarnished overview"
      >
        {w.character.name} · Lv.{w.character.level}
      </button>
      <button
        type="button"
        className="chip on quicklog-open desktop-only"
        aria-label="Quick log"
        title="Quick log — mark a boss, grace, or item done"
        onClick={onOpenLog}
      >
        +
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
