import { useEffect, useState } from 'react'
import type { MapMarker } from '../types'

export type CoordPin = {
  id: string
  name: string
  kind: MapMarker['kind'] | string
  world: string
  x: number
  y: number
  how?: string
  cat?: string
}

let cache: CoordPin[] | null = null

export function useCoords() {
  const [rows, setRows] = useState<CoordPin[]>(cache || [])
  useEffect(() => {
    if (cache) return
    void Promise.all([
      fetch('/sourced/open/coords.json').then((r) => r.json()),
      fetch('/sourced/open/boss-pins.json').then((r) => r.json() as Promise<CoordPin[]>).catch(() => [] as CoordPin[]),
    ]).then(([list, bosses]) => {
      cache = [...(list as CoordPin[]), ...bosses]
      setRows(cache)
    })
  }, [])
  return rows
}

export function matchCoords(text: string, rows: CoordPin[]) {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return [] as CoordPin[]
  return rows.filter((r) => r.name.toLowerCase().includes(n)).slice(0, 12)
}
