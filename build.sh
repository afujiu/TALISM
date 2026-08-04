#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
import json
from pathlib import Path

root = Path('.')
svelte_pkg = json.loads((root / 'svelte' / 'package.json').read_text())
tauri_pkg = json.loads((root / 'tauri' / 'package.json').read_text())

for key in ('scripts', 'devDependencies'):
    if key in svelte_pkg:
        if key not in tauri_pkg or not isinstance(tauri_pkg[key], dict):
            tauri_pkg[key] = {}
        for name, value in svelte_pkg[key].items():
            tauri_pkg[key].setdefault(name, value)

if 'private' in svelte_pkg and 'private' not in tauri_pkg:
    tauri_pkg['private'] = svelte_pkg['private']

(root / 'tauri' / 'package.json').write_text(json.dumps(tauri_pkg, indent=2) + '\n')
PY

mkdir -p tauri/src
find tauri/src -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R svelte/src/. tauri/src/