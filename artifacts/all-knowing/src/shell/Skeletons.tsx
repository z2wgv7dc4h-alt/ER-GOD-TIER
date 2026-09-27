/**
 * Task 103 §2 — light section skeletons.
 *
 * The lazy rooms each own a chunk; before it resolves the shell mounts one of
 * these instead of an empty `<Suspense fallback={null}>`, so the section never
 * flashes blank and the phone/desktop layout stays stable during the swap.
 */

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="skeleton-card" aria-hidden>
      <span className="skel-bar skel-thumb" />
      <span className="skeleton-card-body">
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i} className={i === 0 ? 'skel-bar skel-line-sm' : 'skel-bar skel-line'} />
        ))}
      </span>
    </div>
  )
}

export function SectionSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="section-skeleton" role="status" aria-live="polite" aria-label="Loading section">
      <span className="skeleton-label">{label}</span>
      <div className="skeleton-toolbar">
        <span className="skel-bar skel-search" />
        <span className="skel-bar skel-chip" />
        <span className="skel-bar skel-chip" />
        <span className="skel-bar skel-chip" />
      </div>
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

/** The narrow Gideon dock's placeholder. */
export function DockSkeleton() {
  return (
    <div className="section-skeleton dock-skeleton" role="status" aria-live="polite" aria-label="Loading Gideon">
      <span className="skeleton-label">Loading Gideon…</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="skel-bar skel-line" />
      ))}
    </div>
  )
}
