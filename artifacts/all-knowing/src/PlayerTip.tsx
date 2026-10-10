import type { PlayerTip } from './lib/playerTips'

/**
 * Task 195 §2 — one curated player tip, shown in an existing page with a small
 * "Player tip · patch X" tag so it reads as community advice, not wiki text.
 * Styling matches its neighbours (the surrounding `.note` lists); there is no
 * dedicated tab or page for these.
 */
export function PlayerTipLine({ tip }: { tip: PlayerTip }) {
  return (
    <li className="player-tip">
      <span className="player-tip-tag">Player tip · patch {tip.patch}</span>
      <span className="note">{tip.text}</span>
    </li>
  )
}

export function PlayerTips({ tips }: { tips: PlayerTip[] }) {
  if (!tips.length) return null
  return (
    <ul className="player-tips">
      {tips.map((tip) => (
        <PlayerTipLine key={tip.id} tip={tip} />
      ))}
    </ul>
  )
}

export default PlayerTips
