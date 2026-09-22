import { encode, renderSVG } from 'uqr'
import type { Character } from '../types'
import { QR_MAX_BYTES, packetFileName, packetHash, packetJson } from './packet'

/**
 * Scannable QR for the packet handoff (Task 63).
 *
 * Encoder: `uqr` 0.1.3 — MIT, zero dependencies, `encode` + `renderSVG` (single
 * ESM bundle). It is a normal pinned dependency (not vendored); the decoder used
 * only by the test suite (`@paulmillr/qr`) is a devDependency and never enters
 * the app bundle.
 *
 * Two modes, decided by the *encoded byte length* of the exact compact JSON that
 * `copyPacket` copies:
 *  - `packet`  — the JSON fits a QR (≤ `QR_MAX_BYTES`, 2953 = version 40, ECC L,
 *                byte mode). The QR is the real packet: scan it and you have the
 *                whole thing.
 *  - `handoff` — the JSON is larger. We QR a short instruction card (filename +
 *                SHA-256 + byte count). The QR never holds a truncated packet,
 *                never multi-tiles, never gzips, and never goes in a URL.
 */

export type PacketQrMode = 'packet' | 'handoff'

export type PacketQr = {
  mode: PacketQrMode
  /** Exact compact JSON (packet) or the handoff card text (handoff). */
  text: string
  /** UTF-8 byte length of the packet JSON (not of the card). */
  bytes: number
  /** Packet SHA-256 hex; present in handoff mode (empty when no secure context). */
  hash?: string
  svg: string
}

/** The handoff card: short, scannable, and never the packet itself. */
export function handoffCard(fileName: string, hash: string, bytes: number): string {
  return [
    'ALL-KNOWING-HANDOFF',
    fileName,
    `sha256:${hash}`,
    `bytes:${bytes}`,
    'use Copy or Save for the JSON',
  ].join('\n')
}

/** High-contrast SVG for any text. Pure black on white scans best. */
export function qrSvg(text: string): string {
  return renderSVG(text, { ecc: 'L', border: 2, blackColor: '#000000', whiteColor: '#ffffff' })
}

/**
 * The encoded module matrix (no border) for a QR payload — the exact modules the
 * SVG draws. Exposed so the test can decode the same data without a camera.
 */
export function qrMatrix(text: string): boolean[][] {
  return encode(text, { ecc: 'L', border: 0 }).data
}

export async function packetQr(character: Character): Promise<PacketQr> {
  const json = packetJson(character)
  const bytes = new TextEncoder().encode(json).byteLength
  if (bytes <= QR_MAX_BYTES) {
    return { mode: 'packet', text: json, bytes, svg: qrSvg(json) }
  }
  const hash = (await packetHash(character)) || ''
  const text = handoffCard(packetFileName(character), hash, bytes)
  return { mode: 'handoff', text, bytes, hash, svg: qrSvg(text) }
}
