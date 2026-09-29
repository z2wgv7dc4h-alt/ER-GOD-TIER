"""Regenerate the open map/boss/loot dumps from the local, unmodded game install.

These files used to be copied from `VirusAlex/ERR-MapForGoblins-DLL` — the Map
for Goblins build for **Elden Ring Reforged**, a PC overhaul mod. That data
carried ERR's added bosses (Gnoster, Thief-Taker Acacio, Morion…), renamed
vanilla fights, extra graces, ERR-only places and items (Lamp Oil, Starlight
Token…) and moved item placements — none of which exist in the game a PS5
player runs. Everything here is read from the game's own files instead:

    GameAreaParam (regulation)        -> open/boss-list.json, open/boss-xyz.json,
                                         src/data/hosted-bosses.json
    engine boss markers               -> open/boss-pins.json, src/knowledge/bossPins.ts
    BonfireWarpParam (regulation)     -> open/grace-xyz.json
    MSB PARTS (every map)             -> open/msb-enemies.json, open/gathering-nodes.json
    MSB treasure events + ItemLotParam_map -> open/world-lots.json
    NpcParam names (Paramdex, vanilla) -> open/enemies.json
    PlaceName FMG (open/text)         -> open/place-names.json

Read-only: nothing in the install is written. Refuses to run with ER_MOD_DIR set.

    python scripts/extract-vanilla-open.py [--game-dir DIR]
"""
import argparse
import json
import os
import re
import sys

reconfigure = getattr(sys.stdout, "reconfigure", None)
if reconfigure:
    reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "vendor", "elden-ring-map")
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from erlib import dcx, msb, oodle, param, paramdef  # noqa: E402
from erlib import mfg_categories  # noqa: E402  (the engine's item classifier)
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

OPEN = os.path.join(ROOT, "public", "sourced", "open")
DEFS = os.path.join(ENGINE, "data", "paramdefs")
MAPLIST = os.path.join(ENGINE, "cache", "map-list.txt")
MARKERS = os.path.join(ENGINE, "data", "markers.json")
PARAMDEX = os.path.join(OPEN, "paramdex")

# MSB offsets (verified by the engine's extract_items.py / probe_msb_treasure.py)
PART_POSITION = 0x20
PART_NPC_PARAM_ID = 0x2AC  # NPCParamID; 0x2A8 is ThinkParamID (often the same base id, sometimes 1)
EVENT_TYPE_TREASURE = 4
EV_TYPE = 0x0C
EV_TYPEDATA_PTR = 0x20
TD_PART_INDEX = 0x08
TD_ITEM_LOT = 0x10
CATEGORY_TABLES = {1: "GoodsName", 2: "WeaponName", 3: "ProtectorName", 4: "AccessoryName", 5: "GemName"}
WORLD_BY_MASTER = {"M00": "overworld", "M01": "underground", "M10": "shadow"}


def write(path, doc, compact=True):
    with open(path, "w", encoding="utf-8") as f:
        if compact:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(f"  -> {os.path.relpath(path, ROOT)}")


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()


def vanilla_names():
    """Every name a vanilla source knows: the wiki snapshot (titles + redirects),
    the game's NPC names, the checklist and Fextralife boss lists."""
    names = set()
    db_path = os.path.join(ROOT, "data", "raw", "er-mcp.db")
    if os.path.exists(db_path):
        import sqlite3
        db = sqlite3.connect(db_path)
        names |= {norm(t) for (t,) in db.execute("select title from pages")}
        cols = [c[1] for c in db.execute("pragma table_info(redirects)")]
        src = next((c for c in cols if "from" in c), None)
        if src:
            names |= {norm(t) for (t,) in db.execute(f"select {src} from redirects")}
    names |= {norm(v) for v in text_table("NpcName").values()}
    for path, key in [(os.path.join(ROOT, "public", "sourced", "checklists", "bosses.json"), None),
                      (os.path.join(OPEN, "bosses-fextralife.json"), "bosses")]:
        if os.path.exists(path):
            doc = json.load(open(path, encoding="utf-8"))
            for row in (doc.get(key, []) if key else doc):
                names.add(norm(row.get("name")))
    names.discard("")
    return names


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
    return {int(k): v for k, v in json.load(open(path, encoding="utf-8")).items()} if os.path.exists(path) else {}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--game-dir", default=None)
    ap.add_argument("--previous", default=None, help="an earlier boss-list.json whose vanilla names may fill arena-only labels")
    args = ap.parse_args()
    if os.environ.get("ER_MOD_DIR"):
        sys.exit("ER_MOD_DIR is set — this extractor must read the unmodded game only.")

    game = require_game_dir(args.game_dir)
    print(f"game dir: {game}")
    reg = os.path.join(game, "regulation.bin")
    params = param.load_params(reg)
    dvd = DvdBnd(game, cache_dir=os.path.join(ENGINE, "cache"), verbose=False)
    helper = oodle.make_helper(game)

    # ---------------------------------------------------------------- bosses
    ga_def = paramdef.load(os.path.join(DEFS, "GameAreaParam.xml"))
    markers = json.load(open(MARKERS, encoding="utf-8"))["markers"]
    boss_markers = {m["id"]: m for m in markers if m["cat"] == "boss"}
    hunt_by_flag = {h["flag"]: h["name"] for h in json.load(open(os.path.join(ROOT, "src", "data", "hunts.json"), encoding="utf-8"))}
    vanilla = vanilla_names()
    # Names from an earlier dump are only ever a fallback, and only when they are
    # a real vanilla name — the ERR dump both invented names and put a different
    # vanilla boss on some flags, so the install's own data always wins.
    previous = {}
    prev_path = args.previous or os.path.join(OPEN, "boss-list.json")
    if os.path.exists(prev_path):
        for row in json.load(open(prev_path, encoding="utf-8")):
            previous[row.get("killEventFlagId")] = row.get("vanillaPlaceName")

    def tokens(s):
        return {t for t in norm(s).split() if len(t) > 3}

    def boss_name(kill, marker):
        """Name for one fight, from vanilla sources only, keyed by its kill flag."""
        if kill in hunt_by_flag:
            return hunt_by_flag[kill], "hunts"
        prev = previous.get(kill)
        prev_ok = bool(prev) and norm(prev) in vanilla
        eng = ((marker or {}).get("names", {}).get("en", "") or "").replace(" · underground", "")
        if eng and not eng.startswith("Boss arena"):
            # The engine lists every health bar in the fight ("Sorcerer Rogier /
            # Fia's Champion"); a matching vanilla fight name reads better.
            if " / " in eng and prev_ok and tokens(prev) & tokens(eng):
                return prev, "previous"
            return eng, "engine"
        if prev_ok:
            return prev, "previous"
        return None, None

    bosses = []
    unnamed = []
    ga_rows = {r.id: ga_def.as_dict(r.data, ["defeatBossFlagId", "bossChallengeFlagId", "bossPosX", "bossPosY", "bossPosZ",
                                              "bossMapAreaNo", "bossMapBlockNo", "bossMapMapNo"]) for r in params["GameAreaParam"].rows}
    for rid, v in ga_rows.items():
        defeat = v["defeatBossFlagId"] or v["bossChallengeFlagId"]
        if not defeat or not v["bossMapAreaNo"]:
            continue
        # The row id is the fight: in 199 of 216 rows it equals the defeat flag.
        # A row whose defeat flag is another row's id is that fight's partner
        # (duo flag +1, a phase row) — unless the hunt table knows the row id as
        # its own fight (row 1039510800, the Altus Night's Cavalry, points its
        # defeat field at a Bell Bearing Hunter).
        if rid in hunt_by_flag:
            kill = rid
        elif defeat != rid and defeat in ga_rows:
            continue
        else:
            kill = defeat
            # Liurnia's night bosses sit on sub-rows (…0340) of the same map tile
            # whose real kill flag is the hunt's …0800 flag.
            same_tile = [] if defeat in hunt_by_flag else [f for f in hunt_by_flag if f // 1000 == rid // 1000 and f not in ga_rows]
            eng = ((boss_markers.get(f"boss:{rid}") or {}).get("names", {}) or {}).get("en", "")
            for f in same_tile:
                if norm(hunt_by_flag[f]) == norm(eng.replace(" · underground", "")):
                    kill = f
                    break
        marker = boss_markers.get(f"boss:{rid}")
        # The engine names a fight from the event script of its defeat flag, so
        # its label is only this fight's when the two agree.
        if marker and defeat != kill:
            marker = None
        name, _src = boss_name(kill, marker)
        if name:
            name = re.sub(r"\s*\(x(\d)\)$", r" ×\1", name)  # "Fell Twin(x2)" -> "Fell Twin ×2"
        if not name:
            unnamed.append((rid, kill, ((marker or {}).get("names", {}) or {}).get("en")))
            continue
        area, block, mapno = v["bossMapAreaNo"], v["bossMapBlockNo"], v["bossMapMapNo"]
        bosses.append({
            "areaNo": area, "gridX": block, "gridZ": mapno,
            "x": round(v["bossPosX"], 3), "y": round(v["bossPosY"], 3), "z": round(v["bossPosZ"], 3),
            "map": f"m{area:02d}_{block:02d}_{mapno:02d}_00",
            "enemyModel": None, "npcParamId": None,
            "clearedEventFlagId": rid, "killEventFlagId": kill,
            "wmpTextId1": None, "vanillaPlaceName": name,
            "_marker": marker,
        })
    print(f"bosses: {len(bosses)} GameAreaParam fights named from vanilla sources; {len(unnamed)} left unnamed (skipped):")
    for row in unnamed:
        print(f"    row {row[0]} kill {row[1]} engine label {row[2]!r}")

    write(os.path.join(OPEN, "boss-list.json"), [{k: v for k, v in b.items() if k != "_marker"} for b in bosses], compact=False)
    xyz = [{"id": f"bossflag:{b['clearedEventFlagId']}", "name": b["vanillaPlaceName"], "flag": b["clearedEventFlagId"],
            "kill": b["killEventFlagId"], "map": b["map"], "x": b["x"], "y": b["y"], "z": b["z"]} for b in bosses]
    write(os.path.join(OPEN, "boss-xyz.json"), xyz, compact=False)
    write(os.path.join(ROOT, "src", "data", "hosted-bosses.json"), xyz, compact=False)

    pins = []
    for b in bosses:
        m = b["_marker"]
        if not m or m.get("px") is None:
            continue
        world = WORLD_BY_MASTER.get(m.get("master"), "overworld")
        pins.append({"id": f"bossflag:{b['clearedEventFlagId']}", "name": b["vanillaPlaceName"], "kind": "boss",
                     "world": world, "x": round(m["px"] / 10496 * 100, 2), "y": round(m["py"] / 10496 * 100, 2),
                     "map": b["map"], "flag": b["clearedEventFlagId"]})
    write(os.path.join(OPEN, "boss-pins.json"), pins, compact=False)
    ts = [{"id": p["id"], "name": p["name"], "world": p["world"], "x": p["x"], "y": p["y"]} for p in pins]
    with open(os.path.join(ROOT, "src", "knowledge", "bossPins.ts"), "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/extract-vanilla-open.py from the game's GameAreaParam + engine boss markers.\n")
        f.write("export const bossPins = " + json.dumps(ts, ensure_ascii=False) + " as const\n\n")
        f.write("export function findBossPin(q: string) {\n  const n = q.toLowerCase().trim()\n"
                "  // An exact name first, so 'tree sentinel' is not answered by the Tree Sentinel duo.\n"
                "  return bossPins.find((b) => b.name.toLowerCase() === n) ??\n"
                "    bossPins.find((b) => n.includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(n))\n}\n")
    print("  -> src/knowledge/bossPins.ts")

    # ---------------------------------------------------------------- graces
    bw_def = paramdef.load(os.path.join(DEFS, "BonfireWarpParam.xml"))
    sub_names = paramdex_names("BonfireWarpSubCategoryParam")
    tab_names = paramdex_names("BonfireWarpTabParam")

    def tab_for(sub):
        for t in (sub // 1000 * 1000, sub // 100 * 100, sub // 10 * 10, sub):
            if t in tab_names:
                return t
        return None

    graces = []
    for r in params["BonfireWarpParam"].rows:
        v = bw_def.as_dict(r.data, ["eventflagId", "areaNo", "gridXNo", "gridZNo", "posX", "posY", "posZ", "bonfireSubCategoryId"])
        if not v["eventflagId"] or not v["areaNo"]:
            continue
        sub = v["bonfireSubCategoryId"]
        tab = tab_for(sub) if sub and sub > 0 else None
        graces.append({"areaNo": v["areaNo"], "gridX": v["gridXNo"], "gridZ": v["gridZNo"],
                       "x": round(v["posX"]), "y": round(v["posY"]), "z": round(v["posZ"]),
                       "subCategoryId": sub if sub and sub > 0 else 0,
                       "subRegion": sub_names.get(sub), "tabId": tab, "majorRegion": tab_names.get(tab) if tab else None})
    write(os.path.join(OPEN, "grace-xyz.json"), graces)
    print(f"graces: {len(graces)} (BonfireWarpParam)")

    # ---------------------------------------------------------------- MSBs
    lot_def = paramdef.load(os.path.join(DEFS, "ItemLotParam.xml"))
    lots = {r.id: r for r in params["ItemLotParam_map"].rows}
    item_names = {t: text_table(t) for t in CATEGORY_TABLES.values()}
    old_gather = json.load(open(os.path.join(OPEN, "gathering-nodes.json"), encoding="utf-8"))
    gather_models = {g["model"] for g in (old_gather if isinstance(old_gather, list) else old_gather.get("nodes", []))}

    map_ids = [l.split("\t")[0] for l in open(MAPLIST, encoding="utf-8") if l.strip()]
    enemies, nodes, treasure = [], [], {}
    for i, mid in enumerate(map_ids):
        path = f"/map/mapstudio/{mid}.msb.dcx"
        if not dvd.has(path):
            continue
        try:
            m = msb.load(dcx.decompress(dvd.read(path), oodle=helper))
        except Exception:
            continue
        area = int(mid[1:3])
        # Overworld maps repeat every placement in lower-detail tiles (_01, _02);
        # only the detailed tier is a real placement.
        detailed = area not in (60, 61) or mid.endswith("_00")
        parts = m.lists.get("PARTS_PARAM_ST")
        part_offsets = parts.entry_offsets if parts else []
        for off, name in (m.entries("PARTS_PARAM_ST") if detailed else []):
            model = name.split("_")[0] if name.startswith("c") else "_".join(name.split("_")[:2])
            x, y, z = m.vec3(off + PART_POSITION)
            if re.match(r"^c\d{4}_", name):
                npc = m.i32(off + PART_NPC_PARAM_ID)
                if npc > 0:
                    enemies.append({"id": str(npc), "map": mid, "x": round(x, 3), "z": round(z, 3), "model": model, "name": name})
            elif model in gather_models:
                inst = name.rsplit("_", 1)[-1]
                nodes.append({"model": model, "name": name, "map": mid, "area": area, "p1": 0, "p2": 0, "p3": 0,
                              "x": x, "y": y, "z": z, "entity_id": 0, "instance_id": int(inst) if inst.isdigit() else 0})
        for off, _name in m.entries("EVENT_PARAM_ST"):
            if m.i32(off + EV_TYPE) != EVENT_TYPE_TREASURE:
                continue
            td = off + m.i64(off + EV_TYPEDATA_PTR)
            lot_id = m.i32(td + TD_ITEM_LOT)
            idx = m.i32(td + TD_PART_INDEX)
            if lot_id not in lots or not (0 <= idx < len(part_offsets)):
                continue
            x, y, z = m.vec3(part_offsets[idx] + PART_POSITION)
            tier = int(mid[10:12]) if area in (60, 61) else 0
            prev = treasure.get(lot_id)
            if prev is None or tier < prev[0]:
                treasure[lot_id] = (tier, mid, x, y, z)
        if (i + 1) % 250 == 0:
            print(f"  {i + 1}/{len(map_ids)} maps")
    dvd.close()

    write(os.path.join(OPEN, "msb-enemies.json"), enemies)
    write(os.path.join(OPEN, "gathering-nodes.json"), nodes)
    print(f"enemies placed: {len(enemies)}  gathering nodes: {len(nodes)}")

    world_lots = []
    referenced = set(treasure)
    for lot_id, (_tier, mid, x, y, z) in sorted(treasure.items()):
        # A pickup with several items continues on the next lot ids (lot+1, +2…)
        # until a gap or a lot another treasure event owns.
        chain = [lot_id]
        while chain[-1] + 1 in lots and chain[-1] + 1 not in referenced and len(chain) < 10:
            chain.append(chain[-1] + 1)
        for lid in chain:
            row = lots[lid]
            flag = lot_def.get(row.data, "getItemFlagId")
            if not flag:
                continue
            for s in range(1, 9):
                iid = lot_def.get(row.data, f"lotItemId{s:02d}")
                cat = lot_def.get(row.data, f"lotItemCategory{s:02d}")
                table = CATEGORY_TABLES.get(cat)
                nm = item_names.get(table, {}).get(iid, "") if table else ""
                if not iid or not nm or nm.startswith("%null%"):
                    continue
                world_lots.append({"flag": flag, "lot": lid, "map": mid, "x": round(x, 3), "y": round(y, 3), "z": round(z, 3),
                                   "name": nm, "cat": mfg_categories.categorise(iid, nm, cat),
                                   "src": "treasure"})
    write(os.path.join(OPEN, "world-lots.json"), world_lots)
    print(f"treasure pickups: {len(world_lots)} items in {len({w['lot'] for w in world_lots})} lots")

    # ---------------------------------------------------------------- names
    npc_rows = paramdex_names("NpcParam")
    seen, named = set(), []
    for rid, nm in sorted(npc_rows.items()):
        key = nm.lower()
        if rid < 10000000 or key in seen or re.search(r"dummy|test|unused|^\?|\bcut\b", key):
            continue
        seen.add(key)
        named.append({"id": str(rid), "name": nm})
    write(os.path.join(OPEN, "enemies.json"), named, compact=False)
    print(f"enemy names: {len(named)} (NpcParam)")

    places = json.load(open(os.path.join(OPEN, "text", "PlaceName.json"), encoding="utf-8"))
    write(os.path.join(OPEN, "place-names.json"), places, compact=False)
    print(f"place names: {len(places)} (game PlaceName text)")


if __name__ == "__main__":
    main()
