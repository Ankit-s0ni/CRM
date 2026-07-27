#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Use the same Node toolchain as the PM2 services.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

for command in pnpm pm2; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "${command} is required for production deployment." >&2
    exit 1
  fi
done

cd "${ROOT_DIR}"

# Build before restarting so a failed build leaves the current release online.
pnpm install --frozen-lockfile

cd "${ROOT_DIR}/apps/api"
pnpm exec prisma generate

cd "${ROOT_DIR}"
pnpm --filter api build
pnpm --filter web build

cd "${ROOT_DIR}/apps/api"
pnpm exec prisma migrate deploy

cd "${ROOT_DIR}"
pm2 restart deltcrm-api deltcrm-web --update-env
pm2 save

echo "Deployment complete: deltcrm-api and deltcrm-web restarted."
