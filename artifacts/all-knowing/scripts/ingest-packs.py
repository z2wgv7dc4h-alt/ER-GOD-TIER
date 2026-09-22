"""Ingest the user's local structured packs into `public/sourced/open/`.

Reads (read-only) from a downloads folder:

  * `ER Checklist*.zip`      -> mods/ercl/items.json (categorised item ids/names)
  * `Elden Medusa*.zip`      -> data/en/act*  (100% walkthrough text)

Emits:

  * public/sourced/open/ercl-items.json     item checklist (base + SotE)
  * public/sourced/open/medusa-route.json   walkthrough acts/chapters/steps

The map-marker side of the old "EldenRingMap" Nexus pack is NOT ingested here:
it is the same project as the vendored engine, which already carries those
markers in full, so the app reads the engine's own data instead
(`scripts/export-engine-markers.mjs` -> `src/lib/engineMarkers.ts`).

    python scripts/ingest-packs.py [--pack-dir "C:\\Users\\<you>\\Downloads"]
"""
import argparse
import glob
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sourced", "open")

ERCL_SOURCE = "ER Checklist (Nexus 9953) mods/ercl/items.json"
MEDUSA_SOURCE = "Elden Medusa (Nexus 10286) 100% walkthrough, data/en/act*/"


def read_zip_json(zf, name):
    with zf.open(name) as f:
        return json.load(f)


def find_zip(pack_dir, prefix):
    hits = glob.glob(os.path.join(pack_dir, prefix + "*.zip"))
    return hits[0] if hits else None


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

    doc = {"source": ERCL_SOURCE, "version": raw.get("version"), "categories": categories}
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
    ingest_ercl(args.pack_dir)
    ingest_medusa(args.pack_dir)


if __name__ == "__main__":
    main()
