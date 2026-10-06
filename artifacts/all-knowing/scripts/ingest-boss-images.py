#!/usr/bin/env python3
"""Download boss portraits the FanAPI never had (Task 154 step 3).

The FanAPI predates Shadow of the Erdtree, so every SotE boss (and a few base
bosses) has no cached picture. The Fandom wiki dump (`.scratch/er-mcp.db`, the
same sqlite the rest of the app reads) stores each page's wikitext, whose boss
infobox carries the image file name. This resolves the page for every boss record
that still has no picture, downloads the file through
`Special:FilePath/<file>` (max one request per second), writes a 256px WebP to
`public/sourced/images/bosses/`, and records the name -> path in
`src/data/image-index.json` (ingest-images.py conventions) and the exact record
name -> path in `public/sourced/open/boss-images.json` for the entity builder.

Run after a first `npm run index:entities`; re-run that afterwards.

    python scripts/ingest-boss-images.py [--limit N] [--dry-run]
"""
import argparse
import io
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, ".scratch", "er-mcp.db")
INDEX_PATH = os.path.join(ROOT, "src", "data", "image-index.json")
ENTITY_INDEX = os.path.join(ROOT, "public", "sourced", "entity-index.json")
BOSS_JSON = os.path.join(ROOT, "public", "sourced", "open", "boss-images.json")
IMG_DIR = os.path.join(ROOT, "public", "sourced", "images", "bosses")
FILEPATH = "https://eldenring.fandom.com/wiki/Special:FilePath/"
API = "https://eldenring.fandom.com/api.php"
UA = "all-knowing-boss-images/1.0"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
THUMB = 256
MIN_INTERVAL = 1.0

# Bosses whose wiki page has no usable infobox picture, but whose real art lives
# under a different File name on the same wiki (found via the search API).
MANUAL = {
    "Battlemage Hugues": "ER Battlemage Hugues.png",
    "Red Bear": "SE Enemy Red Bear.png",
    "Rugalea the Great Red Bear": "SE Enemy Red Bear.png",
    "Snake Snail": "ER Enemy Snail Snake.png",
}

_last_request = [0.0]


def throttle():
    """Keep every Fandom request (API + image) at most one per second."""
    wait = MIN_INTERVAL - (time.time() - _last_request[0])
    if wait > 0:
        time.sleep(wait)
    _last_request[0] = time.time()


def fetch_binary(url):
    """Download an image. curl, not urllib: Cloudflare 403s the Python TLS hello."""
    curl = shutil.which("curl") or "curl.exe"
    throttle()
    result = subprocess.run(
        [curl, "-sSL", "--fail", "-A", BROWSER_UA,
         "-H", "Referer: https://eldenring.fandom.com/", url],
        capture_output=True,
    )
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError(f"curl exit {result.returncode}: {result.stderr.decode('utf-8', 'replace')[:120]}")
    return result.stdout


def file_url(image):
    """The static.wikia URL for a Fandom File:, via the MediaWiki API.

    static.wikia.nocookie.net serves the image but its path hash cannot be
    guessed, and Special:FilePath is 403 from here; the API gives the real URL.
    """
    query = urllib.parse.urlencode({
        "action": "query", "titles": f"File:{image}",
        "prop": "imageinfo", "iiprop": "url", "format": "json",
    })
    throttle()
    req = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": UA})
    data = json.loads(urllib.request.urlopen(req, timeout=60).read())
    for page in (data.get("query", {}).get("pages") or {}).values():
        info = page.get("imageinfo")
        if info:
            return info[0].get("url")
    return None


def norm(s):
    """fanImage.normalizeName, the image-index key form."""
    s = str(s).lower()
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def clean_image(value):
    value = value.strip()
    value = re.sub(r"^\[\[|\]\]$", "", value)
    value = re.sub(r"^File:", "", value, flags=re.I)
    return value.split("|")[0].strip()


def pick_images(wikitext):
    """Ordered infobox image candidates for a boss: real art before item icons."""
    values = [clean_image(v) for v in re.findall(r"\|\s*image\d*\s*=\s*([^\n|}]+)", wikitext, re.I)]
    values = [v for v in values if v and "<" not in v and ">" not in v]
    junk = re.compile(r"\b(icon|remembrance|talisman|weapon|armor|spell|incantation|sorcery|great rune|key item|map)\b", re.I)
    good = [v for v in values if not junk.search(v)]
    art = [v for v in good if re.search(r"boss|render", v, re.I)]
    ordered = art + [v for v in good if v not in art]
    return list(dict.fromkeys(ordered))


def load_missing():
    doc = json.load(open(ENTITY_INDEX, encoding="utf-8"))
    records = doc["records"]
    index = json.load(open(INDEX_PATH, encoding="utf-8"))
    names = []
    for record in records.values():
        if record.get("kind") != "boss" or record.get("image"):
            continue
        if "--" in record["id"]:      # per-location encounter, inherits its group
            continue
        if index.get(norm(record["name"])):
            continue
        names.append(record["name"])
    return sorted(set(names))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        sys.exit(f"missing {DB_PATH}")
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()

    title_by_norm = {}
    for (title,) in cur.execute("select title from pages"):
        title_by_norm.setdefault(norm(title), title)
    exact = {}
    for (title,) in cur.execute("select title from pages"):
        exact.setdefault(title.lower(), title)
    redirects = {norm(f): t for f, t in cur.execute("select from_title, to_title from redirects")}

    def resolve(name):
        candidates = (name, name.replace(" and ", " & "), name.split(" & ")[0], name.split("(")[0])
        for candidate in candidates:                 # an exact title first
            if candidate.lower() in exact:
                return exact[candidate.lower()]
        for candidate in candidates:
            key = norm(candidate)
            if key in title_by_norm:
                return title_by_norm[key]
            if key in redirects and norm(redirects[key]) in title_by_norm:
                return title_by_norm[norm(redirects[key])]
        return None

    names = load_missing()
    if args.limit:
        names = names[:args.limit]
    print(f"missing boss portraits: {len(names)}")

    index = json.load(open(INDEX_PATH, encoding="utf-8"))
    extra = json.load(open(BOSS_JSON, encoding="utf-8")) if os.path.exists(BOSS_JSON) else {}
    os.makedirs(IMG_DIR, exist_ok=True)

    downloaded = 0
    skipped = []
    for name in names:
        rel = f"/sourced/images/bosses/{slug(name)}.webp"
        dest = os.path.join(IMG_DIR, f"{slug(name)}.webp")
        if os.path.exists(dest) and name not in MANUAL:
            index[norm(name)] = rel
            extra[name] = rel
            continue
        title = resolve(name)
        if not title:
            skipped.append((name, "no wiki page"))
            continue
        row = cur.execute("select wikitext from pages where title=?", (title,)).fetchone()
        candidates = ([MANUAL[name]] if name in MANUAL else []) + (pick_images(row[0]) if row else [])
        if not candidates:
            skipped.append((name, f"no boss image on '{title}'"))
            continue
        if args.dry_run:
            print(f"  {name} <- {title} :: {candidates}")
            continue
        try:
            url = None
            for candidate in candidates:
                url = file_url(candidate)
                if url:
                    break
            if not url:
                skipped.append((name, f"no downloadable File: among {candidates} on '{title}'"))
                continue
            raw = fetch_binary(url)
            im = Image.open(io.BytesIO(raw)).convert("RGBA")
            im.thumbnail((THUMB, THUMB), Image.Resampling.LANCZOS)
            im.save(dest, "WEBP", quality=82, method=4)
        except Exception as exc:  # noqa: BLE001 - report, never guess
            skipped.append((name, f"download failed: {type(exc).__name__}: {exc}"))
            continue
        downloaded += 1
        index[norm(name)] = rel
        extra[name] = rel
        print(f"  {name} <- {candidates[0]}")

    if args.dry_run:
        return
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    with open(BOSS_JSON, "w", encoding="utf-8") as f:
        json.dump(extra, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    total = sum(os.path.getsize(os.path.join(IMG_DIR, f)) for f in os.listdir(IMG_DIR)
                if f.endswith(".webp"))
    print(f"\ndownloaded {downloaded} boss portraits; {len(extra)} in the boss map ({total / 1e6:.1f} MB)")
    if skipped:
        print(f"still without a picture ({len(skipped)}):")
        for name, why in skipped:
            print(f"  {name}: {why}")


if __name__ == "__main__":
    main()
