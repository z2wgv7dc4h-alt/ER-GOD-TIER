import { gideonBaseUrl, gideonKey, gideonModel } from './muse'
import type { EquipmentRead } from './equipmentOcr'

/**
 * Read a character/equipment screen with Muse vision. OCR can read the numbers
 * but not the equipment icons; Muse is multimodal, so we send the image and ask
 * for the level, the eight attributes and the equipped gear names as schema-
 * constrained JSON. Returns null with no key or on any failure, so the caller
 * falls back to Tesseract + `parseEquipmentText`.
 */
const SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'CharacterScreen',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        level: { type: ['integer', 'null'] },
        vigor: { type: ['integer', 'null'] },
        mind: { type: ['integer', 'null'] },
        endurance: { type: ['integer', 'null'] },
        strength: { type: ['integer', 'null'] },
        dexterity: { type: ['integer', 'null'] },
        intelligence: { type: ['integer', 'null'] },
        faith: { type: ['integer', 'null'] },
        arcane: { type: ['integer', 'null'] },
        gear: { type: 'array', items: { type: 'string' } },
      },
      required: ['level', 'vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane', 'gear'],
    },
  },
} as const

const PROMPT =
  'This is an Elden Ring character/equipment screen. Read the character level, the eight attributes ' +
  '(Vigor, Mind, Endurance, Strength, Dexterity, Intelligence, Faith, Arcane) and the names of the ' +
  'equipped weapons, armour and talismans. Use the on-screen numbers and icon labels; null any value ' +
  'you cannot read. Never guess.'

export async function readCharacterScreen(imageDataUrl: string, timeoutMs = 45000): Promise<EquipmentRead | null> {
  const key = gideonKey()
  if (!key) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${gideonBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: gideonModel(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        response_format: SCHEMA,
        reasoning_effort: 'minimal',
        max_tokens: 800,
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const text = data.choices?.[0]?.message?.content
    if (typeof text !== 'string') return null
    const raw = JSON.parse(text) as Record<string, number | string[] | null>
    const stats: EquipmentRead['stats'] = {}
    for (const k of ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane'] as const) {
      const v = raw[k]
      if (typeof v === 'number' && v >= 1 && v <= 99) stats[k] = v
    }
    return {
      level: typeof raw.level === 'number' ? raw.level : undefined,
      stats,
      gear: Array.isArray(raw.gear) ? raw.gear.filter((g): g is string => typeof g === 'string' && g.length > 1) : [],
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
