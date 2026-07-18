#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the source PostgreSQL database}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/postgres-common.sh"
database_url="$(postgres_cli_url "$DATABASE_URL")"
server_version="$(psql "$database_url" -Atqc 'SHOW server_version')"
client_version="$(pg_dump --version | sed -E 's/^pg_dump \(PostgreSQL\) //')"

output_dir="${BACKUP_OUTPUT_DIR:-./artifacts/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
release="${RELEASE_VERSION:-unknown}"
mkdir -p "$output_dir"
backup="$output_dir/deltcrm-${release}-${timestamp}.dump"

started_at="$(date +%s)"
pg_dump --format=custom --compress=9 --no-owner --no-privileges \
  --file="$backup" "$database_url"
pg_restore --list "$backup" >/dev/null
shasum -a 256 "$backup" >"$backup.sha256"
finished_at="$(date +%s)"

printf 'backup=%s\nchecksum=%s\nserver_version=%s\npg_dump_version=%s\nduration_seconds=%s\n' \
  "$backup" "$backup.sha256" "$server_version" "$client_version" \
  "$((finished_at - started_at))"
