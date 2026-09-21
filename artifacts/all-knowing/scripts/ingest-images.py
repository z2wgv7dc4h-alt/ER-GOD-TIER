#!/usr/bin/env python3
"""Ingest real item / weapon / boss / location images for the Codex (Task 36).

Source: the FanAPI (https://eldenring.fanapis.com, deliton/eldenring-api JSON).
The checklist dumps this repo already carries (public/sourced/checklists/*.json)
hold a per-entry `image` URL on fanapis.com; bosses.json and locations.json do
not, so those two routes are fetched live from the API.

Each image is downscaled to a 160 px WebP thumbnail and written to
public/sourced/images/<category>/<id>.webp (the originals run to ~78 MB; the
thumbnails are a few MB and are all the Codex cards need). A name index is
written to src/data/image-index.json; `fanImage()` (src/lib/fanImage.ts) looks
a name up and renders the local file, so a Codex render never hits the network.

FanAPI is pre-Shadow-of-the-Erdtree: base-game content only. SotE / Tarnished
Pack entries are left without an image and reported as the DLC gap.

Usage (from artifacts/all-knowing):
    python3 scripts/ingest-images.py

Re-runnable: existing thumbnails are skipped and the index is rebuilt from what
is on disk. Do not hand-edit src/data/image-index.json — re-run this script.
"""

import io
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "public" / "sourced" / "images"
INDEX_PATH = ROOT / "src" / "data" / "image-index.json"
API = "https://eldenring.fanapis.com/api"

THUMB = 160
UA = "all-knowing-image-ingest/1.0"

# Checklist files that already carry a FanAPI image URL.
CHECKLISTS = [
    "weapons", "armors", "talismans", "sorceries", "incantations", "items",
    "ashes", "spirits", "ammos", "shields", "classes", "creatures", "npcs",
]


def norm(s: str) -> str:
    """Same normalisation as src/lib/fanImage.ts and scripts/gen-aliases.mjs."""
    s = str(s).lower()
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def fetch(url: str, tries: int = 3) -> bytes:
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read()
        except Exception as e:  # noqa: BLE001 - retry any transport error
            last = e
            time.sleep(0.4 * (i + 1))
    raise RuntimeError(f"fetch failed: {url} ({last})")


def fetch_json(url: str):
    return json.loads(fetch(url).decode("utf-8"))


def fetch_all(route: str):
    out = []
    for page in range(40):
        data = fetch_json(f"{API}/{route}?limit=100&page={page}").get("data") or []
        out.extend(data)
        if len(data) < 100:
            break
    return out


def collect():
    entries = []
    for cat in CHECKLISTS:
        path = ROOT / "public" / "sourced" / "checklists" / f"{cat}.json"
        if not path.exists():
            continue
        rows = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not row or not row.get("image") or not row.get("name"):
                continue
            entries.append({
                "category": cat,
                "name": row["name"],
                "id": row.get("id") or slug(row["name"]),
                "url": row["image"],
            })
    return entries


def main():
    print("collecting FanAPI image URLs...")
    entries = collect()
    for route in ("bosses", "locations"):
        try:
            rows = fetch_all(route)
        except RuntimeError as e:
            print(f"  ! {route}: {e}")
            rows = []
        for row in rows:
            if not row or not row.get("image") or not row.get("name"):
                continue
            entries.append({
                "category": route,
                "name": row["name"],
                "id": row.get("id") or slug(row["name"]),
                "url": row["image"],
            })

    # Dedupe by (category, id): two names can share the same asset URL (the
    # FanAPI reuses art), but every name still needs its own index entry, so do
    # not collapse on URL alone.
    seen = set()
    unique = []
    for e in entries:
        key = (e["category"], slug(e["id"]))
        if key in seen:
            continue
        seen.add(key)
        unique.append(e)
    print(f"  {len(unique)} images to cache ({len(entries) - len(unique)} duplicate rows collapsed)")

    stats = {"downloaded": 0, "skipped": 0, "failed": [], "bytes": 0}
    lock_errors = []

    def work(entry):
        dest = IMG_DIR / entry["category"] / f"{slug(entry['id'])}.webp"
        if dest.exists():
            stats["skipped"] += 1
            return
        try:
            raw = fetch(entry["url"])
            im = Image.open(io.BytesIO(raw)).convert("RGBA")
            im.thumbnail((THUMB, THUMB))
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "WEBP", quality=82, method=4)
            stats["downloaded"] += 1
            stats["bytes"] += dest.stat().st_size
        except Exception as e:  # noqa: BLE001
            lock_errors.append(f"{entry['category']}/{entry['name']}: {e}")

    with ThreadPoolExecutor(max_workers=24) as pool:
        list(pool.map(work, unique))

    stats["failed"] = lock_errors

    # Rebuild the index from what is actually on disk.
    index = {}
    by_category = {}
    for e in unique:
        dest = IMG_DIR / e["category"] / f"{slug(e['id'])}.webp"
        if not dest.exists():
            continue
        key = norm(e["name"])
        if not key:
            continue
        rel = f"/sourced/images/{e['category']}/{dest.name}"
        if key not in index:
            index[key] = rel
        by_category[e["category"]] = by_category.get(e["category"], 0) + 1

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(index, separators=(",", ":")) + "\n", encoding="utf-8")

    print(f"\ndownloaded {stats['downloaded']}, already cached {stats['skipped']}, failed {len(stats['failed'])}")
    print(f"cache size added this run: {stats['bytes'] / 1e6:.1f} MB")
    print(f"wrote {len(index)} indexed names to {INDEX_PATH}")
    print("indexed by category:")
    for cat, n in sorted(by_category.items()):
        print(f"  {cat}: {n}")
    if stats["failed"]:
        print("failures:")
        for f in stats["failed"][:20]:
            print(f"  {f}")


if __name__ == "__main__":
    sys.exit(main())
