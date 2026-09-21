/**
 * Read-only PC Elden Ring `.sl2` parser — original implementation for All-Knowing.
 *
 * Format understanding (BND4 container, the 10 fixed character slots, the sequential
 * little-endian `UserDataX` walk, the packed event-flag bitfield) is drawn from the
 * public Elden Ring save-format documentation and the ER-Save-Lib / elden-ring-compass
 * reference parsers. The code here is written from scratch: it emits only the fields
 * this app needs, never decompresses the embedded regulation blob, and has no write
 * path of any kind.
 *
 * The `.sl2` layout (PC):
 *   "BND4" + 0x2FC header
 *   10 × slots, each 0x280010 bytes (0x10 MD5 checksum + 0x280000 UserDataX)
 *   UserData10 (profile summary: active-slot mask + per-slot playtime)
 *
 * Everything in the slot is little-endian and byte-packed; we walk the whole slot in
 * field order, capturing what we need and advancing past the rest by its exact size.
 * The embedded `USER_DATA_11` regulation blob (zstd) is never touched.
 */
import type { Stats } from '../../types'
import { BinaryReader, SaveMagicError } from './reader'

const MAGIC = [0x42, 0x4e, 0x44, 0x34] // "BND4"
const HEADER_SIZE = 0x2fc
const SLOT_SIZE = 0x280010
const SLOT_CHECKSUM = 0x10
const SLOTS_START = MAGIC.length + HEADER_SIZE // 0x300
const SLOT_COUNT = 10
const USER_DATA_10_START = SLOTS_START + SLOT_SIZE * SLOT_COUNT

const EVENT_FLAGS_LEN = 0x1bf99f
const PLAYER_GAME_DATA_LEN = 0x1b0
const EQUIP_SLOTS_LEN = 0x58
const EQUIPPED_ARMAMENTS_AND_ITEMS_LEN = 0x9c
const FACE_DATA_LEN = 0x12f
const TROPHY_EQUIP_LEN = 0x34
const GAITEM_GAME_DATA_LEN = 8 + 7000 * 16
const NET_MAN_LEN = 0x20004
const PS5_ACTIVITY_LEN = 0x20

const PROFILE_LEN = 0x24c
const PROFILE_SECONDS_PLAYED_OFFSET = 0x26

const CHARACTER_NAME_BYTES = 32

/** Offsets within the fixed 0x1B0 PlayerGameData block. */
const PGD = {
  hp: 0x08,
  maxHp: 0x0c,
  fp: 0x14,
  maxFp: 0x18,
  stamina: 0x24,
  maxStamina: 0x28,
  vigor: 0x34,
  mind: 0x38,
  endurance: 0x3c,
  strength: 0x40,
  dexterity: 0x44,
  intelligence: 0x48,
  faith: 0x4c,
  arcane: 0x50,
  level: 0x60,
  runes: 0x64,
  characterName: 0x94,
  gender: 0xb6,
  archetype: 0xb7,
  greatRuneOn: 0xf7,
} as const

const utf16le = new TextDecoder('utf-16le')

export type ParsedSlot = {
  /** Slot index 0–9 (the user-facing slot number is +1). */
  index: number
  version: number
  steamId: string
  secondsPlayed: number
  characterName: string
  level: number
  stats: Stats
  archetype: number
  hp: number
  maxHp: number
  fp: number
  maxFp: number
  stamina: number
  maxStamina: number
  runes: number
  deaths: number
  gender: number
  mapId: [number, number, number, number]
  regions: number[]
  lastRestedGrace: number
  eventFlags: Uint8Array
  dlc: { shadowOfErdtree: boolean; preorderTheRing: boolean; preorderRingOfMiquella: boolean }
}

export type ParsedSave = {
  globalSteamId: string
  slots: ParsedSlot[]
}

function readCharacterName(r: BinaryReader, abs: number): string {
  const raw = r.viewAt(abs, CHARACTER_NAME_BYTES)
  let end = 0
  while (end + 1 < raw.length && !(raw[end] === 0 && raw[end + 1] === 0)) end += 2
  return utf16le.decode(raw.subarray(0, end)).replace(/\0+$/, '').trimEnd()
}

function readUserData10(r: BinaryReader) {
  r.seek(USER_DATA_10_START + 0x10) // skip MD5
  r.skip(4) // version
  const globalSteamId = r.u64String()
  r.skip(0x140) // settings
  r.skip(4) // menu blob header
  r.skip(r.u32()) // menu blob
  const active: boolean[] = []
  for (let i = 0; i < SLOT_COUNT; i++) active.push(r.u8() !== 0)
  const secondsPlayed: number[] = []
  for (let i = 0; i < SLOT_COUNT; i++) {
    const start = r.position()
    secondsPlayed[i] = r.u32At(start + PROFILE_SECONDS_PLAYED_OFFSET)
    r.seek(start + PROFILE_LEN)
  }
  return { globalSteamId, active, secondsPlayed }
}

/** Reads the gaitem map entry-by-entry; the stride depends on the handle class. */
function skipGaitem(r: BinaryReader) {
  const handle = r.u32()
  r.skip(4) // item_id
  if (handle === 0) return
  const cls = (handle & 0xf0000000) >>> 0
  if (cls !== 0xc0000000) r.skip(8)
  if (cls === 0x80000000) r.skip(5)
}

function readSlot(r: BinaryReader, index: number, secondsPlayed: number): ParsedSlot {
  const version = r.u32()
  const mapId = r.mapId()
  r.skip(0x18) // unk0x8 + unk0x10

  const gaitemCount = version <= 81 ? 0x13fe : 0x1400
  for (let n = 0; n < gaitemCount; n++) skipGaitem(r)

  const pgd = r.position()
  const characterName = readCharacterName(r, pgd + PGD.characterName)
  const stats: Stats = {
    vigor: r.u32At(pgd + PGD.vigor),
    mind: r.u32At(pgd + PGD.mind),
    endurance: r.u32At(pgd + PGD.endurance),
    strength: r.u32At(pgd + PGD.strength),
    dexterity: r.u32At(pgd + PGD.dexterity),
    intelligence: r.u32At(pgd + PGD.intelligence),
    faith: r.u32At(pgd + PGD.faith),
    arcane: r.u32At(pgd + PGD.arcane),
  }
  const level = r.u32At(pgd + PGD.level)
  const runes = r.u32At(pgd + PGD.runes)
  const hp = r.u32At(pgd + PGD.hp)
  const maxHp = r.u32At(pgd + PGD.maxHp)
  const fp = r.u32At(pgd + PGD.fp)
  const maxFp = r.u32At(pgd + PGD.maxFp)
  const stamina = r.u32At(pgd + PGD.stamina)
  const maxStamina = r.u32At(pgd + PGD.maxStamina)
  const gender = r.byteAt(pgd + PGD.gender)
  const archetype = r.byteAt(pgd + PGD.archetype)
  r.seek(pgd + PLAYER_GAME_DATA_LEN)

  r.skip(0xd * 16) // SPEffects (13 × 16 bytes)
  r.skip(EQUIP_SLOTS_LEN) // equipped equip-index
  r.skip(0x1c) // active weapon slots + arm style
  r.skip(EQUIP_SLOTS_LEN) // equipped item ids
  r.skip(0x58) // chr_asm2 (armaments/armor/talismans)
  r.skip(4 + 0xa80 * 12) // held inventory: count + common capacity × 12 bytes
  r.skip(4 + 0x180 * 12 + 8) // held key inventory + counters
  r.skip(0x74) // equipped spells
  r.skip(0xa * 8 + 4 + 0x6 * 8 + 8) // equip item data (quick + pouch + tail)
  r.skip(0x18) // equipped gestures
  const projectileCount = r.u32()
  r.skip(projectileCount * 8) // acquired projectiles
  r.skip(EQUIPPED_ARMAMENTS_AND_ITEMS_LEN) // redundant item-id mirror
  r.skip(0xc) // equipped physics (physick tears)
  r.skip(FACE_DATA_LEN) // face data
  r.skip(4 + 0x780 * 12) // storage inventory: count + common capacity × 12
  r.skip(4 + 0x80 * 12 + 8) // storage key inventory + counters
  r.skip(64 * 4) // full gesture table

  const regionCount = r.u32()
  const regions: number[] = []
  for (let n = 0; n < regionCount; n++) regions.push(r.u32())

  r.skip(0x29) // horse: coords + map id + angle + hp + state + control byte
  r.skip(0x44) // blood stain
  r.skip(8) // gamedataman unknown pair
  r.skip(4) // menu profile blob header
  r.skip(r.u32()) // menu profile blob
  r.skip(TROPHY_EQUIP_LEN)
  r.skip(GAITEM_GAME_DATA_LEN)
  r.skip(4) // tutorial blob header
  const tutorialSize = r.u32()
  const tutorialCount = r.u32()
  if (tutorialCount !== 0) r.skip(tutorialSize - 4)
  r.skip(3) // gameman bytes
  const deaths = r.u32()
  r.skip(4) // character type
  r.skip(1) // online session flag
  r.skip(4) // character type online
  const lastRestedGrace = r.u32()
  r.skip(1) // not alone flag
  r.skip(8) // countdown timer + gamedataman

  // Event flags: raw packed bitfield, copied so the result detaches from the 28 MB file.
  // Trailing zero bytes carry no flags, so trim them (matches the reference parser).
  const rawFlags = r.viewNext(EVENT_FLAGS_LEN)
  let flagEnd = rawFlags.length
  while (flagEnd > 0 && rawFlags[flagEnd - 1] === 0) flagEnd--
  const eventFlags = rawFlags.slice(0, flagEnd)
  r.skip(1) // terminator
  r.skip(r.i32()) // field_area
  r.skip(r.i32()) // world_area
  r.skip(r.i32()) // world_geom_man
  r.skip(r.i32()) // world_geom_man2
  r.skip(r.i32()) // rend_man
  r.skip(0x20) // player coords + map id + facing angle
  r.skip(1) // game_man byte
  r.skip(12) // unk coords
  r.skip(16) // unk angle
  r.skip(2) // game_man pair
  r.skip(4) // spawn point entity id
  r.skip(4) // game_man
  if (version >= 65) r.skip(4)
  if (version >= 66) r.skip(1)
  r.skip(NET_MAN_LEN)
  r.skip(0xc) // world area weather
  r.skip(0xc) // world area time
  r.skip(0x10) // base version
  const steamId = r.u64String()
  r.skip(PS5_ACTIVITY_LEN)
  const preorderTheRing = r.u8() !== 0
  const shadowOfErdtree = r.u8() !== 0
  const preorderRingOfMiquella = r.u8() !== 0

  return {
    index,
    version,
    steamId,
    secondsPlayed,
    characterName,
    level,
    stats,
    archetype,
    hp,
    maxHp,
    fp,
    maxFp,
    stamina,
    maxStamina,
    runes,
    deaths,
    gender,
    mapId,
    regions,
    lastRestedGrace,
    eventFlags,
    dlc: { shadowOfErdtree, preorderTheRing, preorderRingOfMiquella },
  }
}

/** Parse a PC `.sl2` buffer. Read-only; throws on non-BND4 or truncated input. */
export function parseSave(buffer: ArrayBuffer): ParsedSave {
  const r = new BinaryReader(buffer)
  for (let i = 0; i < MAGIC.length; i++) {
    if (r.byteAt(i) !== MAGIC[i]) throw new SaveMagicError()
  }

  const { globalSteamId, active, secondsPlayed } = readUserData10(r)
  const slots: ParsedSlot[] = []
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!active[i]) continue
    r.seek(SLOTS_START + SLOT_SIZE * i + SLOT_CHECKSUM)
    slots.push(readSlot(r, i, secondsPlayed[i] ?? 0))
  }
  return { globalSteamId, slots }
}
