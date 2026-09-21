/**
 * Regulation stamp (SCOPE item #6).
 *
 * The Build lab's attack rating is computed from Thomas Clark's
 * `regulation-vanilla-v1.17.json` — the vanilla 1.17 / Tarnished Pack patch
 * line. Everything the app calls a "fact" is keyed to that same line, so both
 * `Character` and the catalog carry this stamp.
 *
 * Task 24 audited the other data sources against it and found three of four
 * off-stamp. Task 27 diagnosed the cause: the local install *is* the 1.17
 * Tarnished Pack build (its own item FMG carries the Tarnished Pack weapons),
 * but the in-repo FMG dump was a stale base-game third-party extract and the
 * atlas markers had never been regenerated from it. Both have now been
 * regenerated from the install. The one remaining off-stamp source is the
 * upstream `soulsmods/Paramdex` name dump, which has not yet published
 * Tarnished Pack rows.
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
 * What each data source actually derives from, verified against the sources
 * themselves (Task 27 re-read them; Task 24's read was wrong for three of the
 * four because the in-repo dumps were stale third-party extracts, not the
 * install):
 * - Clark's file's upstream commit is literally titled "Tarnished edition"
 *   (2026-08-27) and contains the Tarnished Pack weapon rows.
 * - The local install's own item FMG (base + `item_dlc02`) carries the
 *   Tarnished Pack names (Idus Sword, Leontiel's Greatsword, Milady, Messmer),
 *   so the install is the 1.17 Tarnished Pack build. The atlas markers and the
 *   FMG name dump have been regenerated from it.
 * - The vendored `soulsmods/Paramdex` dump is post-Shadow-of-the-Erdtree but
 *   predates the Tarnished Pack: it has Milady/Messmer but no Idus/Leontiel.
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
    version: REGULATION_STAMP,
    consistent: true,
    detail:
      "Regenerated from this machine's 1.17 Tarnished Pack install by the vendored EldenRingMap " +
      "tool (`python tools/build_markers.py`), which reads the install's own regulation.bin plus " +
      'the DLC message archives. 1,106 markers (208 boss / 413 grace / 157 landmark / 294 poi / ' +
      '34 fragment), including Shadow of the Erdtree areas (Belurat, Shadow Keep, Scadutree ' +
      'Avatar). Game-derived and gitignored, so it is regeneratable-only, not committed.',
  },
  {
    id: 'fmg-dump',
    label: 'FMG names — public/sourced/open/names.json',
    version: REGULATION_STAMP,
    consistent: true,
    detail:
      'Regenerated from the install\'s item + item_dlc02 FMG by ' +
      '`python scripts/extract-fmg-names.py`: 8,767 names (was a 6,820-name base-game Text ' +
      "Explorer dump), now including Shadow of the Erdtree and Tarnished Pack names (Milady, " +
      "Rellana, Messmer, Idus Sword, Leontiel's Greatsword).",
  },
  {
    id: 'paramdex',
    label: 'Paramdex names — public/sourced/open/paramdex/',
    version: 'equipment names on 1.17-tarnished-pack; NpcParam.txt upstream (post-SotE, pre-Tarnished-Pack)',
    consistent: false,
    detail:
      'The equipment name files (EquipParamWeapon/Goods/Protector/Accessory/Gem) were topped up ' +
      'from the install by `python scripts/extract-paramdex-names.py` (row id == FMG text id for ' +
      'these params) and now include the Tarnished Pack rows (Idus Sword, Leontiel\'s Greatsword). ' +
      'NpcParam.txt is still the upstream soulsmods/Paramdex dump: it is post-SotE but predates ' +
      'the Tarnished Pack, and its names are DSMapStudio-resolved (generic model/behaviour names, ' +
      'not an FMG row-id join), so it cannot be regenerated locally. This is the one remaining ' +
      'off-stamp source, and it is external to this repo; the only Tarnished Pack boss it would ' +
      'cover (`boss:leontiel`) is authored-only in the catalog anyway.',
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
