"""Extract the world-map place names (the text the game draws on the map's
scroll/ribbon banners) from an installed copy of ELDEN RING.

    python vendor/elden-ring-map/tools/extract_place_names.py [GAME_DIR]

Writes two files:

    vendor/elden-ring-map/data/place-names.json        (generated, gitignored)
    public/sourced/open/map-place-names.json           (committed copy)

The map tiles contain the banner art but no glyphs; the names are drawn on top
at runtime from ``WorldMapPlaceNameParam`` (area/grid/position) resolved through
the ``PlaceName`` FMG, exactly like the marker pipeline in build_markers.py. The
projection is the same code path (``project`` + ``WorldMapLegacyConvParam``), so
the labels land in the same 10496x10496 master-pixel space the tiles and the
pins use.

Scope note (important, and honest): ``WorldMapPlaceNameParam`` in the shipped
game holds only the *major region* banners (Limgrave, Liurnia of the Lakes,
Caelid, ...). The finer sub-regions a player sees in the cursor banner
("Stormhill", "Mistwood", "Weeping Peninsula", ...) live in ``MapNameTexParam`` /
``MapNameTexParam_m61``, which carry no coordinates at all - they are colour
keys into a runtime region-id texture that is not shipped as an extractable
file. There is therefore no non-invented position for them, and this extractor
deliberately does not fabricate one. See docs/tasks/120-map-place-names.md.
"""

import argparse
import json
import os
import sys
from collections import defaultdict

reconfigure = getattr(sys.stdout, "reconfigure", None)
if reconfigure:
    reconfigure(encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ALL_KNOWING = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ALL_KNOWING, "scripts"))

from erlib import param, paramdef, fmg, oodle, dcx  # noqa: E402
import erlib.modfiles as modfiles  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

DEFS = os.path.join(ROOT, "data", "paramdefs")
GENERATED = os.path.join(ROOT, "data", "place-names.json")
COMMITTED = os.path.join(ALL_KNOWING, "public", "sourced", "open", "map-place-names.json")

# Same constants as build_markers.py - do NOT diverge, or labels stop lining up
# with the pins and the tiles.
TILE_WORLD = 256
OFFSET_X = -7168
OFFSET_Y = 16640

# Locale -> the game's own message folder. Using the game's text means the names
# read exactly as they do in-game, not a translation.
LOCALES = {"en": "engus", "ru": "rusru"}

# Legacy blocks whose art lives on the underground master rather than the
# surface (same set build_markers.py uses).
UNDERGROUND_BLOCKS = {(12, 1), (12, 2), (12, 3), (12, 4), (12, 5), (12, 7)}

# Tier -> the on-screen scale at which a label becomes visible. Tier 0 is the
# big region banners (always shown); later tiers are reserved for finer
# locations and appear as you zoom in. The renderer and the tests both read
# these from the JSON so they cannot drift.
TIER_MIN_ZOOM = {0: 0.0, 1: 0.7, 2: 1.2, 3: 1.8}

MASTER_WORLD = {
    "M00": "overworld",
    "M01": "underground",
    "M10": "shadow",
    "M11": "shadow-underground",
}


def project(area, grid_x, grid_z, pos_x, pos_z, tier=0):
    """Overworld grid + local offset -> master pixel (same as build_markers)."""
    size = TILE_WORLD * (2 ** tier)
    world_x = grid_x * size + size / 2 + pos_x
    world_z = grid_z * size + size / 2 + pos_z
    return world_x + OFFSET_X, OFFSET_Y - world_z


def anchor_rank(v):
    """Sort key that puts a block's real anchor row first (see build_markers)."""
    return (0 if v["dstAreaNo"] in (60, 61) else 1,
            0 if v["isBasePoint"] else 1,
            0 if (v["srcPosX"] or v["srcPosZ"]) else 1,
            0 if (v["dstPosX"] or v["dstPosZ"]) else 1)


class LegacyConv:
    """WorldMapLegacyConvParam -> translate dungeon-local coords onto the map.

    A faithful (smaller) copy of the class in build_markers.py: same anchor
    ordering, same chain-following, same tier-0 assumption for targets. Keeping
    it identical is the whole point - one coordinate model, two extractors.
    """

    def __init__(self, rows, pdef):
        self.by_block = defaultdict(list)
        for r in rows:
            v = pdef.as_dict(r.data)
            self.by_block[(v["srcAreaNo"], v["srcGridXNo"], v["srcGridZNo"])].append(v)
        for lst in self.by_block.values():
            lst.sort(key=anchor_rank)

    def _rows_for(self, area, block, mapno):
        return self.by_block.get((area, block, mapno)) or self.by_block.get((area, block, 0))

    def convert(self, area, block, mapno, x, y, z, _depth=0, tier=0):
        """-> (px, py, height, dstArea) or None if the game does not place it."""
        if area in (60, 61):
            px, py = project(area, block, mapno, x, z, tier)
            return px, py, y, area
        if _depth > 4:
            return None
        rows = self._rows_for(area, block, mapno)
        if not rows:
            return None
        best = rows[0]
        nx = x - best["srcPosX"] + best["dstPosX"]
        ny = y - best["srcPosY"] + best["dstPosY"]
        nz = z - best["srcPosZ"] + best["dstPosZ"]
        return self.convert(best["dstAreaNo"], best["dstGridXNo"], best["dstGridZNo"],
                            nx, ny, nz, _depth + 1, tier=0)


def master_for(area, block, dst_area):
    if dst_area == 61:
        return "M10"
    if (area, block) in UNDERGROUND_BLOCKS:
        return "M01"
    return "M00"


def load_names(dvd, helper, mod):
    """-> {locale: {textId: string}} for the PlaceName table only."""
    out = {}
    for loc, folder in LOCALES.items():
        table = {}
        for base in ("item.msgbnd.dcx", "item_dlc02.msgbnd.dcx"):
            path = f"/msg/{folder}/{base}"
            if not modfiles.has(dvd, mod, path):
                continue
            for fmg_name, rows in fmg.load_msgbnd(modfiles.read(dvd, mod, path),
                                                  oodle=helper).items():
                if fmg_name.split("_dlc")[0] != "PlaceName":
                    continue
                # DLC archives reuse the id space; later rows must not clobber
                # a real base-game string with a "DLC dummy" placeholder.
                for tid, value in rows.items():
                    if value and not value.lower().startswith("dlc dummy"):
                        table[tid] = value
        out[loc] = table
    return out


def build(params, defs, names_by_loc, conv):
    labels = []
    d = defs["WorldMapPlaceNameParam"]
    for r in params["WorldMapPlaceNameParam"].rows:
        v = d.as_dict(r.data)
        text_id = v["textId"]
        if text_id is None or text_id <= 0:
            continue
        en = names_by_loc["en"].get(text_id, "")
        if not en or en.startswith("%null%"):
            continue
        names = {}
        for loc in LOCALES:
            local = names_by_loc.get(loc, {}).get(text_id, "")
            names[loc] = en if (not local or local.startswith("%null%")) else local
        placed = conv.convert(v["areaNo"], v["gridXNo"], v["gridZNo"],
                              v["posX"], v["posY"], v["posZ"])
        if placed is None:
            continue
        px, py, _height, dst_area = placed
        master = master_for(v["areaNo"], v["gridXNo"], dst_area)
        labels.append({
            "id": f"place:{r.id}",
            "textId": text_id,
            "piece": v["worldMapPieceId"],
            "tier": 0,
            "minZoom": TIER_MIN_ZOOM[0],
            "world": MASTER_WORLD.get(master, "overworld"),
            "master": master,
            "px": round(px, 1),
            "py": round(py, 1),
            "names": names,
        })
    labels.sort(key=lambda x: (x["master"], x["names"]["en"]))
    return labels


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("game_dir", nargs="?", default=None,
                    help=r"the ...\ELDEN RING\Game folder (auto-detected if omitted)")
    args = ap.parse_args()

    game = require_game_dir(args.game_dir)
    print(f"game dir: {game}")
    mod = modfiles.find_mod_dir()
    reg = modfiles.regulation_path(game, mod)

    dvd = DvdBnd(game, cache_dir=os.path.join(ROOT, "cache"), verbose=False)
    helper = oodle.make_helper(game)

    print("loading params ...")
    params = param.load_params(reg)
    defs = {n: paramdef.load(os.path.join(DEFS, n + ".xml"))
            for n in ("WorldMapPlaceNameParam", "WorldMapLegacyConvParam")}
    for n, d in defs.items():
        p = params.get(n)
        actual = p.row_size if p else 0
        flag = "ok" if d.row_size == actual else f"MISMATCH (def {d.row_size} vs param {actual})"
        print(f"  {n:<24} rows={p.row_count if p else 0:<4} rowSize={actual:<4} {flag}")
    if params.get("WorldMapPlaceNameParam") is None:
        sys.exit("WorldMapPlaceNameParam not present in regulation.bin - cannot continue")

    print("loading names ...")
    names_by_loc = load_names(dvd, helper, mod)
    for loc in LOCALES:
        print(f"  {loc}: PlaceName {len(names_by_loc.get(loc, {}))}")
    if not names_by_loc.get("en"):
        sys.exit("no English PlaceName strings loaded - cannot continue")

    conv = LegacyConv(params["WorldMapLegacyConvParam"].rows,
                      defs["WorldMapLegacyConvParam"])
    labels = build(params, defs, names_by_loc, conv)
    dvd.close()

    payload = {
        "generatedBy": "vendor/elden-ring-map/tools/extract_place_names.py",
        "source": "WorldMapPlaceNameParam + PlaceName FMG",
        "masterPx": 10496,
        "locales": list(LOCALES),
        "tierMinZoom": {str(k): v for k, v in TIER_MIN_ZOOM.items()},
        "labels": labels,
    }

    for path in (GENERATED, COMMITTED):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print(f"-> {path}  ({len(labels)} labels)")

    by_world = defaultdict(int)
    by_tier = defaultdict(int)
    for l in labels:
        by_world[l["world"]] += 1
        by_tier[l["tier"]] += 1
    print(f"\nlabels: {len(labels)}")
    print("  by world: " + ", ".join(f"{k}={v}" for k, v in sorted(by_world.items())))
    print("  by tier:  " + ", ".join(f"{k}={v}" for k, v in sorted(by_tier.items())))
    print("\nsamples (name | world | px, py):")
    for l in labels[:10]:
        print(f"  {l['names']['en'][:34]:<36} {l['world']:<10} {l['px']:>7.1f}, {l['py']:>7.1f}")


if __name__ == "__main__":
    main()
