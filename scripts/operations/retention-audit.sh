#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the PostgreSQL database}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/postgres-common.sh"

database_url="$(postgres_cli_url "$DATABASE_URL")"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$script_dir/retention-audit.sql"
