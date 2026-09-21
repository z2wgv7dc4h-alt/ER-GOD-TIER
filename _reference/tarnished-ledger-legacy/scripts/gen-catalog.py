#!/usr/bin/env python3
"""Compile the Tarnished Ledger item catalogs from MIT / factual sources.

Sources (no flavor text copied):
  - ThomasJClark/elden-ring-weapon-calculator  regulation-vanilla-v1.17  (MIT)
  - Gobluebro/Elden-Ring-Checklist             names + DLC flags          (MIT)
  - deliton/eldenring-api                      base-game numeric stats
  - GavinRay97 armor optimizer                 poise / negation
  - eldenring.wiki.gg infobox numbers          remaining DLC stats (facts)
  - existing Ledger entries                    locations, skills, tarnished pack
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path("/workspace")
SRC = ROOT / "src" / "data"
CATALOG = SRC / "catalog"
ER = Path("/tmp/erdata")
CACHE = ER / "wiki-cache"
CACHE.mkdir(parents=True, exist_ok=True)
CATALOG.mkdir(parents=True, exist_ok=True)

UA = "TarnishedLedger/1.0 (catalog compiler; factual stats only)"

WEAPON_TYPE = {
    1: "Dagger",
    3: "Straight Sword",
    5: "Greatsword",
    7: "Colossal Sword",
    9: "Curved Sword",
    11: "Curved Greatsword",
    13: "Katana",
    14: "Twinblade",
    15: "Thrusting Sword",
    16: "Heavy Thrusting Sword",
    17: "Axe",
    19: "Greataxe",
    21: "Hammer",
    23: "Great Hammer",
    24: "Flail",
    25: "Spear",
    28: "Great Spear",
    29: "Halberd",
    31: "Reaper",
    35: "Fist",
    37: "Claw",
    39: "Whip",
    41: "Colossal Weapon",
    50: "Light Bow",
    51: "Bow",
    53: "Greatbow",
    55: "Crossbow",
    56: "Ballista",
    57: "Glintstone Staff",
    59: "Glintstone Staff",
    61: "Sacred Seal",
    65: "Small Shield",
    67: "Medium Shield",
    69: "Greatshield",
    87: "Torch",
    88: "Hand-to-Hand",
    89: "Perfume Bottle",
    90: "Thrusting Shield",
    91: "Throwing Blade",
    92: "Backhand Blade",
    93: "Light Greatsword",
    94: "Great Katana",
    95: "Beast Claw",
}

GOBLUE_WEAPON_CLS = {
    "Axes": "Axe",
    "Backhand Blades": "Backhand Blade",
    "Ballistas": "Ballista",
    "Beast Claws": "Beast Claw",
    "Bows": "Bow",
    "Claw": "Claw",
    "Colossal Sword": "Colossal Sword",
    "Colossal Weapons": "Colossal Weapon",
    "Crossbows": "Crossbow",
    "Curved Greatswords": "Curved Greatsword",
    "Curved Swords": "Curved Sword",
    "Daggers": "Dagger",
    "Fists": "Fist",
    "Flails": "Flail",
    "Glintstone Staffs": "Glintstone Staff",
    "Great Hammers / Warhammers": "Great Hammer",
    "Great Katanas": "Great Katana",
    "Great Spears": "Great Spear",
    "Greataxes": "Greataxe",
    "Greatbows": "Greatbow",
    "Greatshields": "Greatshield",
    "Greatswords": "Greatsword",
    "Halberds": "Halberd",
    "Hammers": "Hammer",
    "Hand-To-Hand Arts": "Hand-to-Hand",
    "Heavy Thrusting Swords": "Heavy Thrusting Sword",
    "Katanas": "Katana",
    "Light Bows": "Light Bow",
    "Light Greatswords": "Light Greatsword",
    "Medium Shields": "Medium Shield",
    "Perfume Bottles": "Perfume Bottle",
    "Reapers": "Reaper",
    "Sacred Seal": "Sacred Seal",
    "Small Shields": "Small Shield",
    "Spears": "Spear",
    "Straight Swords": "Straight Sword",
    "Throwing Blades": "Throwing Blade",
    "Thrusting Shields": "Thrusting Shield",
    "Thrusting Swords": "Thrusting Sword",
    "Torches": "Torch",
    "Twinblades": "Twinblade",
    "Whips": "Whip",
}

SCALING_TIERS = [(1.75, "S"), (1.4, "A"), (0.9, "B"), (0.6, "C"), (0.25, "D"), (0.01, "E")]

SLOT_FROM_GOBLUE = {"Helms": "helm", "Chests": "chest", "Gauntlets": "gauntlets", "Legs": "legs"}
FANAPI_SLOT = {
    "Helm": "helm",
    "Leg Armor": "legs",
    "Chest Armor": "chest",
    "Gauntlets": "gauntlets",
    "Armor": "chest",
}
GAVIN_SLOT = {1: "helm", 2: "chest", 3: "gauntlets", 4: "legs"}

HELM_SFX = (
    "helm", "helmet", "hood", "hat", "crown", "mask", "circlet", "headband", "cowl",
    "cap", "veil", "visor", "hoods", "tiara", "pointed hat", "glintstone crown",
    "twin crown", "crucible hornshield", "headscarf", "coif",
)
CHEST_SFX = (
    "armor", "robe", "garb", "cloak", "tabard", "surcoat", "dress", "coat", "gown",
    "attire", "robes", "traveling attire", "traveling garb", "finery", "harness",
    "rags", "cloth", "loincloth", "tunic", "vestments", "apron",
)
ARM_SFX = (
    "gauntlets", "gloves", "bracers", "manchettes", "bracelets", "gauntlet",
    "leather gloves", "vambraces",
)
LEG_SFX = (
    "greaves", "leggings", "trousers", "boots", "skirt", "waistcloth", "pants",
    "hose", "legwraps", "loincloth", "smalls", "breeches", "soles", "wraps",
)


def norm(s: str) -> str:
    s = (s or "").lower().replace("’", "'").replace("“", '"').replace("”", '"')
    s = s.replace("+", " ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def slug(name: str) -> str:
    s = name.lower().replace("'", "").replace("’", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "item"


def grade(v: float) -> str:
    for thresh, g in SCALING_TIERS:
        if v >= thresh:
            return g
    return "E" if v > 0 else "-"


def num(x, default=0.0):
    try:
        if x is None or x == "" or x == "-":
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


def js_dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

ITEM_RE = re.compile(
    r"isDLC:\s*true,?\s*\n\s*description:\s*rawHTMLLink\(\s*\"[^\"]+\",\s*\"([^\"]+)\"",
    re.M,
)
ITEM_RE2 = re.compile(
    r"description:\s*rawHTMLLink\(\s*\"[^\"]+\",\s*\"([^\"]+)\"\s*\),?\s*\n\s*isDLC:\s*true",
    re.M,
)
ITEM_ANY = re.compile(
    r"rawHTMLLink\(\s*\"[^\"]+\",\s*\"([^\"]+)\"",
    re.M,
)
DLC_BLOCK = re.compile(
    r"\{[^{}]*?rawHTMLLink\(\s*\"[^\"]+\",\s*\"([^\"]+)\"[^{}]*?\}",
    re.S,
)


def goblue_sections(path: Path) -> dict[str, list[tuple[str, bool]]]:
    text = path.read_text()
    # Split on top-level section objects that have `name: "..."` and a requirements array.
    sections: dict[str, list[tuple[str, bool]]] = {}
    # Find each `name: "X"` that is a section header (followed by url / requirements)
    parts = re.split(r"\n  \{\n", text)
    for part in parts[1:]:
        m = re.search(r'name: "([^"]+)"', part)
        if not m:
            continue
        name = m.group(1)
        items: list[tuple[str, bool]] = []
        for block in re.finditer(
            r"\{[^{}]*?rawHTMLLink\(\s*\"[^\"]+\",\s*\"([^\"]+)\"[^{}]*?\}",
            part,
        ):
            chunk = block.group(0)
            item_name = block.group(1)
            dlc = "isDLC: true" in chunk
            items.append((item_name, dlc))
        if items:
            sections[name] = items
    return sections


def parse_existing_weapons(path: Path) -> dict[str, dict]:
    text = path.read_text()
    out = {}
    # skill and loc sit after the upgrade token; scaling grades are also quoted so
    # we cannot just collect every string.
    for m in re.finditer(
        r'w\(\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)",.*?,\s*"(regular|somber)",\s*"([^"]*)",\s*"([^"]*)"',
        text,
        re.S,
    ):
        wid, name, cls, upgrade, skill, loc = m.groups()
        chunk = m.group(0)
        rest = text[m.end() : m.end() + 160]
        notes = ""
        tail_strs = re.findall(r'"((?:\\.|[^"\\])*)"', chunk + rest)
        if tail_strs:
            cand = tail_strs[-1]
            if cand not in ("base", "sote", "tarnished", skill, loc, name, wid, cls, upgrade) and len(cand) > 12:
                notes = cand
        dlc = "base"
        blob = chunk + rest
        if "tarnished" in blob:
            dlc = "tarnished"
        elif re.search(r'["\']sote["\']', blob):
            dlc = "sote"
        out[norm(name)] = {
            "id": wid,
            "name": name,
            "skill": skill,
            "loc": loc,
            "notes": notes,
            "dlc": dlc,
        }
    return out


def parse_existing_simple(path: Path, name_key="name") -> dict[str, dict]:
    """Parse existing TS object arrays for id/name/loc/effect/etc. Nested-brace aware."""
    text = path.read_text()
    out = {}
    i = 0
    while True:
        start = text.find("{", i)
        if start < 0:
            break
        depth = 0
        j = start
        while j < len(text):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        chunk = text[start:j]
        i = j
        if "id:" not in chunk or "name:" not in chunk:
            continue
        kv = dict(re.findall(r'(\w+):\s*"((?:\\.|[^"\\])*)"', chunk))
        if "id" not in kv or "name" not in kv:
            continue
        if "tarnished" in chunk:
            kv["dlc"] = "tarnished"
        elif re.search(r'dlc:\s*"sote"', chunk):
            kv["dlc"] = "sote"
        if re.search(r"legendary:\s*true", chunk):
            kv["legendary"] = "true"
        out[norm(kv["name"])] = kv
    return out


def parse_existing_armor(path: Path) -> dict[str, dict]:
    text = path.read_text()
    out = {}
    for m in re.finditer(r'a\(\[([^\]]+)\]\)', text):
        raw = m.group(1)
        strs = re.findall(r'"((?:\\.|[^"\\])*)"', raw)
        if len(strs) < 2:
            continue
        aid, name = strs[0], strs[1]
        dlc = "tarnished" if "tarnished" in raw else ("sote" if '"sote"' in raw else "base")
        out[norm(name)] = {"id": aid, "name": name, "dlc": dlc}
    return out


def fanapi_list(name: str):
    p = ER / "fanapi" / "api" / "public" / "data" / name
    data = json.loads(p.read_text())
    return data if isinstance(data, list) else data.get("data", [])


def amt(arr, key, default=0):
    if not arr:
        return default
    for x in arr:
        if (x.get("name") or "").lower().startswith(key.lower()):
            v = x.get("amount")
            return default if v is None else v
    return default


def req_map(arr) -> dict:
    m = {}
    mapping = {
        "str": "str", "strength": "str",
        "dex": "dex", "dexterity": "dex",
        "int": "int", "intelligence": "int",
        "fai": "fai", "faith": "fai",
        "arc": "arc", "arcane": "arc",
    }
    for x in arr or []:
        k = mapping.get((x.get("name") or "").lower())
        if not k:
            continue
        v = x.get("amount")
        if v:
            m[k] = int(v)
    return m


def scale_map(arr) -> dict:
    m = {}
    mapping = {
        "str": "str", "strength": "str",
        "dex": "dex", "dexterity": "dex",
        "int": "int", "intelligence": "int",
        "fai": "fai", "faith": "fai",
        "arc": "arc", "arcane": "arc",
    }
    for x in arr or []:
        k = mapping.get((x.get("name") or "").lower())
        g = (x.get("scaling") or "").upper()
        if k and g and g != "-":
            m[k] = g
    return m


def set_name_from_piece(name: str, slot: str) -> str:
    n = name
    n = re.sub(r"\s*\(Altered\)\s*$", "", n)
    suffixes = {
        "helm": HELM_SFX,
        "chest": CHEST_SFX,
        "gauntlets": ARM_SFX,
        "legs": LEG_SFX,
    }[slot]
    low = n.lower()
    for sfx in sorted(suffixes, key=len, reverse=True):
        if low.endswith(" " + sfx) or low == sfx:
            n = n[: len(n) - len(sfx)].rstrip(" '")
            break
    if n.endswith("'s"):
        n = n[:-2]
    return n or name


# ---------------------------------------------------------------------------
# wiki.gg infobox fetch
# ---------------------------------------------------------------------------

def wiki_get(titles: list[str]) -> dict[str, str]:
    """Return map of normalized title -> wikitext, using disk cache."""
    out: dict[str, str] = {}
    missing = []
    for t in titles:
        key = slug(t) + ".txt"
        fp = CACHE / key
        if fp.exists():
            out[norm(t)] = fp.read_text()
        else:
            missing.append(t)
    if not missing:
        return out
    for i in range(0, len(missing), 50):
        chunk = missing[i : i + 50]
        q = "|".join(chunk)
        url = (
            "https://eldenring.wiki.gg/api.php?action=query&prop=revisions"
            "&rvprop=content&rvslots=main&format=json&redirects=1&titles="
            + urllib.parse.quote(q, safe="|")
        )
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print("wiki fetch error", e)
            time.sleep(1)
            continue
        query = data.get("query", {})
        redirects = {r["from"]: r["to"] for r in query.get("redirects", [])}
        normalized = {n["from"]: n["to"] for n in query.get("normalized", [])}
        pages = query.get("pages", {})
        title_to_text = {}
        for page in pages.values():
            title = page.get("title", "")
            revs = page.get("revisions") or []
            if not revs:
                continue
            slots = revs[0].get("slots", {})
            text = slots.get("main", {}).get("*") or revs[0].get("*") or ""
            title_to_text[title] = text
        for orig in chunk:
            resolved = redirects.get(normalized.get(orig, orig), normalized.get(orig, orig))
            text = title_to_text.get(resolved, "")
            (CACHE / (slug(orig) + ".txt")).write_text(text)
            out[norm(orig)] = text
        time.sleep(0.15)
    return out


INFOBOX_RE = re.compile(r"\{\{\s*Infobox\s+([^|\n]+)(.*?)(?:\n\}\}|\n\{\{)", re.S | re.I)


def infobox_fields(wikitext: str) -> dict[str, str]:
    if not wikitext:
        return {}
    m = re.search(r"\{\{\s*Infobox[_\s]?", wikitext, re.I)
    if not m:
        return {}
    start = m.start()
    i = start
    depth = 0
    end = None
    while i < len(wikitext):
        if wikitext.startswith("{{", i):
            depth += 1
            i += 2
            continue
        if wikitext.startswith("}}", i):
            depth -= 1
            i += 2
            if depth == 0:
                end = i
                break
            continue
        i += 1
    if end is None:
        return {}
    body = wikitext[start:end]
    fields = {}
    for line in body.split("\n"):
        mm = re.match(r"\|\s*([a-zA-Z0-9_]+)\s*=\s*(.*)$", line)
        if mm:
            fields[mm.group(1).strip().lower()] = mm.group(2).strip()
    return fields


def wiki_plain(text: str) -> str:
    text = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", text or "")
    text = re.sub(r"\{\{[^}]+\}\}", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"'{2,}", "", text)
    text = re.sub(r"file:.*?\|", "", text, flags=re.I)
    return " ".join(text.split())


def acquisition(wikitext: str) -> str:
    if not wikitext:
        return ""
    m = re.search(
        r"==\s*(?:\[[^\]]+\]\s*)*Acquisition\s*==\s*(.+?)(?:\n==|\Z)",
        wikitext,
        re.S | re.I,
    )
    if not m:
        return ""
    for line in m.group(1).split("\n"):
        line = wiki_plain(line)
        line = re.sub(r"^\*+\s*", "", line).strip()
        if len(line) > 16 and not line.lower().startswith("the "):
            # skip very generic lead-ins when a better bullet exists; still accept
            return line[:140]
        if len(line) > 20:
            return line[:140]
    return ""


def infobox_effect(fields: dict) -> str:
    raw = fields.get("item_effect") or fields.get("effect") or fields.get("effects") or ""
    raw = wiki_plain(raw.replace("<br>", " / ").replace("<br/>", " / "))
    return raw[:180]


def fnum(fields: dict, *keys, default=0.0):
    for k in keys:
        if k in fields and fields[k] not in ("", "-", "?", "N/A"):
            cleaned = re.sub(r"[^0-9.+-]", "", fields[k].split("<")[0])
            if cleaned:
                try:
                    return float(cleaned)
                except ValueError:
                    pass
    return default


# ---------------------------------------------------------------------------
# Build catalogs
# ---------------------------------------------------------------------------

def load_tjc_weapons():
    data = json.loads((ER / "tjc/public/regulation-vanilla-v1.17.js").read_text())
    best = {}
    for w in data["weapons"]:
        name = w.get("weaponName") or w.get("name")
        if not name or name == "Unarmed":
            continue
        aff = w.get("affinityId")
        if aff not in (-1, 0):
            continue
        prev = best.get(name)
        # prefer unique/somber (affinity -1) over standard (0)
        if prev is None or (aff == -1 and prev.get("affinityId") != -1):
            best[name] = w
    return best


def build_weapons():
    tjc = load_tjc_weapons()
    gob = goblue_sections(ER / "goblue/data/lists/weapons.ts")
    fan_w = {norm(x["name"]): x for x in fanapi_list("weapons.json")}
    fan_s = {norm(x["name"]): x for x in fanapi_list("shields.json")}
    fan = {**fan_s, **fan_w}
    existing = parse_existing_weapons(SRC / "weapons.ts")

    # goblue name -> class, dlc
    gob_meta = {}
    for cat, items in gob.items():
        cls = GOBLUE_WEAPON_CLS.get(cat)
        if not cls:
            continue
        for name, dlc in items:
            gob_meta[norm(name)] = {"name": name, "cls": cls, "dlc": "sote" if dlc else "base"}

    # union of names
    names = {}
    for name, w in tjc.items():
        names[norm(name)] = name
    for n, meta in gob_meta.items():
        names.setdefault(n, meta["name"])
    for n, x in fan.items():
        names.setdefault(n, x["name"])
    for n, x in existing.items():
        names.setdefault(n, x["name"])

    used_ids = set()
    rows = []
    missing_weight_names = []

    for n, display in sorted(names.items(), key=lambda kv: kv[1].lower()):
        t = None
        for key in (display,):
            t = tjc.get(key)
        if t is None:
            # fuzzy by norm
            for k, v in tjc.items():
                if norm(k) == n:
                    t = v
                    display = k
                    break
        g = gob_meta.get(n, {})
        f = fan.get(n, {})
        ex = existing.get(n, {})

        if ex.get("dlc") == "tarnished":
            dlc = "tarnished"
        elif (t or {}).get("dlc") or g.get("dlc") == "sote" or ex.get("dlc") == "sote":
            dlc = "sote"
        else:
            dlc = "base"

        cls = g.get("cls")
        if not cls and t:
            cls = WEAPON_TYPE.get(t.get("weaponType"), "Straight Sword")
        if not cls:
            cls = f.get("category") or "Straight Sword"
        # fanapi category is already "Katana" etc.

        req = {}
        scaling = {}
        phys = 0
        mag = fire = light = holy = 0
        upgrade = "regular"
        weight = None

        if t:
            req = {k: int(v) for k, v in (t.get("requirements") or {}).items() if v}
            scaling = {}
            for k, v in t.get("attributeScaling") or []:
                gde = grade(float(v))
                if gde != "-":
                    mapping = {"str": "str", "dex": "dex", "int": "int", "fai": "fai", "arc": "arc"}
                    kk = mapping.get(k, k)
                    scaling[kk] = gde
            atk = {int(a): b for a, b in t.get("attack") or []}
            phys = round(atk.get(0, 0))
            mag = round(atk.get(1, 0)) or 0
            fire = round(atk.get(2, 0)) or 0
            light = round(atk.get(3, 0)) or 0
            holy = round(atk.get(4, 0)) or 0
            upgrade = "somber" if t.get("affinityId") == -1 else "regular"

        if f:
            if not req:
                req = req_map(f.get("requiredAttributes"))
            if not scaling:
                scaling = scale_map(f.get("scalesWith"))
            if not phys:
                phys = int(amt(f.get("attack"), "Phy"))
            if not mag:
                mag = int(amt(f.get("attack"), "Mag"))
            if not fire:
                fire = int(amt(f.get("attack"), "Fire"))
            if not light:
                light = int(amt(f.get("attack"), "Ligt") or amt(f.get("attack"), "Light"))
            if not holy:
                holy = int(amt(f.get("attack"), "Holy"))
            weight = num(f.get("weight"), None)

        if weight is None:
            missing_weight_names.append(display)

        wid = ex.get("id") or slug(display)
        base = wid
        i = 2
        while wid in used_ids:
            wid = f"{base}-{i}"
            i += 1
        used_ids.add(wid)

        skill = ex.get("skill") or ""
        loc = ex.get("loc") or ""
        notes = ex.get("notes") or ""

        row = {
            "id": wid,
            "name": ex.get("name") or g.get("name") or display,
            "cls": cls,
            "dlc": dlc,
            "weight": weight if weight is not None else 0,
            "req": req,
            "scaling": scaling,
            "phys": int(phys or 0),
            "crit": 100,
            "upgrade": upgrade,
            "skill": skill,
            "loc": loc,
        }
        if mag:
            row["mag"] = int(mag)
        if fire:
            row["fire"] = int(fire)
        if light:
            row["light"] = int(light)
        if holy:
            row["holy"] = int(holy)
        if notes:
            row["notes"] = notes
        rows.append(row)

    # wiki fill: weight, skill, location
    need = [r["name"] for r in rows if not r["weight"] or not r.get("skill") or not r.get("loc")]
    print(f"weapons wiki fill: {len(need)}")
    wiki = wiki_get(need)
    class_weights = defaultdict(list)
    for r in rows:
        if r["weight"]:
            class_weights[r["cls"]].append(r["weight"])
    med = {c: sorted(vs)[len(vs) // 2] for c, vs in class_weights.items() if vs}

    for r in rows:
        wt = wiki.get(norm(r["name"]), "")
        fields = infobox_fields(wt)
        if not r["weight"]:
            w = fnum(fields, "weight")
            r["weight"] = w if w else med.get(r["cls"], 5.0)
        if not r.get("skill"):
            sk = wiki_plain(fields.get("skill") or fields.get("ash_of_war") or fields.get("unique_skill") or "")
            if sk and len(sk) < 70:
                r["skill"] = sk
        if not r.get("loc"):
            loc = acquisition(wt)
            if loc:
                r["loc"] = loc
        if not r.get("skill"):
            r["skill"] = "Ash of War" if r["upgrade"] == "regular" else "Unique Skill"

    rows.sort(key=lambda r: (r["cls"], r["name"].lower()))
    return rows


def build_armor():
    gob = goblue_sections(ER / "goblue/data/lists/armor.ts")
    gavin = json.loads((ER / "gavin/armor.json").read_text())
    gavin_by = {norm(x["name"]): x for x in gavin}
    fan = {norm(x["name"]): x for x in fanapi_list("armors.json")}
    existing = parse_existing_armor(SRC / "armor.ts")

    gob_meta = {}
    for cat, items in gob.items():
        slot = SLOT_FROM_GOBLUE.get(cat)
        if not slot:
            continue
        for name, dlc in items:
            gob_meta[norm(name)] = {"name": name, "slot": slot, "dlc": "sote" if dlc else "base"}

    names = {}
    for n, x in gob_meta.items():
        names[n] = x["name"]
    for n, x in gavin_by.items():
        names.setdefault(n, x["name"])
    for n, x in fan.items():
        names.setdefault(n, x["name"])
    for n, x in existing.items():
        names.setdefault(n, x["name"])

    used_ids = set()
    rows = []
    need_wiki = []

    for n, display in sorted(names.items(), key=lambda kv: kv[1].lower()):
        g = gob_meta.get(n, {})
        gv = gavin_by.get(n, {})
        f = fan.get(n, {})
        ex = existing.get(n, {})
        slot = g.get("slot")
        if not slot and gv:
            slot = GAVIN_SLOT.get(gv.get("slotType"))
        if not slot and f:
            slot = FANAPI_SLOT.get(f.get("category"), "chest")
        if not slot:
            # guess from name
            low = display.lower()
            if any(low.endswith(s) or s in low for s in ("greaves", "leggings", "trousers", "boots", "skirt")):
                slot = "legs"
            elif any(s in low for s in ("gauntlet", "gloves", "bracers", "manchettes")):
                slot = "gauntlets"
            elif any(s in low for s in ("helm", "hood", "hat", "crown", "mask", "circlet", "headband", "cowl")):
                slot = "helm"
            else:
                slot = "chest"

        dlc = ex.get("dlc") or g.get("dlc") or "base"
        setn = set_name_from_piece(display, slot)

        weight = poise = phys = 0.0
        strike = slash = pierce = mag = fire = light = holy = None
        if gv:
            weight = num(gv.get("weight"))
            poise = num(gv.get("poise"))
            phys = num(gv.get("physical"))
            strike = num(gv.get("strike"))
            slash = num(gv.get("slash"))
            pierce = num(gv.get("pierce"))
            mag = num(gv.get("magic"))
            fire = num(gv.get("fire"))
            light = num(gv.get("lightning"))
            holy = num(gv.get("holy"))
        elif f:
            weight = num(f.get("weight"))
            phys = num(amt(f.get("dmgNegation"), "Phy"))
            strike = num(amt(f.get("dmgNegation"), "Strike"))
            slash = num(amt(f.get("dmgNegation"), "Slash"))
            pierce = num(amt(f.get("dmgNegation"), "Pierce"))
            mag = num(amt(f.get("dmgNegation"), "Magic"))
            fire = num(amt(f.get("dmgNegation"), "Fire"))
            light = num(amt(f.get("dmgNegation"), "Ligt") or amt(f.get("dmgNegation"), "Light"))
            holy = num(amt(f.get("dmgNegation"), "Holy"))

        aid = ex.get("id") or slug(display)
        base = aid
        i = 2
        while aid in used_ids:
            aid = f"{base}-{i}"
            i += 1
        used_ids.add(aid)

        row = {
            "id": aid,
            "name": ex.get("name") or g.get("name") or display,
            "slot": slot,
            "set": setn,
            "weight": round(weight, 2),
            "poise": round(poise, 1) if poise else int(poise),
            "phys": round(phys, 1) if phys else phys,
            "dlc": dlc,
        }
        extras = {
            "strike": strike,
            "slash": slash,
            "pierce": pierce,
            "mag": mag,
            "fire": fire,
            "light": light,
            "holy": holy,
        }
        for k, v in extras.items():
            if v:
                row[k] = round(v, 1)
        if not weight:
            need_wiki.append(row["name"])
        rows.append(row)

    print(f"armor missing stats: {len(need_wiki)}")
    wiki = wiki_get(need_wiki)
    for r in rows:
        if r["weight"]:
            continue
        fields = infobox_fields(wiki.get(norm(r["name"]), ""))
        if not fields:
            continue
        r["weight"] = round(fnum(fields, "weight"), 2)
        r["poise"] = round(fnum(fields, "poise"), 1)
        r["phys"] = round(fnum(fields, "physical"), 1)
        mapping = [
            ("strike", "vs_strike", "strike"),
            ("slash", "vs_slash", "slash"),
            ("pierce", "vs_pierce", "pierce"),
            ("mag", "magic", "magic"),
            ("fire", "fire", "fire"),
            ("light", "lightning", "lightning"),
            ("holy", "holy", "holy"),
        ]
        for dst, *keys in mapping:
            v = fnum(fields, *keys)
            if v:
                r[dst] = round(v, 1)

    rows.sort(key=lambda r: (r["set"].lower(), {"helm": 0, "chest": 1, "gauntlets": 2, "legs": 3}.get(r["slot"], 9), r["name"].lower()))
    return rows


def build_talismans():
    gob = goblue_sections(ER / "goblue/data/lists/collectables.ts")
    items = gob.get("Talismans", [])
    fan = {norm(x["name"]): x for x in fanapi_list("talismans.json")}
    existing = parse_existing_simple(SRC / "talismans.ts")
    used = set()
    rows = []
    need = []
    seen = set()
    for name, dlc in items:
        n = norm(name)
        if n in seen:
            continue
        seen.add(n)
        ex = existing.get(n, {})
        f = fan.get(n, {})
        tid = ex.get("id") or slug(name)
        base = tid
        i = 2
        while tid in used:
            tid = f"{base}-{i}"
            i += 1
        used.add(tid)
        row = {
            "id": tid,
            "name": ex.get("name") or name,
            "weight": num(ex.get("weight"), 0) or 0.6,
            "effect": ex.get("effect") or f.get("effect") or "",
            "loc": ex.get("loc") or "",
            "dlc": ex.get("dlc") or ("sote" if dlc else "base"),
        }
        if not row["effect"] or row["weight"] == 0.6:
            need.append(name)
        rows.append(row)
    # tarnished leftover
    for n, ex in existing.items():
        if ex.get("dlc") == "tarnished" and n not in seen:
            rows.append({
                "id": ex["id"],
                "name": ex["name"],
                "weight": num(ex.get("weight"), 0.6),
                "effect": ex.get("effect") or "",
                "loc": ex.get("loc") or "",
                "dlc": "tarnished",
            })
    print(f"talismans wiki fill: {len(need)}")
    wiki = wiki_get([r["name"] for r in rows])
    for r in rows:
        wt = wiki.get(norm(r["name"]), "")
        fields = infobox_fields(wt)
        w = fnum(fields, "weight")
        if w:
            r["weight"] = w
        eff = infobox_effect(fields)
        if eff:
            r["effect"] = eff
        if not r.get("loc"):
            loc = acquisition(wt)
            if loc:
                r["loc"] = loc
    rows.sort(key=lambda r: r["name"].lower())
    return rows


def build_spells():
    gob = goblue_sections(ER / "goblue/data/lists/spells.ts")
    fan_s = {norm(x["name"]): x for x in fanapi_list("sorceries.json")}
    fan_i = {norm(x["name"]): x for x in fanapi_list("incantations.json")}
    existing = parse_existing_simple(SRC / "spells.ts")
    rows = []
    used = set()
    need = []
    for kind, cat in (("sorcery", "Sorceries"), ("incantation", "Incantations")):
        for name, dlc in gob.get(cat, []):
            n = norm(name)
            ex = existing.get(n, {})
            f = (fan_s if kind == "sorcery" else fan_i).get(n, {})
            sid = ex.get("id") or slug(name)
            base = sid
            i = 2
            while sid in used:
                sid = f"{base}-{i}"
                i += 1
            used.add(sid)
            req = req_map(f.get("requires")) if f else {}
            # existing req isn't easily parsed; skip
            row = {
                "id": sid,
                "name": ex.get("name") or name,
                "kind": kind,
                "slots": int(f.get("slots") or ex.get("slots") or 1),
                "fp": int(f.get("cost") or 0),
                "req": req,
                "loc": ex.get("loc") or "",
                "dlc": ex.get("dlc") or ("sote" if dlc else "base"),
            }
            if ex.get("notes"):
                row["notes"] = ex["notes"]
            if not row["fp"] or not req or not row["loc"]:
                need.append(name)
            rows.append(row)
    print(f"spells wiki fill: {len(need)}")
    wiki = wiki_get(need)
    for r in rows:
        wt = wiki.get(norm(r["name"]), "")
        fields = infobox_fields(wt)
        if not r["fp"]:
            fp = fnum(fields, "fp_cost", "fp", "cost")
            if fp:
                r["fp"] = int(fp)
        slots = fnum(fields, "slots", "memory_slots")
        if slots:
            r["slots"] = int(slots)
        if not r.get("req"):
            req = {}
            for k, keys in {
                "int": ("int_req", "intelligence", "int"),
                "fai": ("fai_req", "faith", "fai"),
                "arc": ("arc_req", "arcane", "arc"),
                "str": ("str_req", "strength"),
                "dex": ("dex_req", "dexterity"),
            }.items():
                v = fnum(fields, *keys)
                if v:
                    req[k] = int(v)
            if req:
                r["req"] = req
        if not r.get("loc"):
            loc = acquisition(wt)
            if loc:
                r["loc"] = loc
    rows.sort(key=lambda r: (r["kind"], r["name"].lower()))
    return rows


def build_ashes():
    gob = goblue_sections(ER / "goblue/data/lists/spells.ts")
    fan = {norm(x["name"].replace("Ash Of War: ", "").replace("Ash of War: ", "")): x for x in fanapi_list("ashes.json")}
    rows = []
    used = set()
    need = []
    for name, dlc in gob.get("Ashes of War", []):
        clean = re.sub(r"^Ash of War:\s*", "", name, flags=re.I)
        n = norm(clean)
        f = fan.get(n, {})
        aid = slug(clean)
        base = aid
        i = 2
        while aid in used:
            aid = f"{base}-{i}"
            i += 1
        used.add(aid)
        row = {
            "id": aid,
            "name": clean,
            "affinity": f.get("affinity") or "",
            "skill": f.get("skill") or clean,
            "dlc": "sote" if dlc else "base",
            "loc": "",
        }
        if not row["affinity"]:
            need.append("Ash of War: " + clean)
        rows.append(row)
    print(f"ashes wiki fill: {len(need)}")
    wiki = wiki_get(need + [r["name"] for r in rows if not r["affinity"]])
    for r in rows:
        if r["affinity"]:
            continue
        fields = infobox_fields(wiki.get(norm("Ash of War: " + r["name"]), "") or wiki.get(norm(r["name"]), ""))
        if not fields:
            continue
        aff = fields.get("affinity") or fields.get("default_affinity") or ""
        aff = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", aff)
        if aff:
            r["affinity"] = aff.split("<")[0].strip()[:40]
        sk = fields.get("skill") or ""
        sk = re.sub(r"\[\[([^|\]]+\|)?([^\]]+)\]\]", r"\2", sk)
        if sk:
            r["skill"] = sk[:60]
    rows.sort(key=lambda r: r["name"].lower())
    return rows


def build_spirits():
    gob = goblue_sections(ER / "goblue/data/lists/collectables.ts")
    fan = {norm(x["name"]): x for x in fanapi_list("spirits.json")}
    existing = parse_existing_simple(SRC / "spirits.ts")
    rows = []
    used = set()
    seen = set()
    for name, dlc in gob.get("Spirit Ashes and Puppets", []):
        n = norm(name)
        if n in seen:
            continue
        seen.add(n)
        ex = existing.get(n, {})
        f = fan.get(n, {})
        sid = ex.get("id") or slug(name)
        base = sid
        i = 2
        while sid in used:
            sid = f"{base}-{i}"
            i += 1
        used.add(sid)
        row = {
            "id": sid,
            "name": ex.get("name") or name,
            "loc": ex.get("loc") or "",
            "dlc": ex.get("dlc") or ("sote" if dlc else "base"),
        }
        if ex.get("region"):
            row["region"] = ex["region"]
        if ex.get("notes"):
            row["notes"] = ex["notes"]
        if ex.get("legendary") == "true" or ex.get("legendary") is True:
            row["legendary"] = True
        rows.append(row)
    for n, ex in existing.items():
        if n not in seen:
            rows.append({
                "id": ex["id"],
                "name": ex["name"],
                "loc": ex.get("loc") or "",
                "dlc": ex.get("dlc") or "base",
                **({"region": ex["region"]} if ex.get("region") else {}),
                **({"notes": ex["notes"]} if ex.get("notes") else {}),
            })
    rows.sort(key=lambda r: r["name"].lower())
    return rows


def write_json(name: str, rows: list):
    path = CATALOG / name
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=None, separators=(",", ":")))
    print(f"  wrote {path.name:18} {len(rows):4} items  {path.stat().st_size/1024:.1f} KB")


def main():
    print("== weapons ==")
    weapons = build_weapons()
    write_json("weapons.json", weapons)

    print("== armor ==")
    armor = build_armor()
    write_json("armor.json", armor)

    print("== talismans ==")
    tals = build_talismans()
    write_json("talismans.json", tals)

    print("== spells ==")
    spells = build_spells()
    write_json("spells.json", spells)

    print("== ashes ==")
    ashes = build_ashes()
    write_json("ashes.json", ashes)

    print("== spirits ==")
    spirits = build_spirits()
    write_json("spirits.json", spirits)

    print("\nDONE")
    print("weapons", len(weapons), "sote", sum(1 for x in weapons if x["dlc"] == "sote"), "tarnished", sum(1 for x in weapons if x["dlc"] == "tarnished"))
    print("armor  ", len(armor), "sote", sum(1 for x in armor if x["dlc"] == "sote"), "tarnished", sum(1 for x in armor if x["dlc"] == "tarnished"))
    print("tals   ", len(tals), "sote", sum(1 for x in tals if x["dlc"] == "sote"))
    print("spells ", len(spells), "sote", sum(1 for x in spells if x["dlc"] == "sote"))
    print("ashes  ", len(ashes), "sote", sum(1 for x in ashes if x["dlc"] == "sote"))
    print("spirits", len(spirits), "sote", sum(1 for x in spirits if x["dlc"] == "sote"))


if __name__ == "__main__":
    main()
