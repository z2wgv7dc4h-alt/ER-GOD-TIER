import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { canonicalFactId } from './aliases'
import indexJson from '../../public/sourced/entity-index.json'

/**
 * Task 189 — Batch C, the game name-table resolution the Task 186 review flagged
 * (FIX LIST items 10–12). The report read `public/sourced/open/text/*Name.json`,
 * dropped `%null%`/`[ERROR]`/blank values and resolved each spelling by
 * normalised name against every record name and every `aliases.json`
 * `fmgName`/`aliases` entry.
 *
 *  - NpcName / PlaceName regressions are aliased in `src/data/game-name-aliases.json`.
 *  - The DLC `Ash of War: <skill>` spellings are folded onto the bare skill record
 *    by `scripts/gen-aliases.mjs`.
 *  - A name with no record anywhere is an intentional gap: the guard below proves
 *    the gap is genuine (no record exists) and locks the count, so a future data
 *    addition fails the test instead of silently staying broken.
 */

type IndexRecord = { id: string; kind: string; name: string }
const records = (indexJson as { records: Record<string, IndexRecord> }).records

const aliasRows = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/sourced/aliases.json', import.meta.url)), 'utf8'),
) as { fmgName: string; aliases?: string[] }[]

const tableValues = (table: string): string[] => {
  const doc = JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../public/sourced/open/text/${table}.json`, import.meta.url)), 'utf8'),
  ) as Record<string, string>
  const out = new Set<string>()
  for (const value of Object.values(doc)) {
    const s = String(value ?? '').trim()
    if (s && s !== '%null%' && s !== '[ERROR]') out.add(s)
  }
  return [...out]
}

/** The report's normal forms: loose (`norm`, drops parentheticals) and strict (`rawNorm`). */
const rawNorm = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[\u2019']s\b/g, '').replace(/[^a-z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim()
const norm = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[\u2019']s\b/g, '').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim()
const appNorm = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

const known = new Set<string>()
for (const rec of Object.values(records)) {
  known.add(rawNorm(rec.name))
  known.add(norm(rec.name))
  known.add(appNorm(rec.name))
}
for (const row of aliasRows) {
  for (const value of [row.fmgName, ...(row.aliases ?? [])]) {
    known.add(rawNorm(value))
    known.add(norm(value))
    known.add(appNorm(value))
  }
}
/** Does the report's method resolve this spelling against a record or alias? */
const resolvesByReportMethod = (value: string): boolean =>
  known.has(rawNorm(value)) || known.has(norm(value)) || known.has(appNorm(value))

describe('Task 189 §11 — NpcName / PlaceName spellings the Task 184 rebuild broke', () => {
  const fixed: [string, string][] = [
    ['Asimi, Eternal King', 'npc:asimi-silver-tear'],
    ['Count Ymir, High Priest', 'hunt:count-ymir-mother-of-fingers'],
    ['Demi-Human Boc', 'npc:boc'],
    ['Pureblood Knight Ansbach', 'enemy:sir-ansbach-npc-specimen-storehouse'],
    ["Night's Cavalry (Glaive)", 'boss:nights-cavalry'],
    ["Night's Cavalry (Flail)", 'boss:nights-cavalry'],
  ]

  it('resolves each through the app resolver to an existing record', () => {
    for (const [name, id] of fixed) {
      expect(canonicalFactId('unknown', name), name).toBe(id)
      expect(records[id], `${name} -> ${id}`).toBeTruthy()
    }
  })

  it('leaves the truly target-less NpcName placeholders unresolved, not mapped to a stranger', () => {
    // "Someone Yet Unseen" is the game's own placeholder for 16 unseen NPCs;
    // "The Noble Broken Mask" has no record at all. Neither may be aliased.
    for (const name of ['Someone Yet Unseen', 'The Noble Broken Mask']) {
      const id = canonicalFactId('unknown', name)
      expect(records[id], `${name} must not resolve to a record`).toBeFalsy()
      expect(resolvesByReportMethod(name), name).toBe(false)
    }
  })

  it('resolves the PlaceName Siofra River Well', () => {
    expect(canonicalFactId('unknown', 'Siofra River Well')).toBe('region:siofra-river')
    expect(records['region:siofra-river']).toBeTruthy()
  })
})

describe('Task 189 §10 — WeaponName base names', () => {
  /** Affinity slots (the report drops any name carrying one of these labels). */
  const AFFINITY = [
    'heavy', 'keen', 'quality', 'fire', 'flame art', 'lightning', 'sacred', 'magic',
    'cold', 'blood', 'occult', 'poison', 'frost', 'holy', 'dark', 'standard',
  ]
  const hasAffinity = (name: string): boolean =>
    AFFINITY.some((a) => new RegExp('(^|\\s)(' + a.replace(/ /g, '\\s+') + ')(\\s|$)', 'i').test(name))

  /**
   * The documented intentional gap: the alternate affinity labels the WeaponName
   * table uses ("Bloody", "Sharp", "Flame", so on) plus the four real names no
   * record exists for. Affinity-only spellings name the base weapon under an
   * affinity; `Royal Soldier Straight Sword` is cut, `Pulley Crossbow`'s record
   * is misnamed "Pulley Bow", and `Great Épée`/`Varré's Bouquet` differ from
   * their records only by an accent the app's normal form cannot fold.
   */
  const GAP = [
    'Arcane Burial Axe', 'Arcane Sharktooth Curved Sword',
    'Blessed Burial Axe', 'Blessed Sharktooth Curved Sword',
    'Bloody Bastard Sword', 'Bloody Buckler', 'Bloody Club', 'Bloody Highland Axe',
    'Bloody Iron Roundshield', 'Bloody Lance', 'Bloody Large Leather Shield',
    'Bloody Longsword', 'Bloody Red Thorn Roundshield', 'Bloody Rickety Shield',
    'Bloody Scimitar', 'Bloody Spear', 'Bloody Twinblade', "Carian Knight's Bloody Shield",
    'Flame Burial Axe', 'Flame Sharktooth Curved Sword',
    'Great Épée', 'Pulley Crossbow',
    'Pyromancy Burial Axe', 'Pyromancy Sharktooth Curved Sword',
    'Royal Soldier Straight Sword',
    'Sharp Burial Axe', 'Sharp Sharktooth Curved Sword',
    "Varré's Bouquet",
  ]

  it('resolves every base weapon name except the documented affinity/cut gap', () => {
    const unresolved = tableValues('WeaponName')
      .filter((v) => !hasAffinity(v))
      .filter((v) => !resolvesByReportMethod(v))
      .sort()
    expect(unresolved).toEqual([...GAP].sort())
  })
})

describe('Task 189 §10 — GemName / ArtsName skill spellings', () => {
  const GEM_GAP = [
    'Ash of War: Buckler Parry',
    'Ash of War: Firebreather',
    'Ash of War: Spinning Chain',
    'Ash of War: Torch Attack',
    'Ashes of War: Invisible Arrow',
    'Ashes of War: Wicked Stance',
    'test gem 1',
    'test gem 2',
    'test gem 3',
  ]

  it('resolves every Ash of War spelling except the test gems and four base skills with no record', () => {
    const unresolved = tableValues('GemName').filter((v) => !resolvesByReportMethod(v)).sort()
    expect(unresolved).toEqual([...GEM_GAP].sort())
  })

  it('resolves the DLC Ash of War spellings through the app resolver to their skill record', () => {
    const pairs: [string, string][] = [
      ['Ash of War: Holy Ground', 'item:holy-ground'],
      ['Ash of War: Dryleaf Whirlwind', 'item:dryleaf-whirlwind'],
      ['Ash of War: Palm Blast', 'item:palm-blast'],
      ['Ash of War: Wall of Sparks', 'item:wall-of-sparks'],
      ['Ash of War: Rolling Sparks', 'item:rolling-sparks'],
      ['Ash of War: Wing Stance', 'item:wing-stance'],
      ['Ash of War: Blinkbolt', 'item:blinkbolt'],
      ['Ash of War: Flame Skewer', 'item:flame-skewer'],
      ['Ash of War: Divine Beast Frost Stomp', 'item:divine-beast-frost-stomp'],
      ['Ash of War: Flame Spear', 'item:flame-spear'],
      ['Ash of War: Carian Sovereignty', 'item:carian-sovereignty'],
      ['Ash of War: Shriek of Sorrow', 'item:shriek-of-sorrow'],
      ['Ash of War: Ghostflame Call', 'item:ghostflame-call'],
      ['Ash of War: The Poison Flower Blooms Twice', 'item:the-poison-flower-blooms-twice'],
      ["Ash of War: Igon's Drake Hunt", 'item:igon-s-drake-hunt'],
      ['Ash of War: Shield Strike', 'item:shield-strike'],
    ]
    for (const [name, id] of pairs) {
      expect(canonicalFactId('unknown', name), name).toBe(id)
      expect(records[id], id).toBeTruthy()
    }
  })

  it('leaves the 134 ArtsName skill spellings that have no record as a genuine gap', () => {
    const unresolved = tableValues('ArtsName').filter((v) => !resolvesByReportMethod(v))
    expect(unresolved.length).toBe(134)
    for (const skill of unresolved) {
      const s = slug(skill)
      for (const id of [`item:skill-${s}`, `item:${s}`, `item:ash-of-war-${s}`]) {
        expect(records[id], `${skill} unexpectedly has ${id}`).toBeFalsy()
      }
    }
  })
})
