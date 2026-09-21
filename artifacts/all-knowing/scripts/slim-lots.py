#!/usr/bin/env python3
"""Collapse Goblins items_database.json (18MB) to world-lots.json."""
import json
import sys
from pathlib import Path

src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/erbulk/ERR-MapForGoblins-DLL/data/items_database.json")
dst = Path(sys.argv[2] if len(sys.argv) > 2 else "public/sourced/open/world-lots.json")
rows = json.loads(src.read_text())
slim, seen = [], set()
for r in rows:
    names = ", ".join(i.get("name") or "" for i in (r.get("items") or []) if i.get("name"))
    key = (r.get("eventFlag"), names, r.get("map"))
    if key in seen:
        continue
    seen.add(key)
    slim.append({
        "flag": r.get("eventFlag"),
        "lot": r.get("itemLotId"),
        "map": r.get("map"),
        "x": r.get("x"),
        "y": r.get("y"),
        "z": r.get("z"),
        "name": names,
        "cat": r.get("primary_category"),
        "src": r.get("source"),
    })
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")))
print(f"wrote {len(slim)} lots -> {dst} ({dst.stat().st_size // 1024} kb)")
