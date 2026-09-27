import { useState } from 'react'
import { BUILD_CODE_PREFIX, copyBuildCode, encodeBuildCode, tryDecodeBuildCode } from './lib/buildCode'
import { useWorkspace } from './state'

/**
 * Task 92 row 10: the build-code share/import UI, moved out of the Kit library
 * into one component so both Library → Kit and Tarnished → Update render the
 * exact same path (`encodeBuildCode` / `tryDecodeBuildCode` / `copyBuildCode`).
 */
export function BuildCodeCard() {
  const { character, setCharacter } = useWorkspace()
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [importCode, setImportCode] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function exportBuild() {
    const next = encodeBuildCode({
      level: character.level,
      stats: character.stats,
      loadout: character.loadout,
      name: label.trim() || undefined,
    })
    setCode(next)
    const copied = await copyBuildCode(next)
    setMsg({ ok: true, text: copied ? 'Build code copied to clipboard.' : 'Copy blocked — select the code below.' })
  }

  function importBuild() {
    const result = tryDecodeBuildCode(importCode)
    if (!result.ok) {
      setMsg({ ok: false, text: result.error })
      return
    }
    const { level, stats, loadout, name } = result.build
    setCharacter({ ...character, stats, level, loadout })
    setImportCode('')
    setMsg({
      ok: true,
      text: `Applied ${name ? `“${name}”` : 'build'}: Lv ${level}, ${loadout.length} gear slot${loadout.length === 1 ? '' : 's'}.`,
    })
  }

  return (
    <div className="build-code">
      <p className="note">
        Share just the build — stats, level and gear. Not a packet: it carries no run progress, and
        importing a code never renames your Tarnished.
      </p>
      <div className="opts" style={{ marginTop: 8 }}>
        <input
          className="search"
          style={{ minWidth: 150 }}
          placeholder="Build label (optional)"
          maxLength={40}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="button" className="chip on" onClick={() => void exportBuild()}>
          Export build
        </button>
      </div>
      {code && (
        <input
          className="search"
          style={{ width: '100%', marginTop: 6 }}
          readOnly
          value={code}
          aria-label="Build code"
          onFocus={(e) => e.target.select()}
        />
      )}
      <div className="kicker" style={{ marginTop: 12 }}>Import a build code</div>
      <textarea
        className="search"
        style={{ width: '100%', minHeight: 56, marginTop: 6, resize: 'vertical' }}
        placeholder={`Paste a code starting with ${BUILD_CODE_PREFIX}`}
        value={importCode}
        onChange={(e) => setImportCode(e.target.value)}
      />
      <div className="opts" style={{ marginTop: 6 }}>
        <button type="button" className="chip on" disabled={!importCode.trim()} onClick={importBuild}>
          Apply build code
        </button>
      </div>
      {msg && (
        <p className="note" role="status" style={{ color: msg.ok ? 'var(--ok)' : 'var(--danger)' }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
