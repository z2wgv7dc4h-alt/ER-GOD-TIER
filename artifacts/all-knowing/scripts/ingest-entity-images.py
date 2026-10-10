#!/usr/bin/env python3
"""Download enemy + NPC portraits from the Fandom wiki dump (Task 184 item 1).

Task 154 gave bosses their portraits; they are still missing for most enemies
and NPCs. The wiki dump (`.scratch/er-mcp.db`, the same sqlite the rest of the
app reads) stores each page's wikitext, whose infobox carries the image file
name. This resolves the page for every enemy/NPC record that has no picture in
`public/sourced/entity-index.json` (record.image) and none in the FanAPI index
(`src/data/image-index.json`), downloads the file through the wiki API
(max one request per second), writes a 256px WebP to
`public/sourced/images/creatures/` (enemies) or `public/sourced/images/npcs/`
(NPCs), and records name/id -> path in `.scratch/184/entity-images.json`.

Enemy variants share their base enemy's picture: every record that resolves to
the same wiki page maps to the same file. A record whose page cannot be resolved
or has no usable infobox image is left empty (empty beats wrong).

Raw downloads are cached under `.scratch/184/` so a re-run is cheap.

    python scripts/ingest-entity-images.py [--kind enemy|npc] [--limit N] [--dry-run]
"""
import argparse
import html
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
CACHE = os.path.join(ROOT, ".scratch", "184")
INDEX_PATH = os.path.join(ROOT, "src", "data", "image-index.json")
ENTITY_INDEX = os.path.join(ROOT, "public", "sourced", "entity-index.json")
OUT = os.path.join(CACHE, "entity-images.json")
CREATURE_DIR = os.path.join(ROOT, "public", "sourced", "images", "creatures")
NPC_DIR = os.path.join(ROOT, "public", "sourced", "images", "npcs")
API = "https://eldenring.fandom.com/api.php"
UA = "all-knowing-entity-images/1.0"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
THUMB = 256
MIN_INTERVAL = 1.0

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

    Special:FilePath 403s from here; the API returns the real static.wikia URL
    (the same file Special:FilePath would redirect to).
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
    value = html.unescape(str(value)).strip()
    value = re.sub(r"^\[\[|\]\]$", "", value)
    value = re.sub(r"^File:", "", value, flags=re.I)
    value = value.split("|")[0].strip()
    if re.search(r"[<>#{}]|^https?:|^(gallery|/gallery)$", value, re.I):
        return ""
    return value


def pick_images(wikitext):
    """Ordered infobox image candidates: real art before item icons."""
    raw = re.findall(r"\|\s*image\d*\s*=\s*([^\n|}]+)", wikitext, re.I)
    for gallery in re.findall(r"<gallery[^>]*>(.*?)</gallery>", wikitext, re.I | re.S):
        raw.extend(line.strip() for line in gallery.splitlines())
    values = [clean_image(v) for v in raw]
    values = [v for v in values if v]
    junk = re.compile(
        r"\b(icon|remembrance|talisman|weapon|armor|spell|incantation|sorcery|"
        r"great rune|key item|site of grace|map fragment|dungeon map|note)\b", re.I)
    good = [v for v in values if not junk.search(v)]
    ordered = good + [v for v in values if v not in good]
    return list(dict.fromkeys(ordered))


def base_name(name):
    n = re.sub(r"^\(.*?\)\s*", "", name)
    n = re.sub(r"\s*\(.*$", "", n)
    n = re.sub(r"\s*\u00d7\d+$", "", n)
    return n.strip()


def candidates(name):
    """Ordered page-title candidates for a record name."""
    out = [name, name.replace("\u2019", "'"), name.replace(" and ", " & ")]
    stripped = re.sub(r"\s+-\s+.*$", "", name).strip()
    out.append(stripped)
    out.append(re.sub(r"\s+Both$", "", stripped).strip())
    out.append(base_name(name))
    out.append(base_name(stripped))
    out.append(name.split(" & ")[0])
    out.append(name.split("(")[0])
    seen, ordered = set(), []
    for c in out:
        c = c.strip()
        if c and c not in seen:
            seen.add(c)
            ordered.append(c)
    return ordered


def load_missing(only_kind=None):
    doc = json.load(open(ENTITY_INDEX, encoding="utf-8"))
    records = doc["records"]
    index = json.load(open(INDEX_PATH, encoding="utf-8"))
    kinds = ("enemy", "npc") if not only_kind else (only_kind,)
    out = []
    for record in records.values():
        if record.get("kind") not in kinds or record.get("image"):
            continue
        if index.get(norm(record["name"])):
            continue
        out.append(record)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--kind", choices=["enemy", "npc"])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        sys.exit(f"missing {DB_PATH}")
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()

    title_by_norm = {}
    exact = {}
    for (title,) in cur.execute("select title from pages"):
        title_by_norm.setdefault(norm(title), title)
        exact.setdefault(title.lower(), title)
    redirects = {norm(f): t for f, t in cur.execute("select from_title, to_title from redirects")}

    def resolve(name):
        for candidate in candidates(name):
            if candidate.lower() in exact:
                return exact[candidate.lower()]
        for candidate in candidates(name):
            key = norm(candidate)
            if key in title_by_norm:
                return title_by_norm[key]
            if key in redirects and norm(redirects[key]) in title_by_norm:
                return title_by_norm[norm(redirects[key])]
        return None

    records = load_missing(args.kind)
    if args.limit:
        records = records[:args.limit]
    print(f"missing enemy/npc portraits: {len(records)}")

    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(CREATURE_DIR, exist_ok=True)
    os.makedirs(NPC_DIR, exist_ok=True)
    result = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"names": {}, "ids": {}}

    downloaded = 0
    skipped = []
    for record in records:
        name = record["name"]
        kind = record["kind"]
        title = resolve(name)
        if not title:
            skipped.append((name, "no wiki page"))
            continue
        row = cur.execute("select wikitext from pages where title=?", (title,)).fetchone()
        picks = pick_images(row[0]) if row else []
        if not picks:
            skipped.append((name, f"no infobox image on '{title}'"))
            continue
        rel_dir = "creatures" if kind == "enemy" else "npcs"
        abs_dir = CREATURE_DIR if kind == "enemy" else NPC_DIR
        rel = f"/sourced/images/{rel_dir}/{slug(title)}.webp"
        dest = os.path.join(abs_dir, f"{slug(title)}.webp")
        if args.dry_run:
            print(f"  [{kind}] {name} <- {title} :: {picks[:2]}")
            result["names"][norm(name)] = rel
            result["ids"][record["id"]] = rel
            continue
        try:
            if not os.path.exists(dest):
                cached = os.path.join(CACHE, slug(title) + ".bin")
                raw = None
                if os.path.exists(cached):
                    raw = open(cached, "rb").read()
                else:
                    url = None
                    for pick in picks:
                        url = file_url(pick)
                        if url:
                            break
                    if not url:
                        skipped.append((name, f"no downloadable File: among {picks[:3]} on '{title}'"))
                        continue
                    raw = fetch_binary(url)
                    with open(cached, "wb") as fh:
                        fh.write(raw)
                im = Image.open(io.BytesIO(raw)).convert("RGBA")
                im.thumbnail((THUMB, THUMB), Image.Resampling.LANCZOS)
                im.save(dest, "WEBP", quality=82, method=4)
                downloaded += 1
        except Exception as exc:  # noqa: BLE001 - report, never guess
            skipped.append((name, f"download failed: {type(exc).__name__}: {exc}"))
            continue
        result["names"][norm(name)] = rel
        result["ids"][record["id"]] = rel
        print(f"  [{kind}] {name} <- {title}")

    if args.dry_run:
        print(f"\ndry-run: {len(result['names'])} name keys / {len(result['ids'])} records; {len(skipped)} unresolved")
        for name, why in skipped:
            print(f"  {name}: {why}")
        return

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write("\n")
    print(f"\ndownloaded {downloaded} new; {len(result['names'])} names / {len(result['ids'])} ids in the map")
    if skipped:
        print(f"still without a picture ({len(skipped)}):")
        for name, why in skipped:
            print(f"  {name}: {why}")


if __name__ == "__main__":
    main()
