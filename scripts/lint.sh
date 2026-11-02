#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for f in src/*.js tests/*.js; do node --check "$f"; done
bash -n scripts/*.sh
# Ensure every asset referenced by index.html exists
for ref in $(grep -oE '(src|href)="[^"]+"' src/index.html | sed -E 's/.*="([^"]+)"/\1/'); do
  [ -f "src/$ref" ] || { echo "missing asset: $ref"; exit 1; }
done
if command -v aws >/dev/null 2>&1 && aws sts get-caller-identity >/dev/null 2>&1; then
  aws cloudformation validate-template --region "${AWS_REGION:-us-east-1}" \
    --template-body file://infra/template.yaml >/dev/null && echo "template valid"
fi
echo "lint ok"
