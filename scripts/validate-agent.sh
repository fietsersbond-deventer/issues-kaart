#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pnpm run lint
pnpm run typecheck
pnpm run typecheck:e2e
pnpm run test:coverage
pnpm run build
node scripts/smoke-agent.mjs
