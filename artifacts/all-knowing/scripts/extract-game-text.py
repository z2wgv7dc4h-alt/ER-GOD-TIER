"""Regenerate public/sourced/open/text/ from a local Elden Ring install.

This is the *full text* dump beside names.json: every FMG string table the game
ships in English, not just item names. That includes the verbatim NPC dialogue
(`TalkMsg`) and talk-condition text (`EventTextForTalk`), plus menu, tutorial,
key-guide, place-name and caption tables.

Base and DLC bundles are merged per table: `TalkMsg` + `TalkMsg_dlc02`, etc.
DLC rows add new ids but never overwrite a base string (and the per-table
"DLC dummy" placeholder is dropped), exactly like extract-fmg-names.py.

    python scripts/extract-game-text.py [--game-dir "...\\ELDEN RING\\Game"]

Read-only against the install. Nothing is written into the game directory.
Output goes to public/sourced/open/text/ (committed, like names.json); it is
game text the user owns, redistributed the same way names.json already is.
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "scripts")
sys.path.insert(0, TOOLS)

from erlib import fmg, oodle  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

OUT_DIR = os.path.join(ROOT, "public", "sourced", "open", "text")

# English only for now. Adding a locale here is the whole change for more
# languages; the app reads the manifest's `locale` to label them.
LOCALES = {"en": "engus"}

# Base first, then DLC: DLC rows only fill ids the base does not already own.
BUNDLES = [
    "menu.msgbnd.dcx", "menu_dlc02.msgbnd.dcx", "menu_dlc03.msgbnd.dcx",
    "item.msgbnd.dcx", "item_dlc02.msgbnd.dcx", "item_dlc03.msgbnd.dcx",
]

ERROR_PREFIX = "[ERROR]"
SENTINEL = "dlc dummy"
DLC_SUFFIX = re.compile(r"_dlc\d*$")


def strip_error(text):
    if text.startswith(ERROR_PREFIX):
        text = text[len(ERROR_PREFIX):]
    return text.strip()


def is_placeholder(text):
    return strip_error(text).lower() == SENTINEL


def load_tables(game_dir, oodle_helper):
    dvd = DvdBnd(game_dir, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    merged = {}      # table -> {id: text}
    provenance = {}  # table -> set of bundle basenames that contributed
    for folder in LOCALES.values():
        for bundle in BUNDLES:
            path = f"/msg/{folder}/{bundle}"
            if not dvd.has(path):
                continue
            data = dvd.read(path)
            for fmg_name, table in fmg.load_msgbnd(data, oodle=oodle_helper).items():
                key = DLC_SUFFIX.sub("", fmg_name)
                dest = merged.setdefault(key, {})
                src = provenance.setdefault(key, set())
                for tid, value in table.items():
                    text = strip_error(str(value))
                    if not text or is_placeholder(text):
                        continue
                    if tid in dest:          # base wins over DLC
                        continue
                    dest[tid] = text
                    src.add(bundle)
    dvd.close()
    return merged, provenance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-dir", default=None, help="...\\ELDEN RING\\Game")
    parser.add_argument("--out", default=OUT_DIR)
    args = parser.parse_args()

    game_dir = require_game_dir(args.game_dir)
    print(f"game dir: {game_dir}")
    helper = oodle.make_helper(game_dir)
    tables, provenance = load_tables(game_dir, helper)

    os.makedirs(args.out, exist_ok=True)
    manifest = []
    for name in sorted(tables):
        rows = {str(tid): tables[name][tid] for tid in sorted(tables[name])}
        with open(os.path.join(args.out, f"{name}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        manifest.append({
            "table": name,
            "count": len(rows),
            "sources": sorted(provenance.get(name, ())),
        })

    with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({
            "locale": "en",
            "tableCount": len(manifest),
            "stringCount": sum(m["count"] for m in manifest),
            "tables": manifest,
        }, f, ensure_ascii=False, indent=1)

    print(f"wrote {args.out}")
    print(f"tables: {len(manifest)}   strings: {sum(m['count'] for m in manifest):,}")
    for m in manifest:
        print(f"  {m['table']:<24} {m['count']:>6}  <- {', '.join(m['sources'])}")


if __name__ == "__main__":
    main()
