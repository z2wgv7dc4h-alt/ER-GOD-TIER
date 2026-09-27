import { useEffect, useRef, useState } from 'react'
import { Help } from '../Help'
import { useWorkspace } from '../state'
import { AreaChip } from './AreaChip'
import { SectionTabs } from './SectionTabs'

/**
 * Task 103 §1 / Task 107 §3 — the phone header is exactly one 52px row: brand
 * mark · search (magnifier) · area (pin + name) · character (initial + Lv) ·
 * overflow `⋯` (Glance mode and Help). There is no text section title on phone;
 * the bottom tab bar already names the section, and the freed width goes to the
 * area chip. The Quick-log `+` lives on the floating thumb button (QuickLog) on
 * phone, and stays a header button on desktop. Desktop keeps the wide search
 * field, section tabs and inline Glance/Help buttons.
 */
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const initial = (w.character.name || 'T').trim().charAt(0).toUpperCase()

  return (
    <header className="shell-header">
      <button
        type="button"
        className="brand-mark"
        aria-label="All-Knowing — Tarnished overview"
        onClick={() => w.go('me', 'overview')}
      />
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
        <svg className="icon-magnifier" viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="15.4" y1="15.4" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
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
        <span className="char-avatar" aria-hidden>{initial}</span>
        <span className="char-name">{w.character.name}</span>
        <span className="char-sep" aria-hidden>·</span>
        <span className="char-level">Lv {w.character.level}</span>
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
      <div className="header-more" ref={menuRef}>
        <button
          type="button"
          className={menuOpen ? 'chip on header-more-toggle phone-only' : 'chip header-more-toggle phone-only'}
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="header-more-menu panel" role="menu" aria-label="More options">
            {onOpenLog && (
              <button
                type="button"
                role="menuitem"
                className="chip on"
                onClick={() => { onOpenLog(); setMenuOpen(false) }}
              >
                Quick log
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={w.glance ? 'chip on' : 'chip'}
              onClick={() => { w.setGlance(!w.glance); setMenuOpen(false) }}
            >
              {w.glance ? 'Glance on' : 'Glance mode'}
            </button>
            <button
              type="button"
              role="menuitem"
              className="chip"
              onClick={() => { w.setHelpOpen(true); setMenuOpen(false) }}
            >
              Help
            </button>
          </div>
        )}
      </div>
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
