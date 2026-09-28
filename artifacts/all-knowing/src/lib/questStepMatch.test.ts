import { describe, expect, it } from 'vitest'
import { itemEntityNameSet, matchWikiStepToBeat, type AuthoredBeatLike, type WikiStepLike } from './questStepMatch'

/**
 * Task 137 §3 — the matcher must attach a wiki step only on a real location or
 * item signal. Fixtures are the real Sellen / Ranni / Millicent / Alexander data
 * (authored beats from `storylines.ts`, wiki steps from `npc-quests.json`).
 */
const ITEM_NAMES = itemEntityNameSet([
  'Fingerslayer Blade',
  'Carian Inverted Statue',
  'Dark Moon Ring',
  'Unalloyed Gold Needle',
  "Valkyrie's Prosthesis",
  'Shard of Alexander',
  "Alexander's Innards",
  'Stars of Ruin',
])

describe('quest step matcher (Task 137 §3)', () => {
  it('Sellen: attaches the wiki step by the shared Waypoint Ruins location', () => {
    const beat: AuthoredBeatLike = {
      do: 'Free Sellen from the Waypoint Ruins',
      detail: 'Defeat the Mad Pumpkin Head in the cellar below the Liurnia ruins.',
    }
    const wiki: WikiStepLike[] = [
      {
        location: 'Waypoint Ruins',
        action: 'Sellen can be found in the cellar of Waypoint Ruins after defeating the Mad Pumpkin Head.',
      },
      { location: 'Witchbane Ruins', action: 'After Starscourge Radahn has been defeated, talk to Sellen.' },
    ]
    const match = matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })
    expect(match?.index).toBe(0)
    expect(match?.reason).toBe('location')
  })

  it('Ranni: attaches the Fingerslayer Blade step by item overlap, not shared tokens', () => {
    const beat: AuthoredBeatLike = {
      do: 'Retrieve the Fingerslayer Blade',
      detail: 'Night’s Sacred Ground in Nokron. Give it to Ranni, never to Seluvis.',
    }
    const wiki: WikiStepLike[] = [
      { location: 'Caria Manor', action: 'Traverse Caria Manor and defeat Royal Knight Loretta.' },
      {
        location: 'Nokron, Eternal City',
        action: 'Proceed through Nokron to obtain the Fingerslayer Blade.',
      },
    ]
    const match = matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })
    expect(match?.index).toBe(1)
    expect(['item', 'both']).toContain(match?.reason)
  })

  it('Millicent: matches the Erdtree-Gazing Hill beat to its wiki step by location', () => {
    const beat: AuthoredBeatLike = {
      do: 'Meet Millicent at Erdtree-Gazing Hill',
      detail: 'She waits on the Altus plateau road and repeats her thanks.',
    }
    const wiki: WikiStepLike[] = [
      { location: "Caelid (Gowry's Shack)", action: "Return to Gowry's Shack and exhaust Millicent's dialogue." },
      {
        location: 'Altus Plateau (Erdtree-Gazing Hill Ruins)',
        action: 'Find Millicent on a hill north of the Erdtree Gazing Hill Site of Grace.',
      },
    ]
    const match = matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })
    expect(match?.index).toBe(1)
    expect(match?.reason).toBe('location')
  })

  it('Millicent: the Unalloyed Gold Needle beat matches by item', () => {
    const beat: AuthoredBeatLike = {
      do: 'Get the Unalloyed Gold Needle from Commander O’Neil',
      detail: 'Gowry in Sellia asks for it first; O’Neil drops it.',
    }
    const wiki: WikiStepLike[] = [
      { location: 'Caelid (Swamp of Aeonia)', action: 'Millicent can invade in the swamp.' },
      {
        location: "Caelid (Swamp of Aeonia and Gowry's Shack)",
        action: 'Defeat Commander O’Niel to obtain the Unalloyed Gold Needle and bring it to Gowry.',
      },
    ]
    const match = matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })
    expect(match?.index).toBe(1)
    expect(['item', 'both']).toContain(match?.reason)
  })

  it('Alexander: attaches the Gael Tunnel beat by the shared place', () => {
    const beat: AuthoredBeatLike = {
      do: 'Find him again near Gael Tunnel in Caelid',
      detail: 'He waits by the tunnel and asks you to meet him at the Redmane festival.',
    }
    const wiki: WikiStepLike[] = [
      {
        location: 'Limgrave (Gael Tunnel)',
        action: 'Alexander can next be found near the Rear Gael Tunnel Site of Grace.',
      },
      { location: 'Mt Gelmir', action: 'Alexander can be found in a pool of lava south of Fort Laiedd.' },
    ]
    const match = matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })
    expect(match?.index).toBe(0)
    expect(match?.reason).toBe('location')
  })

  it('leaves an unrelated wiki step as its own step (no location or item overlap)', () => {
    const beat: AuthoredBeatLike = {
      do: 'Carry the Innards to Jar-Bairn in Jarburg',
      detail: 'The nephew in Liurnia’s jar village vows to grow as strong as his uncle.',
    }
    const wiki: WikiStepLike[] = [
      {
        location: 'Crumbling Farum Azula',
        action: 'Alexander stands on a floating platform and requests a duel.',
      },
    ]
    expect(matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })).toBeNull()
  })

  it('skips wiki steps already claimed by an earlier beat', () => {
    const beat: AuthoredBeatLike = {
      do: 'Free Sellen from the Waypoint Ruins',
      detail: 'Defeat the Mad Pumpkin Head.',
    }
    const wiki: WikiStepLike[] = [{ location: 'Waypoint Ruins', action: 'Talk to Sellen in the cellar.' }]
    expect(matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES, used: new Set([0]) })).toBeNull()
  })

  it('does not match on token overlap alone', () => {
    const beat: AuthoredBeatLike = { do: 'Find Lusat in the Sellia Hideaway', detail: 'Caelid. Break the illusory wall.' }
    const wiki: WikiStepLike[] = [
      { location: 'Academy of Raya Lucaria', action: 'Find Lusat in the Sellia Hideaway and tell Sellen.' },
    ]
    // "Lusat", "Sellia", "Hideaway" are shared, but no item entity and no
    // location string matches — the step must stay separate.
    expect(matchWikiStepToBeat(beat, wiki, { entityNames: ITEM_NAMES })).toBeNull()
  })
})
