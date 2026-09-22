import { afterEach, describe, expect, it, vi } from 'vitest'
import decodeQR from '@paulmillr/qr/decode.js'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { fromPacket, packetFileName, packetJson, QR_MAX_BYTES } from './packet'
import { handoffCard, packetQr, qrMatrix } from './packetQr'

/**
 * Decode a QR payload from the *same* module matrix the UI renders, as an RGB
 * image, using @paulmillr/qr's decoder — no BarcodeDetector, no camera.
 */
function decodeQrMatrix(text: string): string {
  const matrix = qrMatrix(text)
  const n = matrix.length
  const scale = 8 // matches @paulmillr/qr's grayscale block size
  const quiet = 4
  const width = (n + quiet * 2) * scale
  const data = new Uint8Array(width * width * 3).fill(255)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!matrix[y][x]) continue
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const pixel = ((y + quiet) * scale + dy) * width + ((x + quiet) * scale + dx)
          data[pixel * 3] = 0
          data[pixel * 3 + 1] = 0
          data[pixel * 3 + 2] = 0
        }
      }
    }
  }
  return decodeQR({ width, height: width, data })
}

/** Smallest real packet: an empty character is far under the QR ceiling. */
const tiny: Character = emptyCharacter

/** A 40-fact mid-run whose compact JSON exceeds a QR's capacity. */
const midRun: Character = {
  ...emptyCharacter,
  collectedItems: Array.from({ length: 40 }, (_, i) => `item:x${i}`),
  evidence: Array.from({ length: 40 }, (_, i) => ({
    id: `e${i}`,
    fact: `item:x${i}`,
    source: 'answer' as const,
    confidence: 0.9,
    at: i,
    detail: 'seed',
  })),
}

afterEach(() => vi.restoreAllMocks())

describe('packet QR modes', () => {
  it('packet mode: QR is the exact compact JSON and decodes back to it', async () => {
    // Freeze the packet timestamp so `packetJson` is reproducible.
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const q = await packetQr(tiny)
    expect(q.mode).toBe('packet')
    expect(q.bytes).toBeLessThanOrEqual(QR_MAX_BYTES)
    expect(q.text).toBe(packetJson(tiny))
    expect(decodeQrMatrix(q.text)).toBe(q.text)
    // A scan is a full, valid packet.
    expect((JSON.parse(q.text) as { kind: string }).kind).toBe('all-knowing.packet')
    expect(() => fromPacket(JSON.parse(q.text))).not.toThrow()
  })

  it('handoff mode: a 40-fact run is too large, so the QR is the handoff card', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    const q = await packetQr(midRun)
    const expectedBytes = new TextEncoder().encode(packetJson(midRun)).byteLength
    expect(q.mode).toBe('handoff')
    expect(q.bytes).toBe(expectedBytes)
    expect(q.bytes).toBeGreaterThan(QR_MAX_BYTES)
    expect(q.text.startsWith('ALL-KNOWING-HANDOFF')).toBe(true)
    expect(q.text).toContain(packetFileName(midRun))
    expect(q.text).toMatch(/sha256:[0-9a-f]{64}/)
    expect(q.text).toContain(`bytes:${q.bytes}`)
    expect(q.text).toContain('use Copy or Save for the JSON')
    expect(decodeQrMatrix(q.text)).toBe(q.text)
    // The handoff card is deliberately NOT packet JSON.
    expect(() => JSON.parse(q.text)).toThrow()
  })

  it('handoffCard builds the exact five-line instruction', () => {
    expect(handoffCard('tarnished.all-knowing.json', 'abc123', 4000)).toBe(
      ['ALL-KNOWING-HANDOFF', 'tarnished.all-knowing.json', 'sha256:abc123', 'bytes:4000', 'use Copy or Save for the JSON'].join('\n'),
    )
  })
})
