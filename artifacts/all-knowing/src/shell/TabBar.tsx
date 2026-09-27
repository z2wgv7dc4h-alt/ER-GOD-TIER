import { art } from '../art'
import type { Section } from '../types'
import { useWorkspace } from '../state'

const TABS: { id: Section; label: string; icon: string }[] = [
  { id: 'me', label: 'Tarnished', icon: art.room.reckon },
  { id: 'journey', label: 'Journey', icon: art.room.map },
  { id: 'library', label: 'Library', icon: art.room.build },
  { id: 'gideon', label: 'Gideon', icon: art.guide },
]

/** Phone-only bottom bar: exactly four sections, ≥44px targets. */
export function TabBar() {
  const { section, go } = useWorkspace()
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          data-tour={t.id}
          className={section === t.id ? 'active' : ''}
          aria-current={section === t.id ? 'page' : undefined}
          onClick={() => go(t.id)}
        >
          <img src={t.icon} alt="" />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
