import { byId } from '../knowledge/catalog'
import { advise, strongerUpgrades } from './advisor'
import { areaBosses, areaDontMiss, areaNpcs } from './areaHub'
import { closeWorld, knownFactIds } from './infer'
import { activityLine, progressMeters } from './progressStats'
import { scenarioCharacter } from './__fixtures__/scenarios/urmummytoilet'

/**
 * Task 144 §4 — run the scenario characters through the Overview, Area and Now
 * data functions and assert the properties the play-test broke:
 *
 *  - every progress ratio is ≤ 1 and uses a full set;
 *  - player text never contains a raw fact id or asset code;
 *  - no inference contradiction (a known fact whose catalog prerequisites are
 *    not also known);
 *  - lockouts only appear where their trigger or concrete loss is;
 *  - every Now upgrade is a positive, reachable change.
 *
 * `scripts/progress-audit.mjs` and `progressAudit.test.ts` both consume this.
 */

const RAW_FACT_ID = /\b(?:item|boss|grace|region|npc|quest|dungeon|merchant|enemy|weapon|armor|talisman|spell|ash|spirit|material|mapfrag|hunt|gate|build|mechanic|line|invader|area|point|loot|shop|frag|wiki):[a-z0-9][a-z0-9-]*\b/

export type ProgressAudit = {
  scenario: string
  ratios: { id: string; have: number; total: number; ratio: number }[]
  lockouts: string[]
  upgradeCount: number
  violations: string[]
}

export function auditScenario(name: string, character: ReturnType<typeof scenarioCharacter>): ProgressAudit {
  const violations: string[] = []

  // 1. Overview ratios.
  const ratios = progressMeters(character).map((m) => ({
    id: m.label,
    have: m.have,
    total: m.total,
    ratio: m.ratio,
  }))
  for (const m of ratios) {
    if (m.total <= 0) violations.push(`${name}: ${m.id} has no full set (total 0)`)
    if (!(m.ratio >= 0 && m.ratio <= 1)) violations.push(`${name}: ${m.id} ratio ${m.ratio} outside [0,1]`)
    if (m.have > m.total) violations.push(`${name}: ${m.id} have ${m.have} > total ${m.total}`)
  }

  // 2. No raw ids / asset codes in player-facing names.
  const names = [
    ...character.evidence.map((e) => activityLine(e).name),
    ...areaBosses(character, 'Stormveil').map((b) => b.name),
    ...areaNpcs(character, 'Stormveil').map((n) => n.name),
    ...areaDontMiss(character, 'Stormveil').map((d) => d.name),
  ]
  for (const text of names) {
    if (RAW_FACT_ID.test(text)) violations.push(`${name}: raw id in player text: ${text}`)
  }

  // 3. Inference consistency: every known fact's prerequisites are closed.
  const known = knownFactIds(character)
  const expected = new Set(closeWorld([...known], known))
  for (const id of expected) {
    const node = byId.get(id)
    for (const req of node?.implies ?? []) {
      if (!expected.has(req)) violations.push(`${name}: ${id} known but prerequisite ${req} not`)
    }
  }

  // 4. Lockouts are area-scoped: the Seluvis/Nepheli lockout is Roundtable, not
  //    Stormveil, and must not appear in Stormveil's "before you leave".
  const stormveil = areaDontMiss(character, 'Stormveil')
  const lockouts = stormveil.map((d) => d.name)
  if (lockouts.some((l) => /seluvis|nepheli/i.test(l))) {
    violations.push(`${name}: Liurnia/Roundtable lockout shown at Stormveil`)
  }

  // 5. Now upgrades are always positive and reachable.
  const upgrades = strongerUpgrades(advise(character).upgrades)
  for (const u of upgrades) {
    if (u.gainPct <= 0) violations.push(`${name}: non-positive upgrade ${u.name} ${u.gainPct}%`)
    if (!u.reachable) violations.push(`${name}: unreachable upgrade listed: ${u.name}`)
  }

  return { scenario: name, ratios, lockouts, upgradeCount: upgrades.length, violations }
}

export function runProgressAudit(): { scenarios: ProgressAudit[]; violations: string[] } {
  const scenarios = [auditScenario('urmummytoilet', scenarioCharacter())]
  return { scenarios, violations: scenarios.flatMap((s) => s.violations) }
}
