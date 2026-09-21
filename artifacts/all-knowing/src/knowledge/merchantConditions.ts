/**
 * Conditional merchant stock — the "what does X sell after I give Y" half of
 * the merchant story (`HANDOFF-CLAUDE.md` §7). `merchants.ts` already carries
 * the *static* vendor rows (106 of them, including a handful of suffixed
 * conditionals like `Brother Corhyn - Golden Order Principia`), but the trigger
 * that opens each suffixed row was never captured, so nothing could answer a
 * conditional question.
 *
 * This file authors that missing trigger layer. The stock itself stays in
 * `merchants.ts` (single source of truth); each entry here only names the row
 * and the in-game condition that unlocks it. Real game knowledge, not param
 * truth — same authoring standard as `collectibles.ts`.
 */
import { merchants } from './merchants'

export type ConditionalUnlock = {
  /** Vendor row in `merchants.ts` this opens, including the " - condition" suffix. */
  vendor: string
  /** Who the player actually buys from, without the suffix. */
  soldBy: string
  /** The item given, boss defeated, or quest beat that opens the stock. */
  trigger: string
  /** Fact id of the trigger, when one exists, so Gideon can log it. */
  triggerId?: string
  /** Lower-cased terms matched against a free-text question. */
  triggerTerms: string[]
  /** One honest line of context. */
  note: string
}

/** Prayerbooks and scrolls hand the vendor new spells/incantations to sell. */
const prayerbookUnlocks: ConditionalUnlock[] = [
  {
    vendor: 'Brother Corhyn - Ancient Dragon Prayerbook',
    soldBy: 'Brother Corhyn',
    trigger: 'Give the Ancient Dragon Prayerbook to Corhyn',
    triggerId: 'item:ancient-dragon-prayerbook',
    triggerTerms: ['ancient dragon prayerbook'],
    note: 'Corhyn teaches the prayerbook’s two incantations for runes.',
  },
  {
    vendor: "Brother Corhyn - Assassin's Prayerbook",
    soldBy: 'Brother Corhyn',
    trigger: "Give the Assassin's Prayerbook to Corhyn",
    triggerId: 'item:assassins-prayerbook',
    triggerTerms: ["assassin's prayerbook", 'assassins prayerbook'],
    note: 'Assassin’s Approach and Darkness become purchasable.',
  },
  {
    vendor: 'Brother Corhyn - Dragon Cult Prayerbook',
    soldBy: 'Brother Corhyn',
    trigger: 'Give the Dragon Cult Prayerbook to Corhyn',
    triggerId: 'item:dragon-cult-prayerbook',
    triggerTerms: ['dragon cult prayerbook'],
    note: 'Dragon Cult incantations become purchasable.',
  },
  {
    vendor: "Brother Corhyn - Fire Monks' Prayerbook",
    soldBy: 'Brother Corhyn',
    trigger: "Give the Fire Monks' Prayerbook to Corhyn",
    triggerId: 'item:fire-monks-prayerbook',
    triggerTerms: ["fire monks' prayerbook", 'fire monks prayerbook'],
    note: 'O Flame! and Surge become purchasable.',
  },
  {
    vendor: "Brother Corhyn - Giant's Prayerbook",
    soldBy: 'Brother Corhyn',
    trigger: "Give the Giant's Prayerbook to Corhyn",
    triggerId: 'item:giants-prayerbook',
    triggerTerms: ["giant's prayerbook", 'giants prayerbook'],
    note: 'Giantsflame Take Thee and Flame become purchasable.',
  },
  {
    vendor: 'Brother Corhyn - Godskin Prayerbook',
    soldBy: 'Brother Corhyn',
    trigger: 'Give the Godskin Prayerbook to Corhyn',
    triggerId: 'item:godskin-prayerbook',
    triggerTerms: ['godskin prayerbook'],
    note: 'Black Flame and Black Flame Blade become purchasable.',
  },
  {
    vendor: 'Brother Corhyn - Golden Order Principia',
    soldBy: 'Brother Corhyn',
    trigger: 'Give the Golden Order Principia to Corhyn',
    triggerId: 'item:golden-order-principia',
    triggerTerms: ['golden order principia'],
    note: 'Opens Radagon’s Rings of Light and Law of Regression.',
  },
  {
    vendor: "Brother Corhyn - Two Fingers' Prayerbook",
    soldBy: 'Brother Corhyn',
    trigger: "Give the Two Fingers' Prayerbook to Corhyn",
    triggerId: 'item:two-fingers-prayerbook',
    triggerTerms: ["two fingers' prayerbook", 'two fingers prayerbook'],
    note: 'Lord’s Heal and Lord’s Aid become purchasable.',
  },
  {
    vendor: 'Brother Corhyn - Goldmask',
    soldBy: 'Brother Corhyn',
    trigger: 'Follow Corhyn’s quest to Goldmask after the Golden Order Principia',
    triggerTerms: ['goldmask', 'gold mask'],
    note: 'Discus of Light appears once Corhyn joins Goldmask on the Altus Plateau.',
  },
  {
    vendor: 'Brother Corhyn - Altus Plateau',
    soldBy: 'Brother Corhyn',
    trigger: 'Meet Corhyn on the Altus Plateau after the Golden Order Principia',
    triggerTerms: ['altus plateau'],
    note: 'Corhyn relocates from Roundtable Hold; Great Heal and Lightning Fortification unlock.',
  },
  {
    vendor: 'Brother Corhyn - Erdtree Sanctuary',
    soldBy: 'Brother Corhyn',
    trigger: 'Reach the Erdtree Sanctuary in Corhyn’s quest',
    triggerTerms: ['erdtree sanctuary'],
    note: 'Immutable Shield is sold once Corhyn reaches the Erdtree Sanctuary.',
  },
  {
    vendor: 'Miriel - Academy Scroll',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Academy Scroll to Miriel',
    triggerId: 'item:academy-scroll',
    triggerTerms: ['academy scroll'],
    note: 'Great Glintstone Shard and Swift Glintstone Shard become purchasable.',
  },
  {
    vendor: 'Miriel - Conspectus Scroll',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Conspectus Scroll to Miriel',
    triggerId: 'item:conspectus-scroll',
    triggerTerms: ['conspectus scroll'],
    note: 'Glintstone Cometshard and Star Shower become purchasable.',
  },
  {
    vendor: 'Miriel - Ancient Dragon Prayerbook',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Ancient Dragon Prayerbook to Miriel',
    triggerId: 'item:ancient-dragon-praybook',
    triggerTerms: ['ancient dragon prayerbook'],
    note: 'Same incantations Corhyn teaches, sold at the Church of Vows.',
  },
  {
    vendor: "Miriel - Assassin's Prayerbook",
    soldBy: 'Miriel, Pastor of Vows',
    trigger: "Give the Assassin's Prayerbook to Miriel",
    triggerTerms: ["assassin's prayerbook", 'assassins prayerbook'],
    note: 'Assassin’s Approach and Darkness become purchasable.',
  },
  {
    vendor: 'Miriel - Dragon Cult Prayerbook',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Dragon Cult Prayerbook to Miriel',
    triggerTerms: ['dragon cult prayerbook'],
    note: 'Dragon Cult incantations become purchasable.',
  },
  {
    vendor: "Miriel - Fire Monks' Prayerbook",
    soldBy: 'Miriel, Pastor of Vows',
    trigger: "Give the Fire Monks' Prayerbook to Miriel",
    triggerTerms: ["fire monks' prayerbook", 'fire monks prayerbook'],
    note: 'O Flame! and Surge become purchasable.',
  },
  {
    vendor: "Miriel - Giant's Prayerbook",
    soldBy: 'Miriel, Pastor of Vows',
    trigger: "Give the Giant's Prayerbook to Miriel",
    triggerTerms: ["giant's prayerbook", 'giants prayerbook'],
    note: 'Giantsflame Take Thee and Flame become purchasable.',
  },
  {
    vendor: 'Miriel - Godskin Prayerbook',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Godskin Prayerbook to Miriel',
    triggerTerms: ['godskin prayerbook'],
    note: 'Black Flame and Black Flame Blade become purchasable.',
  },
  {
    vendor: 'Miriel - Golden Order Principia',
    soldBy: 'Miriel, Pastor of Vows',
    trigger: 'Give the Golden Order Principia to Miriel',
    triggerTerms: ['golden order principia'],
    note: 'Radagon’s Rings of Light and Law of Regression become purchasable.',
  },
  {
    vendor: "Miriel - Two Fingers' Prayerbook",
    soldBy: 'Miriel, Pastor of Vows',
    trigger: "Give the Two Fingers' Prayerbook to Miriel",
    triggerTerms: ["two fingers' prayerbook", 'two fingers prayerbook'],
    note: 'Lord’s Heal and Lord’s Aid become purchasable.',
  },
  {
    vendor: 'Sorceress Sellen - Academy Scroll',
    soldBy: 'Sorceress Sellen',
    trigger: 'Give the Academy Scroll to Sellen',
    triggerId: 'item:academy-scroll',
    triggerTerms: ['academy scroll'],
    note: 'Great Glintstone Shard and Swift Glintstone Shard become purchasable.',
  },
  {
    vendor: 'Sorceress Sellen - Conspectus Scroll',
    soldBy: 'Sorceress Sellen',
    trigger: 'Give the Conspectus Scroll to Sellen',
    triggerId: 'item:conspectus-scroll',
    triggerTerms: ['conspectus scroll'],
    note: 'Glintstone Cometshard and Star Shower become purchasable.',
  },
  {
    vendor: 'Sorceress Sellen - Quest',
    soldBy: 'Sorceress Sellen',
    trigger: 'Finish Sellen’s questline',
    triggerId: 'quest:sellen',
    triggerTerms: ['sellen quest', "sellen's quest", 'finish sellen', 'complete sellen'],
    note: 'Shard Spiral is sold after Sellen’s quest resolves.',
  },
]

/**
 * Enia trades the remembrance of a defeated shardbearer/demigod for their gear.
 * The trigger is the kill, so these reuse the catalog boss slugs.
 */
const eniaUnlocks: ConditionalUnlock[] = [
  ['Enia - Margit', 'Margit, the Fell Omen', 'boss:margit', ['margit', 'fell omen']],
  ['Enia - Godfrey', 'Godfrey / Hoarah Loux', 'boss:godfrey', ['godfrey', 'hoarah loux']],
  ['Enia - Malenia', 'Malenia, Blade of Miquella', 'boss:malenia', ['malenia']],
  ['Enia - Maliketh', 'Maliketh, the Black Blade', 'boss:maliketh', ['maliketh']],
  ['Enia - Messmer the Impaler', 'Messmer the Impaler', 'boss:messmer', ['messmer']],
  ['Enia - Mohg', 'Mohg, Lord of Blood', 'boss:mohg', ['mohg']],
  ['Enia - Radahn', 'Starscourge Radahn', 'boss:radahn', ['radahn', 'starscourge']],
  [
    'Enia - Radahn, Consort of Miquella',
    'Promised Consort Radahn',
    'boss:consort',
    ['consort radahn', 'promised consort'],
  ],
  [
    'Enia - Rellana, Twin Moon Knight',
    'Rellana, Twin Moon Knight',
    'boss:rellana',
    ['rellana'],
  ],
  ['Enia - Rennala', 'Rennala, Queen of the Full Moon', 'boss:rennala', ['rennala']],
  [
    'Enia - Royal Knight Loretta',
    'Royal Knight Loretta',
    'boss:royal-knight-loretta',
    ['royal knight loretta', 'loretta'],
  ],
  ['Enia - Commander Niall', 'Commander Niall', 'boss:commander-niall', ['commander niall', 'niall']],
  ['Enia - Commander Gaius', 'Commander Gaius', 'boss:commander-gaius', ['commander gaius', 'gaius']],
  [
    'Enia - Elemer of the Briar',
    'Elemer of the Briar',
    'boss:elemer',
    ['elemer', 'briar'],
  ],
].map(([vendor, boss, triggerId, terms]) => ({
  vendor: vendor as string,
  soldBy: 'Enia',
  trigger: `Defeat ${boss as string}, then exchange their Remembrance at Enia`,
  triggerId: triggerId as string,
  triggerTerms: terms as string[],
  note: 'Enia’s remembrance stock, Roundtable Hold.',
}))

/** Quest-gated puppet stock. */
const questUnlocks: ConditionalUnlock[] = [
  {
    vendor: 'Preceptor Seluvis - Ranni Quest',
    soldBy: 'Preceptor Seluvis',
    trigger: 'Advance Ranni’s questline to Seluvis’s puppet offer',
    triggerId: 'quest:ranni',
    triggerTerms: ['ranni quest', "ranni's quest", 'ranni puppet'],
    note: 'Seluvis sells puppet ashes only while Ranni’s quest is in progress.',
  },
  {
    vendor: 'Preceptor Seluvis - Dung Eater Quest',
    soldBy: 'Preceptor Seluvis',
    trigger: 'Turn the Dung Eater into a puppet for Seluvis',
    triggerId: 'quest:dung-eater',
    triggerTerms: ['dung eater quest', 'dung eater puppet'],
    note: 'The Dung Eater Puppet unlocks after that step.',
  },
]

/**
 * Bell bearings handed to the Twin Maiden Husks transfer the dead merchant's
 * whole inventory. `bellBearingVendors` maps the bearing to the `merchants.ts`
 * vendor row whose stock she then sells.
 */
export const bellBearingRule =
  'Give a Bell Bearing to the Twin Maiden Husks in Roundtable Hold and she stocks that merchant’s inventory.'

export const bellBearingVendors: Record<string, string> = {
  "Sellen's Bell Bearing": 'Sorceress Sellen',
  "Corhyn's Bell Bearing": 'Brother Corhyn',
  "D's Bell Bearing": 'D Hunter of The Dead',
  "Gowry's Bell Bearing": 'Gowry',
  "Iji's Bell Bearing": 'Iji',
  "Miriel's Bell Bearing": 'Miriel',
  "Patches' Bell Bearing": 'Patches',
  "Pidia's Bell Bearing": 'Pidia Carian Servant',
  "Seluvis's Bell Bearing": 'Preceptor Seluvis',
  "Rogier's Bell Bearing": 'Sorcerer Rogier',
  "Bernahl's Bell Bearing": 'Knight Bernahl',
  "Gostoc's Bell Bearing": 'Gatekeeper Gostoc',
  "Blackguard's Bell Bearing": 'Blackguard Big Boggart',
  "Kalé's Bell Bearing": 'Merchant Kale',
  "Imprisoned Merchant's Bell Bearing": 'Imprisoned Merchant - Mohgwyn',
}

const bellBearingUnlocks: ConditionalUnlock[] = Object.entries(bellBearingVendors).map(
  ([bearing, vendor]) => ({
    vendor,
    soldBy: 'Twin Maiden Husks',
    trigger: `Give ${bearing} to the Twin Maiden Husks`,
    triggerId: `item:${bearing.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
    triggerTerms: [bearing.toLowerCase(), bearing.toLowerCase().replace(/'/g, '')],
    note: bellBearingRule,
  }),
)

/** Bonus Twin Maiden Husks rows the guide tracks as their own vendors. */
const twinMaidenBonus: ConditionalUnlock[] = [
  {
    vendor: 'Twin Maiden Husks - Haligtree',
    soldBy: 'Twin Maiden Husks',
    trigger: 'Give the matching Bell Bearing to the Twin Maiden Husks',
    triggerTerms: ['haligtree bell bearing'],
    note: 'Black Flame’s Protection and Lord’s Divine Fortification arrive with a Haligtree bearing.',
  },
  {
    vendor: 'Twin Maiden Husks - Mohg',
    soldBy: 'Twin Maiden Husks',
    trigger: 'Give the matching Bell Bearing to the Twin Maiden Husks',
    triggerTerms: ['mohg bell bearing'],
    note: 'Law of Causality arrives with the relevant bearing.',
  },
  {
    vendor: 'Twin Maiden Husks - Mohgwyn',
    soldBy: 'Twin Maiden Husks',
    trigger: 'Give the matching Bell Bearing to the Twin Maiden Husks',
    triggerTerms: ['mohgwyn bell bearing'],
    note: 'Fevor’s Cookbook [3] arrives with the Mohgwyn bearing.',
  },
]

export const conditionalUnlocks: ConditionalUnlock[] = [
  ...prayerbookUnlocks,
  ...eniaUnlocks,
  ...questUnlocks,
  ...bellBearingUnlocks,
  ...twinMaidenBonus,
]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

export function stockForVendor(vendor: string): string[] {
  return merchants.find((m) => m.vendor === vendor)?.stock ?? []
}

export type ConditionalHit = {
  vendor: string
  soldBy: string
  trigger: string
  triggerId?: string
  items: string[]
  note: string
}

/**
 * Answer a conditional merchant question. A vendor token (the buyer or the
 * suffix vendor) plus a trigger token ("after I give Y") both narrow the set;
 * either alone still returns useful rows. Mirrors `findSellers`' substring
 * matching so the router and the command bar agree.
 */
export function matchConditionalStock(query: string): ConditionalHit[] {
  const n = norm(query)
  if (n.length < 3) return []
  const triggerRows: ConditionalHit[] = []
  const vendorRows: ConditionalHit[] = []
  for (const u of conditionalUnlocks) {
    const vendorNorm = norm(u.soldBy)
    const rowNorm = norm(u.vendor)
    const vendorHit =
      n.includes(vendorNorm) || n.includes(rowNorm) || vendorNorm.includes(n) || rowNorm.includes(n)
    const triggerHit = u.triggerTerms.some((t) => {
      const term = norm(t)
      return term.length >= 3 && (n.includes(term) || term.includes(n))
    })
    if (!vendorHit && !triggerHit) continue
    const hit: ConditionalHit = {
      vendor: u.vendor,
      soldBy: u.soldBy,
      trigger: u.trigger,
      triggerId: u.triggerId,
      items: stockForVendor(u.vendor),
      note: u.note,
    }
    // A named trigger ("after I give Y") is the stronger signal; prefer those.
    if (triggerHit) triggerRows.push(hit)
    else vendorRows.push(hit)
  }
  return (triggerRows.length ? triggerRows : vendorRows).slice(0, 8)
}

/** Conditional rows that mention the given item in their unlocked stock. */
export function conditionalSellersOfItem(item: string): ConditionalHit[] {
  const n = norm(item)
  if (n.length < 3) return []
  const out: ConditionalHit[] = []
  for (const u of conditionalUnlocks) {
    const items = stockForVendor(u.vendor)
    const match = items.find((i) => norm(i).includes(n) || n.includes(norm(i)))
    if (!match) continue
    out.push({
      vendor: u.vendor,
      soldBy: u.soldBy,
      trigger: u.trigger,
      triggerId: u.triggerId,
      items: [match],
      note: u.note,
    })
  }
  return out.slice(0, 8)
}
