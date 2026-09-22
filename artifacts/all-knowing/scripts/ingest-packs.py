"""Ingest the user's local structured packs into `public/sourced/open/`.

Reads (read-only) from a downloads folder:

  * `EldenRingMapV1.2*.zip`  -> DATA/*_en.json  (marker positions, engine frame)
  * `ER Checklist*.zip`      -> mods/ercl/items.json (categorised item ids/names)

Emits:

  * public/sourced/open/eldenringmap.json   locations, frame = px / 10496 * 100
  * public/sourced/open/ercl-items.json     item checklist (base + SotE)

These are third-party Nexus packs; the project's sources policy (HANDOFF-Claude
section 4) allows using their data, and each output carries its source string.
Coordinates are kept as the source's engine-mosaic pixels; the app converts to
plate percent the same way `graces.ts` does. Nothing is interpolated or guessed.

    python scripts/ingest-packs.py [--pack-dir "C:\\Users\\<you>\\Downloads"]
"""
import argparse
import glob
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sourced", "open")

LAYER_WORLD = {"surface": "overworld", "underground": "underground", "dlc": "shadow", "Hub": "hub"}
ERM_SOURCE = "EldenRingMap Nexus V1.2 (egormagurin) DATA/*_en.json"
ERCL_SOURCE = "ER Checklist (Nexus 9953) mods/ercl/items.json"
MEDUSA_SOURCE = "Elden Medusa (Nexus 10286) 100% walkthrough, data/en/act*/"


def read_zip_json(zf, name):
    with zf.open(name) as f:
        return json.load(f)


def find_zip(pack_dir, prefix):
    hits = glob.glob(os.path.join(pack_dir, prefix + "*.zip"))
    return hits[0] if hits else None


def flatten_grouped(top):
    """graces/dungeons/merchants: {layer: {region: [row, ...]}} -> rows."""
    rows = []
    for layer, region_map in top.items():
        world = LAYER_WORLD.get(layer, str(layer).lower())
        if not isinstance(region_map, dict):
            continue
        for region, items in region_map.items():
            if not isinstance(items, list):
                continue
            for it in items:
                if not isinstance(it, dict) or "name" not in it or "x" not in it:
                    continue
                rows.append({
                    "name": it["name"],
                    "region": region,
                    "world": world,
                    "x": it["x"],
                    "y": it["y"],
                })
    return rows


def flatten_collectibles(top):
    """golden_seeds/sacred_tears/scadutree/rspirit_ash: {layer: {type: [row,...]}}."""
    out = {}
    for layer, by_type in top.items():
        world = LAYER_WORLD.get(layer, layer.lower())
        for kind, items in by_type.items():
            bucket = out.setdefault(kind, [])
            for it in items:
                if "x" not in it:
                    continue
                bucket.append({
                    "id": it.get("id", ""),
                    "name": it.get("title") or kind,
                    "world": world,
                    "x": it["x"],
                    "y": it["y"],
                    "note": it.get("description", ""),
                })
    return out


def ingest_eldenringmap(pack_dir):
    zpath = find_zip(pack_dir, "EldenRingMapV1.2")
    if not zpath:
        print("! EldenRingMap pack not found")
        return
    with zipfile.ZipFile(zpath) as zf:
        names = {os.path.basename(n): n for n in zf.namelist() if n.endswith("_en.json")}

        def load(stem):
            n = names.get(stem + "_en.json")
            return read_zip_json(zf, n) if n else None

        doc = {
            "source": ERM_SOURCE,
            "frame": "engine mosaic px; percent = px / 10496 * 100 (same frame as graces.ts)",
            "graces": flatten_grouped(load("graces") or {}),
            "dungeons": flatten_grouped(load("dungeons") or {}),
            "merchants": flatten_grouped(load("merchant") or {}),
            "collectibles": {},
        }
        for stem, kind in (
            ("golden_seeds", "golden_seeds"),
            ("sacred_tears", "sacred_tears"),
            ("scadutree", "scadutree"),
            ("rspirit_ash", "rspirit_ash"),
        ):
            data = load(stem)
            if data:
                doc["collectibles"].update(flatten_collectibles(data))

        nb = load("night_boss") or {}
        doc["nightBosses"] = [
            {"category": cat, "x": it["x"], "y": it["y"], "id": it.get("id")}
            for cat, items in nb.items()
            for it in items
            if "x" in it
        ]

    out = os.path.join(OUT_DIR, "eldenringmap.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    counts = {k: len(v) for k, v in doc.items() if isinstance(v, list)}
    counts["collectibles"] = {k: len(v) for k, v in doc["collectibles"].items()}
    print(f"wrote {out}")
    print(f"  {counts}")


def ingest_ercl(pack_dir):
    zpath = find_zip(pack_dir, "ER Checklist")
    if not zpath:
        print("! ER Checklist pack not found")
        return
    with zipfile.ZipFile(zpath) as zf:
        n = next((x for x in zf.namelist() if x.endswith("items.json")), None)
        raw = read_zip_json(zf, n) if n else None
    if not raw:
        print("! items.json not found in checklist pack")
        return

    categories = {}
    for key, cat in (raw.get("categories") or {}).items():
        items = [{"id": it.get("id"), "name": it.get("name")} for it in cat.get("items", []) if it.get("name")]
        categories[key] = {"display_name": cat.get("display_name", key), "items": items}

    doc = {
        "source": ERCL_SOURCE,
        "version": raw.get("version"),
        "categories": categories,
    }
    out = os.path.join(OUT_DIR, "ercl-items.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {out}")
    print(f"  { {k: len(v['items']) for k, v in categories.items()} }")


def _norm_chapter(ch):
    return {
        "id": ch.get("id"),
        "order": ch.get("order", 0),
        "name": ch.get("name", ""),
        "mainGoal": ch.get("mainGoal", ""),
        "summary": ch.get("summary", ""),
        "locations": [
            {
                "id": loc.get("id"),
                "name": loc.get("name", ""),
                "kind": loc.get("kind", ""),
                "summary": loc.get("summary", ""),
                "dangerLevel": loc.get("dangerLevel"),
            }
            for loc in ch.get("locations", [])
        ],
        "quests": [
            {
                "id": q.get("id"),
                "order": q.get("order", 0),
                "title": q.get("title", ""),
                "type": q.get("type", ""),
                "importanceLabel": q.get("importanceLabel", ""),
                "summary": q.get("summary", ""),
                "directions": q.get("directions", ""),
                "goal": q.get("goal", ""),
                "locationId": q.get("locationId", ""),
            }
            for q in ch.get("quests", [])
        ],
    }


def ingest_medusa(pack_dir):
    zpath = find_zip(pack_dir, "Elden Medusa")
    if not zpath:
        print("! Medusa pack not found")
        return
    acts = {}
    with zipfile.ZipFile(zpath) as zf:
        names = sorted(n for n in zf.namelist() if "data/en/" in n.replace("\\", "/") and n.endswith(".json"))
        for n in names:
            j = read_zip_json(zf, n)
            for act in j.get("acts", []):
                a = acts.setdefault(act.get("id"), {
                    "id": act.get("id"),
                    "order": act.get("order", 0),
                    "name": act.get("name", ""),
                    "summary": act.get("summary", ""),
                    "lore": act.get("lore", ""),
                    "chapters": {},
                })
                for ch in act.get("chapters", []):
                    if ch.get("id"):
                        a["chapters"][ch["id"]] = _norm_chapter(ch)
            # act9 chapter3+ keep chapters at the top level
            for ch in j.get("chapters", []):
                act_id = ch.get("actId")
                if act_id and ch.get("id"):
                    a = acts.setdefault(act_id, {"id": act_id, "order": 0, "name": act_id, "summary": "", "lore": "", "chapters": {}})
                    a["chapters"].setdefault(ch["id"], _norm_chapter(ch))

    doc_acts = []
    for a in sorted(acts.values(), key=lambda x: x["order"]):
        chapters = [c for c in a["chapters"].values()]
        chapters.sort(key=lambda c: c.get("order", 0))
        for c in chapters:
            c["quests"].sort(key=lambda q: q.get("order", 0))
            c["actId"] = a["id"]
        doc_acts.append({
            "id": a["id"], "order": a["order"], "name": a["name"],
            "summary": a["summary"], "lore": a["lore"], "chapters": chapters,
        })

    doc = {"source": MEDUSA_SOURCE, "acts": doc_acts}
    out = os.path.join(OUT_DIR, "medusa-route.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    chapters = sum(len(a["chapters"]) for a in doc_acts)
    quests = sum(len(c["quests"]) for a in doc_acts for c in a["chapters"])
    locs = sum(len(c["locations"]) for a in doc_acts for c in a["chapters"])
    print(f"wrote {out}")
    print(f"  acts {len(doc_acts)}  chapters {chapters}  locations {locs}  quests {quests}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pack-dir", default=os.path.expanduser("~/Downloads"))
    args = ap.parse_args()
    print(f"pack dir: {args.pack_dir}")
    ingest_eldenringmap(args.pack_dir)
    ingest_ercl(args.pack_dir)
    ingest_medusa(args.pack_dir)


if __name__ == "__main__":
    main()
