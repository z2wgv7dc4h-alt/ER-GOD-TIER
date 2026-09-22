/**
 * NPC quest walkthroughs, ripped from the elden-ring-mcp wiki-snapshot DB
 * (`scripts/export-mcp-db.py`): ordered steps per NPC with location, action and
 * whether the step breaks the quest. Complements the authored `storylines.ts`.
 */
export type QuestStep = { id: string; order: number; location: string; action: string; breaks: boolean }
export type NpcQuest = { npc: string; url: string; steps: QuestStep[] }
export type NpcQuestsDoc = { source: string; quests: NpcQuest[] }

let cache: NpcQuestsDoc | null = null

export async function loadNpcQuests(): Promise<NpcQuestsDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/npc-quests.json')
  if (!r.ok) throw new Error('npc quests ' + r.status)
  cache = (await r.json()) as NpcQuestsDoc
  return cache
}

export function findQuest(query: string, quests: NpcQuest[]): NpcQuest | undefined {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return undefined
  const words = new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length >= 4))
  return quests.find((x) => {
    const n = x.npc.toLowerCase()
    if (q.includes(n) || n.includes(q)) return true
    // Match on a distinctive word of the NPC name ("blaidd" for "Blaidd the Half-Wolf").
    return n.split(/[^a-z0-9]+/).some((w) => w.length >= 4 && words.has(w))
  })
}
