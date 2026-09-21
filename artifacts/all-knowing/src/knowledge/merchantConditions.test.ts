import { describe, expect, it } from 'vitest'
import {
  bellBearingVendors,
  conditionalSellersOfItem,
  matchConditionalStock,
  stockForVendor,
} from './merchantConditions'
import { findSellers } from './merchants'

describe('conditional merchant stock', () => {
  it('answers what the Twin Maiden Husks sell after a named bell bearing', () => {
    const hits = matchConditionalStock(
      "what does twin maiden husks sell after i give sellen's bell bearing",
    )
    expect(hits.length).toBeGreaterThan(0)
    const hit = hits[0]
    expect(hit.soldBy).toBe('Twin Maiden Husks')
    expect(hit.trigger.toLowerCase()).toContain('sellen')
    expect(hit.triggerId).toBe('item:sellen-s-bell-bearing')
    expect(hit.items.length).toBeGreaterThan(0)
  })

  it('answers a prayerbook unlock with the buyer and the trigger', () => {
    const hits = matchConditionalStock(
      'what does corhyn sell after i give the golden order principia',
    )
    const corhyn = hits.find((h) => h.soldBy === 'Brother Corhyn')
    expect(corhyn).toBeTruthy()
    expect(corhyn!.items).toContain("Radagon's Rings of Light")
    expect(corhyn!.triggerId).toBe('item:golden-order-principia')
    // Miriel teaches the same prayerbook at the Church of Vows.
    expect(hits.some((h) => h.soldBy === 'Miriel, Pastor of Vows')).toBe(true)
  })

  it('maps a remembrance boss to Enia stock', () => {
    const hits = matchConditionalStock('what does enia sell after radahn')
    expect(hits.some((h) => h.soldBy === 'Enia' && h.trigger.toLowerCase().includes('radahn'))).toBe(
      true,
    )
  })

  it('finds conditional sellers of an item', () => {
    const hits = conditionalSellersOfItem("Radagon's Rings of Light")
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].soldBy).toBe('Brother Corhyn')
  })

  it('labels findSellers conditional hits with their trigger', () => {
    const hits = findSellers("Radagon's Rings of Light")
    const conditional = hits.find((h) => h.conditional)
    expect(conditional).toBeTruthy()
    expect(conditional!.condition).toContain('Golden Order Principia')
  })

  it('every mapped bell bearing resolves to a real stock row', () => {
    for (const [bearing, vendor] of Object.entries(bellBearingVendors)) {
      expect(stockForVendor(vendor).length, `${bearing} -> ${vendor}`).toBeGreaterThan(0)
    }
  })
})
