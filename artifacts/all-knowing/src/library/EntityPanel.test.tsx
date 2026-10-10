import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { EntityPanel } from './EntityPanel'
import type { LibraryEntity } from './model'

/**
 * Task 103 §4/§5 — the entity panel must switch its action set by kind, and a
 * not-yet-reached prerequisite reads "Ahead of you", never "Locked".
 */

function entity(overrides: Partial<LibraryEntity>): LibraryEntity {
  return {
    id: 'x',
    factId: 'x',
    name: 'X',
    category: 'items',
    ...overrides,
  }
}

describe('EntityPanel kind-specific actions (Task 103 §4)', () => {
  it('shows boss actions and suppresses item actions', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'bosses:margit', factId: 'boss:margit', name: 'Margit, the Fell Omen', category: 'bosses', subtype: 'Great Enemy' })}
        factId="boss:margit"
        character={emptyCharacter}
        onOwnedChange={() => {}}
        onShowOnMap={() => {}}
        onSetGoal={() => {}}
        onAskGideon={() => {}}
        onEquip={() => {}}
        onCompare={() => {}}
      />,
    )
    expect(html).toContain('Mark defeated')
    expect(html).toContain('Show arena on map')
    expect(html).toContain('Set as goal')
    expect(html).not.toContain('Mark owned')
    expect(html).not.toContain('Equip')
  })

  it('shows item actions: owned, equip, compare, show where', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'weapons:uchigatana', factId: 'item:uchigatana', name: 'Uchigatana', category: 'weapons', subtype: 'Katana' })}
        character={emptyCharacter}
        onOwnedChange={() => {}}
        onShowOnMap={() => {}}
        onEquip={() => {}}
        onCompare={() => {}}
      />,
    )
    expect(html).toContain('Mark owned')
    expect(html).toContain('Equip')
    expect(html).toContain('Compare')
    expect(html).toContain('Show where')
    expect(html).not.toContain('Mark defeated')
  })

  it('shows NPC actions', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'npcs:ranni', factId: 'npc:ranni', name: 'Ranni the Witch', category: 'npcs', subtype: 'Witch' })}
        character={emptyCharacter}
        onShowOnMap={() => {}}
        onQuestline={() => {}}
        onAskGideon={() => {}}
      />,
    )
    expect(html).toContain('Show where they are now')
    expect(html).toContain('Questline')
    expect(html).toContain('Ask Gideon')
  })

  it('shows grace actions', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'locations:church-of-elleh', factId: 'grace:elleh', name: 'Church of Elleh', category: 'locations', subtype: 'grace' })}
        character={emptyCharacter}
        onImHere={() => {}}
        onShowOnMap={() => {}}
      />,
    )
    expect(html).toMatch(/I(?:&#x27;|')m here/)
    expect(html).toContain('Show on map')
  })
})

describe('EntityPanel empty grace lore (Task 188 §6)', () => {
  it('hides the Lore tab when a grace carries no description', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'locations:church-of-elleh', factId: 'grace:elleh', name: 'Church of Elleh', category: 'locations', subtype: 'grace' })}
        character={emptyCharacter}
      />,
    )
    expect(html).not.toContain('>Lore<')
    expect(html).not.toContain('No lore text in the data for this entry.')
    expect(html).toContain('>Where<')
  })

  it('keeps the Lore tab for a non-grace that has lore', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'weapons:uchigatana', factId: 'item:uchigatana', name: 'Uchigatana', category: 'weapons', subtype: 'Katana', lore: 'A katana of the Land of Reeds.' })}
        character={emptyCharacter}
      />,
    )
    expect(html).toContain('>Lore<')
  })
})

describe('EntityPanel status wording (Task 144 §1)', () => {
  it('reads "Can’t reach yet" with the reason for an unreachable boss', () => {
    const html = renderToStaticMarkup(
      <EntityPanel
        entity={entity({ id: 'bosses:margit', factId: 'boss:margit', name: 'Margit, the Fell Omen', category: 'bosses', subtype: 'Great Enemy' })}
        factId="boss:margit"
        character={emptyCharacter}
      />,
    )
    expect(html).toContain('Can&#x27;t reach yet')
    expect(html).toContain('reach Castleward Tunnel')
    expect(html).not.toContain('Ahead of you')
  })
})

describe('EntityPanel boss page order (Task 165 §2)', () => {
  const boss = entity({ id: 'bosses:margit', factId: 'boss:margit', name: 'Margit, the Fell Omen', category: 'bosses', subtype: 'Great Enemy' })

  it('reduces a boss page to the Lore and Wiki tabs (Where/Related inline)', () => {
    const html = renderToStaticMarkup(<EntityPanel entity={boss} factId="boss:margit" character={emptyCharacter} />)
    expect(html).toContain('>Lore<')
    expect(html).toContain('>Wiki<')
    expect(html).not.toContain('>Stats<')
    expect(html).not.toContain('>Where<')
    expect(html).not.toContain('>Related<')
  })

  it('keeps all five tabs for a non-boss entity', () => {
    const html = renderToStaticMarkup(
      <EntityPanel entity={entity({ id: 'weapons:uchigatana', factId: 'item:uchigatana', name: 'Uchigatana', category: 'weapons', subtype: 'Katana' })} character={emptyCharacter} />,
    )
    expect(html).toContain('>Stats<')
    expect(html).toContain('>Where<')
    expect(html).toContain('>Related<')
  })
})
