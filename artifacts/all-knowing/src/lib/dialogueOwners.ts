/**
 * Dialogue ownership: which NPC speaks a given TalkMsg line.
 *
 * Derived by `scripts/extract-dialogue-owners.py` from the game's own data:
 * each ESD talk script's `TalkID` is matched to the MSB PARTS entry carrying
 * that TalkID, whose `NPCParamID` names the speaker. Only lines a real ESD
 * references are listed, so this is partial — cutscene/menu lines and NPCs
 * with no placed MSB part are not attributed, and nothing is guessed.
 */
export type DialogueOwners = {
  note: string
  /** NPC id (NpcParam row) -> NPC name. */
  npcs: Record<string, string>
  /** TalkMsg id -> owning NPC ids (usually one). */
  byLine: Record<string, string[]>
}

let cache: DialogueOwners | null = null

export async function loadDialogueOwners(): Promise<DialogueOwners> {
  if (cache) return cache
  const r = await fetch('/sourced/open/dialogue-owners.json')
  if (!r.ok) throw new Error(`dialogue owners ${r.status}`)
  cache = (await r.json()) as DialogueOwners
  return cache
}

/**
 * A display label for a line's speaker, or undefined when the line is not
 * attributed. An id with no name source is shown as `npc <id>` so provenance
 * stays visible and nothing is invented.
 */
export function speakerLabel(owners: DialogueOwners, msgId: string): string | undefined {
  const ids = owners.byLine[msgId]
  if (!ids || ids.length === 0) return undefined
  for (const id of ids) {
    const name = owners.npcs[id]
    if (name) return name
  }
  return `npc ${ids[0]}`
}

/** Lines owned by one speaker label, for a per-NPC view. */
export function linesBySpeaker(owners: DialogueOwners): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const [msgId, prefixes] of Object.entries(owners.byLine)) {
    for (const p of prefixes) {
      const label = owners.npcs[p]
      if (!label) continue
      const list = out.get(label) ?? []
      list.push(msgId)
      out.set(label, list)
    }
  }
  return out
}
