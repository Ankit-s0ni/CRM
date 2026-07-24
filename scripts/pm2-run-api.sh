#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Load the server's Node toolchain when it is managed by nvm.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

cd "${ROOT_DIR}/apps/api"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to start the API under PM2." >&2
  exit 1
fi

pnpm build
pnpm exec prisma migrate deploy
exec pnpm start:prod
