import { useState } from 'react'
import { leftovers } from '../lib/leftovers'
import { worldBanners } from '../lib/worldState'
import { useWorkspace } from '../state'

/** Story-flag ribbon, shared by `me/overview` and `journey/now`. */
export function WorldRibbon() {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const [open, setOpen] = useState(false)
  const banners = worldBanners(character)
  const spoil = character.answers.spoil !== '0'
  const miss = spoil ? leftovers(character) : []
  if (!banners.length && !miss.length) return null
  // Task 107 §8: "N story flags" tells a player nothing. The ribbon leads with
  // the first real world change (a readable sentence), with a count of any
  // further ones; with no banner it names what is still missable here.
  const label = banners.length
    ? `${banners[0].text}${banners.length > 1 ? ` +${banners.length - 1} more` : ''}`
    : `${miss.length} still missable here`
  return (
    <div className={open ? 'world-ribbon open' : 'world-ribbon'}>
      <button
        type="button"
        className="ribbon-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      <div className="ribbon-items">
        {banners.map((b) => (
          <span key={b.id} className={b.tone === 'warn' ? 'warn chip' : 'chip on'}>{b.text}</span>
        ))}
        {miss.slice(0, 2).map((e) => (
          <button key={e.id} type="button" className="chip" onClick={() => { if (e.grace) setSelectedMarkerId(e.grace); setModule('map') }}>
            Still in {e.region}: {e.name}
          </button>
        ))}
      </div>
    </div>
  )
}
