#!/usr/bin/env python3
"""Extract the game's own item icons from a local Elden Ring install (Task 154).

Every equipment param row carries an icon id (`EquipParamWeapon.iconId`,
`EquipParamProtector.iconIdM/iconIdF`, `EquipParamAccessory.iconId`,
`EquipParamGoods.iconId`, `EquipParamGem.iconId`). The matching texture lives in
the `menu/hi/00_solo` BXF4 archive as `MENU_Knowledge_<icon id>`, one 1024px DDS
per file, and its display name is the FMG `*Name` table row with the same numeric
id (verified: the param and the text table share the id).

This reads those params + name tables, decodes only the icons some named item
actually uses with Pillow (via `erlib.tpf`), writes 128px WebP thumbnails to
`public/sourced/images/game-icons/<iconId>.webp`, and a name -> icon id map to
`public/sourced/open/item-icons.json`. DLC rows are included: they ship in the
same archive.

Read-only against the install; refuses to run with ER_MOD_DIR set. Missing
Paramdex defs are downloaded (public, like Task 145).

    python scripts/extract-item-icons.py [--game-dir "...\\ELDEN RING\\Game"]
"""
import argparse
import json
import os
import re
import sys
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(ROOT, "vendor", "elden-ring-map")
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from erlib import dcx, oodle, param, paramdef  # noqa: E402
from erlib import tpf as tpflib  # noqa: E402
from erlib.bxf4 import BXF4  # noqa: E402
from erlib.dvdbnd import DvdBnd  # noqa: E402
from erlib.gamepath import require_game_dir  # noqa: E402

DEFS = os.path.join(ENGINE, "data", "paramdefs")
TEXT = os.path.join(ROOT, "public", "sourced", "open", "text")
IMG_DIR = os.path.join(ROOT, "public", "sourced", "images", "game-icons")
INDEX_PATH = os.path.join(ROOT, "public", "sourced", "open", "item-icons.json")
PARAMDEX_URL = "https://raw.githubusercontent.com/soulsmods/Paramdex/master/ER/Defs/{}.xml"

SOLO_BHD = "/menu/hi/00_solo.tpfbhd"
SOLO_BDT = "/menu/hi/00_solo.tpfbdt"
TEX_PREFIX = "MENU_Knowledge_"

THUMB = 128
QUALITY = 80
LANCZOS = Image.Resampling.LANCZOS

# param -> (name table, icon field, female fallback, name prefix to strip)
PARAMS = [
    ("EquipParamWeapon", "WeaponName", "iconId", None, None),
    ("EquipParamProtector", "ProtectorName", "iconIdM", "iconIdF", None),
    ("EquipParamAccessory", "AccessoryName", "iconId", None, None),
    ("EquipParamGoods", "GoodsName", "iconId", None, None),
    ("EquipParamGem", "GemName", "iconId", None, r"^ash(?:es)? of war:\s*"),
]


def clean(text):
    text = str(text or "").strip()
    if text.startswith("[ERROR]"):
        text = text[len("[ERROR]"):].strip()
    if not text or text.lower() == "dlc dummy" or "%null%" in text.lower():
        return ""
    return text


def ensure_def(name):
    path = os.path.join(DEFS, f"{name}.xml")
    if os.path.exists(path):
        return path
    print(f"  downloading {name}.xml ...")
    url = PARAMDEX_URL.format(name)
    req = urllib.request.Request(url, headers={"User-Agent": "all-knowing-icon-extract/1.0"})
    data = urllib.request.urlopen(req, timeout=60).read()
    os.makedirs(DEFS, exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return path


def text_table(name):
    path = os.path.join(TEXT, f"{name}.json")
    if not os.path.exists(path):
        sys.exit(f"missing name table {path} - run extract-game-text.py first")
    return {int(k): v for k, v in json.load(open(path, encoding="utf-8")).items()}


def collect(params):
    """name -> icon id for every named param row, across the equipment params."""
    name_icon = {}
    for pname, table, field, fallback, strip in PARAMS:
        d = paramdef.load(ensure_def(pname))
        p = params[pname]
        if p.row_size != d.row_size:
            sys.exit(f"{pname}: install row size {p.row_size} != paramdef {d.row_size}; "
                     "refusing to trust the field offsets")
        names = text_table(table)
        pattern = re.compile(strip, re.IGNORECASE) if strip else None
        kept = 0
        for r in p.rows:
            nm = clean(names.get(r.id))
            if pattern:
                nm = pattern.sub("", nm).strip()
            if not nm:
                continue
            icon = d.get(r.data, field)
            if fallback and not icon:
                icon = d.get(r.data, fallback)
            if not icon:
                continue
            name_icon.setdefault(nm, icon)
            kept += 1
        print(f"  {pname:<21} {p.row_size:>5}B rows  {kept:>5} named with an icon")
    return name_icon


def load_archive(game):
    dvd = DvdBnd(game, cache_dir=os.path.join(ROOT, ".scratch", "cache"), verbose=False)
    bhd = dvd.read(SOLO_BHD)
    bdt_entry = dvd.entry(SOLO_BDT)
    bdt_file = open(os.path.join(game, bdt_entry.archive + ".bdt"), "rb")
    archive = BXF4(bhd, bdt_file, bdt_base=bdt_entry.offset)
    by_id = {}
    for e in archive.entries:
        base = e.name.replace("\\", "/").split("/")[-1]
        if base.startswith(TEX_PREFIX) and base.endswith(".tpf.dcx"):
            try:
                by_id[int(base[len(TEX_PREFIX):-len(".tpf.dcx")])] = e
            except ValueError:
                continue
    return dvd, archive, bdt_file, by_id


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--game-dir", default=None)
    args = ap.parse_args()
    if os.environ.get("ER_MOD_DIR"):
        sys.exit("ER_MOD_DIR is set - this extractor must read the unmodded game only.")

    game = require_game_dir(args.game_dir)
    print(f"game dir: {game}")
    params = param.load_params(os.path.join(game, "regulation.bin"))

    name_icon = collect(params)
    print(f"  {len(name_icon)} named items -> {len(set(name_icon.values()))} distinct icon ids")

    dvd, archive, bdt_file, by_id = load_archive(game)
    print(f"  {SOLO_BHD}: {archive.file_count} entries, {len(by_id)} knowledge textures")

    helper = oodle.make_helper(game)
    os.makedirs(IMG_DIR, exist_ok=True)

    needed = sorted(set(name_icon.values()))
    saved = set()
    missing = []
    added_bytes = 0
    errors = []
    for i, icon_id in enumerate(needed):
        dest = os.path.join(IMG_DIR, f"{icon_id}.webp")
        if os.path.exists(dest):
            saved.add(icon_id)
            continue
        entry = by_id.get(icon_id)
        if entry is None:
            missing.append(icon_id)
            continue
        try:
            raw = archive.read_entry(entry)
            tex_dec = dcx.decompress(raw, oodle=helper)
            textures = tpflib.parse(tex_dec)
            if not textures:
                missing.append(icon_id)
                continue
            img, _w, _h = tpflib.texture_image(tex_dec, textures[0])
            img = img.convert("RGBA")
            img.thumbnail((THUMB, THUMB), LANCZOS)
            img.save(dest, "WEBP", quality=QUALITY, method=4)
            saved.add(icon_id)
            added_bytes += os.path.getsize(dest)
        except Exception as exc:  # noqa: BLE001 - report the format, do not guess
            errors.append(f"{icon_id}: {type(exc).__name__}: {exc}")
        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{len(needed)} icons")
    bdt_file.close()
    dvd.close()

    index = {name: icon for name, icon in sorted(name_icon.items()) if icon in saved}
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    total = sum(os.path.getsize(os.path.join(IMG_DIR, f"{i}.webp")) for i in saved)
    print(f"\nwrote {len(index)} name -> icon entries to {os.path.relpath(INDEX_PATH, ROOT)}")
    print(f"icons on disk: {len(saved)}  ({total / 1e6:.1f} MB, {added_bytes / 1e6:.1f} MB new)")
    print(f"no texture in archive: {len(missing)} {missing[:20]}")
    if errors:
        print(f"decode errors: {len(errors)}")
        for e in errors[:20]:
            print(f"  {e}")


if __name__ == "__main__":
    main()
