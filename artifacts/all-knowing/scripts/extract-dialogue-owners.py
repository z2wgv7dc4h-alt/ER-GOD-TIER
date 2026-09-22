"""Attribute verbatim dialogue lines to the NPC that owns them.

The game's text bundle gives `TalkMsg` as an id->line map, but the speaker is
not in the text data: `TalkParam` records only `msgId`/`voiceId`, no speaker.
The owner lives in the ESD talk scripts under `/script/talk/<mapId>/`, whose
entries are named per-NPC and whose bytecode references TalkParam ids.

Chain (all from the local install, nothing invented):

    ESD entry name  t<NNNN><mapdigits>.esd   -> NPC prefix NNNN
    ESD bytecode                             -> TalkParam ids it references
    TalkParam.msgId                          -> TalkMsg text id
    TalkMsg[id]                              -> the verbatim line

The `t<NNNN>` prefix matches the first four digits of the NPC's NpcParam row id
(e.g. t2130... -> NpcParam 2130xxxx, whose name comes from the Paramdex
NpcParam.txt already in the repo). Only ids that are real TalkParam rows are
kept, so a coincidental integer cannot become a speaker.

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

from erlib import bnd4, dcx, oodle, param  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

MAPLIST = os.path.join(ROOT, "vendor", "elden-ring-map", "cache", "map-list.txt")
MSBENEMIES = os.path.join(ROOT, "public", "sourced", "open", "msb-enemies.json")
TALKMSG = os.path.join(ROOT, "public", "sourced", "open", "text", "TalkMsg.json")
NPCPARAM = os.path.join(ROOT, "public", "sourced", "open", "paramdex", "NpcParam.txt")
NPCCOMBAT = os.path.join(ROOT, "public", "sourced", "npc-combat.json")
ENEMYCOMBAT = os.path.join(ROOT, "public", "sourced", "enemy-combat.json")
OUT = os.path.join(ROOT, "public", "sourced", "open", "dialogue-owners.json")

# t<4 digits> then map digits, e.g. ...\t213006000.esd -> "2130"
ESD_NAME = re.compile(r"[\\/]t(\d{4})\d*\.esd$", re.IGNORECASE)


def map_ids():
    """Every map id the install has a talk bundle for, most-specific first.

    `map-list.txt` lists the maptile maps (m10..), but the overworld/DLC talk
    hubs are keyed by msb ids (m60_00_00_00, m61_00_00_00, ...) that only appear
    in the placed-enemy dump, so both sources are unioned.
    """
    ids = set()
    with open(MAPLIST, encoding="utf-8") as f:
        for line in f:
            name = line.split("\t")[0].strip()
            if name:
                ids.add(name)
    try:
        with open(MSBENEMIES, encoding="utf-8") as f:
            rows = json.load(f)
        for r in rows if isinstance(rows, list) else rows.get("enemies", []):
            m = r.get("map") or r.get("mapId")
            if m:
                ids.add(m)
    except (OSError, ValueError):
        pass
    # The talk hub for an area is `<area>_00_00_00` (m60_00_00_00 overworld,
    # m61_00_00_00 DLC, ...), which neither source lists directly. Derive it
    # from every area prefix seen, and keep the two famous hubs regardless.
    for mid in list(ids):
        ids.add(f"{mid.split('_')[0]}_00_00_00")
    ids.update({"m60_00_00_00", "m61_00_00_00"})
    return sorted(ids)


def npc_names_by_prefix():
    """{4-digit NpcParam prefix: (shortestRow, name)}.

    The ESD filename only carries the 4-digit NpcParam family, and a family can
    hold several rows (Margit + Morgott, or a base + a "(Capital Outskirts)"
    variant). The lowest row id is the base name; the full set is kept so a
    caller can see the ambiguity instead of trusting one arbitrary label.

    Names come from the Paramdex NpcParam.txt dump (the canonical speaker
    names), then any row the dump is missing is filled from the extracted
    npc-combat/enemy-combat rows, which carry `npcRow` + `name`.
    """
    rows = {}  # row id -> name

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

    by_prefix = {}
    for row, name in rows.items():
        by_prefix.setdefault(str(row)[:4], []).append((row, name))
    return {p: (min(items)[0], min(items)[1]) for p, items in by_prefix.items()}


def talk_msg_map(path):
    with open(path, encoding="utf-8") as f:
        return {int(k): v for k, v in json.load(f).items()}


def load_talk_param(game_dir):
    """{talkId: (msgId, reactionId, returnPos)} from TalkParam.

    TalkParam row layout (Paramdex TALK_PARAM_ST, 96 B): a 4-byte header, then
    msgId@4, voiceId@8, spEffectId0@12, motionId0@16, spEffectId1@20,
    motionId1@24, returnPos@28, reactionId@32. An ESD references only the entry
    talk id, so the rest of a line's conversation is reached by walking
    returnPos/reactionId within the same NPC's script.
    """
    tp = param.load_params(os.path.join(game_dir, "regulation.bin")).get("TalkParam")
    out = {}
    if tp is not None:
        for r in tp.rows:
            if len(r.data) >= 36:
                msg = struct.unpack_from("<i", r.data, 4)[0]
                ret = struct.unpack_from("<i", r.data, 28)[0]
                react = struct.unpack_from("<i", r.data, 32)[0]
                if msg >= 0:
                    out[r.id] = (msg, react, ret)
    return out


def scan_esd(data, talk_ids):
    """TalkParam ids appearing anywhere in the ESD bytecode.

    Ids are not reliably 4-byte aligned in the compiled stream, so every offset
    is checked. A 4-byte window only counts when it is a real TalkParam row, and
    the id space is sparse, so random windows do not produce speakers.
    """
    hits = set()
    for off in range(0, len(data) - 4):
        v = struct.unpack_from("<i", data, off)[0]
        if v in talk_ids:
            hits.add(v)
    return hits


def expand(entries, talk_to_msg):
    """Reachable talk ids from the ESD's entry ids via reactionId/returnPos."""
    seen = set()
    stack = list(entries)
    while stack:
        tid = stack.pop()
        if tid in seen or tid not in talk_to_msg:
            continue
        seen.add(tid)
        _, react, ret = talk_to_msg[tid]
        for nxt in (react, ret):
            if nxt >= 0 and nxt not in seen:
                stack.append(nxt)
    return seen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-dir", default=None)
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    dvd = DvdBnd(game_dir, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    od = oodle.make_helper(game_dir)

    talk_to_msg = load_talk_param(game_dir)
    talk_ids = set(talk_to_msg)
    talkmsg = talk_msg_map(TALKMSG)
    prefix_names = npc_names_by_prefix()
    print(f"TalkParam rows with msgId: {len(talk_to_msg)}  TalkMsg lines: {len(talkmsg)}  NpcParam prefixes: {len(prefix_names)}")

    by_line = {}                 # msgId -> set of npc prefixes
    prefixes_seen = set()
    bundles = 0
    esds = 0
    for mid in map_ids():
        path = f"/script/talk/{mid}.talkesdbnd.dcx"
        if not dvd.has(path):
            continue
        bundles += 1
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
            esds += 1
            prefix = m.group(1)
            for tid in expand(scan_esd(b.read(e), talk_ids), talk_to_msg):
                msg = talk_to_msg[tid][0]
                if msg in talkmsg:
                    by_line.setdefault(msg, set()).add(prefix)
                    prefixes_seen.add(prefix)
    dvd.close()

    npcs = {p: prefix_names[p][1] for p in sorted(prefixes_seen) if p in prefix_names}
    npc_rows = {p: prefix_names[p][0] for p in sorted(prefixes_seen) if p in prefix_names}
    unresolved = sorted(p for p in prefixes_seen if p not in prefix_names)
    print(f"bundles: {bundles}  esd entries: {esds}  owners: {len(by_line)} lines  prefixes: {len(prefixes_seen)} ({len(npcs)} named, {len(unresolved)} unknown)")

    doc = {
        "note": "Line -> NPC owner, derived from ESD talk scripts; see scripts/extract-dialogue-owners.py",
        "npcRows": npc_rows,
        "npcs": npcs,
        "unresolvedPrefixes": unresolved,
        "byLine": {str(k): sorted(v) for k, v in sorted(by_line.items())},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))

    named = {p: n for p, n in npcs.items() if n}
    print("sample owners:", list(named.items())[:12])
    print(f"wrote {args.out}")

if __name__ == "__main__":
    main()
