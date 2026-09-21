import { useEffect, useState } from 'react'
import { flaskUpgrades, mapFragments, scadutreeFragments } from '../knowledge/collectibles'

export type OpenName = { id: string; kind: string; name: string; info: string }
export type OpenArea = { id: string; flag: number; region: string; name: string }
export type OpenShop = { id: string; row: number; vendor: string; item: string }
export type OpenAsh = { id: string; name: string }
export type OpenSpell = { id: string; name: string }
export type WorldLot = { flag?: number; lot?: number; map?: string; x?: number; y?: number; z?: number; name: string; cat?: string; src?: string }
export type NamedXyz = { id: string; name: string; flag?: number; map?: string; x?: number; z?: number }

let namesCache: OpenName[] | null = null
let areasCache: OpenArea[] | null = null
let shopsCache: OpenShop[] | null = null
let ashesCache: OpenAsh[] | null = null
let spellsCache: OpenSpell[] | null = null
let lotsCache: WorldLot[] | null = null
let enemiesCache: { id: string; name: string }[] | null = null
let bossXyzCache: NamedXyz[] | null = null

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

export function matchOpen(text: string, names: OpenName[], areas: OpenArea[], shops: OpenShop[] = [], ashes: OpenAsh[] = [], spells: OpenSpell[] = [], lots: WorldLot[] = [], extra: NamedXyz[] = []) {
  const n = norm(text)
  if (n.length < 3) return [] as { id: string; name: string; detail: string }[]
  const hits: { id: string; name: string; detail: string }[] = []
  for (const row of extra) {
    if (norm(row.name).includes(n)) {
      hits.push({ id: row.id, name: row.name, detail: `${row.map || ''} · ${row.x},${row.z}` })
      if (hits.length >= 6) break
    }
  }
  for (const row of lots) {
    if (row.name && norm(row.name).includes(n)) {
      hits.push({ id: `lot:${row.flag || row.lot}`, name: row.name, detail: `${row.map || ''} · flag ${row.flag} · ${row.x},${row.z}` })
      if (hits.length >= 8) break
    }
  }
  for (const row of shops) {
    if (norm(row.item).includes(n) || norm(row.vendor).includes(n)) {
      hits.push({ id: row.id, name: row.item, detail: `buy from ${row.vendor}` })
      if (hits.length >= 8) break
    }
  }
  for (const row of names) {
    if (norm(row.name) === n || (n.length >= 4 && norm(row.name).includes(n))) {
      hits.push({ id: row.id, name: row.name, detail: `${row.kind} · ${row.info}` })
      if (hits.length >= 16) break
    }
  }
  for (const row of areas) {
    if (norm(row.name).includes(n) || n.includes(norm(row.name))) {
      hits.push({ id: row.id, name: row.name, detail: `area flag ${row.flag} · ${row.region}` })
      if (hits.length >= 20) break
    }
  }
  for (const row of spells) {
    if (norm(row.name).includes(n)) {
      hits.push({ id: row.id, name: row.name, detail: 'spell' })
      if (hits.length >= 22) break
    }
  }
  for (const row of ashes) {
    if (norm(row.name).includes(n)) {
      hits.push({ id: row.id, name: row.name, detail: 'spirit ash' })
      if (hits.length >= 24) break
    }
  }
  for (const row of [...scadutreeFragments, ...mapFragments, ...flaskUpgrades]) {
    if (`${row.name} ${row.note} ${row.region}`.toLowerCase().includes(n)) {
      hits.push({ id: row.id, name: row.name, detail: `${row.region} · ${row.note}` })
    }
  }
  return hits
}

export function useOpenData() {
  const [names, setNames] = useState<OpenName[]>(namesCache || [])
  const [areas, setAreas] = useState<OpenArea[]>(areasCache || [])
  const [shops, setShops] = useState<OpenShop[]>(shopsCache || [])
  const [ashes, setAshes] = useState<OpenAsh[]>(ashesCache || [])
  const [spells, setSpells] = useState<OpenSpell[]>(spellsCache || [])
  const [lots, setLots] = useState<WorldLot[]>(lotsCache || [])
  const [extra, setExtra] = useState<NamedXyz[]>(bossXyzCache || [])
  useEffect(() => {
    if (!namesCache) {
      void fetch('/sourced/open/names.json').then((r) => r.json()).then((rows: OpenName[]) => {
        namesCache = rows
        setNames(rows)
      })
    }
    if (!areasCache) {
      void fetch('/sourced/open/game-areas.json').then((r) => r.json()).then((rows: OpenArea[]) => {
        areasCache = rows
        setAreas(rows)
      })
    }
    if (!shopsCache) {
      void fetch('/sourced/open/shops.json').then((r) => r.json()).then((rows: OpenShop[]) => {
        shopsCache = rows
        setShops(rows)
      })
    }
    if (!ashesCache) {
      void fetch('/sourced/open/ashes.json').then((r) => r.json()).then((rows: OpenAsh[]) => {
        ashesCache = rows
        setAshes(rows)
      })
    }
    if (!spellsCache) {
      void fetch('/sourced/open/magic.json').then((r) => r.json()).then((rows: OpenSpell[]) => {
        spellsCache = rows
        setSpells(rows)
      })
    }
    if (!lotsCache) {
      void fetch('/sourced/open/world-lots.json').then((r) => r.json()).then((rows: WorldLot[]) => {
        lotsCache = rows
        setLots(rows)
      })
    }
    if (!bossXyzCache) {
      void fetch('/sourced/open/boss-xyz.json').then((r) => r.json()).then((rows: NamedXyz[]) => {
        bossXyzCache = rows
        setExtra((cur) => [...rows, ...cur])
      })
    }
    if (!enemiesCache) {
      void fetch('/sourced/open/enemies.json').then((r) => r.json()).then((rows: { id: string; name: string }[]) => {
        enemiesCache = rows
        setExtra((cur) => [...cur, ...rows.map((e) => ({ id: `enemy:${e.id}`, name: e.name }))])
      })
    }
  }, [])
  return { names, areas, shops, ashes, spells, lots, extra, ready: names.length > 0 }
}
