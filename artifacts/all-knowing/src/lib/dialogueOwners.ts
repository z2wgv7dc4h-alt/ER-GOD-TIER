/**
 * Dialogue ownership: which NPC speaks a given TalkMsg line.
 *
 * Derived by `scripts/extract-dialogue-owners.py` from the game's ESD talk
 * scripts (named per-NPC, e.g. `t213006000.esd`) joined through `TalkParam`
 * (`msgId`) to `TalkMsg`. Only lines a real ESD references are listed, so this
 * is partial: cutscene/menu lines and scripts that name no NpcParam family are
 * not attributed, and an unknown family is surfaced by code rather than guessed
 * at a name.
 */
export type DialogueOwners = {
  note: string
  /** owner prefix -> NpcParam row id it was named from. */
  npcRows: Record<string, number>
  /** owner prefix -> NPC name (only families Paramdex/combat data can name). */
  npcs: Record<string, string>
  /** prefixes seen in ESDs that no name source covers. */
  unresolvedPrefixes: string[]
  /** TalkMsg id -> owning prefixes (usually one). */
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
 * attributed. A named family wins over an unnamed one; an unnamed family is
 * shown as `npc <prefix>` so the provenance is visible and nothing is invented.
 */
export function speakerLabel(owners: DialogueOwners, msgId: string): string | undefined {
  const prefixes = owners.byLine[msgId]
  if (!prefixes || prefixes.length === 0) return undefined
  for (const p of prefixes) {
    const name = owners.npcs[p]
    if (name) return name
  }
  return `npc ${prefixes[0]}`
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
