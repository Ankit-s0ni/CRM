#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_FILE:?BACKUP_FILE must point to a pg_dump custom archive}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must point to a disposable drill database}"
: "${ALLOW_RESTORE_DRILL:?Set ALLOW_RESTORE_DRILL=true after confirming the target is disposable}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/postgres-common.sh"
restore_database_url="$(postgres_cli_url "$RESTORE_DATABASE_URL")"

if [[ "$ALLOW_RESTORE_DRILL" != "true" ]]; then
  echo 'ALLOW_RESTORE_DRILL must equal true' >&2
  exit 1
fi

database="$(psql "$restore_database_url" -Atqc 'SELECT current_database()')"
if [[ ! "$database" =~ (_restore_drill|_pitr_drill)$ ]]; then
  echo "Refusing destructive restore into '$database'; target must end in _restore_drill or _pitr_drill" >&2
  exit 1
fi

shasum -a 256 -c "$BACKUP_FILE.sha256"
started_at="$(date +%s)"
server_major="$(psql "$restore_database_url" -Atqc "SELECT current_setting('server_version_num')::int / 10000")"
client_major="$(pg_restore --version | sed -E 's/.* ([0-9]+)(\..*)?$/\1/')"

# The database-name guard above makes this destructive reset safe and keeps
# repeated drills deterministic for partitioned tables.
psql "$restore_database_url" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'

if (( client_major > server_major )); then
  restore_sql="$(mktemp "${TMPDIR:-/tmp}/deltcrm-restore.XXXXXX.sql")"
  trap 'rm -f "$restore_sql"' EXIT
  pg_restore --no-owner --no-privileges \
    --file="$restore_sql" "$BACKUP_FILE"
  sed '/^SET transaction_timeout = 0;$/d' "$restore_sql" | \
    psql "$restore_database_url" -v ON_ERROR_STOP=1
else
  pg_restore --no-owner --no-privileges \
    --dbname="$restore_database_url" "$BACKUP_FILE"
fi
psql "$restore_database_url" -v ON_ERROR_STOP=1 -f \
  "$script_dir/restore-smoke.sql"
finished_at="$(date +%s)"

printf 'database=%s\nserver_major=%s\npg_restore_major=%s\nrestore_seconds=%s\nresult=PASS\n' \
  "$database" "$server_major" "$client_major" "$((finished_at - started_at))"
