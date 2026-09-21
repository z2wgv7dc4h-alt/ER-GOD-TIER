/**
 * Little-endian cursor over a `.sl2` ArrayBuffer.
 *
 * Original implementation for All-Knowing. The Elden Ring save format is a BND4
 * container of fixed-size, uncompressed, little-endian character slots; this reader
 * only needs sequential reads/skips plus absolute reads for the fixed-offset
 * PlayerGameData block. It is strictly bounds-checked because it parses untrusted
 * user files, and it never exposes a write path.
 */

export class SaveTruncatedError extends Error {
  readonly at: number
  readonly need: number
  readonly length: number

  constructor(at: number, need: number, length: number) {
    super(`Save ended early (needed ${need} bytes at ${at}, file is ${length}).`)
    this.name = 'SaveTruncatedError'
    this.at = at
    this.need = need
    this.length = length
  }
}

export class SaveMagicError extends Error {
  constructor() {
    super('That file is not a PC Elden Ring save (missing the BND4 header).')
    this.name = 'SaveMagicError'
  }
}

export class BinaryReader {
  private readonly view: DataView
  private readonly bytes: Uint8Array
  private pos = 0

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer)
    this.bytes = new Uint8Array(buffer)
  }

  get length() {
    return this.bytes.length
  }

  position() {
    return this.pos
  }

  seek(to: number) {
    if (to < 0 || to > this.bytes.length) throw new SaveTruncatedError(to, 0, this.bytes.length)
    this.pos = to
  }

  private take(n: number): number {
    const at = this.pos
    if (at + n > this.bytes.length) throw new SaveTruncatedError(at, n, this.bytes.length)
    this.pos = at + n
    return at
  }

  skip(n: number) {
    if (n < 0) throw new SaveTruncatedError(this.pos, n, this.bytes.length)
    this.take(n)
  }

  u8() {
    return this.view.getUint8(this.take(1))
  }

  u16() {
    return this.view.getUint16(this.take(2), true)
  }

  u32() {
    return this.view.getUint32(this.take(4), true)
  }

  i32() {
    return this.view.getInt32(this.take(4), true)
  }

  f32() {
    return this.view.getFloat32(this.take(4), true)
  }

  /** Steam ids are u64 and overflow JS numbers, so keep them as decimal strings. */
  u64String() {
    return this.view.getBigUint64(this.take(8), true).toString()
  }

  /** A 4-byte MapId, copied so it detaches from the backing buffer. */
  mapId(): [number, number, number, number] {
    const at = this.take(4)
    return [this.view.getUint8(at), this.view.getUint8(at + 1), this.view.getUint8(at + 2), this.view.getUint8(at + 3)]
  }

  u32At(abs: number) {
    if (abs < 0 || abs + 4 > this.bytes.length) throw new SaveTruncatedError(abs, 4, this.bytes.length)
    return this.view.getUint32(abs, true)
  }

  byteAt(abs: number) {
    if (abs < 0 || abs + 1 > this.bytes.length) throw new SaveTruncatedError(abs, 1, this.bytes.length)
    return this.view.getUint8(abs)
  }

  viewAt(abs: number, len: number): Uint8Array {
    if (abs < 0 || abs + len > this.bytes.length) throw new SaveTruncatedError(abs, len, this.bytes.length)
    return this.bytes.subarray(abs, abs + len)
  }

  /** Zero-copy view of the next `len` bytes (used for the event-flag bitfield). */
  viewNext(len: number): Uint8Array {
    const at = this.take(len)
    return this.bytes.subarray(at, at + len)
  }
}
