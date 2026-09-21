import { useState } from 'react'
import { useWorkspace } from './state'

/**
 * Multi-profile switcher (Task 30). Lives at the top of the rail so the active
 * Tarnished is visible and changeable from every room. Create / switch / rename /
 * delete all route through the existing `vault.ts` functions exposed by the
 * workspace context — this is the only profile system in the app.
 */
export function ProfileSwitcher() {
  const { vault, profile, loadProfile, newProfile, renameProfile, removeProfile } = useWorkspace()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  const saved = new Date(profile.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  function commitRename() {
    const label = draft.trim()
    if (label && label !== profile.label) renameProfile(label)
    setRenaming(false)
  }

  function commitNew() {
    const label = newLabel.trim()
    if (label) newProfile(label)
    setNewLabel('')
    setCreating(false)
  }

  function forget() {
    if (vault.profiles.length < 2) return
    if (window.confirm(`Forget ${profile.label}? This device only.`)) removeProfile(profile.id)
  }

  return (
    <section className="profile-switcher" aria-label="Tarnished profiles">
      <label className="kicker" htmlFor="profile-select">Tarnished · saved {saved}</label>
      {renaming ? (
        <div className="profile-row">
          <input
            className="search"
            autoFocus
            aria-label="Rename Tarnished"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
          />
          <button type="button" className="chip on" onClick={commitRename}>Save</button>
          <button type="button" className="chip" onClick={() => setRenaming(false)}>Cancel</button>
        </div>
      ) : (
        <select
          id="profile-select"
          className="search"
          value={profile.id}
          onChange={(e) => loadProfile(e.target.value)}
        >
          {vault.profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      )}
      {creating ? (
        <div className="profile-row">
          <input
            className="search"
            autoFocus
            aria-label="New Tarnished name"
            placeholder="New Tarnished name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew()
              if (e.key === 'Escape') setCreating(false)
            }}
          />
          <button type="button" className="chip on" onClick={commitNew}>Add</button>
          <button type="button" className="chip" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      ) : (
        <div className="opts">
          <button
            type="button"
            className="chip"
            onClick={() => {
              setDraft(profile.label)
              setRenaming(true)
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setNewLabel('')
              setCreating(true)
            }}
          >
            New
          </button>
          <button
            type="button"
            className="chip"
            disabled={vault.profiles.length < 2}
            onClick={forget}
          >
            Forget
          </button>
        </div>
      )}
      <p className="note profile-hint">Each Tarnished keeps its own character, facts and evidence.</p>
    </section>
  )
}
