import { describe, expect, it } from 'vitest'
import {
  ICON_DESCRIPTOR_SIZE,
  classFromImagePath,
  decodeDescriptor,
  descriptorSimilarity,
  encodeDescriptor,
  iconDescriptor,
  rankIconCandidates,
  type IconReference,
} from './ps5Icons'
import type { GrayImage } from './ps5Image'

function noise(width: number, height: number, seed = 1): GrayImage {
  const data = new Uint8Array(width * height)
  let x = seed
  for (let i = 0; i < data.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    data[i] = x % 256
  }
  return { width, height, data }
}

function square(size: number, brightness: number, inset = 0): GrayImage {
  const data = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const edge = x < inset || y < inset || x >= size - inset || y >= size - inset
      data[y * size + x] = edge ? 40 : brightness
    }
  }
  return { width: size, height: size, data }
}

describe('icon descriptor', () => {
  it('has the expected length and unit-ish normalisation', () => {
    const d = iconDescriptor(noise(64, 64))
    expect(d.length).toBe(ICON_DESCRIPTOR_SIZE * ICON_DESCRIPTOR_SIZE * 2)
    let sum = 0
    for (let i = 0; i < ICON_DESCRIPTOR_SIZE * ICON_DESCRIPTOR_SIZE; i++) sum += d[i]
    expect(Math.abs(sum)).toBeLessThan(1e-3)
  })

  it('scores an identical image higher than an unrelated one', () => {
    const a = iconDescriptor(square(40, 200, 6))
    const b = iconDescriptor(square(40, 200, 6))
    const c = iconDescriptor(noise(40, 40, 7))
    expect(descriptorSimilarity(a, b)).toBeCloseTo(1, 5)
    expect(descriptorSimilarity(a, b)).toBeGreaterThan(descriptorSimilarity(a, c))
  })
})

describe('descriptor encoding', () => {
  it('round-trips through base64', () => {
    const d = iconDescriptor(noise(48, 48, 3))
    const back = decodeDescriptor(encodeDescriptor(d))
    expect(back.length).toBe(d.length)
    for (let i = 0; i < d.length; i++) expect(Math.abs(back[i] - d[i])).toBeLessThan(0.02)
  })
})

describe('rankIconCandidates', () => {
  it('returns the closest references first', () => {
    const target = iconDescriptor(square(40, 220, 4))
    const far = iconDescriptor(noise(40, 40, 9))
    const refs: IconReference[] = [
      { name: 'far', klass: 'item', d: encodeDescriptor(far) },
      { name: 'close', klass: 'item', d: encodeDescriptor(target) },
    ]
    const top = rankIconCandidates(target, refs, 2)
    expect(top[0].name).toBe('close')
    expect(top[0].confidence).toBeGreaterThan(top[1].confidence)
  })
})

describe('classFromImagePath', () => {
  it('maps the cached image folders to slot classes', () => {
    expect(classFromImagePath('/sourced/images/weapons/x.webp')).toBe('weapon')
    expect(classFromImagePath('/sourced/images/ammos/x.webp')).toBe('ammo')
    expect(classFromImagePath('/sourced/images/talismans/x.webp')).toBe('talisman')
    expect(classFromImagePath('/sourced/images/locations/x.webp')).toBeUndefined()
  })
})
