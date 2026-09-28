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

Task 133 §1 adds the full readable/searchable corpus (`export_wiki_corpus`,
called at the end of `main`):

    public/sourced/wiki/manifest.json             page metadata + entityId -> page
    public/sourced/wiki/pages-000.json ...        every page, chunked
    public/sourced/wiki/search-index.json         search meta (bucket map)
    public/sourced/wiki/search-<bucket>.json      term -> [pageId, section, tf]

The corpus keeps the prose as plain text and rewrites wiki links to
`[[entityId|label]]` markers for the in-app reader (`src/lib/wikiSearch.ts`).
"""
import argparse
import json
import os
import re
import sqlite3
import sys
import unicodedata

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

    # Task 133 §1 — also write the full readable/searchable corpus.
    export_wiki_corpus(args.db)


# ===========================================================================
# Task 133 §1 — the full readable/searchable corpus under public/sourced/wiki/
# ===========================================================================

CORPUS_DIR = os.path.join(ROOT, "public", "sourced", "wiki")
PAGE_CHUNK = 120
SEARCH_BUDGET = 3 * 1024 * 1024  # task: chunk the index when it exceeds 3 MB

CORPUS_INFOBOX_KIND = {
    "lore": "lore", "faction": "faction", "mechanic": "mechanic", "location": "region",
    "subregion": "region", "region": "region", "character": "npc", "enemy": "enemy",
    "boss": "boss", "item": "item", "weapon": "weapon", "armor": "armor", "spell": "spell",
    "dungeon": "dungeon", "evergaol": "dungeon", "legacy dungeon": "dungeon",
    "legacy_dungeon": "dungeon", "class": "class", "object": "object", "school": "concept",
    "game": "concept", "effect": "concept", "glitch": "concept", "company": "concept",
    "real person": "concept", "playerrole": "concept", "book": "lore", "trophy": "trophy",
    "patch notes": "patch", "empty": "concept",
}
CORPUS_CATEGORY_KIND = [
    ("lore", "lore"), ("faction", "faction"), ("mechanic", "mechanic"), ("concept", "concept"),
    ("location", "region"), ("subregion", "region"), ("characters", "npc"), ("npc", "npc"),
    ("boss", "boss"), ("enemy", "enemy"), ("dungeon", "dungeon"), ("weapon", "weapon"),
    ("armor", "armor"), ("spell", "spell"), ("item", "item"),
]

CORPUS_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has", "have",
    "he", "her", "his", "i", "if", "in", "into", "is", "it", "its", "me", "my", "no", "not",
    "of", "on", "or", "our", "so", "that", "the", "their", "them", "then", "there", "these",
    "they", "this", "to", "up", "was", "we", "were", "will", "with", "you", "your",
}

# When several entities share a name, the character/boss record is the useful
# wiki link ("Ranni the Witch" -> the NPC, not the quest line).
CORPUS_NAME_PRIORITY = {
    "npc": 0, "merchant": 1, "boss": 1, "hunt": 1, "invader": 2, "dungeon": 2,
    "mechanic": 2, "region": 6, "grace": 6, "line": 4, "quest": 5, "ending": 5,
    "gate": 5, "build": 5, "damage": 4, "enemy": 7,
}
CORPUS_DEFAULT_PRIORITY = 3


def corpus_norm(value):
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[\u2019'`\"]", "", text.lower())
    return re.sub(r"[^a-z0-9+]+", " ", text).strip()


def corpus_slug(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")


def corpus_load(path, default):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return default


def corpus_priority(entity_id):
    return CORPUS_NAME_PRIORITY.get(entity_id.split(":", 1)[0], CORPUS_DEFAULT_PRIORITY)


def corpus_stem(token):
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("es") and len(token) > 4:
        return token[:-2]
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        return token[:-1]
    if token.endswith("ing") and len(token) > 5:
        return token[:-3]
    if token.endswith("ed") and len(token) > 4:
        return token[:-2]
    return token


def corpus_tokenize(text):
    text = unicodedata.normalize("NFD", str(text or "").lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    out = []
    for raw in re.findall(r"[a-z0-9']+", text):
        token = raw.replace("'", "")
        if len(token) < 2 or token in CORPUS_STOPWORDS:
            continue
        out.append(corpus_stem(token))
    return out


def corpus_bucket(term):
    return term[0] if term and re.match(r"[a-z0-9]", term[0]) else "_"


def export_wiki_corpus(db_path):
    """Write the Task 133 §1 corpus. See the module docstring addendum."""
    sourced = os.path.join(ROOT, "public", "sourced")
    entity_index = corpus_load(os.path.join(sourced, "entity-index.json"), {})
    aliases = corpus_load(os.path.join(sourced, "aliases.json"), [])
    redirects_doc = corpus_load(os.path.join(sourced, "open", "wiki-db", "redirects.json"), {})

    by_name = {}

    def add_name(name, entity_id):
        key = corpus_norm(name)
        if not key or not entity_id:
            return
        ids = by_name.setdefault(key, [])
        if entity_id not in ids:
            ids.append(entity_id)

    for record in (entity_index.get("records") or {}).values():
        add_name(record.get("name"), record.get("id"))
    for row in aliases:
        for name in [row.get("fmgName")] + list(row.get("aliases") or []):
            add_name(name, row.get("slug"))

    redirect_to = {}
    for row in redirects_doc.get("redirects") or []:
        key = corpus_norm(row.get("from"))
        if key and key not in redirect_to:
            redirect_to[key] = row.get("to")

    def canonical_title(title):
        current = title or ""
        for _ in range(4):
            nxt = redirect_to.get(corpus_norm(current))
            if not nxt or corpus_norm(nxt) == corpus_norm(current):
                break
            current = nxt
        return current

    def entities_for(title):
        found = []
        for candidate in (canonical_title(title), title):
            for entity_id in by_name.get(corpus_norm(candidate), []):
                if entity_id not in found:
                    found.append(entity_id)
        found.sort(key=lambda entity_id: (corpus_priority(entity_id), str(entity_id)))
        return found

    def entity_for(title):
        found = entities_for(title)
        return found[0] if found else None

    wiki_link = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
    ref = re.compile(r"<ref[^>]*>.*?</ref>", re.I | re.S)
    ref_self = re.compile(r"<ref[^>]*/>", re.I)
    comment = re.compile(r"<!--.*?-->", re.S)
    tag = re.compile(r"<[^>]+>")
    template = re.compile(r"\{\{[^{}]*\}\}")
    ext_link = re.compile(r"\[https?://\S+\s+([^\]]+)\]")
    ext_link_bare = re.compile(r"\[https?://\S+\]")

    def clean_markdown(text):
        if not text:
            return ""
        text = comment.sub(" ", text)
        text = ref.sub(" ", text)
        text = ref_self.sub(" ", text)
        text = tag.sub(" ", text)
        text = template.sub(" ", text)

        def link(match):
            target = (match.group(1) or "").strip()
            label = (match.group(2) or target).strip()
            entity_id = entity_for(target)
            return "[[%s|%s]]" % (entity_id, label) if entity_id else label

        text = wiki_link.sub(link, text)
        text = ext_link.sub(r"\1", text)
        text = ext_link_bare.sub(" ", text)
        text = text.replace("'''", "").replace("''", "")
        text = re.sub(r"==+", "", text)
        text = re.sub(r"^\s*[*#:;]+\s*", "", text, flags=re.M)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def infer_kind(title, wikitext):
        match = re.search(r"\{\{\s*Infobox\s*([A-Za-z_ ]+)", wikitext or "")
        if match and match.group(1).strip().lower() in CORPUS_INFOBOX_KIND:
            return CORPUS_INFOBOX_KIND[match.group(1).strip().lower()]
        lowered = (wikitext or "").lower()
        for needle, kind in CORPUS_CATEGORY_KIND:
            if "[[category:%s" % needle in lowered:
                return kind
        return "lore"

    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    page_kind = {}
    for page_id, _, name in cursor.execute("select page_id, type, name from entities"):
        page_kind[page_id] = (page_kind.get(page_id) or "").lower() or None

    sections_by_page = {}
    for section_id, page_id, ord_, heading, markdown in cursor.execute(
        "select id, page_id, ord, heading, markdown from sections order by page_id, ord"
    ):
        cleaned = clean_markdown(markdown)
        if not heading and not cleaned:
            continue
        sections_by_page.setdefault(page_id, []).append(
            {"heading": (heading or "").strip(), "markdown": cleaned}
        )

    pages = []
    entity_to_page = {}
    for page_id, title, url, wikitext in cursor.execute(
        "select id, title, url, wikitext from pages order by id"
    ):
        title = (title or "").strip()
        if not title:
            continue
        entity_ids = entities_for(title)
        entity_id = entity_ids[0] if entity_ids else None
        if entity_id:
            kind = (entity_id.split(":", 1)[0] or "wiki").lower()
        else:
            kind = page_kind.get(page_id) or infer_kind(title, wikitext)
            entity_id = "wiki:%s" % corpus_slug(title)
            entity_ids = [entity_id]
            if kind not in CORPUS_INFOBOX_KIND.values():
                kind = "lore"
        pages.append({
            "id": page_id,
            "title": title,
            "entityId": entity_id,
            "kind": kind,
            "url": url or "",
            "sections": sections_by_page.get(page_id, []),
        })
        for eid in entity_ids:
            entity_to_page.setdefault(eid, page_id)

    os.makedirs(CORPUS_DIR, exist_ok=True)
    for stale in os.listdir(CORPUS_DIR):
        if stale.startswith(("pages-", "search-")) and stale.endswith(".json"):
            os.remove(os.path.join(CORPUS_DIR, stale))

    manifest_pages = {}
    chunks = []
    for index in range(0, len(pages), PAGE_CHUNK):
        chunk_pages = pages[index:index + PAGE_CHUNK]
        name = "pages-%03d.json" % (index // PAGE_CHUNK)
        chunks.append(name)
        for page in chunk_pages:
            manifest_pages[str(page["id"])] = {
                "title": page["title"],
                "entityId": page["entityId"],
                "kind": page["kind"],
                "url": page["url"],
                "chunk": name,
                "sections": len(page["sections"]),
            }
        with open(os.path.join(CORPUS_DIR, name), "w", encoding="utf-8") as handle:
            json.dump({"chunk": name, "pages": chunk_pages}, handle, ensure_ascii=False, separators=(",", ":"))

    with open(os.path.join(CORPUS_DIR, "manifest.json"), "w", encoding="utf-8") as handle:
        json.dump({
            "generatedAt": None,
            "pageCount": len(pages),
            "chunks": chunks,
            "pages": manifest_pages,
            "byEntity": entity_to_page,
        }, handle, ensure_ascii=False, separators=(",", ":"))

    docs = 0
    postings = {}
    lengths = {}
    for page in pages:
        for section_index, section in enumerate(page["sections"]):
            docs += 1
            key = (page["id"], section_index)
            weights = {}
            for term in corpus_tokenize(section["markdown"]):
                weights[term] = weights.get(term, 0) + 1
            for term in set(corpus_tokenize(section["heading"])):
                weights[term] = weights.get(term, 0) + 3
            for term in set(corpus_tokenize(page["title"])):
                weights[term] = weights.get(term, 0) + 4
            for term, weight in weights.items():
                postings.setdefault(term, {})[key] = weight
            lengths["%d:%d" % key] = sum(weights.values())
    avgdl = (sum(lengths.values()) / docs) if docs else 0.0

    buckets = {}
    for term in sorted(postings):
        buckets.setdefault(corpus_bucket(term), {})[term] = [
            [page, ord_, weight] for (page, ord_), weight in sorted(postings[term].items())
        ]

    total = sum(
        len(json.dumps(bucket, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        for bucket in buckets.values()
    )
    if total <= SEARCH_BUDGET:
        terms = {term: rows for bucket in buckets.values() for term, rows in bucket.items()}
        with open(os.path.join(CORPUS_DIR, "search-index.json"), "w", encoding="utf-8") as handle:
            json.dump({"generatedAt": None, "docs": docs, "pages": len(pages), "single": True, "avgdl": avgdl, "lengths": lengths, "terms": terms}, handle, ensure_ascii=False, separators=(",", ":"))
    else:
        bucket_files = {}
        for name in sorted(buckets):
            filename = "search-%s.json" % name
            bucket_files[name] = filename
            with open(os.path.join(CORPUS_DIR, filename), "w", encoding="utf-8") as handle:
                json.dump(buckets[name], handle, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(CORPUS_DIR, "search-index.json"), "w", encoding="utf-8") as handle:
            json.dump({
                "generatedAt": None,
                "docs": docs,
                "pages": len(pages),
                "avgdl": avgdl,
                "lengths": lengths,
                "buckets": bucket_files,
                "terms": sum(len(bucket) for bucket in buckets.values()),
            }, handle, ensure_ascii=False, separators=(",", ":"))

    wiki_only = sum(1 for page in pages if str(page["entityId"]).startswith("wiki:"))
    print("wiki corpus: %d pages, %d sections, %d chunks" % (len(pages), docs, len(chunks)))
    print("  entity-linked pages: %d (ids: %d), wiki-only: %d" % (len(pages) - wiki_only, len(entity_to_page), wiki_only))
    print("  search index: %s" % ("single file" if total <= SEARCH_BUDGET else "%d buckets, %.1f MB" % (len(buckets), total / 1024 / 1024)))


if __name__ == "__main__":
    main()
