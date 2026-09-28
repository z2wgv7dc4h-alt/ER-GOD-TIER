import { deflateSync, inflateSync } from 'node:zlib'
import type { GrayImage } from './ps5Image'

/**
 * Task 134 — minimal PNG grayscale codec, Node-only.
 *
 * Tesseract exposes the page it decoded as a base64 PNG (`imageGrey`). The browser
 * can read pixels straight off a canvas, but a Node test/eval cannot, so this file
 * is only imported by the Node capture runner (and never by app code, which keeps
 * `node:zlib` out of the browser bundle).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, Buffer.from(data)])), 0)
  return Buffer.concat([len, typeBuf, Buffer.from(data), crc])
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/** Decode an 8-bit PNG (grayscale, RGB, gray+alpha or RGBA) into a GrayImage. */
export function decodeGrayPng(buf: Buffer): GrayImage {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let off = 8
  const idat: Buffer[] = []
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.subarray(off + 4, off + 8).toString('ascii')
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported')
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    off += 12 + len
  }
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`)
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0
  if (!channels) throw new Error(`unsupported PNG color type ${colorType}`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = new Uint8Array(width * height)
  let prev = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = new Uint8Array(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 255
      else if (filter === 2) v = (v + b) & 255
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255
      }
      cur[x] = v
    }
    for (let x = 0; x < width; x++) {
      if (channels === 1) out[y * width + x] = cur[x]
      else if (channels === 2) out[y * width + x] = cur[x * 2]
      else if (channels === 3) out[y * width + x] = (0.299 * cur[x * 3] + 0.587 * cur[x * 3 + 1] + 0.114 * cur[x * 3 + 2]) | 0
      else out[y * width + x] = (0.299 * cur[x * 4] + 0.587 * cur[x * 4 + 1] + 0.114 * cur[x * 4 + 2]) | 0
    }
    prev = cur
  }
  return { width, height, data: out }
}

/** Encode a GrayImage as an 8-bit grayscale PNG (filter 0) for Tesseract. */
export function encodeGrayPng(img: GrayImage): Buffer {
  const { width, height, data } = img
  const stride = width
  const rows = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 0
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(rows, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 0
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', new Uint8Array(0))])
}
