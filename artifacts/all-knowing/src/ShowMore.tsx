/**
 * Task 122 §D3 — Library › Guides pagination.
 *
 * Browse lists used to hard-cap at a dozen rows with no way to see the rest.
 * This is the one "show more" control every long list uses: it starts at
 * `PAGE_SIZE` rows and reveals another page per tap, so the phone scroll stays
 * short while nothing is unreachable.
 */
export const PAGE_SIZE = 12

export function ShowMore({
  total,
  shown,
  onMore,
}: {
  total: number
  shown: number
  onMore: () => void
}) {
  if (shown >= total) return null
  return (
    <div className="opts show-more">
      <button type="button" className="chip" onClick={onMore}>
        Show more · {total - shown} left
      </button>
    </div>
  )
}
