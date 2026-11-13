#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mode="${1:-}"
case "$mode" in
  ''|--validate|--with-e2e) ;;
  *) echo 'Usage: bash scripts/setup-agent.sh [--validate|--with-e2e]' >&2; exit 1 ;;
esac
if [ "$#" -gt 1 ]; then
  echo 'Only one mode is supported.' >&2
  exit 1
fi
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use
fi
command -v node >/dev/null || { echo 'Install Node from .nvmrc first.' >&2; exit 1; }
command -v pnpm >/dev/null || { echo 'Install pnpm 10.11.0 first.' >&2; exit 1; }
[ "$(node -p 'process.versions.node')" = "$(tr -d '\r\n' < .nvmrc)" ] || { echo 'Node must match .nvmrc.' >&2; exit 1; }
[ "pnpm@$(pnpm --version)" = "$(node -p "require('./package.json').packageManager")" ] || { echo 'pnpm must match package.json#packageManager.' >&2; exit 1; }
CI=true pnpm install --frozen-lockfile
node scripts/setup-agent.mjs
if [ -n "$mode" ]; then
  bash scripts/validate-agent.sh
fi
if [ "$mode" = --with-e2e ]; then
  pnpm exec playwright install --with-deps chromium
  pnpm run test:e2e:ci
fi
