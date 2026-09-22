"""Refresh the item-name Paramdex dumps from a local Elden Ring install.

`soulsmods/Paramdex` ER/Names is an upstream name dump. The copy vendored here is
post-Shadow-of-the-Erdtree but predates the Tarnished Pack: it has Milady and
Messmer but no Idus Sword or Leontiel's Greatsword.

For the equipment params, a row's display name lives in an FMG table under the
*same numeric id* as the param row (verified: 96-100% of rows), so the missing
rows can be recovered straight from the install:

    EquipParamWeapon    -> WeaponName
    EquipParamGoods     -> GoodsName
    EquipParamProtector -> ProtectorName
    EquipParamAccessory -> AccessoryName
    EquipParamGem       -> GemName

This is additive: existing Paramdex rows are preserved untouched, and only ids
the dump is missing are appended. `NpcParam.txt` is deliberately not touched -
its names are DSMapStudio-resolved (generic model/behaviour names such as
"BuddyStone", "Skeleton (Sword and Shield)") and are not an FMG row-id join, so
it cannot be regenerated this way.

    python scripts/extract-paramdex-names.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install.
"""
import argparse
import importlib.util
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "scripts")
sys.path.insert(0, TOOLS)

from erlib import param  # noqa: E402
from erlib import oodle as oodle_mod  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

PARAMDEX_DIR = os.path.join(ROOT, "public", "sourced", "open", "paramdex")
ERROR_PREFIX = "[ERROR]"
SENTINEL = "dlc dummy"

PARAMS = {
    "EquipParamWeapon": ("EquipParamWeapon.txt", "WeaponName"),
    "EquipParamGoods": ("EquipParamGoods.txt", "GoodsName"),
    "EquipParamProtector": ("EquipParamProtector.txt", "ProtectorName"),
    "EquipParamAccessory": ("EquipParamAccessory.txt", "AccessoryName"),
    "EquipParamGem": ("EquipParamGem.txt", "GemName"),
}


def _load_fmg_module():
    """Load the hyphenated sibling script as a module (its name is not importable)."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract-fmg-names.py")
    spec = importlib.util.spec_from_file_location("extract_fmg_names", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def clean(text):
    if text.startswith(ERROR_PREFIX):
        text = text[len(ERROR_PREFIX):]
    text = text.strip()
    return "" if text.lower() == SENTINEL else text


def read_paramdex(path):
    rows = {}
    if not os.path.isfile(path):
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = line.strip().split(None, 1)
            if len(m) == 2 and m[0].isdigit():
                rows[int(m[0])] = m[1]
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-dir", default=None)
    args = parser.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    params = param.load_params(os.path.join(game_dir, "regulation.bin"))

    fmg_module = _load_fmg_module()
    helper = oodle_mod.make_helper(game_dir)
    tables = fmg_module.load_tables(game_dir, helper)
    name_tables = {
        name_table: {int(k): v for k, v in (tables.get(name_table) or {}).items()}
        for _, name_table, _ in fmg_module.KINDS
    }

    for pname, (filename, fmg_table) in PARAMS.items():
        p = params.get(pname)
        if p is None:
            print(f"  ! {pname} not in regulation.bin, skipping")
            continue
        path = os.path.join(PARAMDEX_DIR, filename)
        existing = read_paramdex(path)
        before = len(existing)
        names = name_tables.get(fmg_table, {})
        added = 0
        for r in p.rows:
            if r.id in existing:
                continue
            nm = clean(str(names.get(r.id, "")))
            if not nm:
                continue
            existing[r.id] = nm
            added += 1
        if added:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                for rid in sorted(existing):
                    f.write(f"{rid} {existing[rid]}\n")
        print(f"  {filename}: {before} -> {len(existing)} (+{added})")


if __name__ == "__main__":
    main()
