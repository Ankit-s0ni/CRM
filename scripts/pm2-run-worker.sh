#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Keep the worker on the same Node runtime as the API.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

cd "${ROOT_DIR}/apps/api"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to start the background worker under PM2." >&2
  exit 1
fi

exec pnpm start:worker:prod
