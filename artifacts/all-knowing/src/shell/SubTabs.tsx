import { sectionMeta } from '../lib/sections'
import { useWorkspace } from '../state'

/** The section's segmented sub-view control. Hidden for the full-screen gideon. */
export function SubTabs() {
  const { section, sub, go } = useWorkspace()
  const meta = sectionMeta(section)
  if (!meta.subs.length) return null
  return (
    <div className="subtabs" role="tablist" aria-label={`${meta.label} views`}>
      {meta.subs.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={sub === s.id}
          className={sub === s.id ? 'active' : ''}
          onClick={() => go(section, s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
