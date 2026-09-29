import { byId } from '../knowledge/catalog'
import { advise, strongerUpgrades } from './advisor'
import { areaBosses, areaCompletion, areaDontMiss, areaGraces, areaNpcs } from './areaHub'
import { canonicalFactId } from './aliases'
import { resolvedFactIds } from './infer'
import { activityLine, progressMeters } from './progressStats'
import { scenarioCharacter } from './__fixtures__/scenarios/urmummytoilet'
import { AUDIT_AREAS, progressionScenarios } from './__fixtures__/scenarios/progression'

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
  const names = character.evidence.map((e) => activityLine(e).name)
  for (const area of AUDIT_AREAS) {
    names.push(
      ...areaBosses(character, area).map((b) => b.name),
      ...areaNpcs(character, area).map((n) => n.name),
      ...areaDontMiss(character, area).map((d) => d.name),
    )
  }
  for (const text of names) {
    if (RAW_FACT_ID.test(text) || /^[A-Za-z]+:[a-z0-9]/.test(text)) violations.push(`${name}: raw id in player text: ${text}`)
  }

  // 3. Inference consistency, on what the screens show. Every area tick must
  //    agree with the resolver, and a shown-done fact's prerequisite may only
  //    be shown not-done when the player explicitly denied it.
  const resolved = resolvedFactIds(character)
  const denied = new Set((character.deniedFacts ?? []).map((id) => canonicalFactId(id)))
  for (const area of AUDIT_AREAS) {
    const rows = [...areaBosses(character, area), ...areaGraces(character, area)]
    for (const row of rows) {
      if (row.done !== resolved.has(canonicalFactId(row.id))) {
        violations.push(`${name}: ${area} shows ${row.name} ${row.done ? 'done' : 'not done'}, resolver disagrees`)
      }
    }
    const c = areaCompletion(character, area)
    for (const [k, v] of Object.entries({ graces: c.graces, bosses: c.bosses, items: c.items, dungeons: c.dungeons })) {
      if (v.have > v.total) violations.push(`${name}: ${area} ${k} ${v.have}/${v.total}`)
    }
  }
  for (const id of resolved) {
    for (const req of byId.get(id)?.implies ?? []) {
      const r = canonicalFactId(req)
      if (!resolved.has(r) && !denied.has(r)) violations.push(`${name}: ${id} done but prerequisite ${req} not`)
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
  const scenarios = [
    auditScenario('urmummytoilet', scenarioCharacter()),
    ...progressionScenarios.map((s) => auditScenario(s.name, s.character())),
  ]
  return { scenarios, violations: scenarios.flatMap((s) => s.violations) }
}
