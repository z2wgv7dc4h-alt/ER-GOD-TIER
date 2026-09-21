/**
 * Regulation stamp (SCOPE item #6).
 *
 * The Build lab's attack rating is computed from Thomas Clark's
 * `regulation-vanilla-v1.17.json` — the vanilla 1.17 / Tarnished Pack patch
 * line. Everything the app calls a "fact" is keyed to that same line, so both
 * `Character` and the catalog carry this stamp.
 *
 * Task 24 audited the other data sources against it. They do **not** all agree:
 * the atlas marker extract and the FMG/Paramdex name dumps are base-game /
 * vanilla extracts, not the Tarnished Pack overlay. That mismatch is recorded
 * here and surfaced by `regulationAudit()` — it is not papered over by the
 * stamp.
 */

export const REGULATION_STAMP = '1.17-tarnished-pack'

export type RegulationSource = {
  id: string
  label: string
  /** The regulation line this source's data actually derives from. */
  version: string
  /** True when `version` is the same line as `REGULATION_STAMP`. */
  consistent: boolean
  detail: string
}

/**
 * What each data source actually claims, per Task 24's audit. The claims were
 * read from the sources themselves, not copied from SCOPE.md:
 * - Clark's file's upstream commit is literally titled "Tarnished edition"
 *   (2026-08-27) and contains the Tarnished Pack weapon rows.
 * - The local install's own `regulation.bin` (via NpcParam) has no Tarnished
 *   Pack rows — `boss:leontiel`, a Tarnished Pack encounter, is absent.
 * - `names.json` contains zero Shadow of the Erdtree or Tarnished Pack names.
 */
export const REGULATION_SOURCES: RegulationSource[] = [
  {
    id: 'build-lab-ar',
    label: 'Build lab AR — Clark regulation-vanilla-v1.17.json',
    version: REGULATION_STAMP,
    consistent: true,
    detail:
      "ThomasJClark/elden-ring-weapon-calculator's vanilla 1.17 regulation " +
      '(upstream commit 75a0e97, "Tarnished edition", 2026-08-27), vendored byte-for-byte. ' +
      "Carries the Tarnished Pack rows (Idus Sword, Leontiel's Greatsword), so it is the " +
      '1.17 Tarnished Pack line.',
  },
  {
    id: 'marker-extract',
    label: 'Atlas marker extract — vendor/elden-ring-map (local install)',
    version: 'vanilla (local install, no Tarnished Pack overlay)',
    consistent: false,
    detail:
      "EldenRingMap v1.3.0 generated the atlas markers from the local install's own game files. " +
      "The same install's regulation.bin (NpcParam) has no Tarnished Pack rows — boss:leontiel, " +
      'a Tarnished Pack encounter, is absent — so the extract is the base-game regulation, not ' +
      'the Tarnished Pack overlay the Build lab AR is keyed to.',
  },
  {
    id: 'fmg-dump',
    label: 'FMG names — public/sourced/open/names.json',
    version: 'base-game (pre-Shadow of the Erdtree)',
    consistent: false,
    detail:
      'The Text Explorer dump shipped with the initial commit carries no version metadata and ' +
      '6,820 names, none of which are Shadow of the Erdtree or Tarnished Pack names (no Milady, ' +
      'Rellana, Messmer, or Idus). It is a base-game FMG, older than both the marker extract and ' +
      'the AR line.',
  },
  {
    id: 'paramdex',
    label: 'Paramdex names — public/sourced/open/paramdex/',
    version: 'vanilla (no Tarnished Pack)',
    consistent: false,
    detail:
      'soulsmods/Paramdex ER/Names is a vanilla name dump; EquipParamWeapon.txt and NpcParam.txt ' +
      'contain no Tarnished Pack rows. Same base-game line as the marker extract.',
  },
]

export type RegulationAudit = {
  stamp: string
  consistent: boolean
  sources: RegulationSource[]
  mismatched: RegulationSource[]
}

/** True only when every audited source is on `REGULATION_STAMP`. */
export function regulationAudit(): RegulationAudit {
  const mismatched = REGULATION_SOURCES.filter((s) => !s.consistent)
  return { stamp: REGULATION_STAMP, consistent: mismatched.length === 0, sources: REGULATION_SOURCES, mismatched }
}
