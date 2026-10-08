#!/usr/bin/env python3
"""Task 184 — build `src/data/image-index-extra.json`.

The FanAPI image plane (`src/data/image-index.json`, Task 36/154) predates the
Shadow of the Erdtree and only covers items and bosses. This script assembles a
second, local picture plane for the entity kinds it misses, without touching the
generated index or `fanImage.ts`:

  1. Enemies + NPCs — the portraits already downloaded from the wiki dump by
     `scripts/ingest-entity-images.py` (`.scratch/184/entity-images.json`).
  2. Graces + regions — a 256px WebP crop of the app's committed map plate
     (`public/sourced/maps/m*.jpg`, the same art the Atlas draws) centred on the
     record's `map` coords, into `public/sourced/images/places/`. The layer is
     chosen by `map.world` (overworld / underground / ashen / shadow). A record
     with no coords, or no committed plate for its world, stays empty.
  3. Merchants + quests — the owning character's portrait: a merchant's own
     NPC/merchant record (its `name` before the " - <goods>" suffix), a quest
     step's NPC (from the step's `related`), matched by normalised name against
     the NPC/boss/enemy pictures in the base index and item 1.

Empty beats wrong: a record is only mapped when its owner resolves to a known
character name; anything ambiguous is left out. `--check` prints per-kind
coverage without writing anything.

    python scripts/build-image-index-extra.py [--check]
"""
import argparse
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTITY_INDEX = os.path.join(ROOT, "public", "sourced", "entity-index.json")
BASE_INDEX = os.path.join(ROOT, "src", "data", "image-index.json")
EXTRA_INDEX = os.path.join(ROOT, "src", "data", "image-index-extra.json")
EMIS = os.path.join(ROOT, ".scratch", "184", "entity-images.json")
PLACES_DIR = os.path.join(ROOT, "public", "sourced", "images", "places")

# The committed static plates the Atlas draws (see docs/MAP-ENGINE.md /
# src/lib/ps5MapReference.ts). The engine's tile pyramid is gitignored and not
# present on a fresh checkout, so the plates are what the app actually ships.
PLATES = {
    "overworld": "public/sourced/maps/m0-overworld.jpg",
    "underground": "public/sourced/maps/m1-underground.jpg",
    "ashen": "public/sourced/maps/m-ashen.jpg",
    "shadow": "public/sourced/maps/m-shadow.jpg",
}
CROP_FRACTION = 0.12  # square crop side = 12% of the plate's short edge
THUMB = 256

# Title words dropped when matching an owner ("Lady Tanith" -> "Tanith").
TITLES = (
    "needle knight", "bloody finger hunter", "bloody finger", "war counselor",
    "dragon communion", "white mask", "finger reader", "sir", "lady", "lord",
    "knight", "countess", "count", "preceptor", "sorceress", "sorcerer",
    "blackguard", "redmane", "old", "castellan", "nomadic", "hermit",
    "isolated", "imprisoned", "gatekeeper", "commander", "pastor", "errant",
    "violet", "raging", "noble",
)
SEPS = ("\u2014", " \u2013 ", " - ", " & ", " / ", ":")


def norm(value):
    """`fanImage.normalizeName`, the key form of `image-index.json`."""
    s = str(value).lower()
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def ascii_fold(value):
    s = unicodedata.normalize("NFKD", str(value))
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def owner_fold(value):
    """Accent-insensitive, article-insensitive key for owner-name matching."""
    s = ascii_fold(re.sub(r"\*+\(?optional\)?\*+", "", str(value), flags=re.I))
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"\b(the|of|a|an)\b", " ", s).strip()


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", ascii_fold(value)).strip("-")


def split_candidates(name):
    """Ordered owner-name candidates from a record's own display name."""
    name = re.sub(r"\*+\(?optional\)?\*+", "", name, flags=re.I).strip()
    out = [name]
    for sep in SEPS:
        if sep in name:
            out.append(name.split(sep)[0].strip())
    out.extend(part.strip() for part in re.split(r"\s*&\s*|\s*/\s*|,", name))
    stripped = name
    for title in sorted(TITLES, key=len, reverse=True):
        if stripped.lower().startswith(title + " "):
            stripped = stripped[len(title) + 1 :]
            out.append(stripped)
            break
    res = []
    for candidate in out:
        candidate = re.sub(r"\s*\((?:step\s*\d+|\d+)\)\s*$", "", candidate, flags=re.I).strip()
        if candidate and candidate not in res:
            res.append(candidate)
    return res


def merchant_candidates(name):
    out = split_candidates(name)
    if " - " in name:
        base, suffix = name.split(" - ", 1)
        out.insert(0, f"{base} ({suffix})")
        if base.strip() == "Merchant":
            out.insert(0, f"Nomadic Merchant ({suffix})")
    return out


def quest_candidates(record):
    out = split_candidates(record["name"])
    for related in record.get("related") or []:
        if isinstance(related, str):
            out.append(related)
    return out


def build_owner_lookup(records, base_index, emis):
    """name-key (owner_fold) -> picture path, over every character record.

    The base FanAPI index is surveyed only for names that are actual characters
    (npc/merchant/boss/enemy), so an owner named "Boc" cannot be matched to an
    unrelated item key from the item plane.
    """
    character_kinds = ("npc", "merchant", "boss", "enemy")
    character_keys = {
        owner_fold(record["name"])
        for record in records.values()
        if record.get("kind") in character_kinds
    }
    for rid in emis.get("ids", {}):
        record = records.get(rid)
        if record:
            character_keys.add(owner_fold(record["name"]))
    lookup = {}
    for key, path in base_index.items():
        folded = owner_fold(key)
        if folded in character_keys:
            lookup.setdefault(folded, path)
    for record in records.values():
        if record.get("kind") in character_kinds and record.get("image"):
            lookup.setdefault(owner_fold(record["name"]), record["image"])
    for rid, path in emis.get("ids", {}).items():
        record = records.get(rid)
        if record and rid.split(":", 1)[0] in ("npc", "enemy"):
            lookup.setdefault(owner_fold(record["name"]), path)
    return lookup


def owner_picture(candidates, lookup):
    for candidate in candidates:
        key = owner_fold(candidate)
        if key and key in lookup:
            return lookup[key]
    for candidate in candidates:
        key = owner_fold(candidate)
        if len(key) < 3:
            continue
        matches = {
            path for name, path in lookup.items()
            if name == key or name.startswith(key + " ") or name.endswith(" " + key)
        }
        if len(matches) == 1:
            return matches.pop()
    return None


def already_has_picture(record, base_index):
    """A real existing picture (game icon, FanAPI, or wiki portrait)."""
    return bool(record.get("image")) or norm(record["name"]) in base_index


def is_covered(record, base_index, extra_ids):
    """Coverage measure: an existing picture or one this script produced."""
    return already_has_picture(record, base_index) or record["id"] in extra_ids


def crop_place(record, out_dir):
    coords = record.get("map") or {}
    world = coords.get("world")
    plate_rel = PLATES.get(world)
    if not plate_rel or coords.get("x") is None or coords.get("y") is None:
        return None
    plate = os.path.join(ROOT, plate_rel)
    if not os.path.exists(plate):
        return None
    image = Image.open(plate).convert("RGB")
    width, height = image.size
    side = max(64, round(CROP_FRACTION * min(width, height)))
    x = coords["x"] / 100 * width
    y = coords["y"] / 100 * height
    left = min(max(x - side / 2, 0), width - side)
    top = min(max(y - side / 2, 0), height - side)
    crop = image.crop((round(left), round(top), round(left) + side, round(top) + side))
    crop = crop.resize((THUMB, THUMB), Image.Resampling.LANCZOS)
    name_slug = slug(record["name"]) or slug(record["id"])
    rel = f"/sourced/images/places/{name_slug}.webp"
    dest = os.path.join(out_dir, f"{name_slug}.webp")
    if not os.path.exists(dest):
        crop.save(dest, "WEBP", quality=82, method=4)
    return rel


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="print coverage, write nothing")
    args = ap.parse_args()

    records = json.load(open(ENTITY_INDEX, encoding="utf-8"))["records"]
    base_index = json.load(open(BASE_INDEX, encoding="utf-8"))
    emis = json.load(open(EMIS, encoding="utf-8")) if os.path.exists(EMIS) else {"names": {}, "ids": {}}
    lookup = build_owner_lookup(records, base_index, emis)

    os.makedirs(PLACES_DIR, exist_ok=True)
    extra = {"names": {}, "ids": {}}
    counts = Counter()
    skipped = Counter()

    # Item 1 — enemies + NPCs from the wiki-dump downloads.
    for rid, path in emis["ids"].items():
        record = records.get(rid)
        if not record:
            continue
        extra["ids"][rid] = path
        key = norm(record["name"])
        if key and key not in base_index:
            extra["names"].setdefault(key, path)
        counts[record["kind"]] += 1

    # Item 2 — graces + regions from the committed map plates.
    for record in records.values():
        kind = record.get("kind")
        if kind not in ("grace", "region") or already_has_picture(record, base_index):
            continue
        rel = crop_place(record, PLACES_DIR)
        if not rel:
            skipped[kind] += 1
            continue
        extra["ids"][record["id"]] = rel
        key = norm(record["name"])
        if key and key not in base_index:
            extra["names"].setdefault(key, rel)
        counts[kind] += 1

    # Item 3 — merchants + quests by their owning character's portrait.
    for record in records.values():
        kind = record.get("kind")
        if kind not in ("merchant", "quest") or already_has_picture(record, base_index):
            continue
        if kind == "merchant":
            candidates = merchant_candidates(record["name"])
        elif record["id"].startswith("line:"):
            candidates = split_candidates(record["name"])
        else:
            candidates = quest_candidates(record)
        rel = owner_picture(candidates, lookup)
        if not rel:
            skipped[kind] += 1
            continue
        extra["ids"][record["id"]] = rel
        key = norm(record["name"])
        if key and key not in base_index:
            extra["names"].setdefault(key, rel)
        counts[kind] += 1

    if args.check:
        for kind in ("enemy", "npc", "grace", "region", "merchant", "quest"):
            total = sum(1 for r in records.values() if r.get("kind") == kind)
            covered = sum(
                1 for r in records.values()
                if r.get("kind") == kind and is_covered(r, base_index, extra["ids"])
            )
            print(f"{kind:9} {covered:4}/{total:<4} {covered / total * 100:5.1f}%")
        print("new:", dict(counts), "skipped:", dict(skipped))
        return

    with open(EXTRA_INDEX, "w", encoding="utf-8") as fh:
        json.dump(extra, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write("\n")
    print(f"wrote {EXTRA_INDEX}: {len(extra['names'])} names / {len(extra['ids'])} ids")
    print("new:", dict(counts), "skipped:", dict(skipped))


if __name__ == "__main__":
    main()
