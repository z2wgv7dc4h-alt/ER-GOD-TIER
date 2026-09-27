import { SECTIONS } from '../lib/sections'
import { useWorkspace } from '../state'

/** The four top-level sections. Keyboard `1`–`4` mirrors these. */
export function SectionTabs() {
  const { section, go } = useWorkspace()
  return (
    <nav className="section-tabs" aria-label="Sections">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={section === s.id ? 'active' : ''}
          aria-current={section === s.id ? 'page' : undefined}
          onClick={() => go(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
