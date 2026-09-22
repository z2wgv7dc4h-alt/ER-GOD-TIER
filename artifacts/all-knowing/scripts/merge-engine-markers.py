"""Fold our extracted markers into the interactive engine's feed.

The engine serves `vendor/elden-ring-map/data/markers.json` (generated,
gitignored). Its own extraction covers graces/bosses/landmarks/items but not
NPCs. This appends our projected talking-NPC placements (same `px`/`py` frame)
so they appear on the real interactive map under an `npc` category.

    python scripts/merge-engine-markers.py

Idempotent: our markers are id-prefixed `ak:` and re-running replaces them.
Re-run after `build_markers.py` regenerates markers.json.
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKERS = os.path.join(ROOT, "vendor", "elden-ring-map", "data", "markers.json")
PLACEMENTS = os.path.join(ROOT, "public", "sourced", "npc-placements.json")

MASTER = {"overworld": "M00", "underground": "M01", "shadow": "M10"}


def mk(mid, cat, name, icon, px, py, world, map_id):
    return {
        "id": mid,
        "cat": cat,
        "names": {"en": name, "ru": name},
        "flag": 0,
        "master": MASTER.get(world, "M00"),
        "px": px,
        "py": py,
        "map": map_id,
        "entity": 0,
        "icon": icon,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--markers", default=MARKERS)
    args = ap.parse_args()

    doc = json.load(open(args.markers, encoding="utf-8"))
    base = [m for m in doc.get("markers", []) if not str(m.get("id", "")).startswith("ak:")]
    existing = {m.get("id") for m in base}
    added = []

    # NPC placements (already projected).
    try:
        for p in json.load(open(PLACEMENTS, encoding="utf-8")).get("placements", []):
            if p.get("px") is None:
                continue
            i = f"ak:npc:{p['npc']}:{p['map']}:{round(p['x'],1)}:{round(p['z'],1)}"
            if i in existing:
                continue
            added.append(mk(i, "npc", p["name"], "npc.png", p["px"], p["py"], p["world"], p["map"]))
    except (OSError, ValueError):
        pass

    # No pack block: the "EldenRingMap" Nexus pack is the same project as this
    # engine and is fully subsumed by its own markers, so there is nothing extra
    # to add beyond our NPC placements.

    doc["markers"] = base + added
    with open(args.markers, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"engine markers: {len(base):,} + {len(added):,} ours = {len(doc['markers']):,}")


if __name__ == "__main__":
    main()
