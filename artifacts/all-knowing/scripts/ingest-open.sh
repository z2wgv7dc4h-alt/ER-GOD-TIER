#!/bin/bash
# One-shot public data ingest. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/erbulk"
mkdir -p "$WORK" "$ROOT/public/sourced/open" "$ROOT/public/sourced/guide" "$ROOT/public/sourced/checklists"

clone_sparse() {
  local url="$1" dest="$2" path="$3"
  if [ ! -d "$dest/.git" ]; then
    git clone --depth 1 --filter=blob:none --sparse "$url" "$dest"
  fi
  git -C "$dest" sparse-checkout set "$path"
  git -C "$dest" pull --ff-only || true
}

clone_sparse https://github.com/aether-auto/er-guide.git "$WORK/er-guide" data
clone_sparse https://github.com/deliton/eldenring-api.git "$WORK/eldenring-api" api/public/data
clone_sparse https://github.com/soulsmods/Paramdex.git "$WORK/Paramdex" ER/Names
# NOT VirusAlex/ERR-MapForGoblins-DLL: that is the Elden Ring Reforged (PC mod) build —
# its bosses, graces, places and item placements do not exist in the vanilla game.
# Map/boss/loot dumps come from the local install: python scripts/extract-vanilla-open.py

rsync -a "$WORK/er-guide/data/" "$ROOT/public/sourced/guide/"
rsync -a "$WORK/eldenring-api/api/public/data/" "$ROOT/public/sourced/checklists/"
rsync -a "$WORK/Paramdex/ER/Names/" "$ROOT/public/sourced/open/paramdex/"

python3 - <<'PY'
import json
from pathlib import Path
import os
work = Path(os.environ.get("WORK", "/tmp/erbulk"))
root = Path(os.environ["ROOT"]) if "ROOT" in os.environ else Path(".")
# if run via heredoc from bash, ROOT is set in env below
PY

echo "ingest done. map/boss/loot dumps: python scripts/extract-vanilla-open.py"
echo "guide files $(find "$ROOT/public/sourced/guide" -type f | wc -l)"
echo "paramdex $(ls "$ROOT/public/sourced/open/paramdex" | wc -l)"
echo "checklists $(ls "$ROOT/public/sourced/checklists" | wc -l)"
