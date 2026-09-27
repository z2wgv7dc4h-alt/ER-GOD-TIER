import { useMemo, useState } from 'react'
import type { AtlasWorld } from '../knowledge/graces'
import { labelOf } from '../lib/links'
import { EntityLink } from '../EntityLink'
import { matchNoteLinks, type MapNote } from './notes'

/**
 * Task 111 §2 — the note editor and the Journey › Map › Notes list.
 *
 * Kept out of `Atlas.tsx` so the map's plate/engine logic stays readable. Both
 * components reuse the shell's `.panel` / `.kicker` / `.list` / `.chip` classes
 * so they inherit the phone-first sizing rules.
 */
export function NoteEditor({
  x,
  y,
  world,
  onSave,
  onCancel,
}: {
  x: number
  y: number
  world: AtlasWorld
  onSave: (text: string, entityId?: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [entityId, setEntityId] = useState<string | undefined>(undefined)
  const suggestions = useMemo(() => (entityId ? [] : matchNoteLinks(link)), [link, entityId])

  return (
    <div className="map-note-editor" role="dialog" aria-label="New map note">
      <div className="kicker">New note · {world}</div>
      <label className="map-note-field">
        <span className="note">Note</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          autoFocus
          placeholder="What is here?"
        />
      </label>
      <label className="map-note-field">
        <span className="note">Link entity (optional)</span>
        <input
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setEntityId(undefined)
          }}
          placeholder="e.g. Margit"
        />
      </label>
      {entityId && (
        <p className="note">
          Linked: {labelOf(entityId)}{' '}
          <button type="button" className="chip" onClick={() => setEntityId(undefined)}>
            clear
          </button>
        </p>
      )}
      {!entityId && suggestions.length > 0 && (
        <div className="opts">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              onClick={() => {
                setEntityId(s.id)
                setLink(s.name)
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="opts">
        <button type="button" className="chip on" disabled={!text.trim()} onClick={() => onSave(text, entityId)}>
          Save note
        </button>
        <button type="button" className="chip" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="note">
        Dropped at {x.toFixed(1)}%, {y.toFixed(1)}%
      </p>
    </div>
  )
}

export function MapNotesPanel({
  notes,
  onShow,
  onDelete,
  onAddHere,
  canAddHere,
}: {
  notes: MapNote[]
  onShow: (note: MapNote) => void
  onDelete: (id: string) => void
  onAddHere?: () => void
  canAddHere?: boolean
}) {
  return (
    <section className="map-notes">
      <div className="kicker">Notes</div>
      {notes.length === 0 ? (
        <p className="note">Right-click the map (or long-press on a phone) to drop a note.</p>
      ) : (
        <ul className="list">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="map-note-row" role="button" tabIndex={0} onClick={() => onShow(n)} onKeyDown={(e) => { if (e.key === 'Enter') onShow(n) }}>
                <strong>{n.text}</strong>
                {n.entityId && (
                  <span className="note">
                    <EntityLink id={n.entityId}>{labelOf(n.entityId)}</EntityLink>
                  </span>
                )}
              </span>
              <button type="button" className="chip" aria-label={`Delete note ${n.text}`} onClick={() => onDelete(n.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {onAddHere && (
        <div className="opts" style={{ marginTop: 10 }}>
          <button type="button" className="chip" disabled={!canAddHere} onClick={onAddHere}>
            Drop note here
          </button>
        </div>
      )}
    </section>
  )
}
