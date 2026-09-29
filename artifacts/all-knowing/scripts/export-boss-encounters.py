"""Export per-encounter boss data from the wiki snapshot DB.

Bosses that appear in several places (Night's Cavalry x9, Tree Sentinel,
Deathbird, ...) have one wiki page with a ``<tabber>`` of ``{{Infobox Boss}}``
tabs -- one per encounter, each with its own location, HP, runes, drops and a
short description. The flat exports keep only the page-level infobox, so this
script keeps every tab.

Pure stdlib. Source: ``data/raw/er-mcp.db`` (gitignored wiki snapshot).

    python scripts/export-boss-encounters.py [--db data/raw/er-mcp.db]

Output: ``public/sourced/open/wiki-db/boss-encounters.json``
    [{page, tab, location, hp, runes, drops[], text}]
"""
import argparse
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sourced", "open", "wiki-db", "boss-encounters.json")


def plain(text):
    """Wikitext -> readable plain text (links keep their label)."""
    t = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    t = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", " ", t, flags=re.S)
    t = re.sub(r"<br\s*/?>", ", ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\{\{grace\}\}", "", t)
    t = re.sub(r"\{\{[^{}]*\}\}", " ", t)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]", r"\1", t)
    t = t.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", t).strip(" ,")


def infobox_fields(block):
    fields = {}
    for m in re.finditer(r"^\s*\|\s*([a-z_ ]+?)\s*=(.*?)(?=^\s*\||^\}\})", block, flags=re.M | re.S):
        fields[m.group(1).strip()] = m.group(2).strip()
    return fields


def number(value):
    """First number in the field ("6,461 / 5,384" for a duo -> 6461)."""
    m = re.search(r"\d[\d,]*", plain(value or ""))
    return int(m.group(0).replace(",", "")) if m else None


def drops_of(value):
    if not value:
        return []
    names = [re.sub(r"\s*\[.*$", "", n).strip() for n in re.findall(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]", value)]
    names = [n for n in names if n]
    if names:
        return names
    text = plain(value)
    return [text] if text else []


def encounters(title, wikitext):
    out = []
    for tabber in re.findall(r"<tabber>(.*?)</tabber>", wikitext, flags=re.S):
        for tab in re.split(r"^\|-\|", tabber, flags=re.M):
            head = re.match(r"\s*([^=\n]+?)\s*=", tab)
            box = re.search(r"\{\{Infobox Boss(.*?)^\}\}", tab, flags=re.S | re.M)
            if not head or not box:
                continue
            fields = infobox_fields(box.group(1) + "\n}}")
            rest = tab[box.end():]
            rest = re.sub(r"^=+[^=\n]+=+\s*$", "", rest, flags=re.M)
            out.append({
                "page": title,
                "tab": plain(head.group(1)),
                "location": "" if plain(fields.get("location", "")).lower() == "location" else plain(fields.get("location", "")),
                "hpText": plain(fields.get("hp", "")),
                "hp": number(fields.get("hp")),
                "runes": number(fields.get("runes")),
                "drops": drops_of(fields.get("drops", "")),
                "text": plain(rest)[:600],
            })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.path.join(ROOT, "data", "raw", "er-mcp.db"))
    args = ap.parse_args()
    db = sqlite3.connect(args.db)
    rows = []
    for title, wikitext in db.execute("select title, wikitext from pages"):
        if wikitext and "<tabber>" in wikitext and wikitext.count("{{Infobox Boss") > 1:
            rows.extend(encounters(title, wikitext))
    rows.sort(key=lambda r: (r["page"], r["tab"]))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"source": "data/raw/er-mcp.db (wiki snapshot) boss tabbers", "count": len(rows), "encounters": rows}, f, ensure_ascii=False, indent=1)
    print(f"boss encounters: {len(rows)} from {len({r['page'] for r in rows})} pages -> {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
