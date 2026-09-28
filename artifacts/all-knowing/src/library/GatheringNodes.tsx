import { useState } from 'react'
import { matchGatheringNodes, useGatheringNodes } from '../lib/gatheringNodes'

/**
 * Task 62 / Task 95 — gathering-node placements stay in the Library and stay
 * labelled honestly. The dump has model codes, not item names, so these are
 * placement records: never a map pin, never a Gideon answer, and never given a
 * "Show on map" affordance.
 */
export function GatheringNodes() {
  const nodes = useGatheringNodes()
  const [query, setQuery] = useState('')
  const hits = matchGatheringNodes(query, nodes, 20)

  return (
    <section className="lib-gathering">
      <h3 className="lib-gathering-head">
        Gathering nodes · {nodes.length} placements — unverified placement, model code only
      </h3>
      <p className="note">
        Placement records for gathering-node assets (bushes, rocks, pots, etc.). The model code is
        generic (e.g. AEG099_821) and the dump carries no item field, so this is not a material
        location — it is not drawn on the map and Gideon will not answer “where is X” from it.
        Search by region, map, or model.
      </p>
      <input
        className="lib-search"
        type="search"
        value={query}
        placeholder="Search region, map, or model code…"
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search gathering nodes"
      />
      {query.trim().length >= 3 ? (
        hits.length > 0 ? (
          <div className="lib-gathering-list">
            {hits.map((n) => (
              <div key={n.id} className="lib-gathering-row">
                <span className="kicker">
                  {n.world} · {n.region || n.map} · area {n.area}
                </span>
                <strong>{n.model}</strong>
                <span className="note">
                  {n.map} · x {n.x.toFixed(1)}, y {n.y.toFixed(1)}, z {n.z.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="note">No placements match that query.</p>
        )
      ) : (
        <p className="note">Type at least three characters to search {nodes.length || '…'} placements.</p>
      )}
    </section>
  )
}
