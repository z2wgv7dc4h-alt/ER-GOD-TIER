import { describe, expect, it } from 'vitest'
import { classifyFragments, REGION_ANCHORS } from './ps5MapFragments'
import type { ColorImage } from './ps5MapGraces'
import type { MapReference } from './ps5MapReference'
import type { GrayImage } from './ps5Image'

function flatScene(width = 1000, height = 1000, value = 195): { gray: GrayImage; color: ColorImage } {
  const gray: GrayImage = { width, height, data: new Uint8Array(width * height).fill(value) }
  const color: ColorImage = { width, height, rgba: new Uint8ClampedArray(width * height * 4) }
  for (let i = 0; i < width * height; i++) {
    color.rgba[i * 4] = 205
    color.rgba[i * 4 + 1] = 200
    color.rgba[i * 4 + 2] = 175
    color.rgba[i * 4 + 3] = 255
  }
  return { gray, color }
}

function paint(scene: { gray: GrayImage; color: ColorImage }, fx: number, fy: number, r: number) {
  const x = Math.round(fx)
  const y = Math.round(fy)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx
      const yy = y + dy
      if (xx < 0 || yy < 0 || xx >= scene.gray.width || yy >= scene.gray.height) continue
      const p = (yy * scene.gray.width + xx) * 4
      const c = (dx + r) % 20 < 10 ? 30 : 210
      scene.color.rgba[p] = c
      scene.color.rgba[p + 1] = 90
      scene.color.rgba[p + 2] = 40
      scene.gray.data[yy * scene.gray.width + xx] = c
    }
  }
}

const ref: MapReference = { world: 'overworld', width: 1000, height: 1000, features: [] }
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1]

describe('classifyFragments', () => {
  it('marks painted terrain revealed and parchment unrevealed', () => {
    const limgrave = REGION_ANCHORS.find((a) => a.region === 'Limgrave, West')!
    const scene = flatScene()
    paint(scene, (limgrave.xPercent / 100) * ref.width, (limgrave.yPercent / 100) * ref.height, 30)
    const out = classifyFragments(scene.gray, scene.color, IDENTITY, ref, 'overworld')
    const lim = out.find((f) => f.region === 'Limgrave, West')!
    const gel = out.find((f) => f.region === 'Mt. Gelmir')!
    expect(lim.visible).toBe(true)
    expect(lim.revealed).toBe(true)
    expect(gel.revealed).toBe(false)
  })

  it('returns nothing for the underground world', () => {
    const scene = flatScene()
    expect(classifyFragments(scene.gray, scene.color, IDENTITY, ref, 'underground')).toHaveLength(0)
  })
})
