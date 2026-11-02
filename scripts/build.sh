#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
cp src/index.html src/style.css src/game.js src/main.js dist/
echo "Built: $(ls dist | tr '\n' ' ')"
