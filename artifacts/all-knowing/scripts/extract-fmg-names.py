"""Regenerate public/sourced/open/names.json from a local Elden Ring install.

The FMG name dump is the app's item/NPC/place name index (Codex search + the
generated alias plane). The version shipped in the repo's initial commit was a
base-game Text Explorer dump: 6,820 names, no Shadow of the Erdtree and no
Tarnished Pack entries.

This reads the game's own localized message archives instead - base `item` plus
the DLC `item_dlc02` (and any future `item_dlcNN`) - and emits the same
`{id, kind, name, info}` shape the app already consumes, where `id` is
`kind:<FMG text id>`. Running it against a 1.17 / Tarnished Pack install pulls
in the Shadow of the Erdtree and Tarnished Pack names.

    python scripts/extract-fmg-names.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install. Nothing is written into the game directory.
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "vendor", "elden-ring-map", "tools")
sys.path.insert(0, TOOLS)

from erlib import fmg, oodle  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

OUT = os.path.join(ROOT, "public", "sourced", "open", "names.json")

# kind -> (name FMG table, info/caption FMG table or None). This mirrors the
# kind vocabulary the old dump used, which is what openData.ts and
# gen-aliases.mjs key off.
KINDS = [
    ("goods", "GoodsName", "GoodsInfo"),
    ("accessories", "AccessoryName", "AccessoryInfo"),
    ("arts", "ArtsName", "ArtsCaption"),
    ("gems", "GemName", "GemInfo"),
    ("protector", "ProtectorName", "ProtectorInfo"),
    ("npcs", "NpcName", None),
    ("places", "PlaceName", None),
    ("weapon", "WeaponName", "WeaponInfo"),
]

LOCALES = {"en": "engus"}
ERROR_PREFIX = "[ERROR]"
# Each DLC message archive carries a single placeholder row per table at a
# low id, valued "DLC dummy". It must never overwrite the base game's real
# string at that id (e.g. ArtsName id 10 = "No Skill").
SENTINEL = "dlc dummy"


def strip_error(text):
    if text.startswith(ERROR_PREFIX):
        text = text[len(ERROR_PREFIX):]
    return text.strip()


def is_placeholder(text):
    return strip_error(text).lower() == SENTINEL


def load_tables(game_dir, oodle_helper):
    dvd = DvdBnd(game_dir, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    tables = {}
    for folder in LOCALES.values():
        for base in ["item.msgbnd.dcx", "item_dlc02.msgbnd.dcx", "item_dlc03.msgbnd.dcx"]:
            path = f"/msg/{folder}/{base}"
            if not dvd.has(path):
                continue
            data = dvd.read(path)
            for fmg_name, table in fmg.load_msgbnd(data, oodle=oodle_helper).items():
                # `FooName` and `FooName_dlc02` share one id space; merge them,
                # letting DLC rows add new ids but never the dummy placeholder.
                key = fmg_name.split("_dlc")[0]
                dest = tables.setdefault(key, {})
                for tid, value in table.items():
                    if is_placeholder(value):
                        continue
                    dest[tid] = value
    dvd.close()
    return tables


def build_rows(tables):
    rows = []
    for kind, name_table, info_table in KINDS:
        names = tables.get(name_table) or {}
        infos = tables.get(info_table) or {}
        for tid in sorted(names):
            name = strip_error(str(names[tid]))
            if not name:
                continue
            info = ""
            if info_table:
                raw = infos.get(tid)
                if raw:
                    info = strip_error(str(raw))
            rows.append({"id": f"{kind}:{tid}", "kind": kind, "name": name, "info": info})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-dir", default=None, help="...\\ELDEN RING\\Game")
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    helper = oodle.make_helper(game_dir)
    tables = load_tables(game_dir, helper)
    rows = build_rows(tables)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)

    by_kind = {}
    for r in rows:
        by_kind[r["kind"]] = by_kind.get(r["kind"], 0) + 1
    print(f"wrote {args.out}")
    print(f"rows: {len(rows)}")
    for k, _, _ in KINDS:
        print(f"  {k}: {by_kind.get(k, 0)}")


if __name__ == "__main__":
    main()
