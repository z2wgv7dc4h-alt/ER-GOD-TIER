"""Where each talking NPC stands, projected to the map's pixel frame.

Walks every map's MSB PARTS list, keeps the NPCs that actually have dialogue
(those in `open/dialogue-owners.json`; enemy spawns are excluded — that set is
`open/msb-enemies.json`), and projects each local position to the master-image
pixel space using the exact affine the engine uses (`server/lib/project.js`,
mirrored from `tools/build_markers.py`):

    overworld (area 60/61):  px = block*256 + 128 + x - 7168
                             py = 16640 - (mapno*256 + 128 + z)
    legacy dungeons:         translated to overworld via WorldMapLegacyConv rows
                             (`vendor/elden-ring-map/data/legacy-conv.json`)

So `px`/`py` are in the SAME frame the Atlas plates use (`percent = px/10496*100`)
and the interactive engine's markers use, and can be drawn directly.

    public/sourced/npc-placements.json
    { "source", "placements": [ {npc, name, map, x, y, z, px, py, world} ] }

    python scripts/extract-npc-placements.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install.
"""
import argparse
import json
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "vendor", "elden-ring-map", "tools")
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from erlib import dcx, msb, oodle  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

MAPLIST = os.path.join(ROOT, "vendor", "elden-ring-map", "cache", "map-list.txt")
MSBENEMIES = os.path.join(ROOT, "public", "sourced", "open", "msb-enemies.json")
NPCPARAM = os.path.join(ROOT, "public", "sourced", "open", "paramdex", "NpcParam.txt")
NPCCOMBAT = os.path.join(ROOT, "public", "sourced", "npc-combat.json")
ENEMYCOMBAT = os.path.join(ROOT, "public", "sourced", "enemy-combat.json")
OWNERS = os.path.join(ROOT, "public", "sourced", "open", "dialogue-owners.json")
LEGACY = os.path.join(ROOT, "vendor", "elden-ring-map", "data", "legacy-conv.json")
OUT = os.path.join(ROOT, "public", "sourced", "npc-placements.json")

PART_POSITION = 0x20        # 3 x float32, local position
PART_NPC_PARAM_ID = 0x2A8    # int32, NPCParamID

TILE_WORLD = 256
OFFSET_X = -7168
OFFSET_Y = 16640
WORLD_BY_MASTER = {"M00": "overworld", "M01": "underground", "M10": "shadow"}


def map_ids():
    ids = set()
    with open(MAPLIST, encoding="utf-8") as f:
        for line in f:
            n = line.split("\t")[0].strip()
            if n:
                ids.add(n)
    try:
        with open(MSBENEMIES, encoding="utf-8") as f:
            for r in json.load(f):
                if r.get("map"):
                    ids.add(r["map"])
    except (OSError, ValueError):
        pass
    return sorted(ids)


def npc_names():
    rows = {}

    def add(row, name):
        name = (name or "").strip()
        if row and name:
            rows.setdefault(int(row), name)

    with open(NPCPARAM, encoding="utf-8") as f:
        for line in f:
            p = line.strip().split(None, 1)
            if len(p) == 2 and p[0].isdigit():
                add(p[0], p[1])
    for path in (NPCCOMBAT, ENEMYCOMBAT):
        try:
            with open(path, encoding="utf-8") as f:
                for r in json.load(f):
                    add(r.get("npcRow"), r.get("name"))
        except (OSError, ValueError):
            pass
    return rows


def dialogue_npcs():
    try:
        with open(OWNERS, encoding="utf-8") as f:
            return set(json.load(f).get("npcs", {}).keys())
    except (OSError, ValueError):
        return set()


def _anchor_rank(r):
    dst, s, d = r["dst"], r["srcPos"], r["dstPos"]
    return [0 if dst[0] in (60, 61) else 1, 0 if r.get("base") else 1,
            0 if (s[0] or s[2]) else 1, 0 if (d[0] or d[2]) else 1]


def load_projector():
    try:
        with open(LEGACY, encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, ValueError):
        return None
    by_block = {}
    for r in doc.get("rows", []):
        by_block.setdefault(",".join(str(v) for v in r["src"]), []).append(r)
    for rows in by_block.values():
        rows.sort(key=lambda r: tuple(_anchor_rank(r)))
    underground = {",".join(str(v) for v in b) for b in doc.get("undergroundBlocks", [])}

    def resolve(area, block, mapno, x, y, z, depth=0):
        if area in (60, 61):
            return (block * TILE_WORLD + TILE_WORLD / 2 + x + OFFSET_X,
                    OFFSET_Y - (mapno * TILE_WORLD + TILE_WORLD / 2 + z), y, area)
        if depth > 4:
            return None
        rows = by_block.get(f"{area},{block},{mapno}") or by_block.get(f"{area},{block},0")
        if not rows:
            return None
        b = rows[0]
        return resolve(b["dst"][0], b["dst"][1], b["dst"][2],
                       x - b["srcPos"][0] + b["dstPos"][0],
                       y - b["srcPos"][1] + b["dstPos"][1],
                       z - b["srcPos"][2] + b["dstPos"][2], depth + 1)

    def project(map_id, x, y, z):
        # mAA_BB_MM_00 -> area=AA, block=BB, mapno=MM
        try:
            parts = map_id[1:].split("_")
            area, block, mapno = int(parts[0]), int(parts[1]), int(parts[2])
        except (IndexError, ValueError):
            return None
        r = resolve(area, block, mapno, x, y, z)
        if not r:
            return None
        px, py, _h, dst_area = r
        master = "M10" if dst_area == 61 else ("M01" if f"{dst_area},{block}" in underground else "M00")
        return round(px, 1), round(py, 1), WORLD_BY_MASTER.get(master, "overworld")

    return project


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--game-dir", default=None)
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    dvd = DvdBnd(game_dir, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    od = oodle.make_helper(game_dir)

    names = npc_names()
    talkers = dialogue_npcs()
    project = load_projector()
    print(f"NpcParam names: {len(names)}  dialogue NPCs: {len(talkers)}  projector: {'on' if project else 'OFF'}")

    seen = set()
    placements = []
    projected = 0
    for mid in map_ids():
        path = f"/map/mapstudio/{mid}.msb.dcx"
        if not dvd.has(path):
            continue
        try:
            m = msb.load(dcx.decompress(dvd.read(path), oodle=od))
        except Exception:
            continue
        for off, _n in m.entries("PARTS_PARAM_ST"):
            npc = m.i32(off + PART_NPC_PARAM_ID)
            if npc not in names or str(npc) not in talkers:
                continue
            x, y, z = m.vec3(off + PART_POSITION)
            key = (npc, mid, round(x, 1), round(y, 1), round(z, 1))
            if key in seen:
                continue
            seen.add(key)
            row = {"npc": npc, "name": names[npc], "map": mid,
                   "x": round(x, 2), "y": round(y, 2), "z": round(z, 2)}
            if project:
                p = project(mid, x, y, z)
                if p:
                    row["px"], row["py"], row["world"] = p
                    projected += 1
            placements.append(row)
    dvd.close()

    doc = {
        "source": "MSB PARTS_PARAM_ST from the local install; projected with the engine affine (project.js/legacy-conv.json)",
        "placements": placements,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {args.out}")
    print(f"  placements: {len(placements):,}  projected: {projected:,}  npcs: {len({p['npc'] for p in placements}):,}")


if __name__ == "__main__":
    main()
