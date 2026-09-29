"""Regenerate `public/sourced/open/enemy-drops.json` from the local, unmodded install.

Every `NpcParam` row points at an `ItemLotParam_enemy` (and sometimes
`ItemLotParam_map`) row; that lot carries up to 8 item slots with drop weights.
That is what the game itself says each enemy drops — no wiki, no FanAPI, no name
matching. This is the ground truth for enemy drops.

Read-only: nothing in the install is written. Refuses to run with ER_MOD_DIR set.

    python scripts/extract-enemy-drops.py [--game-dir DIR]
"""
import argparse
import json
import os
import sys

reconfigure = getattr(sys.stdout, "reconfigure", None)
if reconfigure:
    reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "vendor", "elden-ring-map")
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from erlib import param, paramdef  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

OPEN = os.path.join(ROOT, "public", "sourced", "open")
DEFS = os.path.join(ENGINE, "data", "paramdefs")
PARAMDEX = os.path.join(OPEN, "paramdex")

# Category -> FMG name table, the same mapping the game and ItemLot use.
CATEGORY_TABLES = {1: "GoodsName", 2: "WeaponName", 3: "ProtectorName", 4: "AccessoryName", 5: "GemName"}
LOT_TABLES = {"itemLotId_enemy": "ItemLotParam_enemy", "itemLotId_map": "ItemLotParam_map"}
MAX_CHAIN = 10

SOURCE = "Elden Ring regulation.bin NpcParam.itemLotId_{enemy,map} -> ItemLotParam_{enemy,map} (Paramdex defs)"


def write(path, doc):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  -> {os.path.relpath(path, ROOT)}")


def paramdex_names(name):
    out = {}
    path = os.path.join(PARAMDEX, f"{name}.txt")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            p = line.strip().split(None, 1)
            if len(p) == 2 and p[0].lstrip("-").isdigit():
                out[int(p[0])] = p[1].strip()
    return out


def text_table(name):
    path = os.path.join(OPEN, "text", f"{name}.json")
    if not os.path.exists(path):
        return {}
    return {int(k): v for k, v in json.load(open(path, encoding="utf-8")).items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--game-dir", default=None)
    args = ap.parse_args()
    if os.environ.get("ER_MOD_DIR"):
        sys.exit("ER_MOD_DIR is set — this extractor must read the unmodded game only.")

    game = require_game_dir(args.game_dir)
    print(f"game dir: {game}")
    params = param.load_params(os.path.join(game, "regulation.bin"))

    npc_def = paramdef.load(os.path.join(DEFS, "NpcParam.xml"))
    lot_def = paramdef.load(os.path.join(DEFS, "ItemLotParam.xml"))
    npc_rows = {r.id: r for r in params["NpcParam"].rows}
    lots = {table: {r.id: r for r in params[table].rows} for table in LOT_TABLES.values()}
    item_names = {t: text_table(t) for t in CATEGORY_TABLES.values()}
    names = paramdex_names("NpcParam")

    def drops_for(lot_id, table):
        """All named item slots for one lot id, following its consecutive chain."""
        pool = lots[table]
        if lot_id not in pool:
            return []
        chain = [lot_id]
        while chain[-1] + 1 in pool and len(chain) < MAX_CHAIN:
            chain.append(chain[-1] + 1)
        out = []
        for lid in chain:
            row = pool[lid]
            points = [lot_def.get(row.data, f"lotItemBasePoint{s:02d}") for s in range(1, 9)]
            total = sum(points)
            if total <= 0:
                continue
            for s in range(1, 9):
                iid = lot_def.get(row.data, f"lotItemId{s:02d}")
                cat = lot_def.get(row.data, f"lotItemCategory{s:02d}")
                table_name = CATEGORY_TABLES.get(cat)
                if not table_name or iid <= 0 or points[s - 1] <= 0:
                    continue
                nm = item_names.get(table_name, {}).get(iid, "")
                if not nm or nm.startswith("%null%"):
                    continue
                out.append({
                    "item": nm,
                    "category": cat,
                    "chance": round(points[s - 1] / total * 100, 1),
                    "lot": lid,
                })
        return out

    rows = []
    for rid in sorted(npc_rows):
        row = npc_rows[rid]
        drops = []
        seen = set()
        for field, table in LOT_TABLES.items():
            lot_id = npc_def.get(row.data, field)
            # -1 is the paramdef "no lot" sentinel; only a positive id is a lot.
            if lot_id <= 0:
                continue
            for drop in drops_for(lot_id, table):
                key = (drop["item"], drop["lot"])
                if key in seen:
                    continue
                seen.add(key)
                drops.append(drop)
        if not drops:
            continue
        drops.sort(key=lambda d: d["chance"], reverse=True)
        rows.append({"npcParamId": rid, "name": names.get(rid, ""), "drops": drops})

    doc = {"source": SOURCE, "rows": rows}
    write(os.path.join(OPEN, "enemy-drops.json"), doc)
    total = sum(len(r["drops"]) for r in rows)
    print(f"rows written: {len(rows)}  total drops: {total}")
    for row in rows[:5]:
        sample = ", ".join(f'{d["item"]} {d["chance"]}%' for d in row["drops"][:4])
        print(f"  {row['npcParamId']} {row['name']!r}: {sample}")


if __name__ == "__main__":
    main()
