"""Export the full Fandom wiki snapshot DB into per-kind JSON (Task 132 §1).

Source: `data/raw/er-mcp.db` (teoucsb82/elden-ring-mcp release asset, a versioned
Fandom-wiki snapshot). Unlike `scripts/export-mcp-db.py` (which mines only the
acquisition/quests/sections tables the app already consumed), this script
classifies **every page** by its `{{Infobox <Type>}}` and emits one file per
entity kind under `public/sourced/open/wiki-db/`, plus the redirect table as
aliases.

Pure stdlib (`sqlite3`, `json`, `re`, `argparse`) — no installs.

    python scripts/export-wiki-db.py [--db data/raw/er-mcp.db]

Outputs:
    public/sourced/open/wiki-db/summary.json      counts per kind
    public/sourced/open/wiki-db/redirects.json    {from,to,fragment}
    public/sourced/open/wiki-db/<kind>.json       classified pages

The `<kind>.json` records carry the raw infobox field map plus a cleaned
description, region/location, drops and stats, so `entityIndexBuild.ts` can fold
them field-by-field without re-parsing wikitext.
"""
import argparse
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sourced", "open", "wiki-db")
SOURCE = "teoucsb82/elden-ring-mcp (wiki snapshot DB)"

# Infobox type -> app kind. First match wins; types not listed are skipped.
INFOBOX_KIND = [
    ("Boss ERN", "nightreign"),
    ("Boss", "boss"),
    ("Enemy", "enemy"),
    ("Character", "npc"),
    ("Location", "location"),
    ("Region", "region"),
    ("Subregion", "location"),
    ("Dungeon", "dungeon"),
    ("legacy dungeon", "dungeon"),
    ("legacy_dungeon", "dungeon"),
    ("Evergaol", "dungeon"),
    ("Weapon", "weapon"),
    ("Armor", "armor"),
    ("Item", "item"),
    ("Hero", "nightreign"),
    ("Class", "class"),
    ("Lore", "lore"),
    ("Faction", "faction"),
    ("School", "lore"),
    ("Object", "object"),
    ("Mechanic", "mechanic"),
]

# Item infobox `type` -> finer kind (only used for the generic Item/Item ERN
# infobox). Anything unlisted stays an `item` (goods/crafting/etc.).
ITEM_TYPE_KIND = {
    "talisman": "talisman",
    "sorcery": "spell",
    "incantation": "spell",
    "ash of war": "ash",
    "ashes": "ash",
    "skill": "skill",
    "unique skill": "skill",
    "spirit ashes": "spirit",
    "spirit ash": "spirit",
    "gesture": "gesture",
    "relic": "nightreign",
    "chalice": "nightreign",
}

# Infobox fields selected into the record's `stats` map (label -> field).
STAT_FIELDS = {
    "Boss": [("HP", "hp"), ("Runes", "runes"), ("Poise", "poise"), ("Drops", "drops"), ("Location", "location")],
    "Enemy": [("HP", "hp"), ("Runes", "runes"), ("Poise", "poise"), ("Drops", "drops"), ("Location", "location")],
    "Character": [("Role", "role"), ("Affiliation", "affiliation"), ("Race", "race"), ("Voice", "voice")],
    "Location": [("Type", "type"), ("Region", "region"), ("Bosses", "bosses"), ("Graces", "graces"), ("Owner", "owner")],
    "Weapon": [("Type", "type"), ("Weight", "weight"), ("Requirements", "requirements"), ("Skill", "skills")],
    "Armor": [("Type", "type"), ("Weight", "weight"), ("Poise", "poise")],
    "Item": [("Type", "type"), ("Effect", "item_effect"), ("Obtained", "obtained"), ("Weight", "weight"), ("Max held", "max_held")],
}

BOX_RE = re.compile(r"\{\{\s*[Ii]nfobox[\s_]+([A-Za-z0-9_ -]+)", re.I)
CAT_RE = re.compile(r"\[\[Category:\s*([^\]|#]+)")
HEADING_RE = re.compile(r"^\s*=+\s*([^=]+?)\s*=+\s*$", re.M)
REF_RE = re.compile(r"<ref[^>]*?/>|<ref[^>]*?>.*?</ref>", re.I | re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
TEMPLATE_RE = re.compile(r"\{\{[^{}]*\}\}")
LINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
TAG_RE = re.compile(r"<[^>]+>")
TITLE_SUFFIX_RE = re.compile(r"\s*\((?:[^)]*)\)\s*$")


def clean(text):
    """Strip wikitext markup down to readable prose."""
    if not text:
        return ""
    out = str(text)
    out = COMMENT_RE.sub(" ", out)
    out = REF_RE.sub(" ", out)
    # Expand the handful of templates whose rendered text matters for prose.
    out = re.sub(r"\{\{\s*ER\s*(\|[^}]*)?\}\}", "Elden Ring", out, flags=re.I)
    out = re.sub(r"\{\{\s*SotE\s*(\|[^}]*)?\}\}", "Shadow of the Erdtree", out, flags=re.I)
    out = re.sub(r"\{\{\s*TextColor[^}]*\}\}", "", out, flags=re.I)
    # Templates may nest; collapse repeatedly.
    for _ in range(6):
        new = TEMPLATE_RE.sub(" ", out)
        if new == out:
            break
        out = new
    out = out.replace("<br>", " · ").replace("<br/>", " · ").replace("<br />", " · ")
    out = LINK_RE.sub(lambda m: (m.group(2) or m.group(1)).strip(), out)
    out = TAG_RE.sub(" ", out)
    out = out.replace("'''", "").replace("''", "")
    out = out.replace("&nbsp;", " ").replace("&amp;", "&")
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r"\n{2,}", "\n", out)
    return out.strip()


def first_para(wikitext):
    """The lead prose before the first section heading, as one paragraph."""
    if not wikitext:
        return ""
    body = wikitext
    m = HEADING_RE.search(body)
    if m:
        body = body[: m.start()]
    # `clean` strips the infobox templates (and expands {{ER}}/{{SotE}}).
    return clean(body)


def _infobox_bodies(wikitext):
    """Every `{{Infobox ...}}` on the page as (type, body)."""
    out = []
    for m in BOX_RE.finditer(wikitext or ""):
        start = wikitext.rfind("{{", 0, m.end())
        depth = 0
        i = start
        while i < len(wikitext):
            if wikitext[i : i + 2] == "{{":
                depth += 1
                i += 2
                continue
            if wikitext[i : i + 2] == "}}":
                depth -= 1
                i += 2
                if depth == 0:
                    break
                continue
            i += 1
        out.append((m.group(1).strip(), wikitext[start:i]))
    return out


def _parse_fields(body):
    fields = {}
    for pm in re.finditer(r"\|\s*([a-zA-Z0-9_ -]+?)\s*=\s*([^\n|]*)", body):
        key = pm.group(1).strip()
        value = clean(pm.group(2))
        value = value.replace("}}", "").strip().strip("·").strip()
        if key and key.lower() not in ("title", "image", "japanese", "caption", "image1", "image2", "label"):
            fields.setdefault(key, value)
    return fields


# Most-specific infobox first: a boss page whose lead templates are Enemy/Character
# must still classify as Boss.
INFOBOX_PRIORITY = [
    "Boss ERN", "Boss", "Dungeon", "legacy dungeon", "legacy_dungeon", "Evergaol",
    "Character", "Subregion", "Region", "Location",
    "Weapon", "Armor", "Item ERN", "Item", "Enemy",
    "Hero", "Class", "Lore", "Faction", "School", "Object", "Mechanic",
]


def parse_infobox(wikitext):
    """(kind, fields) for the most-specific infobox on the page, or (None, {})."""
    bodies = _infobox_bodies(wikitext)
    if not bodies:
        return None, {}
    by_type = {}
    for type_name, body in bodies:
        by_type.setdefault(type_name.lower(), (type_name, body))
    for wanted in INFOBOX_PRIORITY:
        hit = by_type.get(wanted.lower())
        if hit:
            return hit[0], _parse_fields(hit[1])
    # Unknown infobox type: fall back to the first.
    return bodies[0][0], _parse_fields(bodies[0][1])


def looks_dlc(dlc_flag, dlc_signals, wikitext):
    if dlc_flag:
        return True
    signals = dlc_signals or ""
    if "sote" in signals.lower():
        return True
    text = wikitext or ""
    return bool(re.search(r"SotE|Shadow of the Erdtree", text))


def looks_nightreign(categories, infobox_type):
    if infobox_type in ("Hero", "Boss ERN", "Weapon ERN", "Item ERN"):
        return True
    return any("nightreign" in c.lower() for c in categories)


def split_list(value):
    value = clean(value).strip(" ·")
    if not value:
        return []
    value = value.replace("·", "\n")
    parts = re.split(r"\n|,|;", value)
    return [p.strip(" ·").strip() for p in parts if p.strip(" ·").strip() and p.strip(" ·").lower() not in ("none", "n/a")]


def classify(infobox_type, fields):
    if infobox_type is None:
        return None
    base = None
    for needle, kind in INFOBOX_KIND:
        if infobox_type.lower() == needle.lower() or infobox_type.lower().startswith(needle.lower()):
            base = kind
            break
    if base is None:
        return None
    if base in ("item", "nightreign") and infobox_type.lower().startswith("item"):
        item_type = (fields.get("type") or "").strip().lower()
        if item_type in ITEM_TYPE_KIND:
            base = ITEM_TYPE_KIND[item_type]
    return base


def build_record(row):
    page_id, title, url, wikitext, dlc, dlc_signals = row
    wikitext = wikitext or ""
    categories = [c.strip() for c in CAT_RE.findall(wikitext)]
    infobox_type, fields = parse_infobox(wikitext)
    kind = classify(infobox_type, fields)
    if kind is None:
        return None
    nightreign = looks_nightreign(categories, infobox_type)
    if nightreign:
        return None
    record = {
        "id": f"wiki:{page_id}",
        "title": title,
        "kind": kind,
        "infobox": infobox_type,
        "url": url or "",
        "dlc": looks_dlc(dlc, dlc_signals, wikitext),
        "categories": categories,
        "region": clean(fields.get("region") or fields.get("majorRegion") or ""),
        "location": clean(fields.get("location") or ""),
        "description": first_para(wikitext)[:1200],
        "drops": split_list(fields.get("drops")),
    }
    stats = {}
    stat_fields = STAT_FIELDS.get(infobox_type, [])
    for label, key in stat_fields:
        value = fields.get(key)
        if value:
            value = clean(value)
            if value and value not in ("-", "—", "n/a", "N/A", "None"):
                stats[label] = value
    # Boss/enemy always carry their own infobox type label.
    if kind in ("boss", "enemy") and not record["region"]:
        record["region"] = clean(fields.get("area") or fields.get("area_name") or "")
    if kind in ("location", "region", "dungeon") and not record["location"]:
        record["location"] = clean(fields.get("type") or "")
    record["stats"] = stats
    return record


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default=os.path.join(ROOT, "data", "raw", "er-mcp.db"))
    args = ap.parse_args()
    if not os.path.isfile(args.db):
        raise SystemExit(f"DB not found: {args.db} (see data/raw/README.md)")

    con = sqlite3.connect(args.db)
    cur = con.cursor()

    records = {}
    skipped = 0
    for row in cur.execute(
        "select id, title, url, wikitext, dlc, dlc_signals from pages where wikitext is not null"
    ):
        rec = build_record(row)
        if rec is None:
            skipped += 1
            continue
        records.setdefault(rec["kind"], []).append(rec)

    redirects = [
        {"from": from_title, "to": to_title, "fragment": fragment or ""}
        for from_title, to_title, fragment in cur.execute(
            "select from_title, to_title, fragment from redirects"
        )
        if from_title and to_title
    ]
    con.close()

    os.makedirs(OUT_DIR, exist_ok=True)
    summary = {"source": SOURCE, "kinds": {}, "skipped": skipped, "redirects": len(redirects)}
    for kind, rows in sorted(records.items()):
        rows.sort(key=lambda r: r["title"].lower())
        with open(os.path.join(OUT_DIR, f"{kind}.json"), "w", encoding="utf-8") as f:
            json.dump({"source": SOURCE, "kind": kind, "count": len(rows), "records": rows}, f, ensure_ascii=False, separators=(",", ":"))
        summary["kinds"][kind] = len(rows)
    with open(os.path.join(OUT_DIR, "redirects.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "count": len(redirects), "redirects": redirects}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"wrote {OUT_DIR}")
    for kind, count in sorted(summary["kinds"].items()):
        print(f"  {kind:12s} {count}")
    print(f"  redirects    {len(redirects)}")
    print(f"  skipped (no app kind) {skipped}")


if __name__ == "__main__":
    main()
