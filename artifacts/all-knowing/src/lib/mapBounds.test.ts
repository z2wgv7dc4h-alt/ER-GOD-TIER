import { describe, expect, it } from 'vitest'
import { contentBounds, type TileRows } from './mapBounds'

describe('contentBounds', () => {
  it('returns null when there is nothing to show', () => {
    expect(contentBounds(null, 6)).toBeNull()
    expect(contentBounds(undefined, 6)).toBeNull()
    expect(contentBounds({}, 6)).toBeNull()
    expect(contentBounds({ '6': [] }, 6)).toBeNull()
    expect(contentBounds({ '5': [[1, 1]] }, 6)).toBeNull()
  })

  it('bounds a single tile', () => {
    expect(contentBounds({ '6': [[5, 7]] }, 6)).toEqual([1280, 1792, 1536, 2048])
  })

  it('bounds a fully-covered 41x41 master to the whole canvas', () => {
    const rows: [number, number][] = []
    for (let x = 0; x < 41; x++) for (let y = 0; y < 41; y++) rows.push([x, y])
    expect(contentBounds({ '6': rows }, 6)).toEqual([0, 0, 10496, 10496])
  })

  it('bounds the 16x10 M11 patch, not the full square', () => {
    // M11: archived cells cols 18-33, rows 11-20; write_pyramid flips row to
    // canvas y = (41 - 1 - row), so the index spans x 18-33, y 20-29.
    const rows: [number, number][] = []
    for (let x = 18; x <= 33; x++) for (let y = 20; y <= 29; y++) rows.push([x, y])
    expect(contentBounds({ '6': rows }, 6)).toEqual([4608, 5120, 8704, 7680])
  })

  it('ignores lower zooms so the downscale halo cannot inflate the bounds', () => {
    const tiles: TileRows = {
      '6': [[18, 20], [33, 29]],
      // halo tiles one ring out, present only after LANCZOS downscaling
      '5': [[8, 9], [17, 15]],
    }
    expect(contentBounds(tiles, 6)).toEqual([4608, 5120, 8704, 7680])
  })

  it('honours a non-default tile size', () => {
    expect(contentBounds({ '6': [[1, 2]] }, 6, 512)).toEqual([512, 1024, 1024, 1536])
  })
})
