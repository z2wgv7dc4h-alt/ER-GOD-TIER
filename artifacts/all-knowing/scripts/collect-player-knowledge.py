#!/usr/bin/env python3
"""Task 170 — player knowledge from Reddit (strategies, cheese, bugs, missables, PvP).

Collects posts *and* their top-voted comments from seven Elden Ring subreddits —
"top of all time" plus keyword searches (tip, PSA, guide, strategy, cheese, broken,
OP, bug, glitch, patched, missable, farm, meta, combo, synergy, invade, duel,
speedrun, NG+). Each row carries ``text, score, date, permalink, kind
(post|comment), topic, entities, patch, possiblyOutdated``.

Sources and politeness
----------------------
* Reddit's own JSON answers ``403 Blocked`` from this network (a datacenter IP),
  so the public **Arctic Shift** archive stands in for reddit.com (same public
  post/comment data, no login). The archive cannot sort by score, so "top of all
  time" is approximated by ranking the collected sample by score (see the report).
* Post pages cached by Task 163 under ``.scratch/163/raw/`` are reused as-is.
* New responses are cached under ``.scratch/170/raw/`` so re-runs do not re-fetch.
* <= 1 request / 2 s, descriptive User-Agent, back off on 429/422/5xx, no logins.
* Only post/comment text + topic metadata are stored. Usernames and ``u/...``
  mentions are stripped before writing anything; no author fields are kept.

Patch table
-----------
The ``patch`` field is the App/Regulation version live on the row's date, from
the official patch history (Fextralife ``Patch+Notes`` mirror, cached at
``.scratch/170/raw/patch-notes.html``). ``possiblyOutdated`` is true when a later
patch changed an entity the row mentions, or a later comment in the same thread
says something was patched/nerfed. Rows are never dropped for being outdated.

Usage (from artifacts/all-knowing):
    python scripts/collect-player-knowledge.py                # fetch (cached) + build
    python scripts/collect-player-knowledge.py --no-fetch     # build from cache only
    python scripts/collect-player-knowledge.py --max-comment-posts 250  # bounded fetch
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW163 = ROOT / ".scratch" / "163" / "raw"
RAW = ROOT / ".scratch" / "170" / "raw"
OUT_JSON = ROOT / "public" / "sourced" / "open" / "player-knowledge.json"
OUT_MD = ROOT / "docs" / "PLAYER-QUESTIONS.md"
MD_START = "<!-- task-170:start -->"
MD_END = "<!-- task-170:end -->"

UA = "all-knowing-player-knowledge/1.0 (Elden Ring companion research; personal project)"
MIN_INTERVAL = 2.0  # seconds between live requests (<= 1 request / 2 s)
ARCHIVE = "https://arctic-shift.photon-reddit.com"
POST_FIELDS = "id,title,selftext,score,created_utc,subreddit,num_comments,link_flair_text"
MIN_COMMENT_SCORE = 20
TOP_COMMENTS_PER_POST = 5
MAX_TEXT = 1500
MAX_163_PAGES = 80

SUBREDDITS = [
    "Eldenring",
    "EldenRingHelp",
    "eldenringdiscussion",
    "Shadowoftheerdtree",
    "EldenRingPVP",
    "EldenRingBuilds",
    "eldenringlore",
]

SEARCH_TERMS = [
    "tip", "PSA", "guide", "strategy", "cheese", "broken", "OP", "bug", "glitch",
    "patched", "missable", "farm", "meta", "combo", "synergy", "invade", "duel",
    "speedrun", "NG+",
]

# Official patch history (App/Regulation version live on each date). Dates are
# the release dates stated on the Fextralife "Patch Notes" page; the micro
# versions whose page section carries no date use FromSoftware's announcement
# dates (marked approximate in the report).
PATCH_TABLE = [
    ("2022-02-25", "1.02"),
    ("2022-03-02", "1.02.2"),
    ("2022-03-17", "1.03"),
    ("2022-03-23", "1.03.2"),
    ("2022-04-04", "1.03.3"),
    ("2022-04-19", "1.04"),
    ("2022-04-27", "1.04.1"),
    ("2022-06-13", "1.05"),
    ("2022-08-09", "1.06"),
    ("2022-10-13", "1.07"),
    ("2022-10-25", "1.07.1"),
    ("2022-12-07", "1.08"),
    ("2022-12-15", "1.08.1"),
    ("2023-03-23", "1.09"),
    ("2023-04-17", "1.09.1"),
    ("2023-07-26", "1.10"),
    ("2024-06-20", "1.12"),
    ("2024-06-26", "1.12.2"),
    ("2024-07-04", "1.12.3"),
    ("2024-07-30", "1.13"),
    ("2024-08-06", "1.13.1"),
    ("2024-09-04", "1.13.2"),
    ("2024-09-11", "1.14"),
    ("2024-10-02", "1.15"),
    ("2024-10-17", "1.16"),
    ("2024-11-05", "1.16.1"),
    ("2026-08-27", "1.17"),
]

# ---------------------------------------------------------------------------
# HTTP with cache + politeness
# ---------------------------------------------------------------------------
_last_request = 0.0
_source_failures: dict[str, int] = defaultdict(int)
_source_blocked: set[str] = set()


def _cache_path(name: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:140]
    return RAW / safe


def _read_cache(name: str, folder: Path = RAW):
    path = folder / re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:140]
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return None
    return None


def _write_cache(name: str, value) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    _cache_path(name).write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


def fetch_json(url: str, cache_name: str, source: str):
    cached = _read_cache(cache_name)
    if cached is not None:
        return cached
    if source in _source_blocked:
        raise RuntimeError(f"{source}: blocked")
    global _last_request
    last_error = None
    for attempt in range(5):
        wait = MIN_INTERVAL - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                body = resp.read().decode("utf-8", "replace")
            data = json.loads(body)
            _source_failures[source] = 0
            _write_cache(cache_name, data)
            return data
        except urllib.error.HTTPError as exc:
            code = exc.code
            try:
                detail = exc.read().decode("utf-8", "replace")[:160]
            except Exception:
                detail = ""
            last_error = f"HTTP {code} {detail}"
            if code in (403, 401):
                _source_blocked.add(source)
                raise RuntimeError(f"{source}: {last_error}")
            if code in (422, 429, 500, 502, 503, 504):
                time.sleep(min(25, 4 * (attempt + 1)))
                continue
            break
        except Exception as exc:  # noqa: BLE001 - network noise
            last_error = repr(exc)
            time.sleep(3 * (attempt + 1))
    _source_failures[source] += 1
    if _source_failures[source] >= 4:
        _source_blocked.add(source)
        print(f"  [{source}] errored repeatedly, stopping ({last_error})", file=sys.stderr)
    raise RuntimeError(f"{source}: {last_error}")


# ---------------------------------------------------------------------------
# Cleaning / English detection (shared with Task 163)
# ---------------------------------------------------------------------------
MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
URL = re.compile(r"https?://\S+")
HTML_TAG = re.compile(r"<[^>]+>")
NON_LATIN = re.compile(r"[\u0400-\u04ff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff\u0590-\u05ff]")
USER_MENTION = re.compile(r"(?<![A-Za-z0-9])/?u/[A-Za-z0-9_\-]+", re.I)


def clean_text(raw: str) -> str:
    if not raw:
        return ""
    text = html.unescape(raw)
    text = MD_LINK.sub(r"\1", text)
    text = HTML_TAG.sub(" ", text)
    text = URL.sub(" ", text)
    text = text.replace("&#x200B;", " ")
    text = USER_MENTION.sub(" ", text)  # never store usernames
    text = re.sub(r"[\*_`>#~]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()[:MAX_TEXT]


def is_english(text: str) -> bool:
    if not text or len(text) < 12:
        return False
    if NON_LATIN.search(text):
        return False
    letters = [c for c in text if c.isalpha()]
    if len(letters) < 8:
        return False
    latin = sum(1 for c in letters if c.isascii())
    return latin / len(letters) >= 0.85


# ---------------------------------------------------------------------------
# Topic tagging
# ---------------------------------------------------------------------------
T = re.compile
TOPIC_RULES = [
    ("bug", T(r"\b(bug|glitch|exploit|dupe|duplicat|softlock|soft.?lock|crash|stutter|fps drop|memory leak"
              r"|unintended|not working|doesn'?t work|broken|patched out|got patched|was patched|nerfed"
              r"|reverted|hotfix|error code)\b", re.I)),
    ("missable", T(r"\b(missable|missed out|missable|lost forever|locked out|lock.?out|point of no return"
                   r"|can'?t get (?:it )?(?:anymore|any more)|no longer obtainable|permanently miss|quest fail"
                   r"|griefed|ruined (?:my|the) (?:quest|run)|before (?:burning|killing) the (?:erdtree|final boss))\b", re.I)),
    ("pvp", T(r"\b(pvp|invad|invasion|invader|duel|colosseum|arena|gank|red sign|taunter|bloody finger"
              r"|recusant|festering|twin maiden|mohgwyn|host of fingers|lag switch|estus cancel)\b", re.I)),
    ("farm", T(r"\b(farm|farming|rune farm|runes? (?:per|an) hour|grind|blood.?stain|silver (?:pickled )?fowl"
               r"|golden scarab|greyoll|bird farm|mohgwyn|souls farm|afk farm|dupe runes)\b", re.I)),
    ("synergy", T(r"\b(synerg|combo|combos|pairs? (?:well |nicely )?with|combined with|stacks? with|stacking"
                  r"|chains? into|combo into|one.?shot|one shot|melts?|delete(?:s)? (?:bosses|health)|true combo)\b", re.I)),
    ("mechanic", T(r"\b(mechanic|poise|scaling|soft ?cap|hard ?cap|i.?frames|iframe|hitbox|hyper ?armor"
                   r"|damage negation|status (?:buildup|proc)|stagger|riposte|parry frames|guard boost"
                   r"|how does .{0,30} work|hidden stat|motion value|attack rating|ar |buff stack|snap)\b", re.I)),
    ("build", T(r"\b(build|builds|stat spread|respec|attribute|level \d+|rl\s?\d+|meta level|vigor check"
                r"|talisman setup|armou?r set|starting class|best (?:weapon|stats?|talisman|armou?r) (?:for|to)"
                r"|min.?max|optimis|optimiz|scaling build|arc(?:ane)? build|str(?:ength)? build)\b", re.I)),
    ("route", T(r"\b(route|walkthrough|progression|game progress|what (?:to do|next)|where (?:to go|next)"
                r"|how (?:do i )?(?:get|reach|find|access) (?:to )?|skip to|sequence break|way to|path to"
                r"|directions|order (?:to|of)|lost in)\b", re.I)),
    ("dlc", T(r"\b(dlc|shadow of the erdtree|shadow realm|land of shadow|scadutree|scadu altus|sote"
              r"|messmer|bayle|rellana|euporia|tarnished pack|idus|leontiel)\b", re.I)),
    ("lore", T(r"\b(lore|lorewise|story|theory|head.?canon|who (?:is|was)|why (?:did|does)|history"
               r"|timeline|myth|ending explained|meaning of|symbolis|symboliz)\b", re.I)),
    ("strategy", T(r"\b(strategy|tactic|cheese|chees|tips?|tip |guide|how to (?:beat|kill|defeat|fight)"
                   r"|easiest way|trivializ|exploit the|approach|advice|helpful|pro tip|walkthrough step)\b", re.I)),
]


def classify_topic(text: str, entities: list[str]) -> str:
    for topic, pattern in TOPIC_RULES:
        if pattern.search(text):
            return topic
    if any(e.startswith(("boss:leontiel", "npc:leontiel", "region:shadow", "dungeon:")) and "shadow" in e for e in entities):
        return "dlc"
    return "other"


# ---------------------------------------------------------------------------
# Entity resolution against the alias plane (shared with Task 163)
# ---------------------------------------------------------------------------
def normalize_name(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_entity_lookup() -> dict[str, set[str]]:
    lookup: dict[str, set[str]] = defaultdict(set)
    aliases = json.loads((ROOT / "public" / "sourced" / "aliases.json").read_text(encoding="utf-8"))
    for row in aliases:
        slug = row.get("slug")
        if not slug:
            continue
        for name in [row.get("fmgName"), *(row.get("aliases") or [])]:
            key = normalize_name(name or "")
            if key:
                lookup[key].add(slug)
    index = json.loads((ROOT / "public" / "sourced" / "entity-index.json").read_text(encoding="utf-8"))
    for rec_id, rec in (index.get("records") or {}).items():
        key = normalize_name(rec.get("name") or "")
        if key:
            lookup[key].add(rec.get("id") or rec_id)
    return lookup


TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'+’\-]*")


def resolve_entities(text: str, lookup: dict[str, set[str]]) -> list[str]:
    tokens = TOKEN_RE.findall(text)
    consumed = [False] * len(tokens)
    entities: set[str] = set()
    low = [t.lower() for t in tokens]
    for n in range(6, 0, -1):
        for i in range(len(tokens) - n + 1):
            if any(consumed[i : i + n]):
                continue
            key = normalize_name(" ".join(low[i : i + n]))
            ids = lookup.get(key)
            if not ids:
                continue
            if n == 1 and len(key) < 4:
                continue
            entities.update(ids)
            for j in range(i, i + n):
                consumed[j] = True
    return sorted(entities)


# ---------------------------------------------------------------------------
# Patch mapping + possiblyOutdated
# ---------------------------------------------------------------------------
def patch_for_date(iso_date: str) -> str:
    for date, version in reversed(PATCH_TABLE):
        if iso_date >= date:
            return version
    return "pre-release"


PATCH_ORDER = {version: i for i, (_, version) in enumerate(PATCH_TABLE)}
PATCH_DATE = {version: date for date, version in PATCH_TABLE}
NERR_RE = re.compile(r"\b(patched|nerfed|nerf|was fixed|got fixed|no longer works|doesn'?t work anymore"
                     r"|outdated|reverted|removed in|changed in patch)\b", re.I)


def ensure_patch_notes(fetch: bool) -> None:
    """Download the official patch history once, cached under .scratch/170/raw."""
    path = _cache_path("patch-notes.html")
    if path.exists() or not fetch:
        return
    global _last_request
    wait = MIN_INTERVAL - (time.time() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.time()
    req = urllib.request.Request(
        "https://eldenring.wiki.fextralife.com/Patch+Notes",
        headers={"User-Agent": UA, "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            path.write_bytes(resp.read())
        print("  [patch-notes] cached")
    except Exception as exc:  # noqa: BLE001
        print(f"  [patch-notes] {exc!r}", file=sys.stderr)


def parse_patch_entity_changes(lookup: dict[str, set[str]]) -> dict[str, list[str]]:
    """entity id -> patch versions whose notes mention it (a later change signal)."""
    path = _cache_path("patch-notes.html")
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8", errors="replace")
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    matches = list(re.finditer(r"Version\s*1\.\d+(?:\.\d+)?", text))
    changes: dict[str, set[str]] = defaultdict(set)
    for idx, m in enumerate(matches):
        version = re.sub(r"\s+", "", m.group(0).replace("Version", ""))
        if version not in PATCH_ORDER:
            continue
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = text[m.end() : end]
        if len(body) < 200:  # quick-nav fragment
            continue
        for ent in resolve_entities(body[:20000], lookup):
            changes[ent].add(version)
    return {ent: sorted(vers, key=lambda v: PATCH_ORDER.get(v, 0)) for ent, vers in changes.items()}


def is_outdated(iso_date: str, entities: list[str], change_map: dict[str, list[str]],
                later_nerf_comment: bool) -> bool:
    if later_nerf_comment:
        return True
    for ent in entities:
        for version in change_map.get(ent, ()):
            if PATCH_DATE.get(version, "") > iso_date:
                return True
    return False


# ---------------------------------------------------------------------------
# Fetch — posts
# ---------------------------------------------------------------------------
def load_cached_163_posts() -> dict[str, dict]:
    posts: dict[str, dict] = {}
    for sub in SUBREDDITS:
        found = 0
        for page in range(MAX_163_PAGES):
            data = _read_cache(f"reddit_{sub}_p{page:03d}.json", RAW163)
            if data is None:
                break
            found += 1
            for p in data.get("data") or []:
                if p.get("id"):
                    posts[p["id"]] = p
        if found:
            print(f"  [cache163] {sub}: {found} pages")
    return posts


def load_cached_search_posts() -> dict[str, dict]:
    """Rehydrate keyword-search results cached by a previous --search run."""
    posts: dict[str, dict] = {}
    for path in RAW.glob("search_*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        for p in data.get("data") or []:
            if p.get("id"):
                posts[p["id"]] = p
    return posts


def fetch_search_posts(term: str) -> list[dict]:
    out: list[dict] = []
    for sub in SUBREDDITS:
        cache_name = f"search_{sub}_{re.sub(r'[^A-Za-z0-9]+', '_', term)}.json"
        url = (
            f"{ARCHIVE}/api/posts/search?subreddit={urllib.parse.quote(sub)}"
            f"&limit=100&query={urllib.parse.quote(term)}&fields={POST_FIELDS}"
        )
        try:
            data = fetch_json(url, cache_name, f"archive:search:{sub}")
        except RuntimeError as exc:
            print(f"  [search:{sub}:{term}] {exc}", file=sys.stderr)
            continue
        for p in data.get("data") or []:
            if p.get("id"):
                out.append(p)
        print(f"  [search] {sub} '{term}': {len(data.get('data') or [])}")
    return out


def fetch_comment_tree(post_id: str) -> list[dict]:
    cache_name = f"tree_{post_id}.json"
    url = f"{ARCHIVE}/api/comments/tree?link_id={post_id}&limit=9999"
    try:
        data = fetch_json(url, cache_name, "archive:comments")
    except RuntimeError as exc:
        print(f"  [tree:{post_id}] {exc}", file=sys.stderr)
        return []
    flat: list[dict] = []

    def walk(nodes):
        for node in nodes:
            d = node.get("data") or {}
            if d.get("id"):
                flat.append(d)
            walk(node.get("children") or [])

    walk(data.get("data") or [])
    return flat


# ---------------------------------------------------------------------------
# Build corpus
# ---------------------------------------------------------------------------
SEARCH_RES = [re.compile(r"(?<![A-Za-z0-9])" + re.escape(t.lower()) + r"(?![A-Za-z0-9])", re.I)
              for t in SEARCH_TERMS]


def contains_term(post: dict, terms: list[str] | None = None) -> bool:
    hay = f"{post.get('title') or ''} {post.get('selftext') or ''}"
    return any(rx.search(hay) for rx in SEARCH_RES)


def post_row(p: dict, lookup, change_map, later_nerf: bool = False) -> dict | None:
    title = clean_text(p.get("title") or "")
    body = clean_text(p.get("selftext") or "")
    text = (title + ("\n" + body if body else "")).strip()[:MAX_TEXT]
    if not text or len(text) < 16 or not is_english(text):
        return None
    created = int(p.get("created_utc") or 0)
    if created <= 0:
        return None
    iso = datetime.fromtimestamp(created, tz=timezone.utc).strftime("%Y-%m-%d")
    sub = p.get("subreddit") or ""
    permalink = p.get("permalink") or f"/r/{sub}/comments/{p.get('id')}/"
    if permalink.startswith("/"):
        permalink = "https://www.reddit.com" + permalink
    entities = resolve_entities(text, lookup)
    topic = classify_topic(text, entities)
    patch = patch_for_date(iso)
    return {
        "text": text,
        "score": int(p.get("score") or 0),
        "date": iso,
        "permalink": permalink,
        "kind": "post",
        "topic": topic,
        "entities": entities,
        "patch": patch,
        "possiblyOutdated": is_outdated(iso, entities, change_map, later_nerf),
    }


def comment_row(c: dict, sub: str, lookup, change_map, later_nerf: bool) -> dict | None:
    body = clean_text(c.get("body") or "")
    if not body or len(body) < 12 or not is_english(body):
        return None
    created = int(c.get("created_utc") or 0)
    if created <= 0:
        return None
    iso = datetime.fromtimestamp(created, tz=timezone.utc).strftime("%Y-%m-%d")
    permalink = c.get("permalink") or f"/r/{sub}/comments/{c.get('link_id', '')}/_/{c.get('id')}/"
    if permalink.startswith("/"):
        permalink = "https://www.reddit.com" + permalink
    entities = resolve_entities(body, lookup)
    topic = classify_topic(body, entities)
    return {
        "text": body,
        "score": int(c.get("score") or 0),
        "date": iso,
        "permalink": permalink,
        "kind": "comment",
        "topic": topic,
        "entities": entities,
        "patch": patch_for_date(iso),
        "possiblyOutdated": is_outdated(iso, entities, change_map, later_nerf),
    }


def choose_corpus(pool: dict[str, dict], search_ids: set[str]) -> list[dict]:
    """Top-ranked posts per sub, plus every search hit."""
    by_sub: dict[str, list[dict]] = defaultdict(list)
    for p in pool.values():
        if (p.get("title") or "").strip():
            by_sub[p.get("subreddit") or ""].append(p)
    chosen: dict[str, dict] = {}

    for sub, rows in by_sub.items():
        rows.sort(key=lambda p: (int(p.get("score") or 0), int(p.get("num_comments") or 0)), reverse=True)
        for p in rows[:400]:
            chosen[p["id"]] = p

    for pid in search_ids:
        if pid in pool:
            chosen[pid] = pool[pid]

    for p in pool.values():
        if p.get("id") in chosen:
            continue
        if contains_term(p, SEARCH_TERMS) and int(p.get("score") or 0) >= 5:
            chosen[p["id"]] = p

    return list(chosen.values())


def comment_candidates(corpus: list[dict]) -> list[dict]:
    rows = [p for p in corpus if int(p.get("num_comments") or 0) >= 15]
    rows.sort(key=lambda p: (int(p.get("num_comments") or 0), int(p.get("score") or 0)), reverse=True)
    return rows


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def build_rows(corpus: list[dict], comment_cache: dict[str, list[dict]], lookup, change_map) -> list[dict]:
    rows: list[dict] = []
    corpus_ids = {p["id"] for p in corpus}

    for p in corpus:
        comments = comment_cache.get(p["id"]) or []
        post_date = int(p.get("created_utc") or 0)
        nerr = [(int(c.get("created_utc") or 0), c.get("body") or "", c)
                for c in comments if NERR_RE.search(c.get("body") or "")]
        later_nerf = any(ts > post_date for ts, _, _ in nerr)
        row = post_row(p, lookup, change_map, later_nerf)
        if row:
            rows.append(row)

        scored = [c for c in comments if int(c.get("score") or 0) >= MIN_COMMENT_SCORE]
        scored.sort(key=lambda c: int(c.get("score") or 0), reverse=True)
        seen_bodies: set[str] = set()
        added = 0
        for c in scored:
            if added >= TOP_COMMENTS_PER_POST:
                break
            body_key = (c.get("body") or "")[:80]
            if body_key in seen_bodies:
                continue
            cdate = int(c.get("created_utc") or 0)
            later = any(ts > cdate for ts, _, _ in nerr)
            row = comment_row(c, p.get("subreddit") or "", lookup, change_map, later)
            if row:
                seen_bodies.add(body_key)
                rows.append(row)
                added += 1

    rows.sort(key=lambda r: (r["score"], r["date"]), reverse=True)
    return rows


def write_json(rows: list[dict], change_map: dict[str, list[str]], meta: dict) -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "reddit (Arctic Shift archive) — r/Eldenring, r/EldenRingHelp, "
                  "r/eldenringdiscussion, r/Shadowoftheerdtree, r/EldenRingPVP, "
                  "r/EldenRingBuilds, r/eldenringlore",
        "collected": len(rows),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "patchTable": [{"date": d, "version": v} for d, v in PATCH_TABLE],
        "patchEntityChanges": {k: v for k, v in sorted(change_map.items())},
        "meta": meta,
        "rows": rows,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def write_markdown(rows: list[dict], latest_patch: str) -> None:
    topic_counts = Counter(r["topic"] for r in rows)
    kind_counts = Counter(r["kind"] for r in rows)
    ent_counts = Counter(e for r in rows for e in r["entities"])
    outdated = sum(1 for r in rows if r["possiblyOutdated"])
    current = [r for r in rows
               if not r["possiblyOutdated"] and r["topic"] != "other" and r["patch"] == latest_patch]
    current.sort(key=lambda r: r["score"], reverse=True)
    examples = current[:20]

    lines = [MD_START, "", "## Player knowledge (Task 170)", "",
             "Community strategies, cheese, bugs, missables and PvP from seven Elden Ring "
             "subreddits (posts and their top-voted comments). Collected by "
             "`scripts/collect-player-knowledge.py`; text only, no usernames.", "",
             f"- **Rows:** {len(rows)} ({kind_counts.get('post', 0)} posts, "
             f"{kind_counts.get('comment', 0)} comments)",
             f"- **Possibly outdated:** {outdated} ({outdated * 100 // max(1, len(rows))}%)",
             f"- **Current patch (not outdated):** {len(current)} rows", "",
             "### Counts per topic", "", "| topic | rows |", "| --- | ---: |"]
    for topic, count in topic_counts.most_common():
        lines.append(f"| {topic} | {count} |")
    lines += ["", "### Top 50 entities", "", "| # | entity id | rows |", "| ---: | --- | ---: |"]
    for i, (ent, count) in enumerate(ent_counts.most_common(50), 1):
        lines.append(f"| {i} | {ent} | {count} |")
    lines += ["", "### 20 example tips (current patch, not outdated)", ""]
    if not examples:
        lines.append("None.")
    for r in examples:
        text = r["text"].replace("\n", " ")
        if len(text) > 300:
            text = text[:297] + "..."
        ents = ", ".join(r["entities"][:4])
        lines.append(f"- **[{r['topic']}]** {text}  \n  `{r['patch']}` · score {r['score']} · {ents or '-'} · {r['permalink']}")
    lines += ["", MD_END, ""]

    existing = OUT_MD.read_text(encoding="utf-8") if OUT_MD.exists() else "# Player questions corpus\n"
    out = re.sub(re.escape(MD_START) + r".*?" + re.escape(MD_END), "", existing, flags=re.S).rstrip() + "\n"
    OUT_MD.write_text(out + "\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Collect player knowledge (Task 170).")
    parser.add_argument("--no-fetch", action="store_true", help="build from cache only")
    parser.add_argument("--posts-only", action="store_true", help="fetch posts, skip comments")
    parser.add_argument("--max-comment-posts", type=int, default=0,
                        help="max new comment trees to fetch this run (0 = all)")
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    lookup = load_entity_lookup()
    ensure_patch_notes(fetch=not args.no_fetch)
    change_map = parse_patch_entity_changes(lookup)
    print(f"entity lookup keys: {len(lookup)}; patch-entity changes: {len(change_map)}")

    pool = load_cached_163_posts()
    search_ids: set[str] = set()

    cached_search = load_cached_search_posts()
    if cached_search:
        pool.update(cached_search)
        search_ids.update(cached_search)
        print(f"cached search posts: {len(cached_search)}")

    # The archive's full-text search times out from this network (HTTP 422
    # "Timeout"), so the requested keyword searches are performed locally over
    # the collected post pool instead (title + selftext, word-boundary match).
    for pid, p in pool.items():
        if contains_term(p):
            search_ids.add(pid)

    corpus = choose_corpus(pool, search_ids)
    # local search tagging for cached posts
    for p in corpus:
        if contains_term(p, SEARCH_TERMS):
            search_ids.add(p["id"])
    print(f"pool {len(pool)} posts; corpus {len(corpus)} posts")

    comment_cache: dict[str, list[dict]] = {}
    if not args.posts_only:
        candidates = comment_candidates(corpus)
        fetched = 0
        for p in candidates:
            cached = _read_cache(f"tree_{p['id']}.json")
            if cached is not None:
                comment_cache[p["id"]] = _flatten_tree(cached)
                continue
            if args.max_comment_posts and fetched >= args.max_comment_posts:
                break
            if args.no_fetch:
                continue
            flat = fetch_comment_tree(p["id"])
            comment_cache[p["id"]] = flat
            fetched += 1
        print(f"comment trees: {len(comment_cache)} available ({fetched} fetched this run)")

    rows = build_rows(corpus, comment_cache, lookup, change_map)
    meta = {
        "corpus": len(corpus),
        "searchPosts": len(search_ids),
        "commentTrees": len(comment_cache),
        "sources": "reddit via Arctic Shift archive",
    }
    write_json(rows, change_map, meta)
    write_markdown(rows, PATCH_TABLE[-1][1])
    topic_counts = Counter(r["topic"] for r in rows)
    kind_counts = Counter(r["kind"] for r in rows)
    size_mb = OUT_JSON.stat().st_size / (1024 * 1024)
    print(f"wrote {len(rows)} rows ({kind_counts.get('post',0)} posts, {kind_counts.get('comment',0)} comments) "
          f"to {OUT_JSON} ({size_mb:.2f} MB)")
    print("topics:", dict(topic_counts.most_common()))
    return 0


def _flatten_tree(data) -> list[dict]:
    flat: list[dict] = []

    def walk(nodes):
        for node in nodes:
            d = node.get("data") or {}
            if d.get("id"):
                flat.append(d)
            walk(node.get("children") or [])

    walk(data.get("data") or [])
    return flat


if __name__ == "__main__":
    raise SystemExit(main())
