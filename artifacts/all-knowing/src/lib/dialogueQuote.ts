import type { DialogueOwners } from './dialogueOwners'

/**
 * Verbatim dialogue quoting for Gideon. Pure: the caller supplies the owner map
 * and the TalkMsg table (both loaded async by the UI). Returns real game lines
 * for a named speaker, optionally narrowed by a topic in the question — never a
 * paraphrase or an invented line. An NPC whose lines are not attributed (most
 * of them) simply returns null, so the router falls through to its other
 * answers instead of making something up.
 */
const ASK = /\b(say|says|said|quote|quotes|dialogue|lines?|voice|words|tell me about)\b/

export function isDialogueAsk(question: string): boolean {
  return ASK.test(question.toLowerCase())
}

export type DialogueQuote = { speaker: string; lines: { id: string; text: string }[] }

export function quoteFor(
  question: string,
  owners: DialogueOwners,
  talkmsg: Record<string, string>,
  limit = 3,
): DialogueQuote | null {
  const q = question.toLowerCase()

  const named = Object.values(owners.npcs)
    .filter((name): name is string => Boolean(name) && q.includes(name.toLowerCase()))
    .sort((a, b) => b.length - a.length)
  if (named.length === 0) return null
  const speaker = named[0]

  // Reverse the owner map once, for this speaker only.
  const owned = new Set<string>()
  for (const [msgId, prefixes] of Object.entries(owners.byLine)) {
    if (prefixes.some((p) => owners.npcs[p] === speaker)) owned.add(msgId)
  }
  if (owned.size === 0) return null

  let lines = [...owned].filter((id) => talkmsg[id]).map((id) => ({ id, text: talkmsg[id] }))

  // Optional topic: the words left after the speaker name and the ask words.
  const stop = /\b(say|says|said|quote|quotes|dialogue|lines?|voice|words|about|regarding|tell|me|the|a|an|what|which|his|her|their|to|of|in|on|does|do)\b/g
  const topic = q
    .replace(new RegExp(speaker.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ')
    .replace(stop, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ''))
    .filter((w) => w.length >= 3)
  if (topic.length) {
    const narrowed = lines.filter((l) => topic.some((w) => l.text.toLowerCase().includes(w)))
    if (narrowed.length) lines = narrowed
  }

  if (lines.length === 0) return null
  lines.sort((a, b) => a.id.localeCompare(b.id))
  return { speaker, lines: lines.slice(0, limit) }
}
