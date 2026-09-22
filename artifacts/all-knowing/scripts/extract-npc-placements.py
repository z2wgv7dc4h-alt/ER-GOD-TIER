"""Every talking NPC and where it stands, from the map MSBs.

The MSB PARTS list holds one entry per placed entity. This walks every map and
keeps only the NPCs that actually have dialogue (those in
`open/dialogue-owners.json`) — enemy spawns are excluded, since tens of
thousands of respawning mob positions are noise for a "where is X" tool (the
enemy/combat set already lives in `open/msb-enemies.json`).

    public/sourced/npc-placements.json
    { "source", "placements": [ {npc, name, map, x, y, z} ] }

Positions are the part's local position (MSBE `PARTS_PARAM_ST` + 0x20), kept raw
— no projection is applied here.

    python scripts/extract-npc-placements.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install.
"""
import argparse
import json
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "scripts")
sys.path.insert(0, TOOLS)

from erlib import dcx, msb, oodle  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

MAPLIST = os.path.join(ROOT, "vendor", "elden-ring-map", "cache", "map-list.txt")
MSBENEMIES = os.path.join(ROOT, "public", "sourced", "open", "msb-enemies.json")
NPCPARAM = os.path.join(ROOT, "public", "sourced", "open", "paramdex", "NpcParam.txt")
NPCCOMBAT = os.path.join(ROOT, "public", "sourced", "npc-combat.json")
ENEMYCOMBAT = os.path.join(ROOT, "public", "sourced", "enemy-combat.json")
OWNERS = os.path.join(ROOT, "public", "sourced", "open", "dialogue-owners.json")
OUT = os.path.join(ROOT, "public", "sourced", "npc-placements.json")

PART_POSITION = 0x20      # 3 x float32, local position
PART_NPC_PARAM_ID = 0x2A8  # int32, NPCParamID


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
    ids = sorted(names)
    print(f"NpcParam names: {len(names)}  dialogue NPCs: {len(talkers)}")

    seen = set()
    placements = []
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
            placements.append({
                "npc": npc,
                "name": names[npc],
                "map": mid,
                "x": round(x, 2),
                "y": round(y, 2),
                "z": round(z, 2),
            })
    dvd.close()

    doc = {
        "source": f"MSB PARTS_PARAM_ST from the local install ({len(map_ids())} maps); NPCParamID + local position",
        "placements": placements,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {args.out}")
    print(f"  placements: {len(placements):,}  distinct talker npcs: {len({p['npc'] for p in placements}):,}")


if __name__ == "__main__":
    main()
