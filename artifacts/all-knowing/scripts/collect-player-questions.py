#!/usr/bin/env python3
"""Task 163 — collect how real Elden Ring players ask questions.

Builds a corpus of real player question text (title + first ~300 chars of body)
plus topic metadata, for driving Gideon's question understanding and evaluation.

Sources (polite: descriptive User-Agent, <=1 request / ~2 s, back off on
429/5xx/422, stop a source that errors repeatedly; no logins, no paid APIs):

  * Reddit — the task names reddit.com's public JSON. From this environment every
    reddit.com request is answered ``403 Blocked`` (datacenter IP), so the script
    falls back to the Arctic Shift Reddit archive (same public post data, no
    login) and records reddit.com as blocked in the report.
  * Stack Exchange — gaming.stackexchange.com, tag ``elden-ring``.
  * Steam Community — Elden Ring discussion topic titles.

GameFAQs and Fextralife are attempted once; both answer 403 and are recorded as
blocked. Raw responses are cached under ``.scratch/163/raw/`` so a re-run does not
re-fetch. Only question text + topic metadata are written to the committed
artifacts — no usernames, profile links or other personal data.

Usage (from artifacts/all-knowing):
    python scripts/collect-player-questions.py            # fetch (cached) + process
    python scripts/collect-player-questions.py --no-fetch # process only
    python scripts/collect-player-questions.py --fetch-only
"""

from __future__ import annotations

import argparse
import difflib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / ".scratch" / "163" / "raw"
OUT_JSON = ROOT / "public" / "sourced" / "open" / "player-questions.json"
OUT_MD = ROOT / "docs" / "PLAYER-QUESTIONS.md"
NICK_JSON = ROOT / "src" / "data" / "player-nicknames.json"
SCRATCH = ROOT / ".scratch" / "163"

UA = "all-knowing-question-corpus/1.0 (Elden Ring companion research; personal project)"
MIN_INTERVAL = 2.0  # seconds between live requests to the same host
FAR_FUTURE = 2000000000  # fixed "newest" cursor, keeps paged caches deterministic

# ---------------------------------------------------------------------------
# Source configuration
# ---------------------------------------------------------------------------
SUBREDDITS = {
    "EldenRingHelp": 2200,
    "EldenRingBuilds": 1500,
    "Eldenring": 1500,
    "eldenringdiscussion": 1000,
    "EldenRingPVP": 800,
    "eldenringlore": 500,
    "Shadowoftheerdtree": 400,
}
MAX_PAGES_PER_SUB = 60
TOTAL_TARGET = 12000

STACKEXCHANGE_TAG = "elden-ring"
STEAM_APP = "1245620"
STEAM_FORUM = "0"
MAX_STEAM_PAGES = 130

REDDIT_ARCHIVE = "https://arctic-shift.photon-reddit.com/api/posts/search"
REDDIT_FIELDS = "id,title,selftext,score,created_utc,subreddit,num_comments"

# Task 163 §4 — player nicknames promoted to aliases. Automatic mining (below)
# proposes candidates, but most single words are generic ("Tunnel", "Rings") or
# resolve to several entities ("ranni", "Shadow"); only these were verified by
# hand to name exactly one entity in the alias plane / entity index.
NICKNAME_MAP = {
    "melania": "boss:malenia",
    "mesmer": "boss:messmer",
    "radhan": "boss:radahn",
    "godric": "boss:godrick",
    "goldfrey": "boss:godfrey",
    "renala": "boss:rennala",
    "renalla": "boss:rennala",
    "rennalla": "boss:rennala",
    "calid": "region:caelid",
    "lyndell": "region:leyndell",
    "liurna": "region:liurnia",
    "stormveil": "dungeon:stormveil",
    "nagikiba": "item:nagakiba",
    "nagakibas": "item:nagakiba",
    "granssax": "item:bolt-of-gransax",
    "physic": "item:flask-of-wondrous-physick",
    "waterfowl": "boss:malenia",
    "pcr": "boss:consort",
    "margott": "boss:morgott",
    "darkmoon": "item:dark-moon-greatsword",
}


# ---------------------------------------------------------------------------
# HTTP with cache + politeness
# ---------------------------------------------------------------------------
_last_request = 0.0
_source_failures: dict[str, int] = defaultdict(int)
_source_blocked: set[str] = set()


class Blocked(Exception):
    pass


def _cache_path(name: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:140]
    return RAW / safe


def _read_cache(name: str):
    path = _cache_path(name)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return None
    return None


def _write_cache(name: str, value) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    _cache_path(name).write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


def fetch_json(url: str, cache_name: str, source: str, *, allow_embedded_error: bool = False):
    """Fetch JSON, caching the parsed body. Raises Blocked on a hard block."""
    cached = _read_cache(cache_name)
    if cached is not None:
        return cached
    if source in _source_blocked:
        raise Blocked(source)
    global _last_request
    last_error = None
    for attempt in range(5):
        wait = MIN_INTERVAL - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.time()
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
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
                raise Blocked(f"{source}: {last_error}")
            if code in (422, 429, 500, 502, 503, 504):
                # 422 here is Arctic Shift's "Timeout. Maybe slow down a bit".
                time.sleep(min(20, 4 * (attempt + 1)))
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


def fetch_text(url: str, cache_name: str, source: str) -> str | None:
    path = _cache_path(cache_name)
    if path.exists():
        return path.read_text(encoding="utf-8", errors="replace")
    if source in _source_blocked:
        return None
    global _last_request
    wait = MIN_INTERVAL - (time.time() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.time()
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", "replace")
        path.write_text(body, encoding="utf-8")
        return body
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            _source_blocked.add(source)
            print(f"  [{source}] blocked: HTTP {exc.code}", file=sys.stderr)
        else:
            print(f"  [{source}] HTTP {exc.code}", file=sys.stderr)
        return None
    except Exception as exc:  # noqa: BLE001
        print(f"  [{source}] {exc!r}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Fetch — Reddit
# ---------------------------------------------------------------------------
def fetch_reddit_direct() -> bool:
    """Probe reddit.com once; True when its public JSON is reachable."""
    probe = _read_cache("reddit_direct_probe.json")
    if probe is not None:
        return bool(probe.get("reachable"))
    status = {"reachable": False, "detail": ""}
    try:
        req = urllib.request.Request(
            "https://www.reddit.com/r/Eldenring/top.json?t=all&limit=3",
            headers={"User-Agent": UA, "Accept": "application/json"},
        )
        time.sleep(MIN_INTERVAL)
        with urllib.request.urlopen(req, timeout=45) as resp:
            json.loads(resp.read().decode("utf-8", "replace"))
        status = {"reachable": True, "detail": "200"}
    except urllib.error.HTTPError as exc:
        status = {"reachable": False, "detail": f"HTTP {exc.code}"}
    except Exception as exc:  # noqa: BLE001
        status = {"reachable": False, "detail": repr(exc)}
    _write_cache("reddit_direct_probe.json", status)
    return status["reachable"]


def fetch_reddit_subreddit(sub: str, quota: int, source: str) -> list[dict]:
    posts: list[dict] = []
    cursor = FAR_FUTURE
    candidates = 0
    for page in range(MAX_PAGES_PER_SUB):
        cache_name = f"reddit_{sub}_p{page:03d}.json"
        url = f"{REDDIT_ARCHIVE}?subreddit={sub}&limit=100&sort=desc&fields={REDDIT_FIELDS}&before={cursor}"
        try:
            data = fetch_json(url, cache_name, source)
        except (Blocked, RuntimeError) as exc:
            print(f"  [reddit:{sub}] stopped paging: {exc}", file=sys.stderr)
            break
        rows = data.get("data") if isinstance(data, dict) else None
        if not rows:
            break
        for post in rows:
            title = post.get("title") or ""
            if is_question_like(title):
                posts.append(
                    {
                        "title": title,
                        "selftext": post.get("selftext") or "",
                        "src": f"reddit:{sub}",
                    }
                )
        candidates += sum(1 for p in rows if is_question_like(p.get("title") or ""))
        cursor = int(rows[-1].get("created_utc") or cursor)
        print(f"  [{source}] page {page + 1}: {len(rows)} posts, {candidates} questions")
        if candidates >= quota or cursor <= 0:
            break
    return posts


# ---------------------------------------------------------------------------
# Fetch — Stack Exchange
# ---------------------------------------------------------------------------
def fetch_stackexchange(source: str) -> list[dict]:
    posts: list[dict] = []
    page = 1
    while page <= 20:
        url = (
            "https://api.stackexchange.com/2.3/questions"
            f"?tagged={STACKEXCHANGE_TAG}&site=gaming&pagesize=100&page={page}"
            "&order=desc&sort=votes&filter=withbody"
        )
        try:
            data = fetch_json(url, f"stackexchange_p{page:03d}.json", source)
        except (Blocked, RuntimeError) as exc:
            print(f"  [stackexchange] stopped: {exc}", file=sys.stderr)
            break
        items = data.get("items") if isinstance(data, dict) else []
        if not items:
            break
        for item in items:
            posts.append(
                {
                    "title": item.get("title") or "",
                    "selftext": item.get("body") or "",
                    "src": "stackexchange",
                }
            )
        page += 1
        if not data.get("has_more"):
            break
    return posts


# ---------------------------------------------------------------------------
# Fetch — Steam Community discussion titles
# ---------------------------------------------------------------------------
STEAM_TITLE_RE = re.compile(r'<div class="forum_topic_name ">\s*(.*?)\s*</div>', re.S)


def fetch_steam(source: str) -> list[dict]:
    posts: list[dict] = []
    for page in range(1, MAX_STEAM_PAGES + 1):
        url = (
            f"https://steamcommunity.com/app/{STEAM_APP}/discussions/{STEAM_FORUM}/"
            f"?fp={page}"
        )
        body = fetch_text(url, f"steam_p{page:03d}.html", source)
        if body is None:
            break
        titles = STEAM_TITLE_RE.findall(body)
        if not titles:
            break
        for raw in titles:
            title = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
            if title:
                posts.append({"title": title, "selftext": "", "src": "steam"})
        if len(titles) < 5:
            break
        print(f"  [{source}] page {page}: {len(titles)} topics")
    return posts


def probe_blocked(url: str, cache_name: str, source: str) -> str:
    """One polite request; returns 'ok' or a short status. Caches the status."""
    cached = _read_cache(cache_name)
    if cached is not None:
        return cached.get("status", "unknown")
    status = "ok"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        time.sleep(MIN_INTERVAL)
        with urllib.request.urlopen(req, timeout=45) as resp:
            if resp.status >= 400:
                status = f"HTTP {resp.status}"
    except urllib.error.HTTPError as exc:
        status = f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001
        status = repr(exc)[:60]
    _write_cache(cache_name, {"status": status})
    return status


# ---------------------------------------------------------------------------
# Cleaning / question detection
# ---------------------------------------------------------------------------
MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
URL = re.compile(r"https?://\S+")
HTML_TAG = re.compile(r"<[^>]+>")
NON_LATIN = re.compile(r"[\u0400-\u04ff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff\u0590-\u05ff]")

QUESTION_START = re.compile(
    r"^\s*(?:\[[^\]]*\]|\([^)]*\))?\s*"
    r"(how|what|where|when|why|who|which|whose|whom|can|could|should|would|will|"
    r"do|does|did|is|are|was|were|am|any|anyone|need|need help|help|looking|"
    r"tips|advice|recommend|best|rate|thoughts|question|is it|will i|"
    r"lf|wts|wtb|lfg)\b",
    re.I,
)
HELP_PHRASES = re.compile(
    r"\b(help(?:ing)?\b|need(?:ing)? (?:some )?help|can (?:someone|anyone|somebody)|"
    r"how (?:do|to|can)|where (?:do|is|are|can|to)|what (?:do|is|are|should)|"
    r"any(?:one)? (?:know|tips|advice)|looking for|advice on|tips for|"
    r"should i|is it worth|is this|am i (?:able|supposed)|why (?:is|does|do|can)|"
    r"question about|no idea|not sure|confused|stuck)\b",
    re.I,
)


def clean_text(raw: str) -> str:
    if not raw:
        return ""
    text = html.unescape(raw)
    text = MD_LINK.sub(r"\1", text)
    text = HTML_TAG.sub(" ", text)
    text = URL.sub(" ", text)
    text = text.replace("&#x200B;", " ")
    text = re.sub(r"[\*_`>#~]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


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


def is_question_like(title: str) -> bool:
    t = clean_text(title)
    if len(t) < 12:
        return False
    if "?" in t:
        return True
    if QUESTION_START.search(t):
        return True
    return bool(HELP_PHRASES.search(t))


# ---------------------------------------------------------------------------
# Type tagging
# ---------------------------------------------------------------------------
TYPE_RULES = [
    (re.compile(r"\bhow (?:do|to|can) (?:i|you|we)\b.*\b(beat|kill|defeat|cheese|parry|stagger|dodge|fight)\b", re.I), "how-to-beat"),
    (re.compile(r"\b(beat|kill|defeat)\b.*\b(help|tips|advice|strategy|how)\b", re.I), "how-to-beat"),
    (re.compile(r"\bhow (?:do|to|can) (?:i|you)\b.*\b(get|obtain|acquire|unlock|receive|earn)\b", re.I), "how-to-get"),
    (re.compile(r"\bhow to get\b|\bhow do i get\b|\bwhere (?:do|can) i get\b", re.I), "how-to-get"),
    (re.compile(r"\bwhere (?:is|are|'s)\b.*\bboss\b|\bboss\b.*\blocation\b", re.I), "boss-location"),
    (re.compile(r"\bwhere (?:is|are|can i find|do i find)\b.*\b(item|weapon|talisman|armou?r|spell|incantation|ash|key|medallion|sword|shield|rune|seed|tear|stone)\b", re.I), "item-location"),
    (re.compile(r"\bwhere (?:is|are|can i find|do i find)\b.*\bnpc\b", re.I), "npc-location"),
    (re.compile(r"\bwhere (?:is|are|do i find|can i find|to find)\b", re.I), "where-is"),
    (re.compile(r"\bwhat (?:do i|should i|to) (?:do|next)\b|\bwhere (?:do i|should i|to) (?:go|head)\b|\bwhat now\b", re.I), "what-next"),
    (re.compile(r"\b(quest|questline|quest step|quest order|npc quest|side quest)\b", re.I), "npc-quest"),
    (re.compile(r"\b(drop|drops|drop rate|farm(?:ing)?|loot|reward)\b", re.I), "drops"),
    (re.compile(r"\b(level up|level(?:ing)?|rune farm|farm(?:ing)? runes|respec|vigor|endurance|mind|rl\s?\d+)\b", re.I), "level"),
    (re.compile(r"\b(ending|endings|age of stars|frenzied flame|elden lord|miquella|burn the erdtree)\b", re.I), "ending"),
    (re.compile(r"\b(pvp|invade|invasion|invader|duel|colosseum|arena)\b", re.I), "pvp"),
    (re.compile(r"\b(co-?op|coop|summon|summoning|multiplayer|seamless|password|play with (?:a )?friend)\b", re.I), "co-op"),
    (re.compile(r"\b(build|builds|gear|respec|talisman|armou?r|weapon should|stats should|rate my|optimis|optimiz|stat spread)\b", re.I), "build-advice"),
    (re.compile(r"\b(vs\.?|versus|which is better|which one|which is best|or the)\b", re.I), "compare"),
    (re.compile(r"\b(lore|story|theory|lorewise|meaning|who (?:is|was)|why (?:did|does|is)|history|timeline)\b", re.I), "lore"),
    (re.compile(r"\b(requirement|requirements|prerequisite|how much (?:str|dex|int|faith|arc|mind|vigor|endurance)|minimum stats?)\b", re.I), "requirements"),
    (re.compile(r"\b(recommend|recommendation|suggestion|best (?:weapon|build|class|armou?r|spell|talisman)|what should i (?:use|pick|choose|play))\b", re.I), "recommend"),
    (re.compile(r"\b(bug|glitch|crash|crashes|stutter|fps|\blag\b|not working|won'?t (?:start|launch)|error|stuck|can'?t|cannot|unable|broken)\b", re.I), "bug-glitch"),
    (re.compile(r"\b(starting class|class|wretch|astrologer|samurai|vagabond|prisoner|confessor|prophet|hero|bandit|vagabond)\b", re.I), "class-build"),
    (re.compile(r"\bhow (?:does|do) .* work\b|\bwhat does .* do\b|\bmechanic|poise|scaling|\bbuff\b|\bdebuff\b|stack|proc|soft cap|hard cap\b", re.I), "mechanics"),
    (re.compile(r"\bhow (?:do i|to) use\b|\bwhat do i do with\b", re.I), "how-to-use"),
    (re.compile(r"\bnavigat|\bdirection|\broute\b|\bway to\b|\bget to\b|\breach\b|\bmap\b|\blost\b", re.I), "navigation"),
]
TYPE_ORDER = [
    "how-to-beat", "how-to-get", "boss-location", "item-location", "npc-location",
    "where-is", "npc-quest", "drops", "level", "ending", "pvp", "co-op",
    "build-advice", "compare", "lore", "requirements", "recommend", "class-build",
    "mechanics", "how-to-use", "navigation", "what-next", "bug-glitch", "other",
]
KNOWN_TYPES = set(TYPE_ORDER) | {"multi-part"}


def classify(title: str, body: str) -> str:
    text = f"{title} {body[:300]}"
    if title.count("?") >= 2 or (re.search(r"\band\b", title, re.I) and len(title) > 80):
        return "multi-part"
    for pattern, kind in TYPE_RULES:
        if pattern.search(text):
            return kind
    return "other"


# ---------------------------------------------------------------------------
# Entity resolution against the alias plane
# ---------------------------------------------------------------------------
def normalize_name(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[\u2019']s\b", "", s)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9+]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_entity_lookup() -> dict[str, set[str]]:
    lookup: dict[str, set[str]] = defaultdict(set)
    aliases = json.loads((ROOT / "public/sourced/aliases.json").read_text(encoding="utf-8"))
    for row in aliases:
        slug = row.get("slug")
        if not slug:
            continue
        for name in [row.get("fmgName"), *(row.get("aliases") or [])]:
            key = normalize_name(name or "")
            if key:
                lookup[key].add(slug)
    index = json.loads((ROOT / "public/sourced/entity-index.json").read_text(encoding="utf-8"))
    for rec_id, rec in (index.get("records") or {}).items():
        key = normalize_name(rec.get("name") or "")
        if key:
            lookup[key].add(rec.get("id") or rec_id)
    return lookup


TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'+’\-]*")
PLATFORM = {
    "ps5", "ps4", "psn", "pc", "xbox", "xsx", "xss", "switch", "steam", "ng", "ng+",
    "rl", "dlc", "sote", "goty", "gg", "op", "imo", "edit", "update", "spoiler",
    "spoilers", "tl", "dr", "fps", "hud", "ui", "rng", "ai", "hp", "fp", "stamina",
}
STOPWORDS = {
    "the", "a", "an", "i", "im", "i'm", "my", "me", "we", "our", "you", "your",
    "it", "its", "this", "that", "these", "those", "is", "are", "was", "were",
    "be", "been", "being", "do", "does", "did", "have", "has", "had", "can",
    "could", "should", "would", "will", "just", "so", "but", "and", "or", "if",
    "not", "no", "yes", "on", "in", "at", "to", "for", "of", "with", "about",
    "from", "by", "as", "up", "down", "out", "any", "all", "some", "more", "most",
    "how", "what", "where", "when", "why", "who", "which", "help", "need",
    "please", "pls", "anyone", "someone", "game", "boss", "build", "player",
    "new", "good", "best", "get", "getting", "got", "use", "using", "one", "two",
    "first", "second", "last", "next", "also", "very", "really", "thanks", "thank",
    "question", "advice", "tips", "guide", "like", "know", "want", "looking",
}


def resolve_entities(text: str, lookup: dict[str, set[str]]):
    """Greedy longest-match of alias-plane names in the text.

    Returns (entities, consumed_mask, tokens).
    """
    tokens = TOKEN_RE.findall(text)
    consumed = [False] * len(tokens)
    entities: set[str] = set()
    low = [t.lower() for t in tokens]
    max_n = 6
    for n in range(max_n, 0, -1):
        for i in range(len(tokens) - n + 1):
            if any(consumed[i : i + n]):
                continue
            key = normalize_name(" ".join(low[i : i + n]))
            ids = lookup.get(key)
            if not ids:
                continue
            # Require a distinctive match: multi-word, or a word of >=4 chars.
            if n == 1 and len(key) < 4:
                continue
            entities.update(ids)
            for j in range(i, i + n):
                consumed[j] = True
    return entities, consumed, tokens


def compute_proper(texts: list[str]) -> tuple[set[str], set[str]]:
    """Corpus-derived proper-noun vocabulary and common-word set.

    A token counts as a proper noun when it is capitalised *mid-sentence*
    (sentence-initial capitalisation is ignored) more often than it is written in
    lowercase. This separates real names ("Malenia", "Renalla", "Mesmer") and
    misspellings from sentence-opening English words ("Recently", "Offering").
    The common set is the reverse: words written lowercase at least as often as
    capitalised, used to drop generic terms ("Tunnel", "Rings", "Lady").
    """
    cap: Counter = Counter()
    low: Counter = Counter()
    for text in texts:
        for sentence in re.split(r"[.!?\n]", text):
            tokens = TOKEN_RE.findall(sentence)
            for idx, token in enumerate(tokens):
                if idx == 0:
                    continue
                key = token.lower()
                if re.match(r"^[A-Z]", token):
                    cap[key] += 1
                else:
                    low[key] += 1
    proper = {w for w, count in cap.items() if count >= 2 and count > low.get(w, 0)}
    proper |= {w for w in cap if w.isupper() and 2 <= len(w) <= 6 and cap[w] >= 2}
    common = {w for w, count in low.items() if count >= 4 and count >= cap.get(w, 0)}
    return proper, common


FUNCTION_WORDS = STOPWORDS | {
    "are", "aren't", "am", "any", "been", "being", "could", "did", "do", "does",
    "doing", "done", "for", "from", "had", "has", "have", "having", "he", "her",
    "here", "him", "his", "how", "into", "it", "its", "she", "should", "than",
    "then", "there", "they", "them", "their", "this", "those", "through", "too",
    "under", "until", "very", "was", "we", "were", "what", "when", "where",
    "which", "while", "who", "whom", "why", "will", "with", "would", "you",
    "your", "yours", "myself", "yourself", "ourselves", "themselves",
}

# Pronoun / contraction starts are capitalised mid-sentence as a rule, so the
# proper-noun statistic cannot tell them from names; block them explicitly.
PRONOUNS = {
    "i", "i'm", "i've", "i'll", "i'd", "me", "my", "mine", "myself",
    "we", "we're", "we've", "we'll", "we'd", "us", "our", "ours", "ourselves",
    "you", "you're", "you've", "you'll", "you'd", "your", "yours", "yourself",
    "he", "he's", "him", "his", "himself", "she", "she's", "her", "hers", "herself",
    "it", "it's", "its", "itself", "they", "they're", "they've", "they'll", "they'd",
    "them", "their", "theirs", "themselves", "who", "whom", "whose", "there",
}

# Proper nouns that are not in-game entities (platforms, other games, stats, sites).
NON_ENTITY = {
    "elden", "eldenring", "ring", "xbox", "playstation", "psn", "pc", "bloodborne",
    "sekiro", "darksouls", "fromsoft", "fromsoftware", "youtube", "reddit", "google",
    "npc", "npcs", "dlc", "dexterity", "strength", "intelligence", "faith", "arcane",
    "mind", "vigor", "endurance", "poise", "boss", "bosses", "arena", "summon",
    "help", "edit", "psa", "imo", "op", "fps", "hud", "rng", "nintendo", "switch",
    "dualsense", "playstation", "steam", "mod", "mods", "gaming", "wiki",
}


def _depronoun(token: str) -> str:
    return token.lower().replace("\u2019", "'")


def find_unresolved(text: str, consumed: list[bool], tokens: list[str], proper: set[str]) -> list[str]:
    """Name-like spans the alias plane did not resolve: proper nouns (plus up to a
    few following content words, e.g. "Malenia waterfowl") and quoted phrases."""
    spans: list[str] = []
    for quote_re in (
        re.compile(r'"([^"]{2,50})"'),
        re.compile(r"[\u201c\u2018]([^\u201d\u2019]{2,50})[\u201d\u2019]"),
    ):
        for match in quote_re.findall(text):
            spans.append(match)

    i = 0
    n = len(tokens)
    while i < n:
        token = tokens[i]
        key = _depronoun(token)
        is_proper = key in proper and key not in PRONOUNS and key not in NON_ENTITY
        is_acronym = token.isupper() and 2 <= len(token) <= 5 and key not in NON_ENTITY and key not in PLATFORM
        if not consumed[i] and (is_proper or is_acronym):
            span = [token]
            j = i + 1
            while j < n and len(span) < 4 and not consumed[j]:
                nxt = tokens[j]
                if nxt.lower() in FUNCTION_WORDS or nxt.lower() in PLATFORM:
                    break
                span.append(nxt)
                j += 1
            spans.append(" ".join(span))
            i = j
            continue
        i += 1

    out = []
    for span in spans:
        span = re.sub(r"\s+", " ", span).strip(" '’-")
        first = _depronoun(span.split(" ")[0]) if span else ""
        if span and len(span) >= 4 and first not in NON_ENTITY and first not in PRONOUNS:
            out.append(span)
    return out


# ---------------------------------------------------------------------------
# Dedupe
# ---------------------------------------------------------------------------
def dedupe_key(title: str) -> str:
    t = title.lower()
    t = re.sub(r"[\[(]?(?:ps[45]|pc|xbox(?:\s*(?:one|series\s*[xs]))?|switch|steam)[)\]]?", " ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    words = [w for w in t.split() if w not in {"the", "a", "an"}]
    return " ".join(words)


def near_key(title: str) -> str:
    words = [w for w in dedupe_key(title).split() if len(w) > 2]
    return " ".join(sorted(set(words))[:8])


# ---------------------------------------------------------------------------
# Nickname candidate mining
# ---------------------------------------------------------------------------
NICK_STOP = {
    "help", "build", "boss", "fight", "guide", "tips", "advice", "location", "where",
    "how", "what", "why", "who", "need", "want", "best", "good", "use", "using",
    "get", "getting", "new", "player", "noob", "stuck", "please", "anyone",
    "someone", "question", "problem", "issue", "run", "playthrough", "early",
    "late", "hard", "easy", "first", "second", "final", "true", "real", "whole",
}


NAMED_PREFIXES = (
    "boss:", "npc:", "item:", "weapon:", "armor:", "spirit:", "talisman:", "ash:",
    "spell:", "region:", "grace:", "invader:", "quest:", "enemy:", "dungeon:",
    "merchant:",
)


def _is_named(entity_id: str) -> bool:
    return entity_id.startswith(NAMED_PREFIXES) and not re.search(r"\d{4,}", entity_id)


def nickname_target(term: str, lookup: dict[str, set[str]], named_keys: list[str], common: set[str]):
    """Return (unique_id | None, ambiguous_ids).

    Maps a nickname to one entity when a substring of the term is an alias-plane
    name (longest wins) or — for a single token — when it is a close misspelling
    of exactly one name. Generic (lowercase-frequent) terms and terms with more
    than one candidate are rejected; the latter are listed as ambiguous.
    """
    toks = normalize_name(term).split()
    if not (1 <= len(toks) <= 5):
        return None, set()
    if any(not t.isalpha() for t in toks):
        return None, set()
    if any(t in NICK_STOP for t in toks):
        return None, set()
    if all(t in common for t in toks) or (len(toks) > 1 and toks[0] in common):
        return None, set()

    if len(toks) == 1:
        token = toks[0]
        if len(token) < 5:
            return None, set()
        # Misspelling: close to exactly one known name.
        matches = difflib.get_close_matches(token, named_keys, n=8, cutoff=0.84)
        if matches:
            best_ratio = difflib.SequenceMatcher(None, token, matches[0]).ratio()
            ids: set[str] = set()
            for match in matches:
                if difflib.SequenceMatcher(None, token, match).ratio() >= best_ratio - 0.02:
                    ids.update(e for e in lookup.get(match, ()) if _is_named(e))
            if len(ids) == 1:
                return next(iter(ids)), set()
            if len(ids) > 1:
                return None, ids
        # Or a truncation (first word) of exactly one known name.
        prefix = token + " "
        prefix_ids: set[str] = set()
        for name in named_keys:
            if name.startswith(prefix):
                prefix_ids.update(e for e in lookup.get(name, ()) if _is_named(e))
        if len(prefix_ids) == 1:
            return next(iter(prefix_ids)), set()
        if len(prefix_ids) > 1:
            return None, prefix_ids
        return None, set()

    # Multi-word nickname: exactly one named entity must appear as a substring.
    best = None
    for n in range(len(toks), 1, -1):
        for i in range(len(toks) - n + 1):
            key = " ".join(toks[i : i + n])
            ids = {e for e in lookup.get(key, ()) if _is_named(e)}
            if ids and len(key) >= 4:
                if best is None or n > best[0]:
                    best = (n, key, ids)
    if best is not None:
        _, _key, ids = best
        if len(ids) == 1:
            return next(iter(ids)), set()
        return None, set(ids)
    return None, set()


# ---------------------------------------------------------------------------
# Fetch orchestration
# ---------------------------------------------------------------------------
def gather(fetch: bool) -> tuple[list[dict], dict]:
    meta: dict = {"sources": {}, "blocked": []}
    posts: list[dict] = []

    reddit_ok = False
    if fetch:
        reddit_ok = fetch_reddit_direct()
    else:
        probe = _read_cache("reddit_direct_probe.json") or {}
        reddit_ok = bool(probe.get("reachable"))
    meta["reddit_direct"] = reddit_ok
    if not reddit_ok:
        meta["blocked"].append("reddit.com (403 Blocked) — used Arctic Shift archive")

    # Reddit (archive)
    if fetch:
        for sub, quota in SUBREDDITS.items():
            posts.extend(fetch_reddit_subreddit(sub, quota, f"reddit:{sub}"))

    # Stack Exchange
    if fetch:
        posts.extend(fetch_stackexchange("stackexchange"))

    # Steam
    if fetch:
        posts.extend(fetch_steam("steam"))

    # Blocked-source probes (GameFAQs / Fextralife)
    if fetch:
        gf = probe_blocked(
            "https://gamefaqs.gamespot.com/boards/323294-elden-ring",
            "gamefaqs_probe.json", "gamefaqs",
        )
        fl = probe_blocked(
            "https://fextralife.com/forums/forum/elden-ring/",
            "fextralife_probe.json", "fextralife",
        )
        if gf != "ok":
            meta["blocked"].append(f"GameFAQs ({gf})")
        if fl != "ok":
            meta["blocked"].append(f"Fextralife ({fl})")

    # If not fetching, rehydrate posts from cached pages so process-only works.
    if not fetch:
        posts = rehydrate_from_cache()

    return posts, meta


def rehydrate_from_cache() -> list[dict]:
    """Rebuild the raw post list from cached pages (process-only mode)."""
    posts: list[dict] = []
    for sub in SUBREDDITS:
        for page in range(MAX_PAGES_PER_SUB):
            data = _read_cache(f"reddit_{sub}_p{page:03d}.json")
            if not data:
                break
            for post in data.get("data") or []:
                title = post.get("title") or ""
                if is_question_like(title):
                    posts.append({"title": title, "selftext": post.get("selftext") or "", "src": f"reddit:{sub}"})
    page = 1
    while page <= 20:
        data = _read_cache(f"stackexchange_p{page:03d}.json")
        if not data:
            break
        for item in data.get("items") or []:
            posts.append({"title": item.get("title") or "", "selftext": item.get("body") or "", "src": "stackexchange"})
        if not data.get("has_more"):
            break
        page += 1
    for page in range(1, MAX_STEAM_PAGES + 1):
        path = _cache_path(f"steam_p{page:03d}.html")
        if not path.exists():
            break
        body = path.read_text(encoding="utf-8", errors="replace")
        for raw in STEAM_TITLE_RE.findall(body):
            title = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
            if title:
                posts.append({"title": title, "selftext": "", "src": "steam"})
    return posts


# ---------------------------------------------------------------------------
# Process
# ---------------------------------------------------------------------------
def process(posts: list[dict], meta: dict) -> dict:
    lookup = load_entity_lookup()
    seen: set[str] = set()
    seen_near: set[str] = set()
    accepted: list[tuple[str, str, str, str]] = []
    dropped = Counter()

    for post in posts:
        title = clean_text(post.get("title") or "")
        body = clean_text(post.get("selftext") or "")
        if not is_question_like(title):
            dropped["non_question"] += 1
            continue
        if not is_english(title) and not is_english(f"{title} {body}"):
            dropped["non_english"] += 1
            continue
        dk = dedupe_key(title)
        nk = near_key(title)
        if not dk or dk in seen or (nk and nk in seen_near):
            dropped["duplicate"] += 1
            continue
        seen.add(dk)
        if nk:
            seen_near.add(nk)
        accepted.append((title, body, post.get("src") or "unknown", classify(title, body)))

    texts = [f"{title}. {body[:300]}".strip() for title, body, _, _ in accepted]
    proper, common = compute_proper(texts)
    named_keys = sorted({k for k, ids in lookup.items() if any(_is_named(e) for e in ids)})

    rows: list[dict] = []
    source_counts: Counter = Counter()
    type_counts: Counter = Counter()
    entity_counts: Counter = Counter()
    unresolved_counts: Counter = Counter()
    unresolved_display: dict[str, str] = {}
    openings: dict[str, Counter] = defaultdict(Counter)

    for title, body, src, kind in accepted:
        combined = (title + ". " + body[:300]).strip()
        entities, consumed, tokens = resolve_entities(combined, lookup)
        unresolved = find_unresolved(combined, consumed, tokens, proper)

        source_counts[src] += 1
        type_counts[kind] += 1
        openings[kind][opening_of(title)] += 1
        for ent in sorted(entities):
            entity_counts[ent] += 1
        for term in unresolved:
            key = normalize_name(term)
            if len(key) < 4:
                continue
            if all(t in common for t in key.split()):
                continue
            unresolved_counts[key] += 1
            unresolved_display.setdefault(key, term)

        body_out = body[:300].strip()
        q = title if not body_out else f"{title}\n{body_out}"
        rows.append(
            {
                "q": q,
                "type": kind,
                "entities": sorted(entities),
                "unresolved": sorted(set(unresolved)),
                "src": src,
            }
        )

    # Nickname candidates from unresolved terms (auto), plus the hand-verified map.
    nickname_candidates: dict[str, str] = {}
    ambiguous: list[dict] = []
    for key, count in unresolved_counts.most_common():
        if count < 2:
            continue
        unique_id, amb = nickname_target(key, lookup, named_keys, common)
        if unique_id:
            display = unresolved_display.get(key, key)
            if display not in nickname_candidates:
                nickname_candidates[display] = unique_id
        elif amb:
            ambiguous.append({"term": unresolved_display.get(key, key), "count": count, "candidates": sorted(amb)})

    return {
        "rows": rows,
        "source_counts": source_counts,
        "type_counts": type_counts,
        "entity_counts": entity_counts,
        "unresolved_counts": unresolved_counts,
        "unresolved_display": unresolved_display,
        "openings": openings,
        "nicknames": dict(sorted(NICKNAME_MAP.items())),
        "nickname_candidates": dict(sorted(nickname_candidates.items())),
        "ambiguous": ambiguous,
        "dropped": dropped,
        "meta": meta,
    }


def opening_of(title: str) -> str:
    words = normalize_name(title).split()
    words = [w for w in words if w not in PLATFORM]
    return " ".join(words[:4])


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
def write_outputs(result: dict) -> None:
    rows = result["rows"]
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": dict(sorted(result["source_counts"].items())),
        "collected": len(rows),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rows": rows,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    NICK_JSON.parent.mkdir(parents=True, exist_ok=True)
    NICK_JSON.write_text(
        json.dumps(result["nicknames"], ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    (SCRATCH / "nickname-candidates.json").write_text(
        json.dumps(result["nickname_candidates"], ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    write_markdown(result)


def write_markdown(result: dict) -> None:
    rows = result["rows"]
    sc = result["source_counts"]
    tc = result["type_counts"]
    ec = result["entity_counts"]
    uc = result["unresolved_counts"]
    disp = result["unresolved_display"]
    openings = result["openings"]
    nicknames = result["nicknames"]
    ambiguous = result["ambiguous"]
    meta = result["meta"]

    lines: list[str] = []
    lines.append("# Player questions corpus")
    lines.append("")
    lines.append(
        "Corpus of how real players ask Elden Ring questions, collected by "
        "`scripts/collect-player-questions.py` (Task 163). Only question text and "
        "topic metadata are stored — no usernames, profile links or personal data."
    )
    lines.append("")
    lines.append(f"- **Questions collected:** {len(rows)}")
    lines.append(f"- **Sources reached:** {', '.join(sorted(sc)) or 'none'}")
    lines.append("- **Blocked sources:** " + (", ".join(meta.get("blocked") or []) or "none"))
    lines.append("")
    lines.append("## Counts per source")
    lines.append("")
    lines.append("| source | questions |")
    lines.append("| --- | ---: |")
    for src, count in sc.most_common():
        lines.append(f"| {src} | {count} |")
    lines.append("")
    lines.append("## Type mix")
    lines.append("")
    lines.append("| type | questions |")
    lines.append("| --- | ---: |")
    for kind, count in tc.most_common():
        lines.append(f"| {kind} | {count} |")
    lines.append("")
    lines.append("## 100 most common entities asked about")
    lines.append("")
    lines.append("| # | entity id | questions |")
    lines.append("| ---: | --- | ---: |")
    for i, (ent, count) in enumerate(ec.most_common(100), 1):
        lines.append(f"| {i} | {ent} | {count} |")
    lines.append("")
    lines.append("## 200 most common unresolved terms")
    lines.append("")
    lines.append("Nicknames, slang and misspellings the alias plane does not know.")
    lines.append("")
    lines.append("| # | term | count |")
    lines.append("| ---: | --- | ---: |")
    for i, (key, count) in enumerate(uc.most_common(200), 1):
        lines.append(f"| {i} | {disp.get(key, key)} | {count} |")
    lines.append("")
    lines.append("## Phrasing patterns per type")
    lines.append("")
    lines.append("Most common question openings (up to four normalised words).")
    lines.append("")
    for kind, counter in sorted(openings.items(), key=lambda kv: -tc.get(kv[0], 0)):
        top = [(o, c) for o, c in counter.most_common(8) if o and c > 0]
        if not top:
            continue
        lines.append(f"### {kind} ({tc.get(kind, 0)})")
        lines.append("")
        for opening, count in top:
            lines.append(f"- `{opening}` — {count}")
        lines.append("")
    lines.append("## Nicknames added as aliases")
    lines.append("")
    lines.append(
        "Hand-verified nicknames written to `src/data/player-nicknames.json` and "
        "consumed by `scripts/gen-aliases.mjs`. Automatic candidates that were not "
        "unambiguous were left out."
    )
    lines.append("")
    if nicknames:
        lines.append("| nickname | entity id |")
        lines.append("| --- | --- |")
        for nick, ent in sorted(nicknames.items()):
            lines.append(f"| {nick} | {ent} |")
    else:
        lines.append("None.")
    lines.append("")
    lines.append("## Other automatic nickname candidates (not added)")
    lines.append("")
    candidates = result.get("nickname_candidates") or {}
    added = {normalize_name(k) for k in nicknames}
    extra = {k: v for k, v in candidates.items() if normalize_name(k) not in added}
    if extra:
        lines.append("| candidate | entity id |")
        lines.append("| --- | --- |")
        for nick, ent in sorted(extra.items()):
            lines.append(f"| {nick} | {ent} |")
    else:
        lines.append("None.")
    lines.append("")
    lines.append("## Ambiguous unresolved terms (not added)")
    lines.append("")
    if ambiguous:
        for item in ambiguous[:60]:
            lines.append(f"- `{item['term']}` ({item['count']}) → {' / '.join(item['candidates'])}")
    else:
        lines.append("None.")
    lines.append("")
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Collect player questions (Task 163).")
    parser.add_argument("--no-fetch", action="store_true", help="process cached raw responses only")
    parser.add_argument("--fetch-only", action="store_true", help="fetch and cache, do not write artifacts")
    args = parser.parse_args()

    RAW.mkdir(parents=True, exist_ok=True)
    do_fetch = not args.no_fetch

    if do_fetch:
        posts, meta = gather(True)
    else:
        posts, meta = [], {}
        meta = {
            "sources": {},
            "blocked": [],
            "reddit_direct": bool((_read_cache("reddit_direct_probe.json") or {}).get("reachable")),
        }
        if not meta["reddit_direct"]:
            meta["blocked"].append("reddit.com (403 Blocked) — used Arctic Shift archive")

    if args.fetch_only:
        print(f"fetched {len(posts)} question-like posts (cache warm)")
        return 0

    if not do_fetch:
        posts = rehydrate_from_cache()

    print(f"processing {len(posts)} question-like posts ...")
    result = process(posts, meta)
    write_outputs(result)
    print(f"wrote {len(result['rows'])} questions to {OUT_JSON}")
    print(f"wrote report to {OUT_MD}")
    print(f"wrote {len(result['nicknames'])} nicknames to {NICK_JSON}")
    print("sources:", dict(result["source_counts"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
