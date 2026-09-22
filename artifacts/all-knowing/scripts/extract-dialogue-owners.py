"""Attribute verbatim dialogue lines to the NPC that owns them.

The game's text bundle gives `TalkMsg` as an id->line map but no speaker;
`TalkParam` records only `msgId`/`voiceId`. The speaker is found the way the
game itself finds it:

    ESD talk script  /script/talk/<map>/t<talkId>.esd
    MSB PARTS entry  TalkID == <talkId>   ->   NPCParamID
    NpcParam row id  ->  NpcName (the speaker)

PARTS field offsets (MSBE, verified against real maps: e.g. m60_44_34_00
c2010_9000 has NPCParamID 20100000 @ +0x2a8 and TalkID 216006000 @ +0x2b0, and
20100000 is Blaidd): NPCParamID @ +0x2a8, TalkID @ +0x2b0. A candidate is only
kept when its NPCParamID is a real NpcParam row, so an object part whose bytes
coincidentally look like a pair cannot become a speaker.

An ESD's lines are the TalkParam ids its bytecode references (every byte offset;
they are not 4-byte aligned). Only ids that are real TalkParam rows are kept.

    python scripts/extract-dialogue-owners.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install. Emits public/sourced/open/dialogue-owners.json.
"""
import argparse
import json
import os
import re
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "vendor", "elden-ring-map", "tools")
sys.path.insert(0, TOOLS)

from erlib import bnd4, dcx, msb, oodle, param  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

MAPLIST = os.path.join(ROOT, "vendor", "elden-ring-map", "cache", "map-list.txt")
MSBENEMIES = os.path.join(ROOT, "public", "sourced", "open", "msb-enemies.json")
TALKMSG = os.path.join(ROOT, "public", "sourced", "open", "text", "TalkMsg.json")
NPCPARAM = os.path.join(ROOT, "public", "sourced", "open", "paramdex", "NpcParam.txt")
NPCCOMBAT = os.path.join(ROOT, "public", "sourced", "npc-combat.json")
ENEMYCOMBAT = os.path.join(ROOT, "public", "sourced", "enemy-combat.json")
OUT = os.path.join(ROOT, "public", "sourced", "open", "dialogue-owners.json")

# The ESD filename ends with t<talkId>.esd; the number is the MSB TalkID.
ESD_NAME = re.compile(r"[\\/]t(\d+)\.esd$", re.IGNORECASE)

# MSBE part field offsets (see module docstring).
PART_NPC_PARAM_ID = 0x2A8
PART_TALK_ID = 0x2B0


def msb_map_ids():
    ids = set()
    for source in (MAPLIST, None):
        try:
            if source:
                with open(source, encoding="utf-8") as f:
                    for line in f:
                        name = line.split("\t")[0].strip()
                        if name:
                            ids.add(name)
            else:
                with open(MSBENEMIES, encoding="utf-8") as f:
                    rows = json.load(f)
                for r in (rows if isinstance(rows, list) else rows.get("enemies", [])):
                    m = r.get("map") or r.get("mapId")
                    if m:
                        ids.add(m)
        except (OSError, ValueError):
            pass
    return sorted(ids)


def npc_names():
    """{npcParamRowId: name} from Paramdex + the extracted combat rows."""
    rows = {}

    def add(row, name):
        name = (name or "").strip()
        if row and name:
            rows.setdefault(int(row), name)

    if os.path.isfile(NPCPARAM):
        with open(NPCPARAM, encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split(None, 1)
                if len(parts) == 2 and parts[0].isdigit():
                    add(parts[0], parts[1])
    for path in (NPCCOMBAT, ENEMYCOMBAT):
        try:
            with open(path, encoding="utf-8") as f:
                for r in json.load(f):
                    add(r.get("npcRow"), r.get("name"))
        except (OSError, ValueError):
            pass
    return rows


def talk_param(game_dir):
    """{talkId: msgId} from TalkParam (msgId is a s32 at row offset +4)."""
    tp = param.load_params(os.path.join(game_dir, "regulation.bin")).get("TalkParam")
    out = {}
    if tp is not None:
        for r in tp.rows:
            if len(r.data) >= 8:
                msg = struct.unpack_from("<i", r.data, 4)[0]
                if msg >= 0:
                    out[r.id] = msg
    return out


def talk_to_npc(dvd, od, map_ids, npc_ids):
    """{TalkID: NPCParamID} from every MSB PARTS entry with a real NPCParamID."""
    out = {}
    maps_scanned = 0
    for map_id in map_ids:
        path = f"/map/mapstudio/{map_id}.msb.dcx"
        if not dvd.has(path):
            continue
        try:
            m = msb.load(dcx.decompress(dvd.read(path), oodle=od))
        except Exception:
            continue
        maps_scanned += 1
        for off, _name in m.entries("PARTS_PARAM_ST"):
            npc = m.i32(off + PART_NPC_PARAM_ID)
            talk = m.i32(off + PART_TALK_ID)
            if talk > 0 and npc in npc_ids:
                out.setdefault(talk, npc)
    return out, maps_scanned


def scan_esd(data, talk_ids):
    hits = set()
    for off in range(0, len(data) - 4):
        v = struct.unpack_from("<i", data, off)[0]
        if v in talk_ids:
            hits.add(v)
    return hits


# TalkMsg rows that are engine placeholders, not spoken lines.
DUMMY_TEXT = "(dummyText)"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-dir", default=None)
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    dvd = DvdBnd(game_dir, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    od = oodle.make_helper(game_dir)

    talk_to_msg = talk_param(game_dir)
    talk_ids = set(talk_to_msg)
    talkmsg = {int(k): v for k, v in json.load(open(TALKMSG, encoding="utf-8")).items()}
    names = npc_names()
    print(f"TalkParam rows: {len(talk_to_msg)}  TalkMsg lines: {len(talkmsg)}  NpcParam names: {len(names)}")

    by_talk, maps_scanned = talk_to_npc(dvd, od, msb_map_ids(), set(names))
    print(f"MSBs scanned: {maps_scanned}  TalkID->NPCParamID: {len(by_talk)}")

    by_line = {}            # msgId -> set of npc id strings
    owners = set()
    esds = 0
    # ESD bundles are keyed by map id and by the area hub (`<area>_00_00_00`).
    bundle_ids = set(msb_map_ids())
    for mid in list(bundle_ids):
        bundle_ids.add(f"{mid.split('_')[0]}_00_00_00")
    bundle_ids.update({"m60_00_00_00", "m61_00_00_00"})
    for mid in sorted(bundle_ids):
        path = f"/script/talk/{mid}.talkesdbnd.dcx"
        if not dvd.has(path):
            continue
        try:
            inner = dcx.decompress(dvd.read(path), oodle=od)
            b = bnd4.BND4(inner)
        except Exception as exc:
            print(f"  ! {mid}: {exc}")
            continue
        for e in b.entries:
            m = ESD_NAME.search(e.name)
            if not m:
                continue
            talk_id = int(m.group(1))
            npc = by_talk.get(talk_id)
            if npc is None:
                continue
            esds += 1
            for tid in scan_esd(b.read(e), talk_ids):
                msg = talk_to_msg[tid]
                if msg in talkmsg and talkmsg[msg].strip() != DUMMY_TEXT:
                    by_line.setdefault(msg, set()).add(str(npc))
                    owners.add(npc)
    dvd.close()

    npcs = {str(npc): names[npc] for npc in sorted(owners) if npc in names}
    named_lines = sum(1 for v in by_line.values() if any(p in npcs for p in v))
    print(f"ESDs attributed: {esds}  speakers: {len(npcs)}  lines: {len(by_line)} ({named_lines} named)")

    doc = {
        "note": "Line -> NPC owner via ESD TalkID -> MSB PARTS TalkID -> NPCParamID (see scripts/extract-dialogue-owners.py)",
        "npcs": npcs,
        "byLine": {str(k): sorted(v) for k, v in sorted(by_line.items())},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))

    print("sample speakers:", list(npcs.items())[:10])
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
