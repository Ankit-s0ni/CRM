#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  # Use the same Node toolchain as the PM2 services.
  # shellcheck source=/dev/null
  source "${HOME}/.nvm/nvm.sh"
fi

for command in pnpm; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "${command} is required for production deployment." >&2
    exit 1
  fi
done

cd "${ROOT_DIR}"

# Generate missing production secrets once. Existing values are preserved so
# rerunning a deployment can never desynchronize seeded password hashes.
node scripts/configure-platform-production-env.mjs apps/api/.env

# Build before restarting so a failed build leaves the current release online.
pnpm install --frozen-lockfile

cd "${ROOT_DIR}/apps/api"
pnpm prisma:generate:all

cd "${ROOT_DIR}"
pnpm --filter api build
pnpm --filter web build
pnpm --filter landing build

cd "${ROOT_DIR}/apps/api"
pnpm prisma:migrate:deploy:platform

if [[ "${BOOTSTRAP_PLATFORM:-0}" == "1" ]]; then
  # Only a fresh installation opts into catalog/admin/demo bootstrap. The seed
  # is idempotent, but it intentionally owns the baseline roles and plans.
  NODE_ENV=production node --env-file=.env prisma/platform-seed.js
fi

cd "${ROOT_DIR}"
if systemctl cat deltcrm-platform-api.service >/dev/null 2>&1; then
  sudo systemctl restart \
    deltcrm-platform-api.service \
    deltcrm-platform-worker.service \
    deltcrm-platform-web.service
  if systemctl cat deltcrm-landing-web.service >/dev/null 2>&1; then
    sudo systemctl restart deltcrm-landing-web.service
  fi
else
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "Neither DeltCRM systemd services nor pm2 are available." >&2
    exit 1
  fi
  pm2 restart deltcrm-api deltcrm-worker deltcrm-web --update-env
  if pm2 describe deltcrm-landing >/dev/null 2>&1; then
    pm2 restart deltcrm-landing --update-env
  fi
  pm2 save
fi

echo "Platform deployment complete: API, worker, workspace web, and landing web restarted."
