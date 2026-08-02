#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Keep PM2 on the same Node runtime used for server builds.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

cd "${ROOT_DIR}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to start the landing app under PM2." >&2
  exit 1
fi

exec pnpm --filter landing start
