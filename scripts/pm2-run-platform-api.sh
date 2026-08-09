#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Keep PM2 on the same Node runtime used for server builds.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

cd "${ROOT_DIR}/apps/api"

export PLATFORM_API_PORT="${PLATFORM_API_PORT:-4011}"
exec node "${ROOT_DIR}/apps/api/dist/src/platform-main.js"
