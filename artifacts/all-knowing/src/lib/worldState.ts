import type { Character } from '../types'

export type Banner = {
  id: string
  tone: 'ok' | 'warn' | 'lock'
  text: string
}

function st(c: Character, id: string) {
  if (c.deniedFacts?.includes(id)) return 'false'
  const has =
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  return has ? 'true' : 'unknown'
}

/** Living-world flags the player should see without opening a wiki. */
export function worldBanners(c: Character): Banner[] {
  const q = (id: string) => st(c, id)
  const out: Banner[] = []

  if (q('boss:godrick') === 'true' && q('boss:rennala') !== 'true') {
    out.push({ id: 'academy', tone: 'ok', text: 'Godrick is down. Raya Lucaria still waits if you want a Great Rune.' })
  }
  if (q('boss:radahn') === 'true') {
    out.push({ id: 'festival', tone: 'ok', text: 'Radahn is dead. Festival over. Nokron is open from Fort Haight’s side of Mistwood.' })
  }
  if (q('boss:rykard') === 'true') {
    out.push({ id: 'rykard', tone: 'warn', text: 'Rykard is dead. Volcano Manor invasions are over.' })
  }
  if (q('boss:morgott') === 'true') {
    out.push({ id: 'ashen', tone: 'warn', text: 'Morgott is dead. Leyndell will ash after the Forge. Bolt of Gransax and the Fortified Manor attic are on a clock.' })
  }
  if (q('item:fingerslayer') === 'true' && q('boss:radahn') === 'true') {
    out.push({ id: 'ranni', tone: 'ok', text: 'Fingerslayer is in hand. Give it only to Ranni.' })
  }
  if (q('grace:shadow-keep') === 'true') {
    out.push({ id: 'tree', tone: 'warn', text: 'Shadow Keep is open. Invitations close when you burn the Sealing Tree.' })
  }
  if (c.level > 0 && c.level < 30 && q('boss:godrick') !== 'true') {
    out.push({ id: 'early', tone: 'ok', text: `Level ${c.level}. Stormveil or Weeping is the honest next door, not Caelid.` })
  }
  return out
}
