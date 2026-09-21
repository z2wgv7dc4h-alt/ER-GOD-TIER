import { WEAPONS } from "@/data/weapons";
import { ARMOR } from "@/data/armor";
import { TALISMANS } from "@/data/talismans";
import { SPELLS } from "@/data/spells";
import { ASHES_OF_WAR } from "@/data/ashes";
import { SPIRITS } from "@/data/spirits";
import { dlcVisible } from "@/data/types";
import { checkId, type Character } from "@/store/ledger";
import { counted } from "@/lib/progress";

function packOn(ch: Character) {
  return { includeDlc: ch.includeDlc, includeTarnished: ch.includeTarnished !== false };
}

export function archiveProgress(ch: Character) {
  const shown = packOn(ch);
  const ids = [
    ...WEAPONS.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.wep(b.id)),
    ...ARMOR.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.arm(b.id)),
    ...TALISMANS.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.tal(b.id)),
    ...SPELLS.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.spl(b.id)),
    ...ASHES_OF_WAR.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.aow(b.id)),
    ...SPIRITS.filter((b) => dlcVisible(b.dlc, shown)).map((b) => checkId.spirit(b.id)),
  ];
  return counted(ids, ch.checks);
}
