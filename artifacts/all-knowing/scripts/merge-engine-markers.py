"""Fold our extracted markers into the interactive engine's feed.

The engine serves `vendor/elden-ring-map/data/markers.json` (generated,
gitignored). Its own extraction covers graces/bosses/landmarks/items but not
NPCs or the EldenRingMap pack's extra marker types. This appends ours
(projected to the same `px`/`py` frame) so they appear on the real interactive
map under existing sidebar categories.

    python scripts/merge-engine-markers.py

Idempotent: our markers are id-prefixed `ak:` and re-running replaces them.
Re-run after `build_markers.py` regenerates markers.json.
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKERS = os.path.join(ROOT, "vendor", "elden-ring-map", "data", "markers.json")
RMARKERS = os.path.join(ROOT, "public", "sourced", "open", "eldenringmap.json")
PLACEMENTS = os.path.join(ROOT, "public", "sourced", "npc-placements.json")

MASTER = {"overworld": "M00", "underground": "M01", "shadow": "M10"}


def slug(s):
    out = []
    for ch in s.lower():
        out.append(ch if ch.isalnum() else "-")
    return "".join(out).strip("-")


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

    # EldenRingMap pack markers (px in the same frame).
    try:
        em = json.load(open(RMARKERS, encoding="utf-8"))
        for d in em.get("dungeons", []):
            added.append(mk(f"ak:dungeon:{slug(d['name'])}", "dungeon", d["name"], "interactible.png", d["x"], d["y"], d["world"], d["region"]))
        for i, m in enumerate(em.get("merchants", [])):
            added.append(mk(f"ak:merchant:{slug(m['name'])}:{i}", "merchant", m["name"], "npc.png", m["x"], m["y"], m["world"], m["region"]))
        cat_by_kind = {
            "golden_seed": ("seeds_tears", "seed.png"),
            "sacred_tear": ("seeds_tears", "seed.png"),
            "scadutree": ("scadutree_fragments", "skadu.png"),
            "rspirit_ash": ("spirits", "spirit.png"),
        }
        for kind, rows in em.get("collectibles", {}).items():
            cat, icon = cat_by_kind.get(kind, ("landmark", "interactible.png"))
            for c in rows:
                added.append(mk(f"ak:{kind}:{c['id']}", cat, c["name"], icon, c["x"], c["y"], c["world"], ""))
        for i, b in enumerate(em.get("nightBosses", [])):
            added.append(mk(f"ak:nightboss:{i}", "boss", b["category"].replace("_", " "), "boss.png", b["x"], b["y"], "overworld", ""))
    except (OSError, ValueError):
        pass

    doc["markers"] = base + added
    with open(args.markers, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"engine markers: {len(base):,} + {len(added):,} ours = {len(doc['markers']):,}")


if __name__ == "__main__":
    main()
