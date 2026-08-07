#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

export ROOT_DIR

python3 - <<'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["ROOT_DIR"])

svelte_pkg = json.loads((root / "svelte" / "package.json").read_text())
tauri_pkg = json.loads((root / "tauri" / "package.json").read_text())

for key in ("dependencies", "devDependencies", "scripts"):
    if key in svelte_pkg and isinstance(svelte_pkg[key], dict):
        if key not in tauri_pkg or not isinstance(tauri_pkg[key], dict):
            tauri_pkg[key] = {}
        for name, value in svelte_pkg[key].items():
            tauri_pkg[key].setdefault(name, value)

(root / "tauri" / "package.json").write_text(json.dumps(tauri_pkg, indent=2) + "\n")
PY

rm -rf "$ROOT_DIR/tauri/src"
mkdir -p "$ROOT_DIR/tauri/src"
cp -R "$ROOT_DIR/svelte/src/." "$ROOT_DIR/tauri/src/"

cd "$ROOT_DIR/tauri"
npm install
