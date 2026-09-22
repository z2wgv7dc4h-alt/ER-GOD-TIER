/**
 * Medusa's 100% walkthrough route, ingested by scripts/ingest-packs.py from the
 * local Medusa pack (data/en/act*). It is a route/checklist reference: each step
 * carries directions and a goal, grouped act -> chapter -> location.
 *
 * Only the route text is stored (no images); the pack source is kept on the doc.
 */
export type MedusaQuest = {
  id: string
  actId: string
  actName: string
  chapterId: string
  chapterName: string
  title: string
  type: string
  importanceLabel: string
  summary: string
  directions: string
  goal: string
  locationId: string
}
export type MedusaRoute = {
  source: string
  acts: {
    id: string
    order: number
    name: string
    summary: string
    lore: string
    chapters: {
      id: string
      order: number
      actId: string
      name: string
      mainGoal: string
      summary: string
      locations: { id: string; name: string; kind: string; summary: string; dangerLevel?: number }[]
      quests: { id: string; order: number; title: string; type: string; importanceLabel: string; summary: string; directions: string; goal: string; locationId: string }[]
    }[]
  }[]
}

let cache: MedusaRoute | null = null

export async function loadMedusaRoute(): Promise<MedusaRoute> {
  if (cache) return cache
  const r = await fetch('/sourced/open/medusa-route.json')
  if (!r.ok) throw new Error('medusa route ' + r.status)
  cache = (await r.json()) as MedusaRoute
  return cache
}

export function medusaQuests(doc: MedusaRoute): MedusaQuest[] {
  const out: MedusaQuest[] = []
  for (const act of doc.acts) {
    for (const ch of act.chapters) {
      for (const q of ch.quests) {
        out.push({
          id: q.id,
          actId: act.id,
          actName: act.name,
          chapterId: ch.id,
          chapterName: ch.name,
          title: q.title,
          type: q.type,
          importanceLabel: q.importanceLabel,
          summary: q.summary,
          directions: q.directions,
          goal: q.goal,
          locationId: q.locationId,
        })
      }
    }
  }
  return out
}

export function matchMedusa(query: string, rows: MedusaQuest[], limit = 12): MedusaQuest[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows
    .filter((r) => (r.title + ' ' + r.summary + ' ' + r.directions + ' ' + r.chapterName).toLowerCase().includes(q))
    .slice(0, limit)
}

const STOP = new Set([
  'medusa', 'route', 'walkthrough', 'step', 'steps', 'guide', 'full', '100', 'for', 'the', 'and',
  'what', 'where', 'how', 'does', 'does', 'do', 'i', 'to', 'a', 'an', 'of', 'in', 'on', 'next',
  'after', 'before', 'is', 'are', 'get', 'go', 'about', 'tell', 'me', 'say', 'says',
])

/**
 * Find the walkthrough step a free-text question is about, by scoring the
 * significant query words against each step's title (weighted) and body. Used
 * for "medusa route for X" / "where do I go for X" style asks.
 */
export function findMedusaStep(text: string, rows: MedusaQuest[], limit = 3): MedusaQuest[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
  if (words.length === 0) return []
  const scored = rows
    .map((s) => {
      const title = s.title.toLowerCase()
      const body = (s.title + ' ' + s.summary + ' ' + s.directions + ' ' + s.chapterName).toLowerCase()
      let score = 0
      for (const w of words) {
        if (title.includes(w)) score += 2
        else if (body.includes(w)) score += 1
      }
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.s)
}
