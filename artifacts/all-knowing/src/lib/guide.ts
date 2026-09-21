import { useEffect, useState } from 'react'

export type GuideItem = {
  id: string
  name: string
  category?: string
  dlc?: boolean
  missable?: string | null
  quest?: string | null
  how: string
  world?: string
}

export type GuideLeg = {
  region: string
  id: string
  from: string
  to: string
  summary: string
}

let itemsCache: GuideItem[] | null = null
let legsCache: GuideLeg[] | null = null

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

export function matchGuide(q: string, items: GuideItem[], legs: GuideLeg[]) {
  const n = norm(q)
  if (n.length < 3) return { items: [] as GuideItem[], legs: [] as GuideLeg[] }
  return {
    items: items.filter((i) => norm(i.name).includes(n) || norm(i.how).includes(n)).slice(0, 10),
    legs: legs.filter((l) => `${l.region} ${l.from} ${l.to} ${l.summary}`.toLowerCase().includes(n)).slice(0, 6),
  }
}

export function useGuide() {
  const [items, setItems] = useState<GuideItem[]>(itemsCache || [])
  const [legs, setLegs] = useState<GuideLeg[]>(legsCache || [])
  useEffect(() => {
    if (!itemsCache) {
      void fetch('/sourced/guide/catalog.json').then((r) => r.json()).then((rows: GuideItem[]) => {
        itemsCache = rows
        setItems(rows)
      })
    }
    if (!legsCache) {
      void fetch('/sourced/guide/legs.json').then((r) => r.json()).then((rows: GuideLeg[]) => {
        legsCache = rows
        setLegs(rows)
      })
    }
  }, [])
  return { items, legs }
}
