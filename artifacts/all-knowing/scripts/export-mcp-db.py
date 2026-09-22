"""Rip the structured tables from the elden-ring-mcp release DB.

Source: teoucsb82/elden-ring-mcp release asset `elden-ring.db` (a versioned wiki
snapshot). We take only two tables the app does not already have in better shape:

  * acquisition  -> item -> how obtained (method, location, nearest grace,
                    prerequisites, missable)
  * quests       -> NPC quest steps (order, location, action, breaks)

Download the DB first (it is gitignored scratch):

    curl -L -o .scratch/er-mcp.db \
      https://github.com/teoucsb82/elden-ring-mcp/releases/download/data-2026.09.21/elden-ring.db

Then:

    python scripts/export-mcp-db.py [--db .scratch/er-mcp.db]

Emits public/sourced/open/acquisition.json and public/sourced/open/npc-quests.json.
"""
import argparse
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "sourced", "open")
SOURCE = "teoucsb82/elden-ring-mcp (wiki snapshot DB)"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default=os.path.join(ROOT, ".scratch", "er-mcp.db"))
    args = ap.parse_args()
    if not os.path.isfile(args.db):
        raise SystemExit(f"DB not found: {args.db} (download the release asset first)")

    c = sqlite3.connect(args.db)
    cur = c.cursor()

    acq = []
    for page_id, title, url, method, location, grace, prereqs, missable in cur.execute(
        """select a.page_id, p.title, p.url, a.method, a.location_text, a.nearest_grace,
                  a.prereqs, a.missable
           from acquisition a join pages p on p.id = a.page_id"""
    ):
        try:
            prereq = json.loads(prereqs) if prereqs else []
        except (ValueError, TypeError):
            prereq = []
        acq.append({
            "id": f"acq:{page_id}",
            "name": title or "",
            "method": method or "",
            "location": (location or "").strip(),
            "near": grace or "",
            "prereqs": prereq,
            "missable": bool(missable),
            "url": url or "",
        })
    acq.sort(key=lambda r: r["name"].lower())

    by_npc = {}
    for page_id, title, url, npc, order, location, action, breaks in cur.execute(
        """select q.page_id, p.title, p.url, q.npc, q.step_ord, q.location, q.action, q.breaks_quest
           from quests q join pages p on p.id = q.page_id"""
    ):
        npc = npc or title or "?"
        row = by_npc.setdefault(npc, {"npc": npc, "url": url or "", "steps": []})
        row["steps"].append({
            "id": f"qstep:{page_id}:{order}",
            "order": order,
            "location": location or "",
            "action": (action or "").strip(),
            "breaks": bool(breaks),
        })
    quests = sorted(by_npc.values(), key=lambda r: r["npc"].lower())
    for q in quests:
        q["steps"].sort(key=lambda s: s["order"] or 0)

    # Crafting recipes: craftable item pages carry a "Required items" section
    # listing the materials, e.g. "- Mushroom x1 - Smoldering Butterfly x1".
    recipes = []
    for page_id, title, url, markdown in cur.execute(
        """select s.page_id, p.title, p.url, s.markdown
           from sections s join pages p on p.id = s.page_id
           where lower(s.heading) like '%required item%'"""
    ):
        mats = []
        for line in (markdown or "").splitlines():
            m = re.match(r"^\s*[-*]\s+(.+?)\s*$", line)
            if not m:
                continue
            item = m.group(1).strip()
            lead = re.match(r"^(\d+)\s*x\s+(.+)$", item)      # "1 x Sacramental Bud"
            trail = re.match(r"^(.+?)\s*x\s*(\d+)$", item)    # "Mushroom x1"
            if lead:
                mats.append({"name": lead.group(2).strip(), "qty": int(lead.group(1))})
            elif trail:
                mats.append({"name": trail.group(1).strip(), "qty": int(trail.group(2))})
            else:
                mats.append({"name": item, "qty": 1})
        if mats:
            recipes.append({"id": f"recipe:{page_id}", "name": title or "", "materials": mats, "url": url or ""})
    recipes.sort(key=lambda r: r["name"].lower())

    # Secrets: sections that describe an illusory/hidden wall and what is behind
    # it. Small, high-signal list (the wiki scatters these across item/area pages).
    walls = []
    for sid, page, heading, markdown, url in cur.execute(
        """select s.id, p.title, s.heading, s.markdown, p.url
           from sections s join pages p on p.id = s.page_id
           where lower(s.markdown) like '%illusory wall%' or lower(s.markdown) like '%hidden wall%'"""
    ):
        text = (markdown or "").strip()
        if len(text) < 20:
            continue
        walls.append({
            "id": f"wall:{sid}",
            "area": page or "",
            "heading": heading or "",
            "text": text[:400],
            "url": url or "",
        })
    walls.sort(key=lambda w: w["area"].lower())

    # Full wiki text: every section, trimmed. The prose layer for "answer
    # anything" beyond the structured tables (~4.8 MB of text).
    titles = dict(cur.execute("select id, title from pages"))
    wiki = []
    for sid, page_id, ord_, heading, markdown in cur.execute(
        "select id, page_id, ord, heading, markdown from sections order by page_id, ord"
    ):
        text = (markdown or "").strip()
        if len(text) < 40:
            continue
        wiki.append({
            "id": sid,
            "page": titles.get(page_id, ""),
            "heading": heading or "",
            "text": text[:4000],
        })

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "acquisition.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "rows": acq}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "npc-quests.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "quests": quests}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "recipes.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "recipes": recipes}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "wiki-sections.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "sections": wiki}, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "secrets.json"), "w", encoding="utf-8") as f:
        json.dump({"source": SOURCE, "walls": walls}, f, ensure_ascii=False, separators=(",", ":"))

    miss = sum(1 for r in acq if r["missable"])
    print(f"wrote acquisition.json  rows: {len(acq)}  missable: {miss}")
    print(f"wrote npc-quests.json   npcs: {len(quests)}  steps: {sum(len(q['steps']) for q in quests)}")
    print(f"wrote recipes.json      recipes: {len(recipes)}")
    print(f"wrote wiki-sections.json sections: {len(wiki)}")
    print(f"wrote secrets.json      walls: {len(walls)}")


if __name__ == "__main__":
    main()
