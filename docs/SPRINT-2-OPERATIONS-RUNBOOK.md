# Sprint 2 Platform Operations Runbook

## Local startup

```bash
docker compose up -d --wait postgres redis minio
# Existing PostgreSQL volumes only: provision the runtime role as postgres first.
# psql -U postgres -d hrms_dev -f scripts/provision-platform-role.sql
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
pnpm dev:api
pnpm dev:web
pnpm --filter api start:worker
```

- API: `http://localhost:4001`
- Swagger: `http://localhost:4001/api/docs`
- Web: `http://localhost:4002/platform/login`
- Seed owner: `owner@deltcrm.local` / `PlatformAdmin123!`
- Local development bypasses platform MFA unless `PLATFORM_MFA_REQUIRED=true`.
- Production and test require platform MFA by default.

## Health and readiness

- `GET /healthz` proves the API process is alive.
- `GET /readyz` returns `503` when PostgreSQL, Redis, or object storage is unavailable.
- `GET /platform/health` is permission-protected and always returns an operational snapshot. Its top-level status is `degraded` instead of throwing when a dependency is down.
- Queue health includes unpublished and dead-lettered outbox counts.

Do not route production traffic to an instance until `/readyz` succeeds. A degraded platform snapshot should create or correlate with a `SystemAlert`; the dashboard itself is not the paging system.

## Alert handling

1. Open `/platform/health` and identify the failing dependency and latency.
2. Acknowledge the alert with an investigation note.
3. Check API/worker logs using the alert time, tenant ID, and request ID.
4. Resolve only after the dependency and backlog have recovered.
5. Verify the acknowledgement and resolution in `/platform/audit`.

Alert decisions are state-checked. A resolved alert cannot be resolved or acknowledged again.

## Outbox recovery

- Keep exactly one or more `start:worker` processes running; relay leasing prevents duplicate ownership.
- Inspect unpublished events before restarting a failed worker.
- Retryable failures use bounded backoff. Do not manually set `publishedAt`.
- Investigate `lastError` before replaying a dead-lettered event.
- A dead-letter replay must clear the dead-letter marker and set a new `availableAt` in one audited administrative operation. A dedicated replay endpoint remains deferred; use a reviewed database change during MVP.

## Tenant incident workflow

1. Find the workspace in `/platform/tenants`.
2. Review S3 details, modules, usage, and audit history.
3. Use impersonation only for a scoped read investigation and record a specific reason.
4. Exit the support session immediately after investigation.
5. Suspend only when access must be blocked; suspension revokes tenant refresh families immediately.
6. Reactivation requires every tenant user to authenticate again.

## Security boundaries

- Tenant requests use `DATABASE_URL_APP` (`app_user`) and fail closed through RLS.
- Platform repositories use `DATABASE_URL_PLATFORM` (`platform_runtime`) and never trust `x-tenant-id` as authority.
- `app_admin` owns migrations and infrastructure operations; it is not the platform request-path connection.
- `app_user` has no privileges on platform users/sessions/permissions, system alerts/audits, or impersonation sessions.
- `platform_runtime` can append and read audit records but cannot update, delete, or truncate them.
- Platform and impersonation JWTs have distinct issuers, audiences, and secrets.
- Never place Stitch API keys, JWT secrets, MFA seeds, refresh tokens, or invitation tokens in logs or committed files.

## Release gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm security:check
pnpm test:e2e
pnpm test:web:e2e
pnpm openapi:generate
git diff --exit-code -- docs/openapi.json packages/contracts/src/generated.ts
```

Also apply migrations to an empty database in CI, run the worker-backed import suite, and verify the S1-S4/S9-S11 screenshots at 1024px and 1440px before a production release.
